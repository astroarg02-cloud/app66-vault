import React, { useState } from 'react';
import { 
  FolderClosed, FolderOpen, ShieldCheck, ShieldAlert, Clock,
  User, UserCheck, Wifi, Battery, Signal, Smartphone, Lock, CheckCircle2, XCircle,
  Crown, FileText
} from 'lucide-react';
import { VaultItem, UserProfile } from '../../types';
import { AuthScreen } from './AuthScreen';
import { VaultScreen } from './VaultScreen';
import { VaultDetailModal } from './VaultDetailModal';
import { MembershipScreen } from './MembershipScreen';
import { ReceiptsScreen } from './ReceiptsScreen';
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
  const [deviceOS, setDeviceOS] = useState<'iphone' | 'android'>('iphone');
  const [currentTab, setCurrentTab] = useState<'vault' | 'membership' | 'receipts' | 'profile'>('vault');
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [showAdminUpload, setShowAdminUpload] = useState(false);
  const { isDark } = useTheme();

  // Sync selectedItem if item list updates (e.g. Likes or comments added)
  const activeDetailItem = selectedItem
    ? items.find((i) => i.id === selectedItem.id) || selectedItem
    : null;

  return (
    <div className="relative flex flex-col items-center justify-center p-2 sm:p-4 space-y-4">
      {/* Device Switcher Control Bar */}
      <div className="flex flex-wrap items-center justify-center gap-3 max-w-xl w-full">
        {/* Device Switcher (iPhone vs Android) */}
        <div
          className={`flex items-center gap-1.5 p-1 rounded-2xl border transition-colors ${
            isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0] shadow-sm'
          }`}
        >
          <button
            id="device-switch-iphone"
            onClick={() => setDeviceOS('iphone')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              deviceOS === 'iphone'
                ? 'bg-black text-white border border-white/20 shadow-md'
                : isDark
                ? 'text-[#8E8E93] hover:text-white'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span>iPhone 16 Pro (iOS)</span>
          </button>

          <button
            id="device-switch-android"
            onClick={() => setDeviceOS('android')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              deviceOS === 'android'
                ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                : isDark
                ? 'text-[#8E8E93] hover:text-white'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Android (APK)</span>
          </button>
        </div>
      </div>

      {/* Device Frame (Titanium iPhone or Sleek Android) */}
      <div 
        id="mobile-device-frame"
        className={`w-full max-w-[390px] h-[780px] flex flex-col relative overflow-hidden select-none transition-all duration-300 ${
          deviceOS === 'iphone'
            ? 'rounded-[50px] p-3'
            : 'rounded-[36px] p-2.5'
        } ${
          isDark
            ? deviceOS === 'iphone'
              ? 'bg-black shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_12px_#1c1c1e,0_0_0_14px_#2c2c2e] border border-[#3A3A44]'
              : 'bg-black shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_10px_#121216,0_0_0_12px_#1E1E24] border border-[#2A2A32]'
            : deviceOS === 'iphone'
            ? 'bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15),0_0_0_12px_#D1D5DB,0_0_0_14px_#9CA3AF] border border-[#9CA3AF]'
            : 'bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15),0_0_0_10px_#E2E8F0,0_0_0_12px_#CBD5E1] border border-[#CBD5E1]'
        }`}
      >
        {/* Mobile Screen Area */}
        <div
          className={`w-full h-full flex flex-col overflow-hidden relative border transition-colors duration-300 ${
            deviceOS === 'iphone' ? 'rounded-[40px]' : 'rounded-[28px]'
          } ${
            isDark ? 'bg-black border-[#1E1E24]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
          }`}
        >
          
          {/* Status Bar (iPhone Dynamic Island vs Android Punch-Hole) */}
          <div
            className={`h-11 px-6 pt-2 flex items-center justify-between text-[11px] font-semibold z-40 shrink-0 transition-colors ${
              isDark ? 'bg-black text-white' : 'bg-[#F8FAFC] text-[#0F172A]'
            }`}
          >
            <span className="font-mono">{deviceOS === 'iphone' ? '9:41' : '10:00'}</span>

            {/* Dynamic Island for iPhone OR Punch-Hole for Android */}
            {deviceOS === 'iphone' ? (
              <div
                className={`w-24 h-4 rounded-full flex items-center justify-center gap-1.5 border transition-colors ${
                  isDark
                    ? 'bg-[#0A0A0C] border-[#1E1E24]'
                    : 'bg-[#E2E8F0] border-[#CBD5E1]'
                }`}
                title="Apple Dynamic Island (iOS 18)"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isDark ? 'bg-[#121216]' : 'bg-[#94A3B8]'
                  }`}
                />
                <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
              </div>
            ) : (
              <div
                className="w-3.5 h-3.5 rounded-full bg-black border border-[#2A2A32]"
                title="Android Camera Hole"
              />
            )}

            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-[9px] uppercase tracking-tighter opacity-80">
                {deviceOS === 'iphone' ? '5G' : '4G+'}
              </span>
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
                    <MembershipScreen 
                      currentUser={currentUser}
                      onNavigateToVault={() => setCurrentTab('vault')}
                      onNavigateToReceipts={() => setCurrentTab('receipts')}
                    />
                  )}
                  {currentTab === 'receipts' && (
                    <ReceiptsScreen 
                      currentUser={currentUser}
                      onNavigateToMembership={() => setCurrentTab('membership')}
                      onNavigateToVault={() => setCurrentTab('vault')}
                    />
                  )}
                  {currentTab === 'profile' && (
                    <ProfileScreen
                      currentUser={currentUser}
                      onLogout={() => {
                        setSelectedItem(null);
                        onLogout();
                      }}
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

          {/* Bottom Navigation Bar (Home Bar / Barra de Navegación) */}
          {currentUser && (
            <div 
              id="mobile-bottom-nav"
              className={`h-16 px-4 flex items-center justify-around z-20 shrink-0 border-t transition-colors duration-300 ${
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
                    ? 'text-[#0066FF] font-bold'
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

              {/* Tab 2: Membresía */}
              <button
                id="nav-tab-membership"
                onClick={() => {
                  setSelectedItem(null);
                  setCurrentTab('membership');
                }}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  currentTab === 'membership'
                    ? 'text-[#0066FF] font-bold'
                    : isDark
                    ? 'text-[#5A5A62] hover:text-[#8E8E93]'
                    : 'text-[#94A3B8] hover:text-[#64748B]'
                }`}
              >
                <Crown className="w-5 h-5" />
                <span className="text-[10px] font-semibold">Membresía</span>
              </button>

              {/* Tab 3: Subir Comprobante */}
              <button
                id="nav-tab-receipts"
                onClick={() => {
                  setSelectedItem(null);
                  setCurrentTab('receipts');
                }}
                className={`flex flex-col items-center gap-1 transition-colors relative ${
                  currentTab === 'receipts'
                    ? 'text-[#0066FF] font-black'
                    : isDark
                    ? 'text-[#5A5A62] hover:text-[#8E8E93]'
                    : 'text-[#94A3B8] hover:text-[#64748B]'
                }`}
              >
                <div className="relative">
                  <FileText className="w-5 h-5" />
                  {currentTab !== 'receipts' && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </div>
                <span className="text-[10px] font-semibold">Comprobantes</span>
              </button>

              {/* Tab 4: Perfil */}
              <button
                id="nav-tab-profile"
                onClick={() => {
                  setSelectedItem(null);
                  setCurrentTab('profile');
                }}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  currentTab === 'profile'
                    ? 'text-[#0066FF] font-bold'
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

          {/* Home Bar Indicator (iOS Pill vs Android Gesture Pill) */}
          <div
            className={`h-5 flex items-center justify-center z-40 shrink-0 transition-colors ${
              isDark ? 'bg-black' : 'bg-white'
            }`}
          >
            {deviceOS === 'iphone' ? (
              <div
                className={`w-36 h-1 rounded-full ${
                  isDark ? 'bg-[#3A3A44]' : 'bg-[#CBD5E1]'
                }`}
                title="Barra de inicio de iPhone (iOS Home Indicator)"
              />
            ) : (
              <div
                className={`w-20 h-1 rounded-full ${
                  isDark ? 'bg-[#2A2A32]' : 'bg-[#94A3B8]'
                }`}
                title="Barra de gestos Android"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
