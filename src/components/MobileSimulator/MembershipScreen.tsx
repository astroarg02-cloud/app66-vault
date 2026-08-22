import React from 'react';
import { Clock } from 'lucide-react';
import { UserProfile } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface MembershipScreenProps {
  currentUser: UserProfile;
}

export const MembershipScreen: React.FC<MembershipScreenProps> = () => {
  const { isDark } = useTheme();

  return (
    <div
      className={`h-full flex flex-col items-center justify-center p-6 relative overflow-hidden select-none transition-colors duration-300 ${
        isDark ? 'bg-black text-white' : 'bg-[#F8FAFC] text-[#0F172A]'
      }`}
    >
      {/* Subtle Background Glow in Vibrant Blue */}
      <div className="absolute w-64 h-64 bg-[#0066FF]/10 rounded-full blur-3xl pointer-events-none -top-12 left-1/2 -translate-x-1/2" />
      <div className="absolute w-48 h-48 bg-[#0066FF]/5 rounded-full blur-2xl pointer-events-none bottom-10 left-1/2 -translate-x-1/2" />

      <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-xs">
        {/* Minimalist Icon Badge */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-colors ${
            isDark
              ? 'bg-[#0A0A0C] border-[#1E1E24] shadow-[0_0_30px_-5px_rgba(0,102,255,0.35)]'
              : 'bg-white border-blue-100 shadow-lg shadow-blue-500/10'
          }`}
        >
          <Clock className="w-8 h-8 text-[#0066FF]" />
        </div>

        {/* PRÓXIMAMENTE en Mayúsculas y Alto Contraste */}
        <div className="space-y-2">
          <h1
            className={`text-3xl sm:text-4xl font-black tracking-[0.25em] uppercase transition-colors ${
              isDark
                ? 'text-white drop-shadow-[0_0_20px_rgba(0,102,255,0.4)]'
                : 'text-[#0F172A] drop-shadow-sm'
            }`}
          >
            PRÓXIMAMENTE
          </h1>
          <div className="w-12 h-1 bg-[#0066FF] rounded-full mx-auto" />
        </div>
      </div>
    </div>
  );
};
