export type UserRole = 'admin' | 'vip_member';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  joinedAt: string;
  tier: 'Bóveda Diamante' | 'Acceso VIP' | 'Invitado';
}

export type ResourceCategory = 'video' | 'document' | 'audio' | 'preset' | 'code';

export interface VaultComment {
  id: string;
  userId: string;
  userDisplayName: string;
  userRole: UserRole;
  userTier: string;
  text: string;
  createdAt: string;
}

export interface VaultItem {
  id: string;
  title: string;
  description: string;
  category: ResourceCategory;
  fileType: string;
  fileSize: string;
  downloadUrl: string;
  coverImage: string;
  createdAt: string;
  likesCount: number;
  likedBy: string[]; // list of user UIDs
  comments: VaultComment[];
  isLockedForTier?: boolean;
  version?: string;
  author: {
    name: string;
    badge: string;
  };
}

export interface DartCodeFile {
  path: string;
  title: string;
  category: 'core' | 'auth' | 'vault' | 'membership' | 'admin' | 'config';
  description: string;
  code: string;
}

export type ThemeMode = 'dark' | 'light';

export type AppView = 'simulator' | 'code' | 'supabase' | 'guide';

export type BackendProvider = 'firebase' | 'supabase';

export interface SupabaseConfigState {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConnected: boolean;
}
