import { VaultItem, UserProfile } from '../types';

export const ADMIN_AUTHORIZED_EMAIL = 'astroarg02@gmail.com';

export const isAuthorizedAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_AUTHORIZED_EMAIL.toLowerCase();
};

export const INITIAL_ADMIN_USER: UserProfile = {
  uid: 'admin_master_astro',
  email: 'astroarg02@gmail.com',
  displayName: 'Administrador (astroarg02)',
  role: 'admin',
  joinedAt: '2025-01-01',
  tier: 'Bóveda Diamante',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
};

export const INITIAL_MEMBER_USER: UserProfile = {
  uid: 'vip_user_449',
  email: 'vip.member@privatehub.io',
  displayName: 'Alex Vance',
  role: 'vip_member',
  joinedAt: '2025-02-14',
  tier: 'Acceso VIP',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
};

export const INITIAL_VAULT_ITEMS: VaultItem[] = [];
