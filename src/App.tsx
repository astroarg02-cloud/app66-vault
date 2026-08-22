import React, { useState } from 'react';
import { INITIAL_ADMIN_USER, INITIAL_VAULT_ITEMS } from './data/initialVaultData';
import { VaultItem, UserProfile, VaultComment } from './types';
import { Header } from './components/Header';
import { MobileFrame } from './components/MobileSimulator/MobileFrame';
import { CodeExplorer } from './components/CodeExplorer/CodeExplorer';
import { ArchitectureGuide } from './components/ArchitectureGuide/ArchitectureGuide';
import { SupabaseManager } from './components/SupabaseManager/SupabaseManager';
import { GitHubUploaderModal } from './components/GitHubUploader/GitHubUploaderModal';
import { AndroidBuildGuideModal } from './components/AndroidBuildGuide/AndroidBuildGuideModal';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AppView } from './types';

function AppContent() {
  const [items, setItems] = useState<VaultItem[]>(INITIAL_VAULT_ITEMS);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<AppView>('simulator');
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);
  const { isDark } = useTheme();

  // Toggle Like (optimistic Riverpod / Firestore simulation)
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

  // Add Comment (Private forum discussion)
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

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
        isDark
          ? 'bg-[#000000] text-white selection:bg-[#0066FF] selection:text-white'
          : 'bg-[#F1F4F9] text-[#0F172A] selection:bg-[#0066FF] selection:text-white'
      }`}
    >
      {/* Top Global Navigation Bar */}
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        currentUser={currentUser}
        onLogout={() => setCurrentUser(null)}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
        onOpenAndroidGuideModal={() => setIsAndroidModalOpen(true)}
      />

      {/* 1-Click Global GitHub Uploader Modal */}
      <GitHubUploaderModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
      />

      {/* Direct Android APK Builder Guide Modal */}
      <AndroidBuildGuideModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'simulator' && (
          <div
            className={`flex-1 flex items-center justify-center p-2 sm:p-6 overflow-y-auto custom-scrollbar transition-colors duration-300 ${
              isDark ? 'bg-[#000000]' : 'bg-[#F1F4F9]'
            }`}
          >
            <MobileFrame
              items={items}
              currentUser={currentUser}
              onLogin={setCurrentUser}
              onLogout={() => setCurrentUser(null)}
              onToggleLike={handleToggleLike}
              onAddComment={handleAddComment}
              onUploadItem={handleUploadItem}
            />
          </div>
        )}

        {activeView === 'supabase' && (
          <div
            className={`flex-1 p-4 sm:p-6 overflow-hidden flex flex-col transition-colors duration-300 ${
              isDark ? 'bg-[#000000]' : 'bg-[#F1F4F9]'
            }`}
          >
            <SupabaseManager />
          </div>
        )}

        {activeView === 'code' && (
          <div
            className={`flex-1 p-4 sm:p-6 overflow-hidden flex flex-col transition-colors duration-300 ${
              isDark ? 'bg-[#000000]' : 'bg-[#F1F4F9]'
            }`}
          >
            <CodeExplorer />
          </div>
        )}

        {activeView === 'guide' && (
          <div
            className={`flex-1 overflow-y-auto transition-colors duration-300 ${
              isDark ? 'bg-[#000000]' : 'bg-[#F1F4F9]'
            }`}
          >
            <ArchitectureGuide />
          </div>
        )}
      </main>
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
