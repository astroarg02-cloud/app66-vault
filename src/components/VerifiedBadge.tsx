import React from 'react';
import { motion } from 'motion/react';

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
  title?: string;
  animate?: boolean;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  className = 'w-4 h-4',
  size,
  title = 'Administrador Verificado',
  animate = true,
}) => {
  return (
    <motion.span 
      whileHover={{ scale: 1.22, rotate: 6 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`inline-flex items-center justify-center align-middle cursor-pointer ${
        animate ? 'animate-badge-pop' : ''
      }`}
      title={title}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`inline-block shrink-0 select-none ${animate ? 'animate-verified-pulse' : ''} ${className}`}
        style={size ? { width: size, height: size } : undefined}
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        <defs>
          <linearGradient id="verifiedBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2B82FF" />
            <stop offset="100%" stopColor="#0052E0" />
          </linearGradient>
        </defs>
        {/* 10-point starburst / scalloped badge */}
        <path
          d="M12 1.75L14.7 4.1L18.25 3.3L19.7 6.6L23 8L22.2 11.55L23.9 14.5L21.1 16.85L20.35 20.4L16.8 20.1L14.45 22.85L12 21.65L9.55 22.85L7.2 20.1L3.65 20.4L2.9 16.85L0.1 14.5L1.8 11.55L1 8L4.3 6.6L5.75 3.3L9.3 4.1L12 1.75Z"
          fill="url(#verifiedBlueGrad)"
        />
        {/* Bold White Checkmark in Center */}
        <path
          d="M10.2 15.6L6.4 11.8L7.8 10.4L10.2 12.8L16.2 6.8L17.6 8.2L10.2 15.6Z"
          fill="#FFFFFF"
          stroke="#FFFFFF"
          strokeWidth="0.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </motion.span>
  );
};
