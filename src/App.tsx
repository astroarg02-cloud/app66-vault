import React, { useState, useEffect } from 'react';
import { INITIAL_ADMIN_USER, INITIAL_MEMBER_USER, INITIAL_VAULT_ITEMS } from './data/initialVaultData';
import { VaultItem, UserProfile, VaultComment } from './types';
import { AuthScreen } from './components/MobileSimulator/AuthScreen';
import { VaultScreen } from './components/MobileSimulator/VaultScreen';
import { VaultDetailModal } from './components/MobileSimulator/VaultDetailModal';
import { MembershipScreen } from './components/MobileSimulator/MembershipScreen';
import { ProfileScreen } from './components/MobileSimulator/ProfileScreen';
import { AdminUploadModal } from './components/MobileSimulator/AdminUploadModal';
import { VerifiedBadge } from './components/VerifiedBadge';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { firebaseService } from './services/firebaseService';
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
  Flame
} from 'lucide-react';

function AppContent() {
  const [items, setItems] = useState<VaultItem[]>(INITIAL_VAULT_ITEMS);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => firebaseService.getLocalSession());
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [currentTab, setCurrentTab] = useState<'vault' | 'membership' | 'profile'>('vault');
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [showAdminUpload, setShowAdminUpload] = useState(false);
  const { theme, toggleTheme, isDark } = useTheme();

  // Check existing session and listen to Firebase auth & Firestore live items
  useEffect(() => {
    const unsub = firebaseService.onAuthState((user) => {
      if (user) {
        setCurrentUser(user);
      }
      setIsCheckingSession(false);
    });

    // Real-time Firestore items listener (anyone in the world immediately sees uploads)
    const unsubFirestore = firebaseService.onVaultItemsSnapshot((liveItems) => {
      if (liveItems && Array.isArray(liveItems) && liveItems.length > 0) {
        setItems(liveItems);
      }
    });

    // Safety fallback to guarantee screen is never stuck
    const timer = setTimeout(() => {
      setIsCheckingSession(false);
    }, 200);

    const loadItems = async () => {
      try {
        // First attempt Firestore items
        const firestoreItems = await firebaseService.fetchVaultItems();
        if (firestoreItems && firestoreItems.length > 0) {
          setItems(firestoreItems);
          return;
        }

        // Fallback to Supabase
        const fetchedItems = await supabaseService.fetchVaultItems();
        if (fetchedItems && Array.isArray(fetchedItems) && fetchedItems.length > 0) {
          setItems(fetchedItems);
        }
      } catch (err) {
        console.warn('Error loading vault items:', err);
      }
    };

    loadItems();

    const interval = setInterval(loadItems, 3500);

    return () => {
      clearTimeout(timer);
      unsub();
      unsubFirestore();
      clearInterval(interval);
    };
  }, []);

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    firebaseService.saveSession(user);
  };

  const handleLogout = async () => {
    await firebaseService.signOut();
    setCurrentUser(null);
  };

  const handleSwitchUser = (user: UserProfile) => {
    setCurrentUser(user);
    firebaseService.saveSession(user);
  };

  // Toggle Like (optimistic state + sync to Supabase)
  const handleToggleLike = (itemId: string) => {
    if (!currentUser) return;
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== itemId) return item;
        const alreadyLiked = item.likedBy.includes(currentUser.uid);
        const newLikedBy = alreadyLiked
          ? item.likedBy.filter((id) => id !== currentUser.uid)
          : [...item.likedBy, currentUser.uid];
        const newLikesCount = alreadyLiked
          ? Math.max(0, item.likesCount - 1)
          : item.likesCount + 1;

        // Sync with Supabase in background
        supabaseService.updateItemLikes(itemId, newLikesCount, newLikedBy);

        return {
          ...item,
          likedBy: newLikedBy,
          likesCount: newLikesCount,
        };
      })
    );
  };

  // Add Comment (optimistic state + sync to Supabase)
  const handleAddComment = (itemId: string, text: string) => {
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

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== itemId) return item;
        const updatedComments = [newComment, ...item.comments];
        
        // Sync with Supabase in background
        supabaseService.updateItemComments(itemId, updatedComments);

        return {
          ...item,
          comments: updatedComments,
        };
      })
    );
  };

  // Upload new vault item (Admin exclusively)
  const handleUploadItem = async (
    newItemData: Omit<VaultItem, 'id' | 'createdAt' | 'likesCount' | 'likedBy' | 'comments'>
  ) => {
    const newItem: VaultItem = {
      ...newItemData,
      id: `vault-res-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      likesCount: 1,
      likedBy: currentUser ? [currentUser.uid] : [],
      comments: [],
    };

    setItems((prev) => [newItem, ...prev.filter((i) => i.id !== newItem.id)]);

    // Persist to both Firestore and Supabase for guaranteed global sync across all visitors
    await firebaseService.saveVaultItemToFirestore(newItem);
    await supabaseService.insertVaultItem(newItem);
  };

  // Delete vault item (Admin exclusively)
  const handleDeleteItem = async (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    if (selectedItem?.id === itemId) {
      setSelectedItem(null);
    }
    await firebaseService.deleteVaultItemFromFirestore(itemId);
    await supabaseService.deleteVaultItem(itemId);
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
        <div className="w-12 h-12 rounded-2xl bg-[#0066FF] flex items-center justify-center text-white shadow-xl shadow-[#0066FF]/40 animate-pulse">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-[#0066FF]">
          <div className="w-3.5 h-3.5 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin" />
          <span>Verificando Acceso a la Bóveda...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated view -> Mandatory AuthScreen
  if (!currentUser) {
    return (
      <div className={`h-[100dvh] w-full flex items-center justify-center p-3 sm:p-4 overflow-y-auto transition-colors duration-300 ${
        isDark ? 'bg-black text-white' : 'bg-[#F1F4F9] text-[#0F172A]'
      }`}>
        <div className={`w-full max-w-md max-h-[94dvh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
          isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0]'
        }`}>
          <AuthScreen onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] w-full flex flex-col font-sans overflow-hidden transition-colors duration-300 ${
        isDark
          ? 'bg-black text-white selection:bg-[#0066FF] selection:text-white'
          : 'bg-[#F1F4F9] text-[#0F172A] selection:bg-[#0066FF] selection:text-white'
      }`}
    >
      {/* Top Header Bar for Private Server */}
      <header
        className={`shrink-0 z-40 px-3 sm:px-6 py-2.5 sm:py-3 border-b backdrop-blur-xl transition-colors duration-300 ${
          isDark
            ? 'border-[#1E1E24] bg-black/90 shadow-black/80'
            : 'border-[#E2E8F0] bg-white/95 shadow-sm'
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand & Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#0066FF] flex items-center justify-center shadow-lg shadow-[#0066FF]/30 text-white shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-lg font-black tracking-tight leading-none">
                  App 66
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase bg-[#0066FF]/15 text-[#0066FF] border border-[#0066FF]/30">
                  SERVIDOR PRIVADO
                </span>
                {isSupabaseConfigured && (
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <Database className="w-2.5 h-2.5" /> SUPABASE CONECTADO
                  </span>
                )}
              </div>
              <p className={`text-[11px] sm:text-xs mt-0.5 hidden sm:block ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                Bóveda de contenido exclusivo & acceso restringido
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-2xl border bg-black/10 dark:bg-white/5 border-slate-200 dark:border-white/10">
            <button
              id="nav-tab-vault"
              onClick={() => setCurrentTab('vault')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'vault'
                  ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                  : isDark
                  ? 'text-[#8E8E93] hover:text-white'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <FolderClosed className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Bóveda</span>
            </button>

            <button
              id="nav-tab-membership"
              onClick={() => setCurrentTab('membership')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'membership'
                  ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                  : isDark
                  ? 'text-[#8E8E93] hover:text-white'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Membresía VIP</span>
            </button>

            <button
              id="nav-tab-profile"
              onClick={() => setCurrentTab('profile')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'profile'
                  ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                  : isDark
                  ? 'text-[#8E8E93] hover:text-white'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Mi Perfil</span>
            </button>
          </nav>

          {/* Right Controls: User info, Theme & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* User badge */}
            <div className={`hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs font-semibold ${
              isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0]'
            }`}>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="max-w-[100px] truncate">{currentUser.displayName}</span>
              {currentUser.role === 'admin' ? (
                <VerifiedBadge className="w-3.5 h-3.5 text-[#0066FF]" />
              ) : (
                <span className="text-[10px] text-[#0066FF] font-bold">VIP</span>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className={`p-1.5 sm:p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'border-[#1E1E24] hover:bg-[#1A1A22] text-[#8E8E93] hover:text-white'
                  : 'border-[#E2E8F0] hover:bg-slate-100 text-[#64748B] hover:text-black'
              }`}
              title="Cambiar Modo Claro / Oscuro"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Logout Button */}
            <button
              id="logout-btn"
              onClick={handleLogout}
              className={`p-1.5 sm:p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'border-[#1E1E24] hover:bg-red-500/15 hover:border-red-500/30 text-[#8E8E93] hover:text-red-400'
                  : 'border-[#E2E8F0] hover:bg-red-50 text-[#64748B] hover:text-red-600'
              }`}
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-2 sm:p-4 md:p-5 overflow-hidden flex flex-col min-h-0">
        <div className={`w-full h-full flex-1 rounded-2xl sm:rounded-3xl border shadow-xl overflow-hidden flex flex-col min-h-0 relative transition-colors ${
          isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0]'
        }`}>
          {currentTab === 'vault' && (
            <VaultScreen
              items={items}
              currentUser={currentUser}
              onSelectItem={(item) => setSelectedItem(item)}
              onOpenAdminUpload={() => setShowAdminUpload(true)}
              onDeleteItem={handleDeleteItem}
            />
          )}

          {currentTab === 'membership' && (
            <MembershipScreen
              currentUser={currentUser}
            />
          )}

          {currentTab === 'profile' && (
            <ProfileScreen
              currentUser={currentUser}
              onLogout={handleLogout}
            />
          )}
        </div>
      </main>

      {/* Resource Detail & Countdown Modal */}
      {activeDetailItem && (
        <VaultDetailModal
          item={activeDetailItem}
          currentUser={currentUser}
          onClose={() => setSelectedItem(null)}
          onToggleLike={handleToggleLike}
          onAddComment={handleAddComment}
          onDeleteItem={handleDeleteItem}
        />
      )}

      {/* Admin Exclusive Upload Modal */}
      {showAdminUpload && (
        <AdminUploadModal
          isOpen={showAdminUpload}
          onClose={() => setShowAdminUpload(false)}
          onUpload={handleUploadItem}
        />
      )}
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
