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

const STORAGE_SESSION_KEY = 'app66_active_session_v1';
const STORAGE_VAULT_ITEMS_KEY = 'app66_vault_items_v1';

// Database & Authentication helper functions with automatic fallback and persistent sessions
export const supabaseService = {
  // --- LOCAL PERSISTENCE HELPERS ---
  saveSession(user: UserProfile | null): void {
    try {
      if (user) {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    } catch (e) {
      console.warn('Could not write session to localStorage:', e);
    }
  },

  getLocalSession(): UserProfile | null {
    try {
      const stored = localStorage.getItem(STORAGE_SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.uid && parsed.role) {
          return parsed as UserProfile;
        }
      }
    } catch (e) {
      console.warn('Could not read session from localStorage:', e);
    }
    return null;
  },

  saveLocalVaultItems(items: VaultItem[]): void {
    try {
      localStorage.setItem(STORAGE_VAULT_ITEMS_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Could not save vault items to localStorage:', e);
    }
  },

  getLocalVaultItems(): VaultItem[] | null {
    try {
      const stored = localStorage.getItem(STORAGE_VAULT_ITEMS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as VaultItem[];
        }
      }
    } catch (e) {
      console.warn('Could not load vault items from localStorage:', e);
    }
    return null;
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    // 1. If Supabase is configured, check live session
    if (supabase) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!error && session && session.user) {
          const profile = this.mapSupabaseUserToProfile(session.user);
          this.saveSession(profile);
          return profile;
        }
      } catch (err) {
        console.warn('Error fetching current Supabase session:', err);
      }
    }

    // 2. Persistent fallback from local storage (keeps users logged in across page reloads/browser sessions)
    return this.getLocalSession();
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
      const user: UserProfile = {
        uid: isAdmin ? 'admin_master_astro' : `user_${Date.now()}`,
        email,
        displayName: displayName || (isAdmin ? 'Administrador Root' : 'Miembro VIP'),
        role: isAdmin ? 'admin' : 'vip_member',
        tier: isAdmin ? 'Bóveda Diamante' : 'Acceso VIP',
        joinedAt: new Date().toISOString().split('T')[0],
      };
      this.saveSession(user);
      return { user, error: null };
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
        this.saveSession(profile);
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
      const user: UserProfile = {
        uid: isAdmin ? 'admin_master_astro' : `user_${Date.now()}`,
        email,
        displayName: isAdmin ? 'Administrador Root' : `${fallbackName} (VIP)`,
        role: isAdmin ? 'admin' : 'vip_member',
        tier: isAdmin ? 'Bóveda Diamante' : 'Acceso VIP',
        joinedAt: new Date().toISOString().split('T')[0],
      };
      this.saveSession(user);
      return { user, error: null };
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
        this.saveSession(profile);
        return { user: profile, error: null };
      }

      return { user: null, error: 'Error al verificar credenciales' };
    } catch (err: any) {
      return { user: null, error: err.message || 'Error en autenticación' };
    }
  },

  async signOut(): Promise<void> {
    this.saveSession(null);
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
    // 1. Try fetching from Supabase if configured
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('vault_items')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mappedItems: VaultItem[] = data.map((row: any) => ({
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

          // Merge any locally created items that might not have reached Supabase
          const localItems = this.getLocalVaultItems() || [];
          const remoteIds = new Set(mappedItems.map(i => i.id));
          const unsyncedLocals = localItems.filter(i => !remoteIds.has(i.id));
          const allItems = [...unsyncedLocals, ...mappedItems];

          this.saveLocalVaultItems(allItems);
          return allItems;
        }
      } catch (err) {
        console.warn('Error connecting to Supabase, loading from persistent storage:', err);
      }
    }

    // 2. Load from persistent localStorage
    const localItems = this.getLocalVaultItems();
    if (localItems && localItems.length > 0) {
      return localItems;
    }

    // 3. Initial seed if storage is empty
    this.saveLocalVaultItems(INITIAL_VAULT_ITEMS);
    return INITIAL_VAULT_ITEMS;
  },

  async insertVaultItem(item: VaultItem): Promise<boolean> {
    // 1. Immediately persist to localStorage
    try {
      const currentItems = this.getLocalVaultItems() || INITIAL_VAULT_ITEMS;
      const updated = [item, ...currentItems.filter(i => i.id !== item.id)];
      this.saveLocalVaultItems(updated);
    } catch (e) {
      console.warn('Error persisting item locally:', e);
    }

    // 2. Sync to Supabase if configured
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
    // 1. Update in local storage
    try {
      const currentItems = this.getLocalVaultItems();
      if (currentItems) {
        const updated = currentItems.map(item => 
          item.id === itemId ? { ...item, likesCount, likedBy } : item
        );
        this.saveLocalVaultItems(updated);
      }
    } catch (e) {
      console.warn('Error updating likes locally:', e);
    }

    // 2. Update in Supabase
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
    // 1. Update in local storage
    try {
      const currentItems = this.getLocalVaultItems();
      if (currentItems) {
        const updated = currentItems.map(item => 
          item.id === itemId ? { ...item, comments } : item
        );
        this.saveLocalVaultItems(updated);
      }
    } catch (e) {
      console.warn('Error updating comments locally:', e);
    }

    // 2. Update in Supabase
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
