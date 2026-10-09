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
import { UserProfile, VaultItem, VaultList, MembershipPlanType } from '../types';
import { isAuthorizedAdminEmail, isAuthorizedAdminKey, INITIAL_ADMIN_USER, INITIAL_MEMBER_USER, ADMIN_SECURITY_KEY, INITIAL_VAULT_LISTS } from '../data/initialVaultData';
import { generateUniqueUserId } from '../utils/vaultHelpers';

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

export interface RegisteredAccountRecord {
  email: string;
  password: string;
  profile: UserProfile;
  registeredAt: string;
}

export function getStoredRegisteredAccounts(): Record<string, RegisteredAccountRecord> {
  let accounts: Record<string, RegisteredAccountRecord> = {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REGISTERED_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        accounts = parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read registered accounts store:', e);
  }

  // Cuentas iniciales preconfiguradas con IDs de usuario estrictamente diferentes
  const defaultSeeds: Record<string, RegisteredAccountRecord> = {
    [INITIAL_ADMIN_USER.email.toLowerCase()]: {
      email: INITIAL_ADMIN_USER.email.toLowerCase(),
      password: ADMIN_SECURITY_KEY,
      profile: {
        ...INITIAL_ADMIN_USER,
        uid: 'admin_master_astro',
        bio: 'Administrador central de Bóveda App 66. Gestión de contenidos y verificaciones.',
        phone: '+54 9 11 6554-6038',
        customStatus: '🛡️ En línea - Modo Administrador',
      },
      registeredAt: '2025-01-01T00:00:00.000Z',
    },
    'cuentaninja989@gmail.com': {
      email: 'cuentaninja989@gmail.com',
      password: ADMIN_SECURITY_KEY,
      profile: {
        uid: 'admin_ninja_989',
        email: 'cuentaninja989@gmail.com',
        displayName: 'Administrador (Cuenta Ninja)',
        role: 'admin',
        joinedAt: '2025-01-15',
        tier: 'Bóveda Diamante',
        avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        customStatus: '🛡️ Administrador Secundario',
      },
      registeredAt: '2025-01-15T00:00:00.000Z',
    },
    [INITIAL_MEMBER_USER.email.toLowerCase()]: {
      email: INITIAL_MEMBER_USER.email.toLowerCase(),
      password: 'password123',
      profile: {
        ...INITIAL_MEMBER_USER,
        uid: 'vip_user_449',
        bio: 'Miembro VIP de la comunidad. Acceso a recursos exclusivos.',
        customStatus: '💎 Miembro VIP',
      },
      registeredAt: '2025-02-14T00:00:00.000Z',
    },
  };

  // Agregar semillas por defecto si no existen
  for (const [key, seed] of Object.entries(defaultSeeds)) {
    if (!accounts[key]) {
      accounts[key] = seed;
    }
  }

  // Garantizar que cada usuario en el registro tenga un ID de usuario único sin colisiones
  const seenUids = new Set<string>();
  let hasChanges = false;

  for (const [emailKey, record] of Object.entries(accounts)) {
    if (!record || !record.profile) continue;

    const currentUid = record.profile.uid;
    // Si el ID está vacío o repetido por otro usuario, se genera un ID único e irrepetible
    if (!currentUid || seenUids.has(currentUid)) {
      const isAdm = record.profile.role === 'admin' || isAuthorizedAdminEmail(record.email);
      const uniqueId = generateUniqueUserId(isAdm ? 'admin' : 'usr');
      record.profile.uid = uniqueId;
      hasChanges = true;
    }
    seenUids.add(record.profile.uid);
  }

  if (hasChanges || !localStorage.getItem(LOCAL_STORAGE_REGISTERED_USERS_KEY)) {
    try {
      localStorage.setItem(LOCAL_STORAGE_REGISTERED_USERS_KEY, JSON.stringify(accounts));
    } catch (e) {}
  }

  return accounts;
}

export function storeRegisteredAccount(record: RegisteredAccountRecord): void {
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

  // Obtener todas las cuentas registradas en el dispositivo
  getRegisteredAccounts(): Record<string, RegisteredAccountRecord> {
    return getStoredRegisteredAccounts();
  },

  // Obtener array de todos los perfiles registrados
  getAllRegisteredUsers(): UserProfile[] {
    const accounts = getStoredRegisteredAccounts();
    return Object.values(accounts).map((acc) => acc.profile);
  },

  // Cambiar rápidamente entre cuentas registradas para probar diferentes perfiles
  switchAccount(email: string): UserProfile | null {
    const accounts = getStoredRegisteredAccounts();
    const normalized = email.toLowerCase().trim();
    const record = accounts[normalized];
    if (record && record.profile) {
      this.saveSession(record.profile);
      window.dispatchEvent(new CustomEvent('vault_profile_updated', { detail: { profile: record.profile } }));
      return record.profile;
    }
    return null;
  },

  // Actualizar perfil de un usuario garantizando persistencia local e individual
  async updateUserProfile(profile: UserProfile): Promise<void> {
    this.saveSession(profile);

    // Persistir de forma individual en el registro de cuentas
    try {
      const accounts = getStoredRegisteredAccounts();
      const emailKey = profile.email.toLowerCase().trim();
      let matchedKey: string | null = null;

      if (accounts[emailKey]) {
        matchedKey = emailKey;
      } else {
        for (const [key, record] of Object.entries(accounts)) {
          if (record.profile?.uid === profile.uid) {
            matchedKey = key;
            break;
          }
        }
      }

      if (matchedKey && accounts[matchedKey]) {
        accounts[matchedKey].profile = { ...accounts[matchedKey].profile, ...profile };
        localStorage.setItem(LOCAL_STORAGE_REGISTERED_USERS_KEY, JSON.stringify(accounts));
      } else if (emailKey) {
        // Si no existía, crear la entrada para este usuario
        accounts[emailKey] = {
          email: emailKey,
          password: 'password123',
          profile: { ...profile },
          registeredAt: new Date().toISOString(),
        };
        localStorage.setItem(LOCAL_STORAGE_REGISTERED_USERS_KEY, JSON.stringify(accounts));
      }
    } catch (e) {
      console.warn('Local account store update error:', e);
    }

    // Notificar reactivamente a la UI
    window.dispatchEvent(new CustomEvent('vault_profile_updated', { detail: { profile } }));

    // Persistir en Firestore si la conexión está disponible
    try {
      if (profile.uid) {
        const userDocRef = doc(db, 'users', profile.uid);
        await setDoc(userDocRef, {
          displayName: profile.displayName,
          role: profile.role,
          tier: profile.tier,
          avatarUrl: profile.avatarUrl || null,
          bio: profile.bio || null,
          phone: profile.phone || null,
          customStatus: profile.customStatus || null,
          instagram: profile.instagram || null,
          membershipPlan: profile.membershipPlan || null,
          membershipStatus: profile.membershipStatus || null,
          membershipExpiresAt: profile.membershipExpiresAt || null,
          subscribedAt: profile.subscribedAt || null,
          lastPaymentAmount: profile.lastPaymentAmount || null,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (e) {
      console.warn('Firestore update profile fallback:', e);
    }
  },

  // Activar o mejorar la membresía de un usuario por su UID o Email
  upgradeUserMembershipByUidOrEmail(
    uid: string, 
    email?: string, 
    plan: MembershipPlanType = 'monthly'
  ): UserProfile | null {
    const accounts = getStoredRegisteredAccounts();
    let foundKey: string | null = null;

    if (email && accounts[email.toLowerCase().trim()]) {
      foundKey = email.toLowerCase().trim();
    } else {
      for (const [key, record] of Object.entries(accounts)) {
        if (record.profile?.uid === uid) {
          foundKey = key;
          break;
        }
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (plan === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString();

    if (foundKey && accounts[foundKey]) {
      const updatedProf: UserProfile = {
        ...accounts[foundKey].profile,
        membershipPlan: plan,
        membershipStatus: 'active',
        tier: 'Acceso VIP',
        subscribedAt: now.toISOString(),
        membershipExpiresAt: expiresAt,
        lastPaymentAmount: plan === 'annual' ? 12 : 1,
      };
      accounts[foundKey].profile = updatedProf;
      localStorage.setItem(LOCAL_STORAGE_REGISTERED_USERS_KEY, JSON.stringify(accounts));

      const currentSession = this.getLocalSession();
      if (currentSession && (currentSession.uid === uid || currentSession.email.toLowerCase() === accounts[foundKey].email.toLowerCase())) {
        this.saveSession(updatedProf);
        window.dispatchEvent(new CustomEvent('vault_profile_updated', { detail: { profile: updatedProf } }));
      }
      return updatedProf;
    }
    return null;
  },

  // Denegar o revocar membresía de un usuario
  denyOrRevokeUserMembershipByUidOrEmail(
    uid: string,
    email?: string,
    reason?: string
  ): UserProfile | null {
    const accounts = getStoredRegisteredAccounts();
    let foundKey: string | null = null;

    if (email && accounts[email.toLowerCase().trim()]) {
      foundKey = email.toLowerCase().trim();
    } else {
      for (const [key, record] of Object.entries(accounts)) {
        if (record.profile?.uid === uid) {
          foundKey = key;
          break;
        }
      }
    }

    if (foundKey && accounts[foundKey]) {
      const isUserAdmin = accounts[foundKey].profile.role === 'admin';
      const updatedProf: UserProfile = {
        ...accounts[foundKey].profile,
        membershipPlan: undefined,
        membershipStatus: 'none',
        tier: isUserAdmin ? 'Bóveda Diamante' : 'Invitado',
        membershipExpiresAt: undefined,
        customStatus: reason ? `Membresía no aprobada: ${reason}` : undefined,
      };
      accounts[foundKey].profile = updatedProf;
      localStorage.setItem(LOCAL_STORAGE_REGISTERED_USERS_KEY, JSON.stringify(accounts));

      const currentSession = this.getLocalSession();
      if (currentSession && (currentSession.uid === uid || currentSession.email.toLowerCase() === accounts[foundKey].email.toLowerCase())) {
        this.saveSession(updatedProf);
        window.dispatchEvent(new CustomEvent('vault_profile_updated', { detail: { profile: updatedProf } }));
      }
      return updatedProf;
    }
    return null;
  },

  getLocalSession(): UserProfile | null {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (stored) {
        const user = JSON.parse(stored) as UserProfile;
        if (user && typeof user === 'object') {
          if (!user.uid) {
            user.uid = generateUniqueUserId(user.role === 'admin' ? 'admin' : 'usr');
            this.saveSession(user);
          }
          return user;
        }
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

    // Check local profile first to retain customizations
    const localAccounts = getStoredRegisteredAccounts();
    const localMatch = localAccounts[email.toLowerCase()];
    if (localMatch && localMatch.profile) {
      if (localMatch.profile.avatarUrl) profile.avatarUrl = localMatch.profile.avatarUrl;
      if (localMatch.profile.displayName) profile.displayName = localMatch.profile.displayName;
      if (localMatch.profile.bio) profile.bio = localMatch.profile.bio;
      if (localMatch.profile.phone) profile.phone = localMatch.profile.phone;
      if (localMatch.profile.customStatus) profile.customStatus = localMatch.profile.customStatus;
      if (localMatch.profile.instagram) profile.instagram = localMatch.profile.instagram;
      if (localMatch.profile.membershipPlan) profile.membershipPlan = localMatch.profile.membershipPlan;
      if (localMatch.profile.membershipStatus) profile.membershipStatus = localMatch.profile.membershipStatus;
      if (localMatch.profile.membershipExpiresAt) profile.membershipExpiresAt = localMatch.profile.membershipExpiresAt;
    }

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
          if (data.avatarUrl) profile.avatarUrl = data.avatarUrl;
          if (data.bio) profile.bio = data.bio;
          if (data.phone) profile.phone = data.phone;
          if (data.customStatus) profile.customStatus = data.customStatus;
          if (data.instagram) profile.instagram = data.instagram;
          if (data.membershipPlan) profile.membershipPlan = data.membershipPlan;
          if (data.membershipStatus) profile.membershipStatus = data.membershipStatus;
          if (data.membershipExpiresAt) profile.membershipExpiresAt = data.membershipExpiresAt;
          if (data.subscribedAt) profile.subscribedAt = data.subscribedAt;
          if (data.lastPaymentAmount) profile.lastPaymentAmount = data.lastPaymentAmount;
        } else {
          await setDoc(userDocRef, {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: profile.displayName,
            role: isAdmin ? 'admin' : 'vip_member',
            tier: profile.tier,
            avatarUrl: profile.avatarUrl,
            bio: profile.bio || null,
            phone: profile.phone || null,
            customStatus: profile.customStatus || null,
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
      const registeredAccounts = getStoredRegisteredAccounts();
      const existingRecord = registeredAccounts[normalizedEmail];

      if (existingRecord) {
        if (existingRecord.password === cleanPassword) {
          this.saveSession(existingRecord.profile);
          return existingRecord.profile;
        }
        const passError = new Error('Contraseña incorrecta. Por favor verifica tus datos.');
        (passError as any).code = 'auth/wrong-password';
        throw passError;
      }

      // If pre-configured admin email
      if (isAuthorizedAdminEmail(normalizedEmail) && cleanPassword === ADMIN_SECURITY_KEY) {
        let uniqueAdminUid = 'admin_master_astro';
        if (normalizedEmail.includes('ninja')) uniqueAdminUid = 'admin_ninja_989';
        else if (normalizedEmail.includes('vault.private')) uniqueAdminUid = 'admin_vault_private';

        const adminUser: UserProfile = {
          ...INITIAL_ADMIN_USER,
          uid: uniqueAdminUid,
          email: normalizedEmail,
          displayName: `Administrador (${normalizedEmail.split('@')[0]})`,
        };
        storeRegisteredAccount({
          email: normalizedEmail,
          password: cleanPassword,
          profile: adminUser,
          registeredAt: new Date().toISOString(),
        });
        this.saveSession(adminUser);
        return adminUser;
      }

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

      const notRegError = new Error('Esta cuenta no está registrada. Por favor ve a la pestaña "Registrarse" para crear tu cuenta.');
      (notRegError as any).code = 'auth/user-not-found';
      throw notRegError;
    }
  },

  // Firebase Email/Password Register (Creates a new user account with unique user ID)
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

    const isAdmin = isAuthorizedAdminEmail(normalizedEmail);
    // Generar ID de usuario único, diferente e irrepetible para cada usuario
    const uniqueUid = generateUniqueUserId(isAdmin ? 'admin' : 'usr');

    const newProfile: UserProfile = {
      uid: uniqueUid,
      email: normalizedEmail,
      displayName: displayName?.trim() || normalizedEmail.split('@')[0] || (isAdmin ? 'Administrador' : 'Miembro VIP'),
      role: isAdmin ? 'admin' : 'vip_member',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uniqueUid)}`,
      tier: isAdmin ? 'Bóveda Diamante' : 'Acceso VIP',
      joinedAt: new Date().toISOString().split('T')[0],
    };

    try {
      const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, cleanPassword);
      if (displayName) {
        try {
          await updateProfile(cred.user, { displayName });
        } catch {}
      }
      if (cred && cred.user && cred.user.uid) {
        newProfile.uid = cred.user.uid;
        newProfile.avatarUrl = cred.user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cred.user.uid)}`;
      }
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        throw err;
      }
      // If Firebase Auth operation fails or offline, newProfile uses the unique generated UID
      console.warn('Fallback registering user with unique local ID:', uniqueUid, err?.message);
    }

    // Persist in registered accounts registry
    storeRegisteredAccount({
      email: normalizedEmail,
      password: cleanPassword,
      profile: newProfile,
      registeredAt: new Date().toISOString(),
    });

    // Also save to Firestore users collection
    try {
      const userDocRef = doc(db, 'users', newProfile.uid);
      setDoc(userDocRef, {
        ...newProfile,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    } catch (e) {}

    this.saveSession(newProfile);
    return newProfile;
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
    const currentSession = this.getLocalSession();
    if (currentSession && currentSession.role === 'admin' && currentSession.uid) {
      return currentSession;
    }
    const accounts = getStoredRegisteredAccounts();
    const adminRecord = accounts[INITIAL_ADMIN_USER.email.toLowerCase()];
    if (adminRecord && adminRecord.profile) {
      this.saveSession(adminRecord.profile);
      return adminRecord.profile;
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
      try {
        const itemDocRef = doc(db, 'vault_items', item.id);
        const cleanData = this.sanitizeItemForFirestore(item);
        await setDoc(itemDocRef, {
          ...cleanData,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        return true;
      } catch (sdkErr: any) {
        console.warn('[Firestore Web SDK setDoc Warning, falling back to REST]:', sdkErr?.message || sdkErr);
      }

      // 2. Direct REST write fallback only if Web SDK failed
      const restSuccess = await this.saveToFirestoreREST(item);
      if (restSuccess) {
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('[Firestore Error] Could not save item to Firestore:', err?.message || err);
      return false;
    }
  },

  // Sync items to Firestore safely without overwhelming write streams
  async syncAllItemsToFirestore(items: VaultItem[]): Promise<number> {
    if (!Array.isArray(items) || items.length === 0) return 0;
    let successCount = 0;
    const validItems = items.filter(
      (item) => item && item.id && !item.id.startsWith('res_00') && !item.id.startsWith('test-') && item.id !== 'vault-res-test-rest' && item.id !== 'vault-res-direct-1787703256063'
    );

    // Process sequentially in batches to prevent write stream exhaustion
    for (const item of validItems) {
      try {
        const ok = await this.saveVaultItemToFirestore(item);
        if (ok) successCount++;
      } catch (e) {
        console.warn('Sync item error:', e);
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
              if (docSnap.id.startsWith('res_00') || docSnap.id.startsWith('test-') || docSnap.id === 'vault-res-test-rest' || docSnap.id === 'vault-res-direct-1787703256063') {
                return;
              }
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
          if (docSnap.id.startsWith('res_00') || docSnap.id.startsWith('test-') || docSnap.id === 'vault-res-test-rest' || docSnap.id === 'vault-res-direct-1787703256063') {
            return;
          }
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
          const items: VaultItem[] = data.documents
            .filter((docSnap: any) => {
              const id = docSnap.name.split('/').pop() || '';
              return !id.startsWith('res_00') && !id.startsWith('test-') && id !== 'vault-res-test-rest' && id !== 'vault-res-direct-1787703256063';
            })
            .map((docSnap: any) => {
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

  // Save or update Vault List in Firestore
  async saveVaultListToFirestore(list: VaultList): Promise<boolean> {
    try {
      if (!list || !list.id) return false;
      const cleanList = {
        id: String(list.id),
        name: String(list.name || '').trim(),
        description: String(list.description || '').trim(),
        icon: String(list.icon || 'folder'),
        color: String(list.color || '#0066FF'),
        itemIds: Array.isArray(list.itemIds) ? list.itemIds.filter(Boolean) : [],
        createdAt: list.createdAt || new Date().toISOString().split('T')[0],
        createdBy: list.createdBy || 'admin_master_astro',
        updatedAt: serverTimestamp(),
      };

      try {
        const listDocRef = doc(db, 'vault_lists', list.id);
        await setDoc(listDocRef, cleanList, { merge: true });
        return true;
      } catch (sdkErr) {
        console.warn('Web SDK saveVaultList failed, trying REST:', sdkErr);
      }

      // REST fallback
      const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/vault_lists/${encodeURIComponent(list.id)}?key=${firebaseConfig.apiKey}`;
      const fields: Record<string, any> = {
        id: { stringValue: String(cleanList.id) },
        name: { stringValue: String(cleanList.name) },
        description: { stringValue: String(cleanList.description) },
        icon: { stringValue: String(cleanList.icon) },
        color: { stringValue: String(cleanList.color) },
        createdAt: { stringValue: String(cleanList.createdAt) },
        createdBy: { stringValue: String(cleanList.createdBy) },
        itemIds: {
          arrayValue: {
            values: cleanList.itemIds.map((id) => ({ stringValue: String(id) })),
          },
        },
      };

      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      return res.ok;
    } catch (err) {
      console.warn('Error saving list to Firestore:', err);
      return false;
    }
  },

  // Delete Vault List from Firestore
  async deleteVaultListFromFirestore(listId: string): Promise<boolean> {
    try {
      try {
        const docRef = doc(db, 'vault_lists', listId);
        await deleteDoc(docRef);
      } catch (e) {}

      try {
        const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/vault_lists/${encodeURIComponent(listId)}?key=${firebaseConfig.apiKey}`;
        await fetch(url, { method: 'DELETE' });
      } catch (e) {}

      return true;
    } catch (err) {
      console.warn('Error deleting list from Firestore:', err);
      return false;
    }
  },

  // Real-time listener for Firestore Vault Lists
  onVaultListsSnapshot(callback: (lists: VaultList[]) => void) {
    try {
      const colRef = collection(db, 'vault_lists');
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const lists: VaultList[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              lists.push({
                id: docSnap.id,
                name: data.name || 'Lista',
                description: data.description || '',
                icon: data.icon || 'folder',
                color: data.color || '#0066FF',
                itemIds: Array.isArray(data.itemIds) ? data.itemIds : [],
                createdAt: data.createdAt || new Date().toISOString().split('T')[0],
                createdBy: data.createdBy || 'admin_master_astro',
              });
            });
            callback(lists);
          } else {
            callback([]);
          }
        },
        (error) => {
          console.warn('Firestore onVaultListsSnapshot error:', error);
        }
      );
    } catch (err) {
      console.warn('Could not attach Firestore lists listener:', err);
      return () => {};
    }
  },

  // Fetch lists from Firestore with REST fallback
  async fetchVaultLists(): Promise<VaultList[] | null> {
    try {
      const colRef = collection(db, 'vault_lists');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const lists: VaultList[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          lists.push({
            id: docSnap.id,
            name: data.name || 'Lista',
            description: data.description || '',
            icon: data.icon || 'folder',
            color: data.color || '#0066FF',
            itemIds: Array.isArray(data.itemIds) ? data.itemIds : [],
            createdAt: data.createdAt || new Date().toISOString().split('T')[0],
            createdBy: data.createdBy || 'admin_master_astro',
          });
        });
        return lists;
      }
    } catch (e) {
      console.warn('Could not read from Firestore lists collection, trying REST:', e);
    }

    try {
      const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/vault_lists?key=${firebaseConfig.apiKey}&pageSize=100`;
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        if (data && Array.isArray(data.documents) && data.documents.length > 0) {
          const lists: VaultList[] = data.documents.map((docSnap: any) => {
            const fields = docSnap.fields || {};
            const id = docSnap.name.split('/').pop() || '';
            let itemIds: string[] = [];
            if (fields.itemIds?.arrayValue?.values) {
              itemIds = fields.itemIds.arrayValue.values.map((v: any) => v.stringValue).filter(Boolean);
            }
            return {
              id,
              name: fields.name?.stringValue || 'Lista',
              description: fields.description?.stringValue || '',
              icon: fields.icon?.stringValue || 'folder',
              color: fields.color?.stringValue || '#0066FF',
              itemIds,
              createdAt: fields.createdAt?.stringValue || new Date().toISOString().split('T')[0],
              createdBy: fields.createdBy?.stringValue || 'admin_master_astro',
            };
          });
          return lists;
        }
      }
    } catch (restErr) {
      console.warn('Firestore REST lists read error:', restErr);
    }

    return null;
  },
};
