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
        role: 'admin',
        tier: 'Bóveda Diamante',
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
        membershipStatus: 'none',
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
        role: 'vip_member',
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

  // Migración única para reemplazar fechas simuladas antiguas (-30 días / -3 días) por la fecha exacta y real de inicio y vencimiento
  const REAL_DATES_MIGRATION_KEY = 'vault_real_membership_dates_v2';
  let needsRealDateMigration = false;
  try {
    needsRealDateMigration = localStorage.getItem(REAL_DATES_MIGRATION_KEY) !== 'true';
  } catch {}

  // Garantizar que solo los correos autorizados tengan rol admin, y ningún usuario regular pueda tener admin
  const seenUids = new Set<string>();
  let hasChanges = false;
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  for (const [, record] of Object.entries(accounts)) {
    if (!record || !record.profile) continue;

    const isAllowedAdmin = isAuthorizedAdminEmail(record.email || record.profile.email);
    if (isAllowedAdmin && record.profile.role !== 'admin') {
      record.profile.role = 'admin';
      record.profile.tier = 'Bóveda Diamante';
      hasChanges = true;
    } else if (!isAllowedAdmin && record.profile.role === 'admin') {
      record.profile.role = 'vip_member';
      if (record.profile.tier === 'Bóveda Diamante') {
        record.profile.tier = 'Acceso VIP';
      }
      hasChanges = true;
    }

    const currentUid = record.profile.uid;
    // Si el ID está vacío o repetido por otro usuario, se genera un ID único e irrepetible
    if (!currentUid || seenUids.has(currentUid)) {
      const uniqueId = generateUniqueUserId(isAllowedAdmin ? 'admin' : 'usr');
      record.profile.uid = uniqueId;
      hasChanges = true;
    }
    seenUids.add(record.profile.uid);

    const prof = record.profile;
    let isExplicitlyPurchased = false;
    try {
      isExplicitlyPurchased = localStorage.getItem(`vault_purchased_membership_${prof.uid}`) === 'true';
    } catch {}

    if (!isExplicitlyPurchased) {
      if (prof.membershipPlan || prof.membershipStatus === 'active' || prof.subscribedAt || prof.membershipExpiresAt) {
        prof.membershipPlan = undefined;
        prof.membershipStatus = prof.membershipStatus === 'cancelled' ? 'cancelled' : 'none';
        prof.subscribedAt = undefined;
        prof.membershipExpiresAt = undefined;
        if (prof.role !== 'admin') {
          prof.tier = 'Invitado';
        }
        hasChanges = true;
      }
    } else if (prof.membershipStatus === 'active' && prof.membershipPlan) {
      const durationMs = (prof.membershipPlan === 'annual' ? 365 : 30) * 86400000;
      if (!prof.subscribedAt || !prof.membershipExpiresAt) {
        const startTime = prof.subscribedAt ? new Date(prof.subscribedAt).getTime() : nowMs;
        const validStartTime = isNaN(startTime) ? nowMs : startTime;
        prof.subscribedAt = new Date(validStartTime).toISOString();
        prof.membershipExpiresAt = new Date(validStartTime + durationMs).toISOString();
        hasChanges = true;
      }
    }
  }

  if (needsRealDateMigration || hasChanges) {
    try {
      localStorage.setItem(REAL_DATES_MIGRATION_KEY, 'true');
      const rawSession = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (rawSession) {
        const sessionUser = JSON.parse(rawSession) as UserProfile;
        if (sessionUser && sessionUser.email) {
          const updatedRecord = accounts[sessionUser.email.toLowerCase().trim()];
          if (updatedRecord && updatedRecord.profile) {
            localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(updatedRecord.profile));
          }
        }
      }
    } catch {}
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
    const emailKey = record.email.toLowerCase().trim();
    accounts[emailKey] = record;
    localStorage.setItem(LOCAL_STORAGE_REGISTERED_USERS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Could not persist registered account locally:', e);
  }
  // Automatically persist every stored account to the database (Firestore + Server)
  try {
    firebaseService.saveUserAccountToDatabase(record).catch(() => {});
  } catch {}
}

export const firebaseService = {
  // Save active session locally for instant offline/reloads
  saveSession(user: UserProfile | null): void {
    try {
      if (user) {
        const isAllowedAdmin = isAuthorizedAdminEmail(user.email);
        const sanitizedUser: UserProfile = {
          ...user,
          role: isAllowedAdmin ? 'admin' : 'vip_member',
          tier: isAllowedAdmin ? 'Bóveda Diamante' : (user.tier === 'Bóveda Diamante' ? 'Acceso VIP' : user.tier),
        };
        localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(sanitizedUser));
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

  // Helper para sanitizar un registro de cuenta antes de enviarlo a Firestore
  sanitizeUserRecordForFirestore(record: RegisteredAccountRecord): Record<string, any> {
    const prof = record.profile || ({} as UserProfile);
    const email = (record.email || prof.email || '').toLowerCase().trim();
    const isAdmin = isAuthorizedAdminEmail(email);
    const uid = prof.uid || generateUniqueUserId(isAdmin ? 'admin' : 'usr');

    const clean: Record<string, any> = {
      uid: String(uid),
      email: String(email),
      password: String(record.password || 'password123'),
      registeredAt: String(record.registeredAt || new Date().toISOString()),
      displayName: String(prof.displayName || email.split('@')[0] || 'Usuario'),
      role: isAdmin ? 'admin' : 'vip_member',
      tier: isAdmin ? 'Bóveda Diamante' : (prof.tier === 'Bóveda Diamante' ? 'Acceso VIP' : (prof.tier || 'Invitado')),
      avatarUrl: prof.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uid)}`,
      joinedAt: prof.joinedAt || new Date().toISOString().split('T')[0],
      bio: prof.bio || null,
      phone: prof.phone || null,
      customStatus: prof.customStatus || null,
      instagram: prof.instagram || null,
      membershipPlan: prof.membershipPlan || null,
      membershipStatus: prof.membershipStatus || 'none',
      subscribedAt: prof.subscribedAt || null,
      membershipExpiresAt: prof.membershipExpiresAt || null,
      lastPaymentAmount: typeof prof.lastPaymentAmount === 'number' ? prof.lastPaymentAmount : null,
    };

    Object.keys(clean).forEach((k) => {
      if (clean[k] === undefined) {
        delete clean[k];
      }
    });

    return clean;
  },

  // Guardar cuenta de usuario en Firestore mediante REST API (respaldo directo garantizado)
  async saveUserToFirestoreREST(record: RegisteredAccountRecord): Promise<boolean> {
    try {
      const clean = this.sanitizeUserRecordForFirestore(record);
      if (!clean.uid || !clean.email) return false;

      const fields: Record<string, any> = {};
      for (const [key, value] of Object.entries(clean)) {
        if (value === undefined || value === null) continue;
        if (typeof value === 'string') {
          fields[key] = { stringValue: value };
        } else if (typeof value === 'number') {
          fields[key] = { integerValue: String(Math.round(value)) };
        } else if (typeof value === 'boolean') {
          fields[key] = { booleanValue: value };
        }
      }
      fields.updatedAt = { stringValue: new Date().toISOString() };

      const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${encodeURIComponent(clean.uid)}?key=${firebaseConfig.apiKey}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Firestore REST user write error:', e);
      return false;
    }
  },

  // Guardar una cuenta registrada en la Base de Datos (Firestore Web SDK + Firestore REST + Servidor Central)
  async saveUserAccountToDatabase(record: RegisteredAccountRecord): Promise<boolean> {
    if (!record || (!record.email && !record.profile?.email)) return false;

    const emailKey = (record.email || record.profile.email).toLowerCase().trim();
    const isAdmin = isAuthorizedAdminEmail(emailKey);
    const uid = record.profile?.uid || generateUniqueUserId(isAdmin ? 'admin' : 'usr');

    const normalizedRecord: RegisteredAccountRecord = {
      email: emailKey,
      password: record.password || 'password123',
      registeredAt: record.registeredAt || new Date().toISOString(),
      profile: {
        ...record.profile,
        uid,
        email: emailKey,
        role: isAdmin ? 'admin' : 'vip_member',
        tier: isAdmin
          ? 'Bóveda Diamante'
          : record.profile?.tier === 'Bóveda Diamante'
          ? 'Acceso VIP'
          : record.profile?.tier || 'Invitado',
      },
    };

    // 1. Asegurar persistencia en localStorage
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_REGISTERED_USERS_KEY);
      const currentAccounts = raw ? JSON.parse(raw) : {};
      currentAccounts[emailKey] = normalizedRecord;
      localStorage.setItem(LOCAL_STORAGE_REGISTERED_USERS_KEY, JSON.stringify(currentAccounts));
    } catch {}

    let saved = false;

    // 2. Guardar en servidor central (/api/vault/users -> server_data/users.json + Firestore REST)
    try {
      const res = await fetch('/api/vault/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedRecord),
      });
      if (res.ok) saved = true;
    } catch (e) {
      console.warn('Server /api/vault/users save fallback:', e);
    }

    // 3. Guardar en Firestore mediante Web SDK
    try {
      const userDocRef = doc(db, 'users', uid);
      const cleanData = this.sanitizeUserRecordForFirestore(normalizedRecord);
      await setDoc(
        userDocRef,
        {
          ...cleanData,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      saved = true;
    } catch (sdkErr) {
      // 4. Respaldo directo con Firestore REST API si el SDK falla
      const restOk = await this.saveUserToFirestoreREST(normalizedRecord);
      if (restOk) saved = true;
    }

    return saved;
  },

  // Obtener todas las cuentas registradas desde la Base de Datos (Servidor + Firestore Web SDK + Firestore REST)
  async fetchUsersFromDatabase(): Promise<Record<string, RegisteredAccountRecord>> {
    const dbAccounts: Record<string, RegisteredAccountRecord> = {};

    const mergeRecord = (rec: RegisteredAccountRecord) => {
      if (!rec || (!rec.email && !rec.profile?.email)) return;
      const emailKey = (rec.email || rec.profile.email).toLowerCase().trim();
      if (!emailKey) return;
      const isAdmin = isAuthorizedAdminEmail(emailKey);
      const existing = dbAccounts[emailKey];
      dbAccounts[emailKey] = {
        email: emailKey,
        password:
          rec.password && rec.password !== 'password123'
            ? rec.password
            : existing?.password || rec.password || 'password123',
        registeredAt: rec.registeredAt || existing?.registeredAt || new Date().toISOString(),
        profile: {
          ...(existing?.profile || {}),
          ...(rec.profile || {}),
          email: emailKey,
          role: isAdmin ? 'admin' : 'vip_member',
          tier: isAdmin
            ? 'Bóveda Diamante'
            : rec.profile?.tier === 'Bóveda Diamante'
            ? 'Acceso VIP'
            : rec.profile?.tier || existing?.profile?.tier || 'Invitado',
        },
      };
    };

    // 1. Consultar Servidor Central (/api/vault/users)
    try {
      const res = await fetch('/api/vault/users');
      if (res.ok) {
        const json = await res.json();
        if (json && json.accounts && typeof json.accounts === 'object') {
          for (const rec of Object.values(json.accounts) as RegisteredAccountRecord[]) {
            mergeRecord(rec);
          }
        }
      }
    } catch (e) {}

    // 2. Consultar colección 'users' en Firestore vía Web SDK
    try {
      const colRef = collection(db, 'users');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const email = (data.email || '').toLowerCase().trim();
          if (!email) return;
          const uid = data.uid || docSnap.id;
          const isAdmin = isAuthorizedAdminEmail(email);
          mergeRecord({
            email,
            password: data.password || 'password123',
            registeredAt: data.registeredAt || new Date().toISOString(),
            profile: {
              uid,
              email,
              displayName: data.displayName || email.split('@')[0] || 'Usuario',
              role: isAdmin ? 'admin' : 'vip_member',
              tier: isAdmin ? 'Bóveda Diamante' : (data.tier === 'Bóveda Diamante' ? 'Acceso VIP' : (data.tier || 'Invitado')),
              avatarUrl: data.avatarUrl || undefined,
              joinedAt: data.joinedAt || new Date().toISOString().split('T')[0],
              bio: data.bio || undefined,
              phone: data.phone || undefined,
              customStatus: data.customStatus || undefined,
              instagram: data.instagram || undefined,
              membershipPlan: data.membershipPlan || undefined,
              membershipStatus: data.membershipStatus || 'none',
              subscribedAt: data.subscribedAt || undefined,
              membershipExpiresAt: data.membershipExpiresAt || undefined,
              lastPaymentAmount: typeof data.lastPaymentAmount === 'number' ? data.lastPaymentAmount : undefined,
            },
          });
        });
      }
    } catch (sdkErr) {
      // 3. Respaldo vía Firestore REST API
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users?key=${firebaseConfig.apiKey}&pageSize=300`;
        const res = await fetch(url);
        if (res.ok) {
          const data: any = await res.json();
          if (data && Array.isArray(data.documents)) {
            for (const docSnap of data.documents) {
              const fields = docSnap.fields || {};
              const docId = docSnap.name.split('/').pop() || '';
              const uid = fields.uid?.stringValue || docId;
              const email = (fields.email?.stringValue || '').toLowerCase().trim();
              if (!email) continue;
              const isAdmin = isAuthorizedAdminEmail(email);
              mergeRecord({
                email,
                password: fields.password?.stringValue || 'password123',
                registeredAt: fields.registeredAt?.stringValue || new Date().toISOString(),
                profile: {
                  uid,
                  email,
                  displayName: fields.displayName?.stringValue || email.split('@')[0] || 'Usuario',
                  role: isAdmin ? 'admin' : 'vip_member',
                  tier: isAdmin ? 'Bóveda Diamante' : (fields.tier?.stringValue === 'Bóveda Diamante' ? 'Acceso VIP' : (fields.tier?.stringValue || 'Invitado')),
                  avatarUrl: fields.avatarUrl?.stringValue || undefined,
                  joinedAt: fields.joinedAt?.stringValue || new Date().toISOString().split('T')[0],
                  bio: fields.bio?.stringValue || undefined,
                  phone: fields.phone?.stringValue || undefined,
                  customStatus: fields.customStatus?.stringValue || undefined,
                  instagram: fields.instagram?.stringValue || undefined,
                  membershipPlan: (fields.membershipPlan?.stringValue as any) || undefined,
                  membershipStatus: (fields.membershipStatus?.stringValue as any) || 'none',
                  subscribedAt: fields.subscribedAt?.stringValue || undefined,
                  membershipExpiresAt: fields.membershipExpiresAt?.stringValue || undefined,
                  lastPaymentAmount: fields.lastPaymentAmount?.integerValue ? Number(fields.lastPaymentAmount.integerValue) : undefined,
                },
              });
            }
          }
        }
      } catch {}
    }

    return dbAccounts;
  },

  // Sincronizar TODAS las cuentas registradas (existentes en el dispositivo + sesión actual + base de datos)
  async syncAllRegisteredAccountsToDatabase(): Promise<Record<string, RegisteredAccountRecord>> {
    const localAccounts = getStoredRegisteredAccounts();

    // Asegurar que si hay una sesión activa en localStorage, también esté incluida en las cuentas registradas
    try {
      const activeSession = this.getLocalSession();
      if (activeSession && activeSession.email) {
        const sessionEmail = activeSession.email.toLowerCase().trim();
        if (!localAccounts[sessionEmail]) {
          localAccounts[sessionEmail] = {
            email: sessionEmail,
            password: isAuthorizedAdminEmail(sessionEmail) ? ADMIN_SECURITY_KEY : 'password123',
            registeredAt: new Date().toISOString(),
            profile: activeSession,
          };
        } else {
          localAccounts[sessionEmail].profile = {
            ...localAccounts[sessionEmail].profile,
            ...activeSession,
          };
        }
      }
    } catch {}

    // 1. Enviar todas las cuentas locales al servidor central (/api/vault/users/sync)
    try {
      const res = await fetch('/api/vault/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: localAccounts }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.accounts && typeof json.accounts === 'object') {
          for (const [emailKey, serverRec] of Object.entries(json.accounts) as [string, RegisteredAccountRecord][]) {
            const existing = localAccounts[emailKey];
            if (!existing) {
              localAccounts[emailKey] = serverRec;
            } else {
              localAccounts[emailKey] = {
                ...serverRec,
                ...existing,
                password:
                  existing.password && existing.password !== 'password123'
                    ? existing.password
                    : serverRec.password || existing.password || 'password123',
                profile: {
                  ...(serverRec.profile || {}),
                  ...(existing.profile || {}),
                },
              };
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not batch sync users with server:', e);
    }

    // 2. Traer también cualquier cuenta directamente desde Firestore y fusionar
    try {
      const remoteAccounts = await this.fetchUsersFromDatabase();
      for (const [emailKey, remoteRec] of Object.entries(remoteAccounts)) {
        const existing = localAccounts[emailKey];
        if (!existing) {
          localAccounts[emailKey] = remoteRec;
        } else {
          localAccounts[emailKey] = {
            ...remoteRec,
            ...existing,
            password:
              existing.password && existing.password !== 'password123'
                ? existing.password
                : remoteRec.password || existing.password || 'password123',
            profile: {
              ...(remoteRec.profile || {}),
              ...(existing.profile || {}),
            },
          };
        }
      }
    } catch {}

    // 3. Guardar el mapa completo fusionado en localStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_REGISTERED_USERS_KEY, JSON.stringify(localAccounts));
    } catch {}

    // 4. Asegurar que cada cuenta esté guardada en Firestore (Web SDK + REST fallback)
    for (const record of Object.values(localAccounts)) {
      try {
        const uid = record.profile?.uid;
        if (uid) {
          const userDocRef = doc(db, 'users', uid);
          const cleanData = this.sanitizeUserRecordForFirestore(record);
          await setDoc(userDocRef, { ...cleanData, updatedAt: serverTimestamp() }, { merge: true }).catch(async () => {
            await this.saveUserToFirestoreREST(record);
          });
        }
      } catch {}
    }

    return localAccounts;
  },

  // Listener en tiempo real para cuentas de usuarios en Firestore
  onUsersSnapshot(callback: (accounts: Record<string, RegisteredAccountRecord>) => void) {
    try {
      const colRef = collection(db, 'users');
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const currentAccounts = getStoredRegisteredAccounts();
            let updated = false;

            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              const email = (data.email || '').toLowerCase().trim();
              if (!email) return;
              const uid = data.uid || docSnap.id;
              const isAdmin = isAuthorizedAdminEmail(email);
              const existing = currentAccounts[email];

              const isPurchasedLocal = localStorage.getItem(`vault_purchased_membership_${uid}`) === 'true';

              const mergedProfile: UserProfile = {
                ...(existing?.profile || {}),
                uid,
                email,
                displayName: data.displayName || existing?.profile?.displayName || email.split('@')[0] || 'Usuario',
                role: isAdmin ? 'admin' : 'vip_member',
                tier: isAdmin
                  ? 'Bóveda Diamante'
                  : isPurchasedLocal && data.membershipStatus === 'active'
                  ? 'Acceso VIP'
                  : existing?.profile?.tier === 'Bóveda Diamante'
                  ? 'Invitado'
                  : existing?.profile?.tier || 'Invitado',
                avatarUrl: data.avatarUrl || existing?.profile?.avatarUrl,
                joinedAt: data.joinedAt || existing?.profile?.joinedAt || new Date().toISOString().split('T')[0],
                bio: data.bio ?? existing?.profile?.bio,
                phone: data.phone ?? existing?.profile?.phone,
                customStatus: data.customStatus ?? existing?.profile?.customStatus,
                instagram: data.instagram ?? existing?.profile?.instagram,
                membershipPlan: isPurchasedLocal ? (data.membershipPlan ?? existing?.profile?.membershipPlan) : undefined,
                membershipStatus: isPurchasedLocal ? (data.membershipStatus ?? existing?.profile?.membershipStatus ?? 'none') : 'none',
                subscribedAt: isPurchasedLocal ? (data.subscribedAt ?? existing?.profile?.subscribedAt) : undefined,
                membershipExpiresAt: isPurchasedLocal ? (data.membershipExpiresAt ?? existing?.profile?.membershipExpiresAt) : undefined,
                lastPaymentAmount: isPurchasedLocal ? (data.lastPaymentAmount ?? existing?.profile?.lastPaymentAmount) : undefined,
              };

              currentAccounts[email] = {
                email,
                password:
                  existing?.password && existing.password !== 'password123'
                    ? existing.password
                    : data.password || existing?.password || 'password123',
                registeredAt: existing?.registeredAt || data.registeredAt || new Date().toISOString(),
                profile: mergedProfile,
              };
              updated = true;
            });

            if (updated) {
              try {
                localStorage.setItem(LOCAL_STORAGE_REGISTERED_USERS_KEY, JSON.stringify(currentAccounts));
              } catch {}
              callback(currentAccounts);
            }
          }
        },
        (err) => {
          console.warn('Firestore users onSnapshot warning:', err);
        }
      );
    } catch (err) {
      return () => {};
    }
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
        await this.saveUserAccountToDatabase(accounts[matchedKey]);
      } else if (emailKey) {
        // Si no existía, crear la entrada para este usuario y guardarla en la base de datos
        const newRecord: RegisteredAccountRecord = {
          email: emailKey,
          password: 'password123',
          profile: { ...profile },
          registeredAt: new Date().toISOString(),
        };
        accounts[emailKey] = newRecord;
        localStorage.setItem(LOCAL_STORAGE_REGISTERED_USERS_KEY, JSON.stringify(accounts));
        await this.saveUserAccountToDatabase(newRecord);
      }
    } catch (e) {
      console.warn('Local account store update error:', e);
    }

    // Notificar reactivamente a la UI
    window.dispatchEvent(new CustomEvent('vault_profile_updated', { detail: { profile } }));
  },

  // Activar o mejorar la membresía de un usuario por su UID o Email con fecha exacta y real de inicio y vencimiento
  upgradeUserMembershipByUidOrEmail(
    uid: string, 
    email?: string, 
    plan: MembershipPlanType = 'monthly',
    customStartDateIso?: string
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

    const startD = customStartDateIso ? new Date(customStartDateIso) : new Date();
    const validStartD = isNaN(startD.getTime()) ? new Date() : startD;
    const subscribedAtIso = validStartD.toISOString();
    const expiresAtIso = new Date(validStartD.getTime() + (plan === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString();

    let updatedProf: UserProfile | null = null;

    if (foundKey && accounts[foundKey]) {
      updatedProf = {
        ...accounts[foundKey].profile,
        membershipPlan: plan,
        membershipStatus: 'active',
        tier: accounts[foundKey].profile.role === 'admin' ? 'Bóveda Diamante' : 'Acceso VIP',
        subscribedAt: subscribedAtIso,
        membershipExpiresAt: expiresAtIso,
        lastPaymentAmount: plan === 'annual' ? 12 : 1,
      };
      accounts[foundKey].profile = updatedProf;
      localStorage.setItem(LOCAL_STORAGE_REGISTERED_USERS_KEY, JSON.stringify(accounts));
    } else if (email || uid) {
      const normalizedEmail = (email || `${uid}@vault.user`).toLowerCase().trim();
      updatedProf = {
        uid: uid || generateUniqueUserId('usr'),
        email: normalizedEmail,
        displayName: normalizedEmail.split('@')[0] || 'Miembro VIP',
        role: 'vip_member',
        tier: 'Acceso VIP',
        joinedAt: validStartD.toISOString().split('T')[0],
        membershipPlan: plan,
        membershipStatus: 'active',
        subscribedAt: subscribedAtIso,
        membershipExpiresAt: expiresAtIso,
        lastPaymentAmount: plan === 'annual' ? 12 : 1,
      };
      accounts[normalizedEmail] = {
        email: normalizedEmail,
        password: 'password123',
        profile: updatedProf,
        registeredAt: subscribedAtIso,
      };
      localStorage.setItem(LOCAL_STORAGE_REGISTERED_USERS_KEY, JSON.stringify(accounts));
    }

    if (updatedProf) {
      try {
        localStorage.removeItem(`vault_cancelled_at_${updatedProf.uid}`);
        localStorage.setItem(`vault_purchased_membership_${updatedProf.uid}`, 'true');
      } catch {}

      const currentSession = this.getLocalSession();
      if (
        currentSession &&
        (currentSession.uid === uid ||
          (email && currentSession.email.toLowerCase() === email.toLowerCase().trim()))
      ) {
        this.saveSession(updatedProf);
        window.dispatchEvent(new CustomEvent('vault_profile_updated', { detail: { profile: updatedProf } }));
      }

      // Persistir también en la Base de Datos (Firestore + Servidor Central)
      const targetEmail = (email || updatedProf.email || '').toLowerCase().trim();
      const targetRecord = accounts[targetEmail] || {
        email: targetEmail,
        password: 'password123',
        profile: updatedProf,
        registeredAt: subscribedAtIso,
      };
      this.saveUserAccountToDatabase(targetRecord).catch(() => {});
    }

    return updatedProf;
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
      try {
        localStorage.removeItem(`vault_purchased_membership_${accounts[foundKey].profile.uid}`);
      } catch {}
      const updatedProf: UserProfile = {
        ...accounts[foundKey].profile,
        membershipPlan: undefined,
        membershipStatus: 'none',
        tier: isUserAdmin ? 'Bóveda Diamante' : 'Invitado',
        subscribedAt: undefined,
        membershipExpiresAt: undefined,
        customStatus: reason ? `Membresía no aprobada: ${reason}` : undefined,
      };
      accounts[foundKey].profile = updatedProf;
      localStorage.setItem(LOCAL_STORAGE_REGISTERED_USERS_KEY, JSON.stringify(accounts));
      this.saveUserAccountToDatabase(accounts[foundKey]).catch(() => {});

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
      // Ejecutar registro de cuentas primero para aplicar migración de fechas reales si corresponde
      const accounts = getStoredRegisteredAccounts();
      const stored = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (stored) {
        const user = JSON.parse(stored) as UserProfile;
        if (user && typeof user === 'object') {
          let sessionChanged = false;
          const isAllowedAdmin = isAuthorizedAdminEmail(user.email);
          if (!user.uid) {
            user.uid = generateUniqueUserId(isAllowedAdmin ? 'admin' : 'usr');
            sessionChanged = true;
          }
          if (isAllowedAdmin && user.role !== 'admin') {
            user.role = 'admin';
            user.tier = 'Bóveda Diamante';
            sessionChanged = true;
          } else if (!isAllowedAdmin && user.role === 'admin') {
            user.role = 'vip_member';
            if (user.tier === 'Bóveda Diamante') {
              user.tier = 'Acceso VIP';
            }
            sessionChanged = true;
          }
          let isExplicitlyPurchased = false;
          try {
            isExplicitlyPurchased = localStorage.getItem(`vault_purchased_membership_${user.uid}`) === 'true';
          } catch {}
          if (!isExplicitlyPurchased && (user.membershipPlan || user.membershipStatus === 'active')) {
            user.membershipPlan = undefined;
            user.membershipStatus = 'none';
            user.subscribedAt = undefined;
            user.membershipExpiresAt = undefined;
            if (user.role !== 'admin') {
              user.tier = 'Invitado';
            }
            sessionChanged = true;
          }
          if (sessionChanged) {
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
  async mapFirebaseUserToProfile(fbUser: FirebaseUser): Promise<UserProfile> {
    const email = fbUser.email || '';
    const isAdmin = isAuthorizedAdminEmail(email);
    const userDocRef = doc(db, 'users', fbUser.uid);

    let tier: 'Bóveda Diamante' | 'Acceso VIP' | 'Invitado' = isAdmin ? 'Bóveda Diamante' : 'Invitado';
    let displayName = fbUser.displayName || (email.split('@')[0] ? email.split('@')[0] : 'Usuario');
    const nowIso = new Date().toISOString();

    const profile: UserProfile = {
      uid: fbUser.uid,
      email: fbUser.email || 'user@vault.firebase',
      displayName,
      role: isAdmin ? 'admin' : 'vip_member',
      avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
      joinedAt: nowIso.split('T')[0],
      tier,
      membershipStatus: 'none',
    };

    // Check local profile first to retain customizations & exact real membership dates
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
      if (localMatch.profile.subscribedAt) profile.subscribedAt = localMatch.profile.subscribedAt;
      if (localMatch.profile.membershipExpiresAt) profile.membershipExpiresAt = localMatch.profile.membershipExpiresAt;
      if (localMatch.profile.lastPaymentAmount) profile.lastPaymentAmount = localMatch.profile.lastPaymentAmount;
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
          const isPurchased = localStorage.getItem(`vault_purchased_membership_${fbUser.uid}`) === 'true';
          if (data.displayName) profile.displayName = data.displayName;
          if (data.avatarUrl) profile.avatarUrl = data.avatarUrl;
          if (data.bio) profile.bio = data.bio;
          if (data.phone) profile.phone = data.phone;
          if (data.customStatus) profile.customStatus = data.customStatus;
          if (data.instagram) profile.instagram = data.instagram;
          if (isPurchased) {
            if (data.tier) profile.tier = isAdmin ? 'Bóveda Diamante' : (data.tier === 'Bóveda Diamante' ? 'Acceso VIP' : data.tier);
            if (data.membershipPlan) profile.membershipPlan = data.membershipPlan;
            if (data.membershipStatus) profile.membershipStatus = data.membershipStatus;
            if (data.membershipExpiresAt) profile.membershipExpiresAt = data.membershipExpiresAt;
            if (data.subscribedAt) profile.subscribedAt = data.subscribedAt;
            if (data.lastPaymentAmount) profile.lastPaymentAmount = data.lastPaymentAmount;
          }
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
    storeRegisteredAccount({
      email: (fbUser.email || profile.email).toLowerCase().trim(),
      password: localMatch?.password || 'password123',
      profile,
      registeredAt: localMatch?.registeredAt || nowIso,
    });
    this.saveSession(profile);
    return profile;
  },

  // Firebase Email/Password Login (Only allows login if the user has already registered in local or remote database)
  async signInWithEmail(email: string, password: string): Promise<UserProfile> {
    const normalizedEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();

    try {
      const cred = await signInWithEmailAndPassword(auth, normalizedEmail, cleanPassword);
      const profile = await this.mapFirebaseUserToProfile(cred.user);
      await this.saveUserAccountToDatabase({
        email: normalizedEmail,
        password: cleanPassword,
        profile,
        registeredAt: new Date().toISOString(),
      });
      return profile;
    } catch (err: any) {
      let registeredAccounts = getStoredRegisteredAccounts();
      let existingRecord = registeredAccounts[normalizedEmail];

      // Si no está en localStorage, buscar en la base de datos (Firestore + Servidor)
      if (!existingRecord) {
        try {
          registeredAccounts = await this.syncAllRegisteredAccountsToDatabase();
          existingRecord = registeredAccounts[normalizedEmail];
        } catch {}
      }

      if (existingRecord) {
        if (existingRecord.password === cleanPassword) {
          const isAllowedAdmin = isAuthorizedAdminEmail(normalizedEmail);
          const safeProfile: UserProfile = {
            ...existingRecord.profile,
            role: isAllowedAdmin ? 'admin' : 'vip_member',
          };
          await this.saveUserAccountToDatabase({
            ...existingRecord,
            profile: safeProfile,
          });
          this.saveSession(safeProfile);
          return safeProfile;
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
        else if (normalizedEmail.includes('creador')) uniqueAdminUid = 'admin_creador_ffx';

        const adminUser: UserProfile = {
          ...INITIAL_ADMIN_USER,
          uid: uniqueAdminUid,
          email: normalizedEmail,
          displayName: `Administrador (${normalizedEmail.split('@')[0]})`,
          role: 'admin',
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

    // Check local registry and remote database first
    let registeredAccounts = getStoredRegisteredAccounts();
    if (!registeredAccounts[normalizedEmail]) {
      try {
        const dbAccounts = await this.fetchUsersFromDatabase();
        if (dbAccounts[normalizedEmail]) {
          registeredAccounts[normalizedEmail] = dbAccounts[normalizedEmail];
        }
      } catch {}
    }
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
      displayName: displayName?.trim() || normalizedEmail.split('@')[0] || (isAdmin ? 'Administrador' : 'Usuario'),
      role: isAdmin ? 'admin' : 'vip_member',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uniqueUid)}`,
      tier: isAdmin ? 'Bóveda Diamante' : 'Invitado',
      membershipStatus: 'none',
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

    const accountRecord: RegisteredAccountRecord = {
      email: normalizedEmail,
      password: cleanPassword,
      profile: newProfile,
      registeredAt: new Date().toISOString(),
    };

    // Persist in local registry + Database (Firestore Web SDK + Firestore REST + Server Database)
    storeRegisteredAccount(accountRecord);
    await this.saveUserAccountToDatabase(accountRecord);

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
      await this.saveUserAccountToDatabase({
        email: currentSession.email.toLowerCase().trim(),
        password: ADMIN_SECURITY_KEY,
        profile: currentSession,
        registeredAt: new Date().toISOString(),
      });
      return currentSession;
    }
    const accounts = getStoredRegisteredAccounts();
    const adminRecord = accounts[INITIAL_ADMIN_USER.email.toLowerCase()];
    if (adminRecord && adminRecord.profile) {
      await this.saveUserAccountToDatabase(adminRecord);
      this.saveSession(adminRecord.profile);
      return adminRecord.profile;
    }
    const adminUser = { ...INITIAL_ADMIN_USER };
    await this.saveUserAccountToDatabase({
      email: adminUser.email.toLowerCase().trim(),
      password: ADMIN_SECURITY_KEY,
      profile: adminUser,
      registeredAt: '2025-01-01T00:00:00.000Z',
    });
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

  // Real-time listener for Maintenance Mode in Firestore
  onMaintenanceSnapshot(callback: (maint: { isMaintenance: boolean; message: string; updatedAt?: string }) => void) {
    try {
      const docRef = doc(db, 'system_config', 'maintenance');
      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            callback({
              isMaintenance: Boolean(data.isMaintenance),
              message: String(data.message || ''),
              updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
            });
          }
        },
        (err) => {
          console.warn('Firestore maintenance onSnapshot warning:', err);
        }
      );
    } catch (err) {
      console.warn('Could not attach Firestore maintenance listener:', err);
      return () => {};
    }
  },

  // Save Maintenance Mode state to Firestore (Web SDK + REST fallback)
  async saveMaintenance(isMaintenance: boolean, message: string): Promise<boolean> {
    const cleanMessage = String(message || '').trim();
    const payload = {
      isMaintenance: Boolean(isMaintenance),
      message: cleanMessage,
      updatedAt: new Date().toISOString(),
    };

    // 1. Try Firestore Web SDK
    try {
      const docRef = doc(db, 'system_config', 'maintenance');
      await setDoc(docRef, { ...payload, serverTimestamp: serverTimestamp() }, { merge: true });
      return true;
    } catch (sdkErr) {
      console.warn('Web SDK saveMaintenance failed, trying REST:', sdkErr);
    }

    // 2. Try Firestore REST API fallback
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/system_config/maintenance?key=${firebaseConfig.apiKey}`;
      const fields = {
        isMaintenance: { booleanValue: Boolean(isMaintenance) },
        message: { stringValue: cleanMessage },
        updatedAt: { stringValue: payload.updatedAt },
      };
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      return res.ok;
    } catch (restErr) {
      console.warn('Firestore REST saveMaintenance error:', restErr);
      return false;
    }
  },

  // Fetch Maintenance Mode state from Firestore (SDK + REST fallback)
  async fetchMaintenance(): Promise<{ isMaintenance: boolean; message: string } | null> {
    try {
      const docRef = doc(db, 'system_config', 'maintenance');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          isMaintenance: Boolean(data.isMaintenance),
          message: String(data.message || ''),
        };
      }
    } catch (e) {
      console.warn('Web SDK fetchMaintenance failed, trying REST:', e);
    }

    try {
      const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/system_config/maintenance?key=${firebaseConfig.apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        if (data && data.fields) {
          return {
            isMaintenance: Boolean(data.fields.isMaintenance?.booleanValue),
            message: String(data.fields.message?.stringValue || ''),
          };
        }
      }
    } catch (restErr) {
      console.warn('Firestore REST fetchMaintenance error:', restErr);
    }

    return null;
  },
};
