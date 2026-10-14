import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, CheckCircle2, Database, Lock } from 'lucide-react';
import defaultPackImage from '../assets/images/pack_seis6_loading_1791943905362.jpg';

interface CircularStartupLoaderProps {
  progress: number;
  statusText: string;
  itemCount: number;
  isReady: boolean;
  imageUrl?: string;
  onAnimationComplete?: () => void;
}

export const CircularStartupLoader: React.FC<CircularStartupLoaderProps> = ({
  progress,
  statusText,
  itemCount,
  isReady,
  imageUrl,
  onAnimationComplete,
}) => {
  // Smoothly interpolated progress for ultra-fluid rendering
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [imgError, setImgError] = useState(false);

  const displayImage = imgError
    ? '/pack_seis6.jpg'
    : (imageUrl || defaultPackImage || '/pack_seis6.jpg');

  useEffect(() => {
    let animationFrameId: number;
    const target = Math.min(100, Math.max(0, progress));

    const step = () => {
      setAnimatedProgress((prev) => {
        const diff = target - prev;
        if (Math.abs(diff) < 0.35) {
          return target;
        }
        // Smooth proportional ease
        const next = prev + diff * 0.16;
        return next;
      });
      if (Math.abs(target - animatedProgress) >= 0.35) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [progress, animatedProgress]);

  // SVG circular dimensions tailored for the 1:1 artwork
  const size = 236;
  const strokeWidth = 7;
  const center = size / 2;
  const radius = center - strokeWidth - 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  const isCompleted = animatedProgress >= 99 && isReady;

  useEffect(() => {
    if (isCompleted && !isExiting) {
      const exitTimer = setTimeout(() => {
        setIsExiting(true);
        const doneTimer = setTimeout(() => {
          onAnimationComplete?.();
        }, 450);
        return () => clearTimeout(doneTimer);
      }, 550);
      return () => clearTimeout(exitTimer);
    }
  }, [isCompleted, isExiting, onAnimationComplete]);

  return (
    <div
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-[#040508] text-white select-none overflow-hidden px-4 transition-all duration-500 ease-out ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none filter blur-sm' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient background glow created from the attached artwork */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <img
          src={displayImage}
          alt=""
          referrerPolicy="no-referrer"
          className="absolute w-[420px] h-[420px] object-cover rounded-full blur-[110px] opacity-35 scale-125"
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] bg-[#0066FF]/25 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-400/15 rounded-full blur-[90px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#040508_85%)]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
        {/* Brand Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-2 mb-6"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0066FF] to-blue-700 flex items-center justify-center text-white shadow-lg shadow-[#0066FF]/35 ring-1 ring-white/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-widest uppercase text-white/95 font-mono">
              BÓVEDA PRIVADA SEIS6
            </span>
            <span className="text-[10px] text-white/45 tracking-wider font-mono">
              SECURE STORAGE & SYNC
            </span>
          </div>
        </motion.div>

        {/* Circular Loading Ring Container with Central Artwork */}
        <div className="relative flex items-center justify-center my-2">
          {/* Outer rotating decorative dashed ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            className="absolute w-[266px] h-[266px] rounded-full border border-dashed border-[#0066FF]/35 pointer-events-none"
          />

          {/* Outer subtle glowing halo */}
          <div className="absolute w-[252px] h-[252px] rounded-full border border-white/[0.08] pointer-events-none shadow-[inset_0_0_35px_rgba(0,102,255,0.2)]" />

          {/* SVG Progress Circle */}
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90 drop-shadow-[0_0_22px_rgba(0,102,255,0.6)] z-20 pointer-events-none"
          >
            <defs>
              <linearGradient id="vaultCircleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0066FF" />
                <stop offset="50%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
              <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Inactive Track Ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Active Animated Progress Arc */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="url(#vaultCircleGradient)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{
                transition: 'stroke-dashoffset 0.12s ease-out',
              }}
              filter="url(#glowFilter)"
            />
          </svg>

          {/* Center Content: User's Attached Image Framed Crisp and Unobscured */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="relative w-[190px] h-[190px] rounded-full overflow-hidden ring-2 ring-white/20 shadow-[0_0_35px_rgba(0,102,255,0.4)] bg-[#050811] flex items-center justify-center">
              {/* Image with subtle breathing scale */}
              <motion.img
                src={displayImage}
                alt="SEIS 6 Pack"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-full h-full object-cover"
              />

              {/* Ultra-subtle vignette at very edges to blend with circle rim */}
              <div className="absolute inset-0 rounded-full shadow-[inset_0_0_18px_rgba(0,0,0,0.7)] pointer-events-none" />
            </div>
          </div>

          {/* Floating status / percentage badge positioned gracefully at the bottom */}
          <div className="absolute -bottom-3 z-30 pointer-events-none">
            <AnimatePresence mode="wait">
              {isCompleted ? (
                <motion.div
                  key="done"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                  className="flex items-center justify-center"
                >
                  <div className="px-3.5 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md border border-emerald-300 text-white flex items-center gap-1.5 shadow-xl shadow-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span className="text-[11px] font-black font-mono tracking-wider uppercase">
                      ¡Listo!
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center"
                >
                  <div className="backdrop-blur-md bg-[#050914]/90 px-3.5 py-1 rounded-full border border-blue-400/40 shadow-xl shadow-blue-900/50 flex items-baseline justify-center gap-0.5">
                    <span className="text-sm font-black font-mono text-white tracking-tight drop-shadow-md">
                      {Math.round(animatedProgress)}
                    </span>
                    <span className="text-[10px] font-bold font-mono text-[#38BDF8]">
                      %
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Dynamic Status Display */}
        <div className="mt-8 flex flex-col items-center text-center px-4 w-full">
          <div className="flex items-center gap-2 mb-1.5">
            {!isCompleted ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0066FF] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#38BDF8]" />
              </span>
            ) : (
              <span className="inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            )}
            <p className="text-sm font-semibold text-white tracking-tight">
              {statusText}
            </p>
          </div>

          <p className="text-xs text-white/50 max-w-[280px]">
            {isCompleted
              ? 'Todos los archivos han sido cargados e indexados con éxito.'
              : 'Sincronizando archivos y base de datos de la bóveda...'}
          </p>

          {/* Files counter badge when files are indexed */}
          {itemCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center gap-2 text-[11px] font-mono text-white/75 shadow-sm"
            >
              <Database className="w-3 h-3 text-[#38BDF8]" />
              <span>
                <strong className="text-white font-semibold">{itemCount}</strong> archivos detectados
              </span>
            </motion.div>
          )}
        </div>

        {/* Bottom Security Assurance */}
        <div className="mt-8 flex items-center gap-1.5 text-[10px] font-mono text-white/35 uppercase tracking-widest">
          <Lock className="w-3 h-3" />
          <span>Conexión Segura &bull; Cifrado AES-256</span>
        </div>
      </div>
    </div>
  );
};
