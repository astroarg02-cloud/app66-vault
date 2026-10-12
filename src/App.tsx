import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_ADMIN_USER, INITIAL_MEMBER_USER, INITIAL_VAULT_ITEMS, INITIAL_VAULT_LISTS, ADMIN_SECURITY_KEY, isAuthorizedAdminEmail } from './data/initialVaultData';
import { VaultItem, UserProfile, VaultComment, VaultList } from './types';
import { AuthScreen } from './components/MobileSimulator/AuthScreen';
import { VaultScreen } from './components/MobileSimulator/VaultScreen';
import { VaultDetailModal } from './components/MobileSimulator/VaultDetailModal';
import { MembershipScreen } from './components/MobileSimulator/MembershipScreen';
import { ReceiptsScreen } from './components/MobileSimulator/ReceiptsScreen';
import { AdminApprovalsScreen } from './components/MobileSimulator/AdminApprovalsScreen';
import { ProfileScreen } from './components/MobileSimulator/ProfileScreen';
import { AdminUploadModal } from './components/MobileSimulator/AdminUploadModal';
import { AdminListModal } from './components/MobileSimulator/AdminListModal';
import { receiptService } from './services/receiptService';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import { AdminMaintenanceModal } from './components/AdminMaintenanceModal';
import { VerifiedBadge } from './components/VerifiedBadge';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { firebaseService, resolveApiUrl, safeFetchApi, safeFetchJson, isStandaloneApp, getRemoteServerBaseUrl } from './services/firebaseService';
import { supabaseService, isSupabaseConfigured } from './services/supabaseClient';
import { 
  FolderClosed, 
  Crown, 
  User, 
  Moon, 
  Sun, 
  LogOut, 
  ShieldCheck, 
  Database,
  Flame,
  Layers,
  Wrench,
  FileText,
  FileCheck,
  Settings
} from 'lucide-react';

// Helper to manage deleted list IDs in localStorage to prevent deleted lists from resurfacing
const getDeletedListIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem('vault_deleted_list_ids');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.map(String));
    }
  } catch (e) {}
  return new Set<string>();
};

const addDeletedListId = (id: string) => {
  try {
    const current = getDeletedListIds();
    current.add(id);
    localStorage.setItem('vault_deleted_list_ids', JSON.stringify(Array.from(current)));
  } catch (e) {}
};

const unmarkDeletedListId = (id: string) => {
  try {
    const current = getDeletedListIds();
    current.delete(id);
    localStorage.setItem('vault_deleted_list_ids', JSON.stringify(Array.from(current)));
  } catch (e) {}
};

function AppContent() {
  const [items, setItems] = useState<VaultItem[]>(() => {
    const local = supabaseService.getLocalVaultItems();
    return local && local.length > 0 ? local : INITIAL_VAULT_ITEMS;
  });

  const [lists, setLists] = useState<VaultList[]>(() => {
    try {
      const deletedIds = getDeletedListIds();
      const saved = localStorage.getItem('vault_lists_cache');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((l) => l && l.id && !deletedIds.has(l.id));
        }
      }
      return INITIAL_VAULT_LISTS.filter((l) => l && l.id && !deletedIds.has(l.id));
    } catch (e) {}
    return INITIAL_VAULT_LISTS;
  });

  const sanitizeUserRole = (user: UserProfile | null): UserProfile | null => {
    if (!user) return null;
    if (isAuthorizedAdminEmail(user.email)) {
      return {
        ...user,
        role: 'admin',
        tier: 'Bóveda Diamante',
      };
    }
    if (user.role === 'admin' || user.tier === 'Bóveda Diamante') {
      return {
        ...user,
        role: 'vip_member',
        tier: user.tier === 'Bóveda Diamante' ? 'Acceso VIP' : user.tier,
      };
    }
    return user;
  };

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => sanitizeUserRole(firebaseService.getLocalSession()));
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [currentTab, setCurrentTab] = useState<'vault' | 'membership' | 'receipts' | 'approvals' | 'profile'>('vault');
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(() => receiptService.getPendingCount());
  const [vaultTabMode, setVaultTabMode] = useState<'items' | 'collections'>(() => {
    const initialUser = sanitizeUserRole(firebaseService.getLocalSession());
    return initialUser?.role === 'admin' ? 'items' : 'collections';
  });
  const [selectedVaultListId, setSelectedVaultListId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [showAdminUpload, setShowAdminUpload] = useState(false);
  const [showAdminListModal, setShowAdminListModal] = useState(false);
  const [editingList, setEditingList] = useState<VaultList | null>(null);
  const [isMaintenanceActive, setIsMaintenanceActive] = useState<boolean>(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>(() => {
    try {
      const cached = localStorage.getItem('vault_maintenance_message');
      if (cached) return cached;
    } catch (e) {}
    return 'Estamos realizando labores de mantenimiento y optimización en la plataforma. Volveremos muy pronto.';
  });
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const { theme, toggleTheme, isDark } = useTheme();

  // Protective guard: only admins can access 'approvals' or the general 'Publicaciones' ('items' without selected collection) section
  useEffect(() => {
    const isAdmin = currentUser?.role === 'admin';
    if (currentTab === 'approvals' && !isAdmin) {
      setCurrentTab('vault');
    }
    if (!isAdmin && vaultTabMode === 'items' && !selectedVaultListId) {
      setVaultTabMode('collections');
    }
  }, [currentTab, currentUser, vaultTabMode, selectedVaultListId]);

  // Helper to merge incoming items with existing state preserving custom user uploads
  const mergeVaultItems = useCallback((incoming: VaultItem[]) => {
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    setItems((prev) => {
      const map = new Map<string, VaultItem>();
      incoming.forEach((it) => {
        if (it && it.id && !it.id.startsWith('res_00') && !it.id.startsWith('test-')) {
          map.set(it.id, it);
        }
      });
      // Keep any locally created item not yet returned from server
      prev.forEach((it) => {
        if (it && it.id && !it.id.startsWith('res_00') && !it.id.startsWith('test-') && !map.has(it.id)) {
          map.set(it.id, it);
        }
      });
      const merged = Array.from(map.values());
      supabaseService.saveLocalVaultItems(merged);
      return merged;
    });
  }, []);

  // Helper to merge lists with strict deleted lists exclusion
  const mergeVaultLists = useCallback((incoming: VaultList[], incomingDeletedIds?: string[]) => {
    if (!Array.isArray(incoming)) return;
    const deletedIds = getDeletedListIds();
    if (Array.isArray(incomingDeletedIds)) {
      incomingDeletedIds.forEach((id) => {
        if (id) deletedIds.add(String(id));
      });
      try {
        localStorage.setItem('vault_deleted_list_ids', JSON.stringify(Array.from(deletedIds)));
      } catch (e) {}
    }
    const activeIncoming = incoming.filter((l) => l && l.id && !deletedIds.has(l.id));

    setLists((prev) => {
      const map = new Map<string, VaultList>();
      // First populate with incoming active items
      activeIncoming.forEach((l) => {
        if (l && l.id && !deletedIds.has(l.id)) map.set(l.id, l);
      });
      // Merge with previous non-deleted items
      prev.forEach((l) => {
        if (l && l.id && !deletedIds.has(l.id) && !map.has(l.id)) {
          map.set(l.id, l);
        }
      });
      const merged = Array.from(map.values()).filter((l) => !deletedIds.has(l.id));
      try {
        localStorage.setItem('vault_lists_cache', JSON.stringify(merged));
      } catch (e) {}
      return merged;
    });
  }, []);

  // Check existing session and listen to Firebase auth & Firestore live items and lists
  useEffect(() => {
    const unsub = firebaseService.onAuthState((user) => {
      if (user) {
        const clean = sanitizeUserRole(user);
        setCurrentUser(clean);
        if (clean?.role !== 'admin') {
          setVaultTabMode('collections');
        }
      }
      setIsCheckingSession(false);
    });

    const handleProfileUpdated = (e: any) => {
      if (e?.detail?.profile) {
        setCurrentUser(sanitizeUserRole(e.detail.profile));
      }
    };
    window.addEventListener('vault_profile_updated', handleProfileUpdated);

    const handleReceiptsChanged = (e: any) => {
      setPendingApprovalsCount(receiptService.getPendingCount());
      const incomingReceipts = e?.detail?.receipts || receiptService.getAllReceipts();
      firebaseService.reconcileApprovedReceiptsWithUsers(incomingReceipts);
    };
    window.addEventListener('vault_receipts_changed', handleReceiptsChanged);

    // Real-time Firestore items listener
    const unsubFirestoreItems = firebaseService.onVaultItemsSnapshot((liveItems) => {
      if (liveItems && Array.isArray(liveItems) && liveItems.length > 0) {
        mergeVaultItems(liveItems);
      }
    });

    // Real-time Firestore lists listener
    const unsubFirestoreLists = firebaseService.onVaultListsSnapshot((liveLists, deletedIds) => {
      if (liveLists && Array.isArray(liveLists)) {
        mergeVaultLists(liveLists, deletedIds);
      }
    });

    // Real-time Firestore users listener
    const unsubFirestoreUsers = firebaseService.onUsersSnapshot((accountsMap) => {
      const session = firebaseService.getLocalSession();
      if (session && session.email) {
        const matched = accountsMap[session.email.toLowerCase().trim()];
        if (matched && matched.profile) {
          const clean = sanitizeUserRole(matched.profile);
          setCurrentUser(clean);
          firebaseService.saveSession(clean);
        }
      }
    });

    // Real-time Firestore receipts listener
    const unsubFirestoreReceipts = receiptService.onReceiptsSnapshot((receipts) => {
      setPendingApprovalsCount(receiptService.getPendingCount());
      firebaseService.reconcileApprovedReceiptsWithUsers(receipts);
    });

    // Real-time Firestore maintenance mode listener (disabled since no user has admin)
    const unsubFirestoreMaintenance = () => {};

    // Safety fallback
    const timer = setTimeout(() => {
      setIsCheckingSession(false);
    }, 200);

    const loadData = async () => {
      try {
        // Sync all registered accounts (existing and new) with Database (Server + Firestore)
        firebaseService.syncAllRegisteredAccountsToDatabase().catch((err) => {
          console.warn('Error syncing registered accounts to database:', err);
        });

        // Sync all uploaded payment receipts with Database (Server + Firestore)
        receiptService.syncFromServer().then((syncedReceipts) => {
          setPendingApprovalsCount(receiptService.getPendingCount());
          firebaseService.reconcileApprovedReceiptsWithUsers(syncedReceipts);
        }).catch(() => {});

        // 1. Fetch Items and Lists from Cloud Firestore IMMEDIATELY (primary cloud source for standalone APK & web)
        const [firestoreItems, firestoreLists] = await Promise.all([
          firebaseService.fetchVaultItems().catch(() => null),
          firebaseService.fetchVaultLists().catch(() => null),
        ]);

        if (firestoreItems && firestoreItems.length > 0) {
          mergeVaultItems(firestoreItems);
        }
        if (firestoreLists && firestoreLists.length > 0) {
          mergeVaultLists(firestoreLists);
        }

        // 2. Check items stored in user's browser localStorage
        const localItems = supabaseService.getLocalVaultItems();
        if (localItems && localItems.length > 0) {
          mergeVaultItems(localItems);
        }

        // 3. Optional: If a dedicated backend server is available, sync server-stored items and deleted list IDs
        if (!isStandaloneApp() || getRemoteServerBaseUrl()) {
          try {
            const resDeleted = await safeFetchApi('/api/vault/deleted-lists', {}, 1500);
            if (resDeleted && resDeleted.ok) {
              const jsonDel = await resDeleted.json();
              if (jsonDel.deletedIds && Array.isArray(jsonDel.deletedIds)) {
                const currentDeleted = getDeletedListIds();
                jsonDel.deletedIds.forEach((id: string) => currentDeleted.add(id));
                localStorage.setItem('vault_deleted_list_ids', JSON.stringify(Array.from(currentDeleted)));
                
                // Purge deleted lists from local cache and state
                try {
                  const cached = localStorage.getItem('vault_lists_cache');
                  if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed)) {
                      const filtered = parsed.filter((l: any) => !currentDeleted.has(l.id));
                      localStorage.setItem('vault_lists_cache', JSON.stringify(filtered));
                    }
                  }
                } catch (e) {}

                setLists((prev) => prev.filter((l) => !currentDeleted.has(l.id)));
              }
            }
          } catch (delErr) {
            console.warn('Notice: Server deleted lists not reachable, using local/Firestore state:', delErr);
          }

          try {
            const resItems = await safeFetchApi('/api/vault/items', {}, 2000);
            if (resItems && resItems.ok) {
              const json = await resItems.json();
              if (json.items && Array.isArray(json.items) && json.items.length > 0) {
                mergeVaultItems(json.items);
              }
            }
          } catch {}

          try {
            const resLists = await safeFetchApi('/api/vault/lists', {}, 2000);
            if (resLists && resLists.ok) {
              const jsonLists = await resLists.json();
              if (jsonLists.lists && Array.isArray(jsonLists.lists) && jsonLists.lists.length > 0) {
                mergeVaultLists(jsonLists.lists);
              }
            }
          } catch {}
        }

        // 4. Ensure maintenance mode is off so users are not locked out
        setIsMaintenanceActive(false);
        localStorage.setItem('vault_maintenance_active', 'false');
      } catch (err) {
        console.warn('Error loading initial vault data:', err);
      }
    };

    loadData();

    // Background poll every 30 seconds (READ-ONLY for users/lists/items so we never exhaust Firestore write quota)
    const interval = setInterval(async () => {
      try {
        firebaseService.fetchUsersFromDatabase().then((remoteAccounts) => {
          const session = firebaseService.getLocalSession();
          if (session && session.email) {
            const matched = remoteAccounts[session.email.toLowerCase().trim()];
            if (matched && matched.profile) {
              const clean = sanitizeUserRole(matched.profile);
              setCurrentUser(clean);
              firebaseService.saveSession(clean);
            }
          }
        }).catch(() => {});

        receiptService.syncFromServer().then((syncedReceipts) => {
          setPendingApprovalsCount(receiptService.getPendingCount());
          firebaseService.reconcileApprovedReceiptsWithUsers(syncedReceipts);
        }).catch(() => {});

        // Optional server poll if server is active
        if (!isStandaloneApp() || getRemoteServerBaseUrl()) {
          try {
            const resDel = await safeFetchApi('/api/vault/deleted-lists', {}, 1500);
            if (resDel && resDel.ok) {
              const jsonDel = await resDel.json();
              if (jsonDel.deletedIds && Array.isArray(jsonDel.deletedIds)) {
                const currentDeleted = getDeletedListIds();
                jsonDel.deletedIds.forEach((id: string) => currentDeleted.add(id));
                localStorage.setItem('vault_deleted_list_ids', JSON.stringify(Array.from(currentDeleted)));
                setLists((prev) => prev.filter((l) => !currentDeleted.has(l.id)));
              }
            }
          } catch (e) {}

          try {
            const resItems = await safeFetchApi('/api/vault/items', {}, 2000);
            if (resItems && resItems.ok) {
              const json = await resItems.json();
              if (json.items && Array.isArray(json.items)) mergeVaultItems(json.items);
            }
          } catch (e) {}

          try {
            const resLists = await safeFetchApi('/api/vault/lists', {}, 2000);
            if (resLists && resLists.ok) {
              const jsonLists = await resLists.json();
              if (jsonLists.lists && Array.isArray(jsonLists.lists)) mergeVaultLists(jsonLists.lists);
            }
          } catch (e) {}
        }

        // Also poll Firestore lists so standalone APK always stays in sync
        try {
          const fsLists = await firebaseService.fetchVaultLists();
          if (fsLists && fsLists.length > 0) mergeVaultLists(fsLists);
        } catch (e) {}
      } catch (e) {}
    }, 30000);

    return () => {
      clearTimeout(timer);
      unsub();
      window.removeEventListener('vault_profile_updated', handleProfileUpdated);
      window.removeEventListener('vault_receipts_changed', handleReceiptsChanged);
      unsubFirestoreItems();
      unsubFirestoreLists();
      unsubFirestoreUsers();
      unsubFirestoreReceipts();
      unsubFirestoreMaintenance();
      clearInterval(interval);
    };
  }, [mergeVaultItems, mergeVaultLists]);

  const handleLogin = (user: UserProfile) => {
    const cleanUser = sanitizeUserRole(user);
    setCurrentUser(cleanUser);
    if (cleanUser?.role === 'admin') {
      setVaultTabMode('items');
    } else {
      setVaultTabMode('collections');
      setSelectedVaultListId(null);
    }
    firebaseService.saveSession(cleanUser);
    if (cleanUser) {
      firebaseService.syncAllRegisteredAccountsToDatabase().catch(() => {});
    }
  };

  const handleLogout = async () => {
    await firebaseService.signOut();
    setCurrentUser(null);
  };

  const handleSaveMaintenance = async (newStatus: boolean, newMessage: string): Promise<boolean> => {
    const cleanMsg = newMessage.trim();
    let cloudSaved = false;
    let serverSaved = false;

    // 1. Save directly to Firebase Firestore for real-time propagation across all browsers
    try {
      cloudSaved = await firebaseService.saveMaintenance(newStatus, cleanMsg);
    } catch (fbErr) {
      console.warn('Firebase saveMaintenance warning:', fbErr);
    }

    // 2. Save to Express server endpoint if available
    if (!isStandaloneApp() || getRemoteServerBaseUrl()) {
      try {
        const data = await safeFetchJson<{ success?: boolean }>('/api/maintenance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isMaintenance: newStatus,
            message: cleanMsg,
            adminKey: ADMIN_SECURITY_KEY,
          }),
        }, 2000);
        if (data && data.success) {
          serverSaved = true;
        }
      } catch (err) {
        console.warn('Server API maintenance update warning:', err);
      }
    }

    // 3. Update local state and localStorage immediately
    setIsMaintenanceActive(newStatus);
    if (cleanMsg) setMaintenanceMessage(cleanMsg);
    localStorage.setItem('vault_maintenance_active', String(newStatus));
    if (cleanMsg) localStorage.setItem('vault_maintenance_message', cleanMsg);

    // Always succeed so admin UI is updated reliably
    return true;
  };

  // Toggle Like (optimistic state + sync to Firestore and Supabase)
  const handleToggleLike = async (itemId: string) => {
    if (!currentUser) return;
    let newLikesCount = 0;
    let newLikedBy: string[] = [];

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== itemId) return item;
        const alreadyLiked = item.likedBy.includes(currentUser.uid);
        newLikedBy = alreadyLiked
          ? item.likedBy.filter((id) => id !== currentUser.uid)
          : [...item.likedBy, currentUser.uid];
        newLikesCount = alreadyLiked
          ? Math.max(0, item.likesCount - 1)
          : item.likesCount + 1;

        return {
          ...item,
          likedBy: newLikedBy,
          likesCount: newLikesCount,
        };
      })
    );

    // Update modal if open
    setSelectedItem((prev) =>
      prev && prev.id === itemId
        ? { ...prev, likedBy: newLikedBy, likesCount: newLikesCount }
        : prev
    );

    try {
      await firebaseService.updateItemLikes(itemId, newLikesCount, newLikedBy);
    } catch (e) {
      console.warn('Could not update likes in Firestore:', e);
    }
    try {
      await supabaseService.updateItemLikes(itemId, newLikesCount, newLikedBy);
    } catch (e) {
      console.warn('Could not update likes in Supabase:', e);
    }
  };

  // Add Comment (optimistic state + sync to Firestore and Supabase)
  const handleAddComment = async (itemId: string, text: string) => {
    if (!currentUser) return;
    const newComment: VaultComment = {
      id: `c_${Date.now()}`,
      userId: currentUser.uid,
      userDisplayName: currentUser.displayName,
      userRole: currentUser.role,
      userTier: currentUser.tier,
      text,
      createdAt: 'Justo ahora',
    };

    let updatedComments: VaultComment[] = [];

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== itemId) return item;
        updatedComments = [newComment, ...item.comments];
        return {
          ...item,
          comments: updatedComments,
        };
      })
    );

    // Update modal if open
    setSelectedItem((prev) =>
      prev && prev.id === itemId
        ? { ...prev, comments: updatedComments }
        : prev
    );

    try {
      await firebaseService.updateItemComments(itemId, updatedComments);
    } catch (e) {
      console.warn('Could not update comments in Firestore:', e);
    }
    try {
      await supabaseService.updateItemComments(itemId, updatedComments);
    } catch (e) {
      console.warn('Could not update comments in Supabase:', e);
    }
  };

  // Upload new vault item (Admin exclusively) with optional list assignments
  const handleUploadItem = async (
    newItemData: Omit<VaultItem, 'createdAt' | 'likesCount' | 'likedBy' | 'comments'> & { id?: string },
    targetListIds: string[] = []
  ) => {
    const newItemId = newItemData.id || `vault-res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem: VaultItem = {
      ...newItemData,
      id: newItemId,
      createdAt: new Date().toISOString().split('T')[0],
      likesCount: 1,
      likedBy: currentUser ? [currentUser.uid] : ['admin_master_astro'],
      comments: [],
      listIds: targetListIds.length > 0 ? targetListIds : newItemData.listIds,
    };

    let itemToPersist = { ...newItem };

    // 1. Persist to Central Server API (if server is available)
    try {
      const res = await safeFetchApi('/api/vault/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      }, 2500);
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.item) {
          itemToPersist = { ...itemToPersist, ...data.item };
        }
      }
    } catch (e) {
      console.warn('Central API upload notice:', e);
    }

    // 2. Persist to Firestore
    try {
      await firebaseService.saveVaultItemToFirestore(itemToPersist);
    } catch (e) {
      console.warn('Firestore direct upload error:', e);
    }

    // 3. Persist to Supabase
    try {
      await supabaseService.insertVaultItem(itemToPersist);
    } catch (e) {
      console.warn('Supabase upload error:', e);
    }

    // 4. Update UI State & Local Backup
    setItems((prev) => {
      const updated = [itemToPersist, ...prev.filter((i) => i.id !== itemToPersist.id)];
      supabaseService.saveLocalVaultItems(updated);
      return updated;
    });

    // 5. If assigned to target lists, update those lists
    if (targetListIds.length > 0) {
      targetListIds.forEach(async (listId) => {
        const listToUpdate = lists.find((l) => l.id === listId);
        if (listToUpdate && !listToUpdate.itemIds.includes(itemToPersist.id)) {
          const updatedItemIds = [...listToUpdate.itemIds, itemToPersist.id];
          const updatedList = { ...listToUpdate, itemIds: updatedItemIds };
          
          setLists((prev) =>
            prev.map((l) => (l.id === listId ? updatedList : l))
          );

          try {
            await safeFetchApi('/api/vault/lists', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedList),
            }, 2000);
            await firebaseService.saveVaultListToFirestore(updatedList);
          } catch (e) {
            console.warn('Error updating list with new item:', e);
          }
        }
      });
    }
  };

  // Update vault item (e.g., after re-uploading file)
  const handleUpdateItem = (updatedItem: VaultItem) => {
    setItems((prev) => {
      const updated = prev.map((i) => (i.id === updatedItem.id ? updatedItem : i));
      supabaseService.saveLocalVaultItems(updated);
      return updated;
    });
    setSelectedItem(updatedItem);
  };

  // Delete vault item (Admin exclusively)
  const handleDeleteItem = async (itemId: string) => {
    setItems((prev) => {
      const updated = prev.filter((item) => item.id !== itemId);
      supabaseService.saveLocalVaultItems(updated);
      return updated;
    });
    if (selectedItem?.id === itemId) {
      setSelectedItem(null);
    }

    // Also update lists containing this item
    setLists((prevLists) =>
      prevLists.map((l) => ({
        ...l,
        itemIds: l.itemIds.filter((id) => id !== itemId),
      }))
    );

    // 1. Delete on Central Server (if available)
    try {
      await safeFetchApi(`/api/vault/items/${itemId}`, { method: 'DELETE' }, 2000);
    } catch (e) {}

    // 2. Delete on Firestore
    try {
      await firebaseService.deleteVaultItemFromFirestore(itemId);
    } catch (e) {}

    // 3. Delete on Supabase
    try {
      await supabaseService.deleteVaultItem(itemId);
    } catch (e) {}
  };

  // Create or Update Vault List (Admin)
  const handleSaveList = async (listData: Partial<VaultList>) => {
    const listId = listData.id || `list_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    unmarkDeletedListId(listId);

    const fullList: VaultList = {
      id: listId,
      name: listData.name?.trim() || 'Nueva Colección',
      description: listData.description?.trim() || '',
      icon: listData.icon || 'folder',
      color: listData.color || '#0066FF',
      itemIds: Array.isArray(listData.itemIds) ? listData.itemIds : [],
      createdBy: currentUser?.displayName || 'Administrador',
      createdAt: listData.createdAt || new Date().toISOString().split('T')[0],
    };

    // Optimistic UI update
    let nextListsSnapshot: VaultList[] = [];
    setLists((prev) => {
      const exists = prev.some((l) => l.id === fullList.id);
      const next = exists
        ? prev.map((l) => (l.id === fullList.id ? fullList : l))
        : [...prev, fullList];
      nextListsSnapshot = next;
      try {
        localStorage.setItem('vault_lists_cache', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // 1. Server API (if available)
    try {
      await safeFetchApi('/api/vault/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullList),
      }, 2000);
    } catch (e) {
      console.warn('Notice: Central server list update:', e);
    }

    // 2. Firestore
    try {
      await firebaseService.saveVaultListToFirestore(
        fullList,
        nextListsSnapshot.length > 0 ? nextListsSnapshot : undefined,
        Array.from(getDeletedListIds())
      );
    } catch (e) {
      console.warn('Error saving list to Firestore:', e);
    }

    setShowAdminListModal(false);
    setEditingList(null);
  };

  // Delete Vault List (Admin)
  const handleDeleteList = async (listId: string) => {
    if (!listId) return;

    // 1. Mark in persistent client-side deleted blacklist
    addDeletedListId(listId);

    // 2. Optimistic UI
    let remainingSnapshot: VaultList[] = [];
    setLists((prev) => {
      const next = prev.filter((l) => l.id !== listId);
      remainingSnapshot = next;
      try {
        localStorage.setItem('vault_lists_cache', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // 3. Server API (if available)
    try {
      await safeFetchApi(`/api/vault/lists/${encodeURIComponent(listId)}`, { method: 'DELETE' }, 2000);
    } catch (e) {
      console.warn('Notice: Server list delete:', e);
    }

    // 4. Firestore
    try {
      await firebaseService.deleteVaultListFromFirestore(
        listId,
        remainingSnapshot,
        Array.from(getDeletedListIds())
      );
    } catch (e) {
      console.warn('Error deleting list from Firestore:', e);
    }

    setShowAdminListModal(false);
    setEditingList(null);
  };

  // Toggle single item in list (Admin quick action)
  const handleToggleItemInList = async (listId: string, itemId: string) => {
    let updatedList: VaultList | null = null;
    let nextListsSnapshot: VaultList[] = [];

    setLists((prev) => {
      const next = prev.map((l) => {
        if (l.id !== listId) return l;
        const exists = l.itemIds.includes(itemId);
        const newItemIds = exists
          ? l.itemIds.filter((id) => id !== itemId)
          : [...l.itemIds, itemId];
        updatedList = { ...l, itemIds: newItemIds };
        return updatedList;
      });
      nextListsSnapshot = next;
      try {
        localStorage.setItem('vault_lists_cache', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    if (updatedList) {
      try {
        await safeFetchApi(`/api/vault/lists/${listId}/toggle-item`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId }),
        }, 2000);
        await firebaseService.saveVaultListToFirestore(
          updatedList,
          nextListsSnapshot.length > 0 ? nextListsSnapshot : undefined,
          Array.from(getDeletedListIds())
        );
      } catch (e) {
        console.warn('Error toggling item in list:', e);
      }
    }
  };

  // Sync selectedItem if item list updates
  const activeDetailItem = selectedItem
    ? items.find((i) => i.id === selectedItem.id) || selectedItem
    : null;

  // If checking initial session
  if (isCheckingSession) {
    return (
      <div className={`h-[100dvh] w-full flex flex-col items-center justify-center gap-4 transition-colors duration-300 ${
        isDark ? 'bg-black text-white' : 'bg-[#F1F4F9] text-[#0F172A]'
      }`}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="w-12 h-12 rounded-2xl bg-[#0066FF] flex items-center justify-center text-white shadow-xl shadow-[#0066FF]/40 animate-pulse"
        >
          <ShieldCheck className="w-6 h-6" />
        </motion.div>
        <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-[#0066FF]">
          <div className="w-3.5 h-3.5 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin" />
          <span>Verificando Acceso a la Bóveda...</span>
        </div>
      </div>
    );
  }

  // Priority 1: When maintenance mode is active, block everything for non-admins and display MaintenanceScreen
  if (isMaintenanceActive && (!currentUser || currentUser.role !== 'admin')) {
    return (
      <MaintenanceScreen
        onAdminLogin={handleLogin}
        customMessage={maintenanceMessage}
      />
    );
  }

  // Priority 2: Unauthenticated view -> Mandatory AuthScreen (100% pantalla completa Edge-to-Edge)
  if (!currentUser) {
    return (
      <div className="w-full h-full min-h-[100dvh] max-h-[100dvh] flex flex-col p-0 m-0 overflow-hidden bg-black text-white select-none">
        <AuthScreen onLogin={handleLogin} />
      </div>
    );
  }

  const isStandalone = isStandaloneApp();

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] w-full flex flex-col font-sans overflow-hidden select-none ${
        isDark
          ? 'bg-black text-white selection:bg-[#0066FF] selection:text-white'
          : 'bg-[#F8FAFC] text-[#0F172A] selection:bg-[#0066FF] selection:text-white'
      }`}
    >
      {/* Top Header Bar for Private Server */}
      <header
        className={`shrink-0 z-40 px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 pt-[max(0.6rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] border-b backdrop-blur-xl ${
          isDark
            ? 'border-[#1E1E24] bg-black/95 shadow-black/80'
            : 'border-[#E2E8F0] bg-white/95 shadow-sm'
        }`}
      >
        <div className="w-full flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand & Logo */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setCurrentTab('vault');
                if (currentUser.role !== 'admin') {
                  setVaultTabMode('collections');
                }
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0066FF] flex items-center justify-center shadow-md shadow-[#0066FF]/30 text-white shrink-0 cursor-pointer"
            >
              <ShieldCheck className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </motion.div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base lg:text-lg font-black tracking-tight leading-none truncate">
                  App 66
                </h1>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8.5px] sm:text-[10px] font-extrabold uppercase bg-[#0066FF]/15 text-[#0066FF] border border-[#0066FF]/30 shrink-0">
                  SERVIDOR PRIVADO
                </span>
                {isSupabaseConfigured && (
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <Database className="w-2.5 h-2.5" /> SUPABASE
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Controls: User info with Avatar, Theme & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Admin Maintenance Control Button */}
            {currentUser.role === 'admin' && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowMaintenanceModal(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                  isMaintenanceActive
                    ? 'bg-amber-500/15 border-amber-500/35 text-amber-500 dark:text-amber-400 hover:bg-amber-500/25 shadow-sm'
                    : 'bg-black/5 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Configurar Modo Mantenimiento"
              >
                <Wrench className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Mantenimiento:</span>
                <span className={isMaintenanceActive ? 'font-black text-amber-500 dark:text-amber-400' : 'font-semibold text-slate-400'}>
                  {isMaintenanceActive ? 'ON' : 'OFF'}
                </span>
              </motion.button>
            )}

            {/* User Profile Badge with Avatar and Name - Always visible, links to Profile */}
            <motion.button
              id="header-user-profile-btn"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCurrentTab('profile')}
              title={`Ver Perfil: ${currentUser.displayName}`}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border text-xs font-bold cursor-pointer transition-all ${
                currentTab === 'profile'
                  ? 'border-[#0066FF] bg-[#0066FF]/15 text-[#0066FF]'
                  : isDark
                  ? 'bg-[#0A0A0C] border-[#1E1E24] text-white hover:border-[#0066FF]/40'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
              }`}
            >
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.displayName}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-[#0066FF] shrink-0"
                />
              ) : (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-[#0066FF] to-blue-700 text-[10px] sm:text-xs text-white flex items-center justify-center font-black shrink-0">
                  {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span className="max-w-[80px] sm:max-w-[150px] truncate leading-none">
                {currentUser.displayName}
              </span>
              {currentUser.role === 'admin' ? (
                <VerifiedBadge className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0066FF] shrink-0" />
              ) : currentUser.membershipStatus === 'active' && currentUser.membershipPlan ? (
                <span className="px-1.5 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-extrabold bg-[#0066FF]/15 text-[#0066FF] shrink-0">
                  VIP
                </span>
              ) : null}
            </motion.button>

            {/* Theme Toggle */}
            <motion.button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark
                  ? 'border-[#1E1E24] hover:bg-[#1A1A22] text-[#8E8E93] hover:text-white'
                  : 'border-[#E2E8F0] hover:bg-slate-100 text-[#64748B] hover:text-black'
              }`}
              title="Cambiar Modo Claro / Oscuro"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                </motion.div>
              </AnimatePresence>
            </motion.button>

            {/* Logout Button */}
            <motion.button
              id="logout-btn"
              onClick={handleLogout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark
                  ? 'border-[#1E1E24] hover:bg-red-500/15 hover:border-red-500/30 text-[#8E8E93] hover:text-red-400'
                  : 'border-[#E2E8F0] hover:bg-red-50 text-[#64748B] hover:text-red-600'
              }`}
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content Area: Always 100% full-bleed edge-to-edge */}
      <main className="flex-1 w-full p-0 m-0 overflow-hidden flex flex-col min-h-0">
        <div className={`w-full h-full flex-1 rounded-none border-0 shadow-none overflow-hidden flex flex-col min-h-0 relative ${
          isDark ? 'bg-black text-white' : 'bg-[#F8FAFC] text-[#0F172A]'
        }`}>
          <AnimatePresence mode="wait">
            {currentTab === 'vault' && (
              <motion.div
                key="vault"
                initial={{ opacity: 0, y: 8, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.995 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full flex flex-col min-h-0"
              >
                <VaultScreen
                  items={items}
                  lists={lists}
                  currentUser={currentUser}
                  onSelectItem={(item) => setSelectedItem(item)}
                  onOpenAdminUpload={() => setShowAdminUpload(true)}
                  onOpenAdminCreateList={() => {
                    setEditingList(null);
                    setShowAdminListModal(true);
                  }}
                  onOpenAdminEditList={(list) => {
                    setEditingList(list);
                    setShowAdminListModal(true);
                  }}
                  onDeleteList={handleDeleteList}
                  onDeleteItem={handleDeleteItem}
                  onNavigateToReceipts={() => setCurrentTab('receipts')}
                  onNavigateToMembership={() => setCurrentTab('membership')}
                  activeTabMode={vaultTabMode}
                  onTabModeChange={setVaultTabMode}
                  selectedListId={selectedVaultListId}
                  onSelectedListChange={setSelectedVaultListId}
                />
              </motion.div>
            )}

            {currentTab === 'membership' && (
              <motion.div
                key="membership"
                initial={{ opacity: 0, y: 8, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.995 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full flex flex-col min-h-0"
              >
                <MembershipScreen
                  currentUser={currentUser}
                  onUpdateUser={(updated) => setCurrentUser(updated)}
                  onNavigateToVault={() => setCurrentTab('vault')}
                  onNavigateToReceipts={() => setCurrentTab('receipts')}
                />
              </motion.div>
            )}

            {currentTab === 'receipts' && (
              <motion.div
                key="receipts"
                initial={{ opacity: 0, y: 8, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.995 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full flex flex-col min-h-0"
              >
                <ReceiptsScreen
                  currentUser={currentUser}
                  onUpdateUser={(updated) => setCurrentUser(updated)}
                  onNavigateToMembership={() => setCurrentTab('membership')}
                  onNavigateToVault={() => setCurrentTab('vault')}
                  onNavigateToApprovals={() => setCurrentTab('approvals')}
                />
              </motion.div>
            )}

            {currentTab === 'approvals' && currentUser?.role === 'admin' && (
              <motion.div
                key="approvals"
                initial={{ opacity: 0, y: 8, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.995 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full flex flex-col min-h-0"
              >
                <AdminApprovalsScreen
                  currentUser={currentUser}
                  onUpdateCurrentUser={(updated) => setCurrentUser(updated)}
                  onNavigateToVault={() => setCurrentTab('vault')}
                  onNavigateToMembership={() => setCurrentTab('membership')}
                  onNavigateToReceipts={() => setCurrentTab('receipts')}
                />
              </motion.div>
            )}

            {currentTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 8, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.995 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="w-full flex-1 h-full flex flex-col min-h-0"
              >
                <ProfileScreen
                  currentUser={currentUser}
                  onLogout={handleLogout}
                  onUpdateUser={(updated) => setCurrentUser(updated)}
                  items={items}
                  onSelectItem={(item) => setSelectedItem(item)}
                  onNavigateToMembership={() => setCurrentTab('membership')}
                  onNavigateToReceipts={() => setCurrentTab('receipts')}
                  onNavigateToVault={() => {
                    setCurrentTab('vault');
                    setVaultTabMode(currentUser?.role === 'admin' ? 'items' : 'collections');
                    setSelectedVaultListId(null);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* GLOBAL BOTTOM HOME BAR (Solo iconos en Mobile y PC) */}
      <nav 
        id="global-bottom-home-bar"
        aria-label="Barra de Navegación Inferior"
        className={`shrink-0 z-40 px-3 sm:px-6 py-1.5 sm:py-2 border-t flex justify-center pb-[max(0.6rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] ${
          isDark 
            ? 'bg-black/95 border-[#1E1E24] shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.8)]' 
            : 'bg-white/95 border-slate-200 shadow-[0_-8px_20px_-4px_rgba(0,0,0,0.08)]'
        }`}
      >
        <div className={`w-full max-w-lg flex items-center justify-around sm:justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border shadow-inner ${
          isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-[#F1F5F9] border-slate-200'
        }`}>
          {/* Publicaciones (SOLO ICONO, SOLO ADMINISTRADORES) */}
          {currentUser?.role === 'admin' && (
            <button
              id="home-bar-tab-publicaciones"
              type="button"
              title={`Publicaciones (${items.length})`}
              aria-label="Publicaciones"
              onClick={() => {
                setCurrentTab('vault');
                setVaultTabMode('items');
                setSelectedVaultListId(null);
              }}
              className={`relative flex items-center justify-center w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-full z-10 cursor-pointer select-none outline-none focus:outline-none active:scale-95 transition-all ${
                currentTab === 'vault' && vaultTabMode === 'items' && !selectedVaultListId
                  ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/35'
                  : isDark
                  ? 'text-zinc-400 hover:text-white active:text-white'
                  : 'text-slate-500 hover:text-slate-900 active:text-slate-900'
              }`}
            >
              <FolderClosed className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" />
            </button>
          )}

          {/* Colecciones (SOLO ICONO) */}
          <button
            id="home-bar-tab-colecciones"
            type="button"
            title={`Colecciones (${lists.length})`}
            aria-label="Colecciones"
            onClick={() => {
              setCurrentTab('vault');
              setVaultTabMode('collections');
              setSelectedVaultListId(null);
            }}
            className={`relative flex items-center justify-center w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-full z-10 cursor-pointer select-none outline-none focus:outline-none active:scale-95 transition-all ${
              currentTab === 'vault' && (vaultTabMode === 'collections' || selectedVaultListId !== null)
                ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/35'
                : isDark
                ? 'text-zinc-400 hover:text-white active:text-white'
                : 'text-slate-500 hover:text-slate-900 active:text-slate-900'
            }`}
          >
            <Layers className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" />
          </button>

          {/* Separador vertical sutil */}
          <div className={`w-px h-5 mx-0.5 shrink-0 ${isDark ? 'bg-[#1E1E24]' : 'bg-slate-300'}`} />

          {/* Membresía VIP (SOLO ICONO) */}
          <button
            id="home-bar-tab-membresia"
            type="button"
            title="Membresía VIP"
            aria-label="Membresía VIP"
            onClick={() => setCurrentTab('membership')}
            className={`relative flex items-center justify-center w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-full z-10 cursor-pointer select-none outline-none focus:outline-none active:scale-95 transition-all ${
              currentTab === 'membership'
                ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/35'
                : isDark
                ? 'text-zinc-400 hover:text-white active:text-white'
                : 'text-slate-500 hover:text-slate-900 active:text-slate-900'
            }`}
          >
            <Crown className={`w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0 ${currentTab === 'membership' ? 'text-amber-300' : 'text-amber-400'}`} />
          </button>

          {/* Apartado de Comprobación (SOLO ICONO) */}
          <button
            id="home-bar-tab-comprobantes"
            type="button"
            title="Comprobación de Pago"
            aria-label="Comprobación de Pago"
            onClick={() => setCurrentTab('receipts')}
            className={`relative flex items-center justify-center w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-full z-10 cursor-pointer select-none outline-none focus:outline-none active:scale-95 transition-all ${
              currentTab === 'receipts'
                ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/35'
                : isDark
                ? 'text-zinc-400 hover:text-white active:text-white'
                : 'text-slate-500 hover:text-slate-900 active:text-slate-900'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <FileText className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" />
              {currentTab !== 'receipts' && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </div>
          </button>

          {/* Apartado de Aprobación en Home Bar (SOLO ICONO, SOLO ADMINISTRADORES) */}
          {currentUser?.role === 'admin' && (
            <>
              <div className={`w-px h-5 mx-0.5 shrink-0 ${isDark ? 'bg-[#1E1E24]' : 'bg-slate-300'}`} />
              <button
                id="home-bar-tab-aprobaciones"
                type="button"
                title={`Aprobación de Membresías (${pendingApprovalsCount} pendientes)`}
                aria-label="Aprobación de Membresías"
                onClick={() => setCurrentTab('approvals')}
                className={`relative flex items-center justify-center w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-full z-10 cursor-pointer select-none outline-none focus:outline-none active:scale-95 transition-all ${
                  currentTab === 'approvals'
                    ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/35'
                    : isDark
                    ? 'text-zinc-400 hover:text-white active:text-white'
                    : 'text-slate-500 hover:text-slate-900 active:text-slate-900'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <ShieldCheck className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" />
                  {pendingApprovalsCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 px-1 py-0.2 min-w-[14px] text-[9px] font-black rounded-full bg-amber-400 text-black border border-black flex items-center justify-center">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </div>
              </button>
            </>
          )}

          {/* Separador vertical sutil */}
          <div className={`w-px h-5 mx-0.5 shrink-0 ${isDark ? 'bg-[#1E1E24]' : 'bg-slate-300'}`} />

          {/* Ajustes y Sistema (SOLO ICONO) */}
          <button
            id="home-bar-tab-ajustes"
            type="button"
            title="Ajustes y Sistema"
            aria-label="Ajustes y Sistema"
            onClick={() => setCurrentTab('profile')}
            className={`relative flex items-center justify-center w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-full z-10 cursor-pointer select-none outline-none focus:outline-none active:scale-95 transition-all ${
              currentTab === 'profile'
                ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/35'
                : isDark
                ? 'text-zinc-400 hover:text-white active:text-white'
                : 'text-slate-500 hover:text-slate-900 active:text-slate-900'
            }`}
          >
            <Settings className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" />
          </button>
        </div>
      </nav>

      {/* Resource Detail & Modal */}
      <AnimatePresence>
        {activeDetailItem && (
          <VaultDetailModal
            item={activeDetailItem}
            currentUser={currentUser}
            onClose={() => setSelectedItem(null)}
            onToggleLike={handleToggleLike}
            onAddComment={handleAddComment}
            onDeleteItem={handleDeleteItem}
            onUpdateItem={handleUpdateItem}
            lists={lists}
            onToggleItemInList={handleToggleItemInList}
          />
        )}
      </AnimatePresence>

      {/* Admin Exclusive Upload Modal */}
      <AnimatePresence>
        {showAdminUpload && (
          <AdminUploadModal
            isOpen={showAdminUpload}
            onClose={() => setShowAdminUpload(false)}
            onUpload={handleUploadItem}
            currentUser={currentUser}
            lists={lists}
          />
        )}
      </AnimatePresence>

      {/* Admin List Creator / Manager Modal */}
      <AnimatePresence>
        {showAdminListModal && (
          <AdminListModal
            isOpen={showAdminListModal}
            onClose={() => {
              setShowAdminListModal(false);
              setEditingList(null);
            }}
            onSave={handleSaveList}
            onDelete={handleDeleteList}
            initialList={editingList}
            items={items}
          />
        )}
      </AnimatePresence>

      {/* Admin Maintenance Mode Configuration Modal */}
      <AnimatePresence>
        {showMaintenanceModal && (
          <AdminMaintenanceModal
            isOpen={showMaintenanceModal}
            onClose={() => setShowMaintenanceModal(false)}
            isMaintenance={isMaintenanceActive}
            maintenanceMessage={maintenanceMessage}
            onSave={handleSaveMaintenance}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
