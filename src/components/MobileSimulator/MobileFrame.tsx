import React, { useState } from 'react';
import { 
  FolderClosed, FolderOpen, ShieldCheck, ShieldAlert, Clock,
  User, UserCheck, Wifi, Battery, Signal, Smartphone, Lock, CheckCircle2, XCircle
} from 'lucide-react';
import { VaultItem, UserProfile } from '../../types';
import { AuthScreen } from './AuthScreen';
import { VaultScreen } from './VaultScreen';
import { VaultDetailModal } from './VaultDetailModal';
import { MembershipScreen } from './MembershipScreen';
import { ProfileScreen } from './ProfileScreen';
import { AdminUploadModal } from './AdminUploadModal';
import { INITIAL_ADMIN_USER, INITIAL_MEMBER_USER } from '../../data/initialVaultData';
import { VerifiedBadge } from '../VerifiedBadge';
import { useTheme } from '../../context/ThemeContext';

interface MobileFrameProps {
  items: VaultItem[];
  currentUser: UserProfile | null;
  onLogin: (user: UserProfile) => void;
  onLogout: () => void;
  onToggleLike: (itemId: string) => void;
  onAddComment: (itemId: string, text: string) => void;
  onUploadItem: (newItem: Omit<VaultItem, 'id' | 'createdAt' | 'likesCount' | 'likedBy' | 'comments'>) => void;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  items,
  currentUser,
  onLogin,
  onLogout,
  onToggleLike,
  onAddComment,
  onUploadItem,
}) => {
  const [currentTab, setCurrentTab] = useState<'vault' | 'membership' | 'profile'>('vault');
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [showAdminUpload, setShowAdminUpload] = useState(false);
  const { isDark } = useTheme();

  // Sync selectedItem if item list updates (e.g. Likes or comments added)
  const activeDetailItem = selectedItem
    ? items.find((i) => i.id === selectedItem.id) || selectedItem
    : null;

  return (
    <div className="relative flex flex-col items-center justify-center p-2 sm:p-4 space-y-4">
      {/* Quick Role Testing Control Bar */}
      {currentUser && (
        <div
          className={`flex flex-wrap items-center justify-center gap-3 p-2 rounded-2xl max-w-lg w-full transition-colors border ${
            isDark
              ? 'bg-[#0A0A0C] border-[#1E1E24]'
              : 'bg-white border-[#E2E8F0] shadow-sm'
          }`}
        >
          <span
            className={`text-[11px] font-bold uppercase tracking-wider pl-2 ${
              isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'
            }`}
          >
            Control de Rol Activo:
          </span>

          <div className="flex items-center gap-1.5">
            <button
              id="role-switch-admin"
              onClick={() => onLogin(INITIAL_ADMIN_USER)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentUser.role === 'admin'
                  ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                  : isDark
                  ? 'bg-[#121216] text-[#8E8E93] hover:text-white border border-[#1E1E24]'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0]'
              }`}
            >
              <VerifiedBadge className="w-3.5 h-3.5" />
              <span>Admin (Sube Material)</span>
            </button>

            <button
              id="role-switch-member"
              onClick={() => onLogin(INITIAL_MEMBER_USER)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentUser.role === 'vip_member'
                  ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                  : isDark
                  ? 'bg-[#121216] text-[#8E8E93] hover:text-white border border-[#1E1E24]'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Miembro VIP (Solo Lee/Descarga)</span>
            </button>
          </div>
        </div>
      )}

      {/* Device Frame */}
      <div 
        id="mobile-device-frame"
        className={`w-full max-w-[390px] h-[780px] rounded-[48px] p-3 flex flex-col relative overflow-hidden select-none transition-all duration-300 ${
          isDark
            ? 'bg-black shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_12px_#121216,0_0_0_14px_#1E1E24] border border-[#2A2A32]'
            : 'bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15),0_0_0_12px_#E2E8F0,0_0_0_14px_#CBD5E1] border border-[#CBD5E1]'
        }`}
      >
        {/* Mobile Screen Area */}
        <div
          className={`w-full h-full rounded-[38px] flex flex-col overflow-hidden relative border transition-colors duration-300 ${
            isDark ? 'bg-black border-[#1E1E24]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
          }`}
        >
          
          {/* iOS / Android Status Bar */}
          <div
            className={`h-10 px-6 pt-2 flex items-center justify-between text-[11px] font-semibold z-40 shrink-0 transition-colors ${
              isDark ? 'bg-black text-white' : 'bg-[#F8FAFC] text-[#0F172A]'
            }`}
          >
            <span>20:45</span>

            {/* Dynamic Island / Notch */}
            <div
              className={`w-24 h-4 rounded-full flex items-center justify-center gap-1.5 border transition-colors ${
                isDark
                  ? 'bg-[#0A0A0C] border-[#1E1E24]'
                  : 'bg-[#E2E8F0] border-[#CBD5E1]'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isDark ? 'bg-[#121216]' : 'bg-[#94A3B8]'
                }`}
              />
              <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
            </div>

            <div className="flex items-center gap-1.5">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <Battery className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Screen Content */}
          <div className="flex-1 relative overflow-hidden">
            {!currentUser ? (
              <AuthScreen onLogin={onLogin} />
            ) : (
              <>
                {/* Active Tab Screen */}
                <div className="h-full">
                  {currentTab === 'vault' && (
                    <VaultScreen
                      items={items}
                      currentUser={currentUser}
                      onSelectItem={(item) => setSelectedItem(item)}
                      onOpenAdminUpload={() => {
                        if (currentUser.role === 'admin') {
                          setShowAdminUpload(true);
                        }
                      }}
                    />
                  )}
                  {currentTab === 'membership' && (
                    <MembershipScreen currentUser={currentUser} />
                  )}
                  {currentTab === 'profile' && (
                    <ProfileScreen
                      currentUser={currentUser}
                      onLogout={() => {
                        setSelectedItem(null);
                        onLogout();
                      }}
                      onSwitchUser={onLogin}
                    />
                  )}
                </div>

                {/* Vault Item Detail Overlay */}
                {activeDetailItem && (
                  <VaultDetailModal
                    item={activeDetailItem}
                    currentUser={currentUser}
                    onClose={() => setSelectedItem(null)}
                    onToggleLike={onToggleLike}
                    onAddComment={onAddComment}
                  />
                )}

                {/* Admin Upload Modal */}
                {currentUser.role === 'admin' && (
                  <AdminUploadModal
                    isOpen={showAdminUpload}
                    onClose={() => setShowAdminUpload(false)}
                    onUpload={onUploadItem}
                  />
                )}
              </>
            )}
          </div>

          {/* Bottom Navigation Bar (Only if user is authenticated) */}
          {currentUser && (
            <div 
              id="mobile-bottom-nav"
              className={`h-16 px-6 flex items-center justify-around z-20 shrink-0 border-t transition-colors duration-300 ${
                isDark
                  ? 'bg-black border-[#1E1E24]'
                  : 'bg-white border-[#E2E8F0] shadow-sm'
              }`}
            >
              {/* Tab 1: Bóveda */}
              <button
                id="nav-tab-vault"
                onClick={() => {
                  setSelectedItem(null);
                  setCurrentTab('vault');
                }}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  currentTab === 'vault'
                    ? 'text-[#0066FF]'
                    : isDark
                    ? 'text-[#5A5A62] hover:text-[#8E8E93]'
                    : 'text-[#94A3B8] hover:text-[#64748B]'
                }`}
              >
                {currentTab === 'vault' ? (
                  <FolderOpen className="w-5 h-5" />
                ) : (
                  <FolderClosed className="w-5 h-5" />
                )}
                <span className="text-[10px] font-semibold">Bóveda</span>
              </button>

              {/* Tab 2: Próximamente */}
              <button
                id="nav-tab-membership"
                onClick={() => {
                  setSelectedItem(null);
                  setCurrentTab('membership');
                }}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  currentTab === 'membership'
                    ? 'text-[#0066FF]'
                    : isDark
                    ? 'text-[#5A5A62] hover:text-[#8E8E93]'
                    : 'text-[#94A3B8] hover:text-[#64748B]'
                }`}
              >
                <Clock className="w-5 h-5" />
                <span className="text-[10px] font-semibold">Próximamente</span>
              </button>

              {/* Tab 3: Perfil */}
              <button
                id="nav-tab-profile"
                onClick={() => {
                  setSelectedItem(null);
                  setCurrentTab('profile');
                }}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  currentTab === 'profile'
                    ? 'text-[#0066FF]'
                    : isDark
                    ? 'text-[#5A5A62] hover:text-[#8E8E93]'
                    : 'text-[#94A3B8] hover:text-[#64748B]'
                }`}
              >
                {currentTab === 'profile' ? (
                  <UserCheck className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
                <span className="text-[10px] font-semibold">Perfil</span>
              </button>
            </div>
          )}

          {/* Home Bar Indicator */}
          <div
            className={`h-4 flex items-center justify-center z-40 shrink-0 transition-colors ${
              isDark ? 'bg-black' : 'bg-white'
            }`}
          >
            <div
              className={`w-32 h-1 rounded-full ${
                isDark ? 'bg-[#2A2A32]' : 'bg-[#CBD5E1]'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
