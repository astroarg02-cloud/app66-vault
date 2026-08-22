import React, { useState } from 'react';
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
import { 
  FolderClosed, 
  Crown, 
  User, 
  Moon, 
  Sun, 
  LogOut, 
  ShieldCheck, 
  Plus, 
  Lock 
} from 'lucide-react';

function AppContent() {
  const [items, setItems] = useState<VaultItem[]>(INITIAL_VAULT_ITEMS);
  // Default to Admin logged in for instant access, or can logout to see login
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(INITIAL_ADMIN_USER);
  const [currentTab, setCurrentTab] = useState<'vault' | 'membership' | 'profile'>('vault');
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [showAdminUpload, setShowAdminUpload] = useState(false);
  const { theme, toggleTheme, isDark } = useTheme();

  // Toggle Like (optimistic state)
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

        return {
          ...item,
          likedBy: newLikedBy,
          likesCount: newLikesCount,
        };
      })
    );
  };

  // Add Comment
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
        return {
          ...item,
          comments: [newComment, ...item.comments],
        };
      })
    );
  };

  // Upload new vault item (Admin exclusively)
  const handleUploadItem = (
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

    setItems((prev) => [newItem, ...prev]);
  };

  // Sync selectedItem if item list updates
  const activeDetailItem = selectedItem
    ? items.find((i) => i.id === selectedItem.id) || selectedItem
    : null;

  // Unauthenticated view -> AuthScreen
  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
        isDark ? 'bg-black text-white' : 'bg-[#F1F4F9] text-[#0F172A]'
      }`}>
        <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0]'
        }`}>
          <AuthScreen onLogin={setCurrentUser} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
        isDark
          ? 'bg-black text-white selection:bg-[#0066FF] selection:text-white'
          : 'bg-[#F1F4F9] text-[#0F172A] selection:bg-[#0066FF] selection:text-white'
      }`}
    >
      {/* Top Header Bar for Private Server */}
      <header
        className={`sticky top-0 z-40 px-4 sm:px-8 py-3.5 border-b backdrop-blur-xl transition-colors duration-300 ${
          isDark
            ? 'border-[#1E1E24] bg-black/85 shadow-black/80'
            : 'border-[#E2E8F0] bg-white/90 shadow-sm'
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0066FF] flex items-center justify-center shadow-lg shadow-[#0066FF]/30 text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight leading-none">
                  App 66
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#0066FF]/15 text-[#0066FF] border border-[#0066FF]/30">
                  SERVIDOR PRIVADO
                </span>
              </div>
              <p className={`text-xs mt-0.5 hidden sm:block ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                Bóveda de contenido exclusivo & acceso restringido
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center gap-1.5 p-1 rounded-2xl border bg-black/10 dark:bg-white/5 border-slate-200 dark:border-white/10">
            <button
              id="nav-tab-vault"
              onClick={() => setCurrentTab('vault')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'vault'
                  ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                  : isDark
                  ? 'text-[#8E8E93] hover:text-white'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <FolderClosed className="w-4 h-4" />
              <span className="hidden xs:inline">Bóveda</span>
            </button>

            <button
              id="nav-tab-membership"
              onClick={() => setCurrentTab('membership')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'membership'
                  ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                  : isDark
                  ? 'text-[#8E8E93] hover:text-white'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span className="hidden xs:inline">Membresía VIP</span>
            </button>

            <button
              id="nav-tab-profile"
              onClick={() => setCurrentTab('profile')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'profile'
                  ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                  : isDark
                  ? 'text-[#8E8E93] hover:text-white'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <User className="w-4 h-4" />
              <span className="hidden xs:inline">Mi Perfil</span>
            </button>
          </nav>

          {/* Right Controls: User info, Theme & Logout */}
          <div className="flex items-center gap-2.5">
            {/* User badge */}
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0]'
            }`}>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{currentUser.displayName}</span>
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
              className={`p-2 rounded-xl border transition-colors ${
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
              onClick={() => setCurrentUser(null)}
              className={`p-2 rounded-xl border transition-colors ${
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
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 overflow-y-auto">
        <div className={`w-full min-h-[calc(100vh-140px)] rounded-3xl border shadow-xl overflow-hidden transition-colors ${
          isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0]'
        }`}>
          {currentTab === 'vault' && (
            <VaultScreen
              items={items}
              currentUser={currentUser}
              onSelectItem={(item) => setSelectedItem(item)}
              onOpenAdminUpload={() => setShowAdminUpload(true)}
            />
          )}

          {currentTab === 'membership' && (
            <MembershipScreen
              currentUser={currentUser}
              onUpgradeSuccess={(newTier) => {
                setCurrentUser((prev) => (prev ? { ...prev, tier: newTier, role: 'vip_member' } : null));
              }}
            />
          )}

          {currentTab === 'profile' && (
            <ProfileScreen
              currentUser={currentUser}
              onLogout={() => setCurrentUser(null)}
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
