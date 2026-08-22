import { createClient, SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { VaultItem, UserProfile } from '../types';
import { INITIAL_VAULT_ITEMS, isAuthorizedAdminEmail, isAuthorizedAdminKey, ADMIN_AUTHORIZED_EMAIL, ADMIN_SECURITY_KEY } from '../data/initialVaultData';

// Vite environment accessor safe for TypeScript
const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('http')
);

// Initialize client only if variables are properly provided
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database & Authentication helper functions with automatic fallback
export const supabaseService = {
  // --- AUTHENTICATION METHODS ---
  async getCurrentUser(): Promise<UserProfile | null> {
    if (!supabase) return null;

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session || !session.user) return null;

      return this.mapSupabaseUserToProfile(session.user);
    } catch (err) {
      console.warn('Error fetching current Supabase session:', err);
      return null;
    }
  },

  async signUp(
    email: string, 
    password: string, 
    displayName?: string, 
    adminKey?: string
  ): Promise<{ user: UserProfile | null; error: string | null }> {
    const wantsAdmin = Boolean(adminKey && adminKey.trim().length > 0);
    if (wantsAdmin && !isAuthorizedAdminKey(adminKey)) {
      return { user: null, error: 'Clave de Administrador incorrecta. Se requiere la Key correcta.' };
    }

    const isAdmin = wantsAdmin && isAuthorizedAdminKey(adminKey);

    if (!supabase) {
      return {
        user: {
          uid: isAdmin ? 'admin_master_astro' : `user_${Date.now()}`,
          email,
          displayName: displayName || (isAdmin ? 'Administrador Root' : 'Miembro VIP'),
          role: isAdmin ? 'admin' : 'vip_member',
          tier: isAdmin ? 'Bóveda Diamante' : 'Acceso VIP',
          joinedAt: new Date().toISOString().split('T')[0],
        },
        error: null,
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || (isAdmin ? 'Administrador' : 'Miembro VIP'),
            is_admin: isAdmin,
          },
        },
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        const profile = this.mapSupabaseUserToProfile(data.user, displayName, isAdmin);
        return { user: profile, error: null };
      }

      return { user: null, error: 'No se pudo crear la cuenta' };
    } catch (err: any) {
      return { user: null, error: err.message || 'Error al registrarse con Supabase' };
    }
  },

  async signIn(
    email: string, 
    password: string, 
    adminKey?: string
  ): Promise<{ user: UserProfile | null; error: string | null }> {
    const wantsAdmin = Boolean(adminKey && adminKey.trim().length > 0);
    if (wantsAdmin && !isAuthorizedAdminKey(adminKey)) {
      return { user: null, error: 'Clave de Administrador incorrecta. Se requiere la Key correcta.' };
    }

    const isAdmin = wantsAdmin && isAuthorizedAdminKey(adminKey);

    if (!supabase) {
      const fallbackName = email ? email.split('@')[0] : 'Usuario';
      return {
        user: {
          uid: isAdmin ? 'admin_master_astro' : `user_${Date.now()}`,
          email,
          displayName: isAdmin ? 'Administrador Root' : `${fallbackName} (VIP)`,
          role: isAdmin ? 'admin' : 'vip_member',
          tier: isAdmin ? 'Bóveda Diamante' : 'Acceso VIP',
          joinedAt: new Date().toISOString().split('T')[0],
        },
        error: null,
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        const profile = this.mapSupabaseUserToProfile(data.user, undefined, isAdmin);
        return { user: profile, error: null };
      }

      return { user: null, error: 'Error al verificar credenciales' };
    } catch (err: any) {
      return { user: null, error: err.message || 'Error en autenticación' };
    }
  },

  async signOut(): Promise<void> {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Error signing out of Supabase:', err);
    }
  },

  mapSupabaseUserToProfile(sbUser: SupabaseAuthUser, overrideName?: string, forceAdmin?: boolean): UserProfile {
    const email = sbUser.email || '';
    const meta = sbUser.user_metadata || {};
    const isAdmin = forceAdmin !== undefined ? forceAdmin : Boolean(meta.is_admin);
    const name = overrideName || meta.display_name || meta.name || (isAdmin ? 'Administrador' : email.split('@')[0] || 'Miembro VIP');

    return {
      uid: sbUser.id,
      email,
      displayName: name,
      role: isAdmin ? 'admin' : 'vip_member',
      tier: isAdmin ? 'Bóveda Diamante' : 'Acceso VIP',
      joinedAt: sbUser.created_at ? new Date(sbUser.created_at).toISOString().split('T')[0] : '2026-08-22',
    };
  },

  // --- DATABASE METHODS ---
  async fetchVaultItems(): Promise<VaultItem[]> {
    if (!supabase) {
      return INITIAL_VAULT_ITEMS;
    }

    try {
      const { data, error } = await supabase
        .from('vault_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        if (error) console.warn('Supabase fetch notice (using defaults if empty):', error.message);
        return INITIAL_VAULT_ITEMS;
      }

      return data.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description || '',
        category: row.category || 'code',
        fileType: row.file_type || row.fileType || 'ZIP',
        downloadUrl: row.download_url || row.downloadUrl || 'https://example.com/vault-file.zip',
        fileSize: row.file_size || row.fileSize || '10 MB',
        coverImage: row.cover_image || row.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
        likesCount: Number(row.likes_count ?? row.likesCount ?? 0),
        likedBy: Array.isArray(row.liked_by) ? row.liked_by : (row.likedBy || []),
        createdAt: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '2026-08-22',
        comments: Array.isArray(row.comments) ? row.comments : [],
        isLockedForTier: Boolean(row.is_locked_for_tier ?? row.isLockedForTier),
        version: row.version || 'v1.0.0',
        author: row.author || {
          name: 'Bóveda Central',
          badge: 'ADMIN'
        }
      }));
    } catch (err) {
      console.warn('Error connecting to Supabase, fallback to initial items:', err);
      return INITIAL_VAULT_ITEMS;
    }
  },

  async insertVaultItem(item: VaultItem): Promise<boolean> {
    if (!supabase) return true;

    try {
      const { error } = await supabase.from('vault_items').insert([
        {
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          file_type: item.fileType,
          download_url: item.downloadUrl,
          file_size: item.fileSize,
          cover_image: item.coverImage,
          likes_count: item.likesCount,
          liked_by: item.likedBy,
          comments: item.comments || [],
          is_locked_for_tier: item.isLockedForTier || false,
          version: item.version || 'v1.0',
          author: item.author
        },
      ]);

      if (error) {
        console.error('Error inserting item to Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Failed to insert item to Supabase:', err);
      return false;
    }
  },

  async updateItemLikes(itemId: string, likesCount: number, likedBy: string[]): Promise<boolean> {
    if (!supabase) return true;

    try {
      const { error } = await supabase
        .from('vault_items')
        .update({
          likes_count: likesCount,
          liked_by: likedBy,
        })
        .eq('id', itemId);

      if (error) {
        console.error('Error updating likes in Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Failed to update likes in Supabase:', err);
      return false;
    }
  },

  async updateItemComments(itemId: string, comments: any[]): Promise<boolean> {
    if (!supabase) return true;

    try {
      const { error } = await supabase
        .from('vault_items')
        .update({ comments })
        .eq('id', itemId);

      if (error) {
        console.error('Error updating comments in Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Failed to update comments in Supabase:', err);
      return false;
    }
  }
};
