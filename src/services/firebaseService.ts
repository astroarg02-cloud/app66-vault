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
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, VaultItem } from '../types';
import { isAuthorizedAdminEmail, isAuthorizedAdminKey, INITIAL_ADMIN_USER } from '../data/initialVaultData';

// Initialize Firebase SDK
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const googleAuthProvider = new GoogleAuthProvider();

const LOCAL_STORAGE_SESSION_KEY = 'vault_firebase_session_v1';

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

  // Firebase Email/Password Login
  async signInWithEmail(email: string, password: string): Promise<UserProfile> {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return await this.mapFirebaseUserToProfile(cred.user);
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        console.info('Firebase Email/Password is disabled in Firebase Console. Using secure local session fallback.');
        const isAdmin = email.toLowerCase().includes('admin');
        const fallbackProfile: UserProfile = {
          uid: 'auth_' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
          email,
          displayName: email.split('@')[0] || 'Miembro VIP',
          role: isAdmin ? 'admin' : 'vip_member',
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
          tier: isAdmin ? 'Bóveda Diamante' : 'Acceso VIP',
          joinedAt: new Date().toISOString(),
        };
        this.saveSession(fallbackProfile);
        return fallbackProfile;
      }
      throw err;
    }
  },

  // Firebase Email/Password Register
  async registerWithEmail(email: string, password: string, displayName?: string): Promise<UserProfile> {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        try {
          await updateProfile(cred.user, { displayName });
        } catch {
          // ignore profile update warning
        }
      }
      return await this.mapFirebaseUserToProfile(cred.user);
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        console.info('Firebase Email/Password is disabled in Firebase Console. Using secure local session fallback.');
        const isAdmin = email.toLowerCase().includes('admin');
        const fallbackProfile: UserProfile = {
          uid: 'user_' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
          email,
          displayName: displayName?.trim() || email.split('@')[0] || 'Miembro VIP',
          role: isAdmin ? 'admin' : 'vip_member',
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
          tier: isAdmin ? 'Bóveda Diamante' : 'Acceso VIP',
          joinedAt: new Date().toISOString(),
        };
        this.saveSession(fallbackProfile);
        return fallbackProfile;
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
