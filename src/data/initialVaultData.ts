import { VaultItem, UserProfile } from '../types';

export const ADMIN_AUTHORIZED_EMAIL = 'astroarg02@gmail.com';
export const ADMIN_SECURITY_KEY = '360';

export const isAuthorizedAdminKey = (key?: string | null): boolean => {
  if (!key) return false;
  return key.trim() === ADMIN_SECURITY_KEY;
};

export const isAuthorizedAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_AUTHORIZED_EMAIL.toLowerCase();
};

export const INITIAL_ADMIN_USER: UserProfile = {
  uid: 'admin_master_astro',
  email: 'astroarg02@gmail.com',
  displayName: 'Administrador (astroarg02)',
  role: 'admin',
  joinedAt: '2025-01-01',
  tier: 'Bóveda Diamante',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
};

export const INITIAL_MEMBER_USER: UserProfile = {
  uid: 'vip_user_449',
  email: 'vip.member@privatehub.io',
  displayName: 'Alex Vance',
  role: 'vip_member',
  joinedAt: '2025-02-14',
  tier: 'Acceso VIP',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
};

export const INITIAL_VAULT_ITEMS: VaultItem[] = [
  {
    id: 'res_001_clean_arch',
    title: 'Core Clean Architecture & State Management Template',
    description: 'Estructura modular lista para producción con Feature-First, manejo centralizado de errores, AsyncValue y repositorios abstractos independientes de framework.',
    category: 'code',
    fileType: 'ZIP Archivo / Código',
    fileName: 'clean_architecture_template.zip',
    fileMimeType: 'application/zip',
    fileSize: '4.8 MB',
    downloadUrl: '#download_zip',
    coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    createdAt: '2025-02-15',
    likesCount: 38,
    likedBy: ['admin_master_astro'],
    version: 'v2.5',
    author: {
      name: 'Administrador (astroarg02)',
      badge: 'Admin Master',
    },
    comments: [
      {
        id: 'comm_1',
        userId: 'vip_user_449',
        userDisplayName: 'Alex Vance',
        userRole: 'vip_member',
        userTier: 'Acceso VIP',
        text: '¡Excelente estructura! El archivo mantiene su formato limpio y directo.',
        createdAt: 'Hace 2 horas',
      },
    ],
  },
  {
    id: 'res_002_firebase_sync',
    title: 'Motor de Sincronización Cloud Firestore & Storage Offline',
    description: 'Controlador robusto con persistencia local en base de datos, sincronización bidireccional y resolución automática de conflictos para sistemas de alta concurrencia.',
    category: 'code',
    fileType: 'ZIP Archivo / Módulo',
    fileName: 'motor_sincronizacion_cloud.zip',
    fileMimeType: 'application/zip',
    fileSize: '8.2 MB',
    downloadUrl: '#download_zip',
    coverImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
    createdAt: '2025-02-18',
    likesCount: 29,
    likedBy: ['admin_master_astro', 'vip_user_449'],
    version: 'v1.4',
    author: {
      name: 'Administrador (astroarg02)',
      badge: 'Admin Master',
    },
    comments: [
      {
        id: 'comm_2',
        userId: 'admin_master_astro',
        userDisplayName: 'Administrador (astroarg02)',
        userRole: 'admin',
        userTier: 'Bóveda Diamante',
        text: 'Actualizado con reintentos exponenciales y validación de tokens.',
        createdAt: 'Ayer',
      },
    ],
  },
  {
    id: 'res_003_ui_kit',
    title: 'Dark Neumorphic UI Kit & Assets Vectoriales Premium',
    description: 'Colección de más de 40 componentes visuales estilizados con efectos de blur, paletas cromáticas neutras, micro-interacciones táctiles y presets de diseño.',
    category: 'preset',
    fileType: 'ZIP Paquete UI',
    fileName: 'dark_neumorphic_ui_kit.zip',
    fileMimeType: 'application/zip',
    fileSize: '12.4 MB',
    downloadUrl: '#download_zip',
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    createdAt: '2025-02-20',
    likesCount: 54,
    likedBy: ['admin_master_astro'],
    version: 'v3.0',
    author: {
      name: 'Administrador (astroarg02)',
      badge: 'Admin Master',
    },
    comments: [],
  },
  {
    id: 'res_004_security_doc',
    title: 'Guía Maestra de Ciberseguridad, Ofuscación R8 y Encriptación',
    description: 'Documento técnico integral con configuración de ProGuard, SSL Pinning, detección de intrusión y encriptación AES-256 en memoria para el despliegue seguro.',
    category: 'document',
    fileType: 'PDF Documento Encriptado',
    fileName: 'guia_ciberseguridad_ofuscacion.pdf',
    fileMimeType: 'application/pdf',
    fileSize: '2.3 MB',
    downloadUrl: '#download_zip',
    coverImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
    createdAt: '2025-02-22',
    likesCount: 41,
    likedBy: ['admin_master_astro'],
    version: 'v1.0',
    author: {
      name: 'Administrador (astroarg02)',
      badge: 'Admin Master',
    },
    comments: [],
  },
];
