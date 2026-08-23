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

  // Fetch Vault Items from Firestore with local fallback
  async fetchVaultItems(): Promise<VaultItem[] | null> {
    try {
      const colRef = collection(db, 'vault_items');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const items: VaultItem[] = [];
        snap.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as VaultItem);
        });
        return items;
      }
    } catch (e) {
      console.warn('Could not read from Firestore collection:', e);
    }
    return null;
  },

  // Update likes in Firestore
  async updateItemLikes(itemId: string, likesCount: number, likedBy: string[]): Promise<void> {
    try {
      const docRef = doc(db, 'vault_items', itemId);
      await updateDoc(docRef, { likesCount, likedBy });
    } catch (e) {
      console.warn('Error updating likes in Firestore:', e);
    }
  },
};
