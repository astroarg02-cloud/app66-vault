import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import rawFirebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, VaultItem } from '../types';
import { isAuthorizedAdminEmail, isAuthorizedAdminKey, INITIAL_ADMIN_USER } from '../data/initialVaultData';

// Configuración de Firebase que prioriza las variables de Vercel/Vite y usa el config local de respaldo
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || rawFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawFirebaseConfig.appId,
};

// Initialize Firebase SDK
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const googleAuthProvider = new GoogleAuthProvider();

const LOCAL_STORAGE_SESSION_KEY = 'vault_firebase_session_v1';
const LOCAL_STORAGE_REGISTERED_USERS_KEY = 'vault_registered_accounts_v1';

interface RegisteredAccountRecord {
  email: string;
  password: string;
  profile: UserProfile;
  registeredAt: string;
}

function getStoredRegisteredAccounts(): Record<string, RegisteredAccountRecord> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REGISTERED_USERS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Could not read registered accounts store:', e);
  }
  return {};
}

function storeRegisteredAccount(record: RegisteredAccountRecord): void {
  try {
    const accounts = getStoredRegisteredAccounts();
    accounts[record.email.toLowerCase().trim()] = record;
    localStorage.setItem(LOCAL_STORAGE_REGISTERED_USERS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Could not persist registered account locally:', e);
  }
}

export const firebaseService = {
  // Save active session locally for instant offline/reloads
  saveSession(user: UserProfile | null): void {
    try {
      if (user) {
        localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
      }
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  },

  getLocalSession(): UserProfile | null {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (stored) {
        return JSON.parse(stored) as UserProfile;
      }
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }
    return null;
  },

  // Map a Firebase Auth User + Firestore data into app's UserProfile
  async mapFirebaseUserToProfile(fbUser: FirebaseUser, forceAdmin?: boolean): Promise<UserProfile> {
    const email = fbUser.email || '';
    const isAdmin = forceAdmin || isAuthorizedAdminEmail(email);
    const userDocRef = doc(db, 'users', fbUser.uid);

    let tier: 'Bóveda Diamante' | 'Acceso VIP' | 'Invitado' = isAdmin ? 'Bóveda Diamante' : 'Acceso VIP';
    let displayName = fbUser.displayName || (email.split('@')[0] ? email.split('@')[0] : 'Miembro VIP');

    const profile: UserProfile = {
      uid: fbUser.uid,
      email: fbUser.email || 'user@vault.firebase',
      displayName,
      role: isAdmin ? 'admin' : 'vip_member',
      avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
      joinedAt: new Date().toISOString().split('T')[0],
      tier,
    };

    // Non-blocking firestore sync with timeout to prevent loading hangs
    const firestoreSyncPromise = (async () => {
      try {
        const snap = await Promise.race([
          getDoc(userDocRef),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
        ]);
        if (snap && snap.exists()) {
          const data = snap.data();
          if (data.tier) profile.tier = data.tier;
          if (data.displayName) profile.displayName = data.displayName;
        } else {
          await setDoc(userDocRef, {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: profile.displayName,
            role: isAdmin ? 'admin' : 'vip_member',
            tier: profile.tier,
            avatarUrl: profile.avatarUrl,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          });
        }
      } catch (err) {
        // Safe fallback - keep local profile
      }
    })();

    firestoreSyncPromise.catch(() => {});
    this.saveSession(profile);
    return profile;
  },

  // Firebase Email/Password Login (Only allows login if the user has already registered)
  async signInWithEmail(email: string, password: string): Promise<UserProfile> {
    const normalizedEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();

    try {
      const cred = await signInWithEmailAndPassword(auth, normalizedEmail, cleanPassword);
      return await this.mapFirebaseUserToProfile(cred.user);
    } catch (err: any) {
      // If Firebase Auth returns that user is not found or invalid credential, re-throw so user is alerted
      if (
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/invalid-credential' ||
        err?.code === 'auth/invalid-email'
      ) {
        const notFoundError = new Error('Esta cuenta no existe o la contraseña es incorrecta. Por favor regístrate primero.');
        (notFoundError as any).code = err.code;
        throw notFoundError;
      }

      // If Firebase Email/Password is disabled in Console (auth/operation-not-allowed) or offline:
      if (err?.code === 'auth/operation-not-allowed' || !navigator.onLine) {
        const registeredAccounts = getStoredRegisteredAccounts();
        const existingRecord = registeredAccounts[normalizedEmail];

        // If the user never registered, reject login immediately!
        if (!existingRecord) {
          // Allow pre-configured admin email if valid
          if (isAuthorizedAdminEmail(normalizedEmail)) {
            const adminUser = { ...INITIAL_ADMIN_USER, email: normalizedEmail };
            this.saveSession(adminUser);
            return adminUser;
          }

          const notRegError = new Error('Esta cuenta no está registrada. Por favor ve a la pestaña "Registrarse" para crear tu cuenta.');
          (notRegError as any).code = 'auth/user-not-found';
          throw notRegError;
        }

        // Verify password
        if (existingRecord.password !== cleanPassword) {
          const passError = new Error('Contraseña incorrecta. Por favor verifica tus datos.');
          (passError as any).code = 'auth/wrong-password';
          throw passError;
        }

        this.saveSession(existingRecord.profile);
        return existingRecord.profile;
      }

      throw err;
    }
  },

  // Firebase Email/Password Register (Creates a new user account)
  async registerWithEmail(email: string, password: string, displayName?: string): Promise<UserProfile> {
    const normalizedEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();

    // Check local registry first
    const registeredAccounts = getStoredRegisteredAccounts();
    if (registeredAccounts[normalizedEmail]) {
      const alreadyExistsError = new Error('Este correo ya está registrado. Por favor inicia sesión con tu contraseña.');
      (alreadyExistsError as any).code = 'auth/email-already-in-use';
      throw alreadyExistsError;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, cleanPassword);
      if (displayName) {
        try {
          await updateProfile(cred.user, { displayName });
        } catch {
          // ignore profile update warning
        }
      }
      const profile = await this.mapFirebaseUserToProfile(cred.user);
      storeRegisteredAccount({
        email: normalizedEmail,
        password: cleanPassword,
        profile,
        registeredAt: new Date().toISOString(),
      });
      return profile;
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        throw err;
      }

      if (err?.code === 'auth/operation-not-allowed' || !navigator.onLine) {
        const isAdmin = isAuthorizedAdminEmail(normalizedEmail);
        const uid = 'user_' + btoa(normalizedEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
        const newProfile: UserProfile = {
          uid,
          email: normalizedEmail,
          displayName: displayName?.trim() || normalizedEmail.split('@')[0] || 'Miembro VIP',
          role: isAdmin ? 'admin' : 'vip_member',
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(normalizedEmail)}`,
          tier: isAdmin ? 'Bóveda Diamante' : 'Acceso VIP',
          joinedAt: new Date().toISOString().split('T')[0],
        };

        // Persist in registered accounts registry
        storeRegisteredAccount({
          email: normalizedEmail,
          password: cleanPassword,
          profile: newProfile,
          registeredAt: new Date().toISOString(),
        });

        // Also save to Firestore users collection
        try {
          const userDocRef = doc(db, 'users', uid);
          setDoc(userDocRef, {
            ...newProfile,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          }, { merge: true }).catch(() => {});
        } catch (e) {
          // fallback
        }

        this.saveSession(newProfile);
        return newProfile;
      }
      throw err;
    }
  },

  // Firebase Google Popup Sign-in / Register
  async signInWithFirebaseGoogle(): Promise<UserProfile> {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    return await this.mapFirebaseUserToProfile(cred.user);
  },

  // Direct Admin Access with Master Security Key
  async loginAsAdminWithKey(adminKey: string): Promise<UserProfile> {
    if (!isAuthorizedAdminKey(adminKey)) {
      throw new Error('Key de seguridad incorrecta. Se requiere la clave de Administrador.');
    }
    const adminUser = { ...INITIAL_ADMIN_USER };
    this.saveSession(adminUser);
    return adminUser;
  },

  // Sign out from Firebase
  async signOut(): Promise<void> {
    this.saveSession(null);
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signout error:', err);
    }
  },

  // Real-time listener for Firebase Auth
  onAuthState(callback: (user: UserProfile | null) => void) {
    try {
      return onAuthStateChanged(
        auth,
        async (fbUser) => {
          try {
            if (fbUser) {
              const profile = await this.mapFirebaseUserToProfile(fbUser);
              callback(profile);
            } else {
              callback(this.getLocalSession());
            }
          } catch (e) {
            callback(this.getLocalSession());
          }
        },
        (error) => {
          console.warn('onAuthStateChanged error:', error);
          callback(this.getLocalSession());
        }
      );
    } catch (err) {
      callback(this.getLocalSession());
      return () => {};
    }
  },

  // Helper to sanitize items for Firestore (Firestore strictly forbids 'undefined' and max 1MB doc size)
  sanitizeItemForFirestore(item: VaultItem): Record<string, any> {
    // Firestore documents cannot exceed 1MB (1,048,576 bytes).
    // If base64 fileData is large (>500KB), keep it out of Firestore to prevent document size rejection.
    let safeFileData = '';
    if (item.fileData && typeof item.fileData === 'string' && item.fileData.length < 500000) {
      safeFileData = item.fileData;
    }

    const raw: Record<string, any> = {
      id: String(item.id || `vault-res-${Date.now()}`),
      title: String(item.title || '').trim(),
      description: String(item.description || '').trim(),
      category: item.category || 'code',
      fileType: item.fileType || '',
      fileSize: item.fileSize || '',
      fileName: item.fileName || '',
      fileMimeType: item.fileMimeType || '',
      fileData: safeFileData,
      downloadUrl: item.downloadUrl || '',
      coverImage: item.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      createdAt: item.createdAt || new Date().toISOString().split('T')[0],
      likesCount: typeof item.likesCount === 'number' ? item.likesCount : 0,
      likedBy: Array.isArray(item.likedBy) ? item.likedBy.filter(Boolean) : [],
      comments: Array.isArray(item.comments) ? item.comments.filter(Boolean) : [],
      isLockedForTier: Boolean(item.isLockedForTier),
      version: item.version || 'v1.0',
      author: {
        name: item.author?.name || 'Administrador (astroarg02)',
        badge: item.author?.badge || 'ADMIN ROOT',
      },
    };

    // Remove any undefined keys
    Object.keys(raw).forEach((k) => {
      if (raw[k] === undefined) {
        delete raw[k];
      }
    });

    return raw;
  },

  // Helper to convert item into Firestore REST fields format
  itemToFirestoreRestFields(item: VaultItem): Record<string, any> {
    const clean = this.sanitizeItemForFirestore(item);
    const fields: Record<string, any> = {};

    for (const [key, value] of Object.entries(clean)) {
      if (value === undefined || value === null) continue;
      if (typeof value === 'string') {
        fields[key] = { stringValue: value };
      } else if (typeof value === 'number') {
        fields[key] = { integerValue: String(Math.round(value)) };
      } else if (typeof value === 'boolean') {
        fields[key] = { booleanValue: value };
      } else if (Array.isArray(value)) {
        fields[key] = {
          arrayValue: {
            values: value.map((v) => {
              if (typeof v === 'string') return { stringValue: v };
              if (typeof v === 'object') return { stringValue: JSON.stringify(v) };
              return { stringValue: String(v) };
            }),
          },
        };
      } else if (typeof value === 'object') {
        fields[key] = { stringValue: JSON.stringify(value) };
      }
    }
    return fields;
  },

  // Direct REST write fallback to Firestore
  async saveToFirestoreREST(item: VaultItem): Promise<boolean> {
    try {
      if (!item || !item.id) return false;
      const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/vault_items/${encodeURIComponent(item.id)}?key=${firebaseConfig.apiKey}`;
      const fields = this.itemToFirestoreRestFields(item);
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Firestore REST write error:', e);
      return false;
    }
  },

  // Save or insert Vault Item in Firestore (so all users in any device see it)
  async saveVaultItemToFirestore(item: VaultItem): Promise<boolean> {
    try {
      if (!item || !item.id) {
        console.warn('Cannot save item without ID to Firestore');
        return false;
      }

      // 1. Try Web SDK
      let sdkSuccess = false;
      try {
        const itemDocRef = doc(db, 'vault_items', item.id);
        const cleanData = this.sanitizeItemForFirestore(item);
        await setDoc(itemDocRef, {
          ...cleanData,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        sdkSuccess = true;
      } catch (sdkErr: any) {
        console.warn('[Firestore Web SDK setDoc Warning]:', sdkErr?.message || sdkErr);
      }

      // 2. Direct REST write assurance
      const restSuccess = await this.saveToFirestoreREST(item);

      if (sdkSuccess || restSuccess) {
        console.log(`[Firestore] Successfully saved item "${item.title}" (${item.id})`);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('[Firestore Error] Could not save item to Firestore:', err?.message || err);
      return false;
    }
  },

  // Sync multiple items to Firestore
  async syncAllItemsToFirestore(items: VaultItem[]): Promise<number> {
    if (!Array.isArray(items) || items.length === 0) return 0;
    let successCount = 0;
    for (const item of items) {
      if (item && item.id) {
        const ok = await this.saveVaultItemToFirestore(item);
        if (ok) successCount++;
      }
    }
    return successCount;
  },

  // Delete Vault Item from Firestore
  async deleteVaultItemFromFirestore(itemId: string): Promise<boolean> {
    try {
      // 1. Web SDK delete
      try {
        const itemDocRef = doc(db, 'vault_items', itemId);
        await deleteDoc(itemDocRef);
      } catch (e) {}

      // 2. REST delete
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/vault_items/${encodeURIComponent(itemId)}?key=${firebaseConfig.apiKey}`;
        await fetch(url, { method: 'DELETE' });
      } catch (e) {}

      return true;
    } catch (err) {
      console.warn('Could not delete item from Firestore:', err);
      return false;
    }
  },

  // Real-time listener for Firestore Vault Items
  onVaultItemsSnapshot(callback: (items: VaultItem[]) => void) {
    try {
      const colRef = collection(db, 'vault_items');
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const items: VaultItem[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              items.push({
                id: docSnap.id,
                title: data.title || '',
                description: data.description || '',
                category: data.category || 'code',
                fileType: data.fileType || '',
                fileSize: data.fileSize || '',
                fileName: data.fileName || undefined,
                fileMimeType: data.fileMimeType || undefined,
                fileData: data.fileData || undefined,
                downloadUrl: data.downloadUrl || '',
                coverImage: data.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
                createdAt: data.createdAt || new Date().toISOString().split('T')[0],
                likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
                likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
                comments: Array.isArray(data.comments) ? data.comments : [],
                isLockedForTier: data.isLockedForTier ?? false,
                version: data.version || 'v1.0',
                author: data.author || {
                  name: 'Administrador (astroarg02)',
                  badge: 'ADMIN ROOT',
                },
              });
            });
            callback(items);
          }
        },
        (error) => {
          console.warn('Firestore onSnapshot error:', error);
        }
      );
    } catch (err) {
      console.warn('Could not attach Firestore listener:', err);
      return () => {};
    }
  },

  // Update comments in Firestore
  async updateItemComments(itemId: string, comments: any[]): Promise<void> {
    try {
      const docRef = doc(db, 'vault_items', itemId);
      await setDoc(docRef, { comments, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn('Error updating comments in Firestore Web SDK, trying REST:', e);
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/vault_items/${encodeURIComponent(itemId)}?updateMask.fieldPaths=comments&key=${firebaseConfig.apiKey}`;
        const values = (comments || []).map((c) => ({ stringValue: typeof c === 'object' ? JSON.stringify(c) : String(c) }));
        await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              comments: { arrayValue: { values } },
            },
          }),
        });
      } catch (restErr) {}
    }
  },

  // Fetch Vault Items from Firestore with REST fallback
  async fetchVaultItems(): Promise<VaultItem[] | null> {
    try {
      // 1. Try Web SDK
      const colRef = collection(db, 'vault_items');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const items: VaultItem[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            title: data.title || '',
            description: data.description || '',
            category: data.category || 'code',
            fileType: data.fileType || '',
            fileSize: data.fileSize || '',
            fileName: data.fileName || undefined,
            fileMimeType: data.fileMimeType || undefined,
            fileData: data.fileData || undefined,
            downloadUrl: data.downloadUrl || '',
            coverImage: data.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
            createdAt: data.createdAt || new Date().toISOString().split('T')[0],
            likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
            likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
            comments: Array.isArray(data.comments) ? data.comments : [],
            isLockedForTier: data.isLockedForTier ?? false,
            version: data.version || 'v1.0',
            author: data.author || {
              name: 'Administrador (astroarg02)',
              badge: 'ADMIN ROOT',
            },
          });
        });
        return items;
      }
    } catch (e) {
      console.warn('Could not read from Firestore Web SDK collection, trying REST:', e);
    }

    // 2. REST Fallback
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/vault_items?key=${firebaseConfig.apiKey}&pageSize=300`;
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        if (data && Array.isArray(data.documents) && data.documents.length > 0) {
          const items: VaultItem[] = data.documents.map((docSnap: any) => {
            const fields = docSnap.fields || {};
            const id = docSnap.name.split('/').pop() || '';
            let author = { name: 'Administrador (astroarg02)', badge: 'ADMIN ROOT' };
            if (fields.author?.stringValue) {
              try {
                author = JSON.parse(fields.author.stringValue);
              } catch (err) {
                author = { name: fields.author.stringValue, badge: 'ADMIN ROOT' };
              }
            }
            let comments: any[] = [];
            if (fields.comments?.arrayValue?.values) {
              comments = fields.comments.arrayValue.values.map((v: any) => {
                try {
                  return JSON.parse(v.stringValue);
                } catch (err) {
                  return v.stringValue;
                }
              });
            }
            let likedBy: string[] = [];
            if (fields.likedBy?.arrayValue?.values) {
              likedBy = fields.likedBy.arrayValue.values.map((v: any) => v.stringValue).filter(Boolean);
            }
            return {
              id,
              title: fields.title?.stringValue || '',
              description: fields.description?.stringValue || '',
              category: (fields.category?.stringValue as any) || 'code',
              fileType: fields.fileType?.stringValue || '',
              fileSize: fields.fileSize?.stringValue || '',
              fileName: fields.fileName?.stringValue || undefined,
              fileMimeType: fields.fileMimeType?.stringValue || undefined,
              downloadUrl: fields.downloadUrl?.stringValue || '',
              coverImage: fields.coverImage?.stringValue || '',
              createdAt: fields.createdAt?.stringValue || new Date().toISOString().split('T')[0],
              likesCount: Number(fields.likesCount?.integerValue || 0),
              likedBy,
              comments,
              isLockedForTier: Boolean(fields.isLockedForTier?.booleanValue),
              version: fields.version?.stringValue || 'v1.0',
              author,
            };
          });
          return items;
        }
      }
    } catch (restErr) {
      console.warn('Firestore REST read error:', restErr);
    }

    return null;
  },

  // Update likes in Firestore
  async updateItemLikes(itemId: string, likesCount: number, likedBy: string[]): Promise<void> {
    try {
      const docRef = doc(db, 'vault_items', itemId);
      await setDoc(docRef, { likesCount, likedBy, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn('Error updating likes in Firestore Web SDK, trying REST:', e);
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/vault_items/${encodeURIComponent(itemId)}?updateMask.fieldPaths=likesCount&updateMask.fieldPaths=likedBy&key=${firebaseConfig.apiKey}`;
        await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              likesCount: { integerValue: String(Math.round(likesCount)) },
              likedBy: { arrayValue: { values: (likedBy || []).map((u) => ({ stringValue: String(u) })) } },
            },
          }),
        });
      } catch (restErr) {}
    }
  },
};
