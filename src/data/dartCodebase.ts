import { DartCodeFile } from '../types';

export const DART_CODEBASE: DartCodeFile[] = [
  {
    path: 'pubspec.yaml',
    title: 'pubspec.yaml',
    category: 'config',
    description: 'Configuración de paquetes y dependencias oficiales de Flutter y Firebase para la Bóveda.',
    code: `name: vault_private_server
description: "Servidor Privado y Bóveda de Contenido exclusivo con Flutter y Firebase"
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.3.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # State Management
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5

  # Firebase Suite
  firebase_core: ^2.30.1
  firebase_auth: ^4.19.4
  cloud_firestore: ^4.17.3
  firebase_storage: ^11.7.5

  # Supabase Suite (PostgreSQL + Auth + Storage + RLS)
  supabase_flutter: ^2.8.0

  # Network, Downloads & System
  dio: ^5.4.3+1
  path_provider: ^2.1.3
  permission_handler: ^11.3.1
  share_plus: ^9.0.0
  flutter_downloader: ^1.11.7
  open_file: ^3.3.2

  # UI, Icons, Animations & Fonts
  lucide_icons: ^0.257.0
  google_fonts: ^6.2.1
  flutter_animate: ^4.5.0
  cached_network_image: ^3.3.1
  intl: ^0.19.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  build_runner: ^2.4.9
  riverpod_generator: ^2.4.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/
`,
  },
  {
    path: 'firestore.rules',
    title: 'firestore.rules',
    category: 'config',
    description: 'Reglas de seguridad de Firestore para Servidor Privado (solo astroarg02@gmail.com tiene permisos de Admin para subir y gestionar contenido).',
    code: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Función auxiliar para verificar autenticación
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Función para verificar si el usuario es el Administrador Único Autorizado
    function isAdmin() {
      return isAuthenticated() && 
        request.auth.token.email.lower() == 'astroarg02@gmail.com';
    }

    // Colección de Usuarios
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }

    // Colección de la Bóveda (Vault Items)
    // Solo el ADMIN (astroarg02@gmail.com) puede crear, editar o eliminar recursos
    // Cualquier usuario autenticado puede leer
    match /vault_items/{itemId} {
      allow read: if isAuthenticated();
      allow create, delete: if isAdmin();
      
      // Permitir actualizar metadatos solo al admin, O actualizar conteo de likes por usuarios
      allow update: if isAdmin() || (
        isAuthenticated() && 
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likesCount', 'likedBy'])
      );

      // Subcolección de Comentarios (Foro Privado)
      match /comments/{commentId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
        allow update, delete: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
      }
    }
  }
}
`,
  },
  {
    path: 'lib/main.dart',
    title: 'main.dart',
    category: 'core',
    description: 'Punto de entrada principal de Flutter con inicialización de Firebase, Riverpod ProviderScope y soporte de Modo Oscuro / Claro.',
    code: `import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/theme/vault_theme.dart';
import 'core/theme/theme_provider.dart';
import 'features/auth/presentation/providers/auth_provider.dart';
import 'features/auth/presentation/screens/login_screen.dart';
import 'features/navigation/presentation/main_nav_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Inicialización de Firebase
  await Firebase.initializeApp();
  
  // Bloquear orientación en vertical
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  runApp(
    const ProviderScope(
      child: VaultPrivateApp(),
    ),
  );
}

class VaultPrivateApp extends ConsumerWidget {
  const VaultPrivateApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp(
      title: 'Vault Private Server',
      debugShowCheckedModeBanner: false,
      theme: VaultTheme.lightTheme,
      darkTheme: VaultTheme.darkTheme,
      themeMode: themeMode,
      home: authState.when(
        data: (user) {
          if (user != null) {
            return const MainNavScreen();
          }
          return const LoginScreen();
        },
        loading: () => const Scaffold(
          body: Center(
            child: CircularProgressIndicator(color: VaultTheme.primaryBlue),
          ),
        ),
        error: (err, stack) => const LoginScreen(),
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/core/theme/theme_provider.dart',
    title: 'theme_provider.dart',
    category: 'core',
    description: 'Gestor de estado Riverpod para alternar reactivamente entre Modo Oscuro y Modo Claro.',
    code: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, ThemeMode>((ref) {
  return ThemeModeNotifier();
});

class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  ThemeModeNotifier() : super(ThemeMode.dark);

  void toggleTheme() {
    state = state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
  }

  void setTheme(ThemeMode mode) {
    state = mode;
  }

  bool get isDarkMode => state == ThemeMode.dark;
}
`,
  },
  {
    path: 'lib/core/theme/vault_theme.dart',
    title: 'vault_theme.dart',
    category: 'core',
    description: 'Temas visuales duales: Negro Profundo (#000000) / Slate Claro (#FFFFFF) con Azul Vibrante (#0066FF).',
    code: `import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class VaultTheme {
  // Paleta de Colores Exclusiva
  static const Color backgroundBlack = Color(0xFF000000);
  static const Color surfaceBlack = Color(0xFF0A0A0C);
  static const Color cardBlack = Color(0xFF121216);
  static const Color borderSubtle = Color(0xFF1E1E24);
  
  static const Color backgroundLight = Color(0xFFF8FAFC);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color cardLight = Color(0xFFFFFFFF);
  static const Color borderLight = Color(0xFFE2E8F0);

  static const Color primaryBlue = Color(0xFF0066FF);
  static const Color vibrantBlueLight = Color(0xFF3385FF);
  static const Color accentBlueGlow = Color(0xFF0052FF);

  static const Color textPrimaryDark = Color(0xFFFFFFFF);
  static const Color textSecondaryDark = Color(0xFF8E8E93);
  static const Color textMutedDark = Color(0xFF5A5A62);

  static const Color textPrimaryLight = Color(0xFF0F172A);
  static const Color textSecondaryLight = Color(0xFF64748B);
  static const Color textMutedLight = Color(0xFF94A3B8);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: backgroundBlack,
      primaryColor: primaryBlue,
      canvasColor: backgroundBlack,
      cardColor: cardBlack,
      
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).copyWith(
        displayLarge: GoogleFonts.inter(
          color: textPrimaryDark,
          fontSize: 28,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.5,
        ),
        titleLarge: GoogleFonts.inter(
          color: textPrimaryDark,
          fontSize: 20,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.3,
        ),
        bodyLarge: GoogleFonts.inter(
          color: textPrimaryDark,
          fontSize: 16,
          fontWeight: FontWeight.w400,
          height: 1.5,
        ),
        bodyMedium: GoogleFonts.inter(
          color: textSecondaryDark,
          fontSize: 14,
          fontWeight: FontWeight.w400,
          height: 1.4,
        ),
      ),

      appBarTheme: const AppBarTheme(
        backgroundColor: backgroundBlack,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: textPrimaryDark),
      ),

      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: backgroundBlack,
        selectedItemColor: primaryBlue,
        unselectedItemColor: textMutedDark,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        showSelectedLabels: true,
        showUnselectedLabels: true,
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryBlue,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: backgroundLight,
      primaryColor: primaryBlue,
      canvasColor: backgroundLight,
      cardColor: cardLight,
      
      textTheme: GoogleFonts.interTextTheme(ThemeData.light().textTheme).copyWith(
        displayLarge: GoogleFonts.inter(
          color: textPrimaryLight,
          fontSize: 28,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.5,
        ),
        titleLarge: GoogleFonts.inter(
          color: textPrimaryLight,
          fontSize: 20,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.3,
        ),
        bodyLarge: GoogleFonts.inter(
          color: textPrimaryLight,
          fontSize: 16,
          fontWeight: FontWeight.w400,
          height: 1.5,
        ),
        bodyMedium: GoogleFonts.inter(
          color: textSecondaryLight,
          fontSize: 14,
          fontWeight: FontWeight.w400,
          height: 1.4,
        ),
      ),

      appBarTheme: const AppBarTheme(
        backgroundColor: surfaceLight,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: textPrimaryLight),
      ),

      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: surfaceLight,
        selectedItemColor: primaryBlue,
        unselectedItemColor: textMutedLight,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        showSelectedLabels: true,
        showUnselectedLabels: true,
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryBlue,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/core/services/download_service.dart',
    title: 'download_service.dart',
    category: 'core',
    description: 'Servicio de descarga de archivos multimedia a almacenamiento local mediante Dio y notificaciones de progreso.',
    code: `import 'dart:io';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';

class DownloadService {
  final Dio _dio = Dio();

  Future<String?> downloadFile({
    required String fileUrl,
    required String fileName,
    required void Function(int received, int total) onProgress,
  }) async {
    try {
      // Solicitar permisos de almacenamiento si es necesario en Android
      if (Platform.isAndroid) {
        final status = await Permission.storage.request();
        if (!status.isGranted) {
          // Si es Android 13+ o no requiere storage directo, continúa
        }
      }

      Directory? directory;
      if (Platform.isAndroid) {
        directory = await getExternalStorageDirectory();
      } else {
        directory = await getApplicationDocumentsDirectory();
      }

      final savePath = '\${directory?.path}/$fileName';

      await _dio.download(
        fileUrl,
        savePath,
        onReceiveProgress: onProgress,
      );

      return savePath;
    } catch (e) {
      print('Error al descargar archivo: $e');
      rethrow;
    }
  }
}
`,
  },
  {
    path: 'lib/core/services/share_service.dart',
    title: 'share_service.dart',
    category: 'core',
    description: 'Servicio de invitación e integración con share_plus para compartir recursos del servidor privado.',
    code: `import 'package:share_plus/share_plus.dart';

class ShareService {
  static Future<void> shareVaultInvite({
    required String resourceTitle,
    required String resourceId,
  }) async {
    final message = '''
🔒 ACCESO PRIVADO A LA BÓVEDA
Recurso: "$resourceTitle"

Has sido invitado a consultar este archivo exclusivo en nuestro servidor privado.
Ingresa con tus credenciales autorizadas en la aplicación:
https://vault.privateserver.io/r/$resourceId
''';

    await Share.share(
      message,
      subject: 'Invitación Privada: $resourceTitle',
    );
  }
}
`,
  },
  {
    path: 'lib/features/auth/domain/models/user_model.dart',
    title: 'user_model.dart',
    category: 'auth',
    description: 'Modelo de usuario autenticado con roles de Administrador o Miembro VIP.',
    code: `class AppUser {
  final String uid;
  final String email;
  final String displayName;
  final String role; // 'admin' | 'vip_member'
  final String tier; // 'Bóveda Diamante' | 'Acceso VIP'
  final DateTime createdAt;

  AppUser({
    required this.uid,
    required this.email,
    required this.displayName,
    required this.role,
    this.tier = 'Acceso VIP',
    required this.createdAt,
  });

  bool get isAdmin => role == 'admin';

  factory AppUser.fromMap(Map<String, dynamic> map, String uid) {
    return AppUser(
      uid: uid,
      email: map['email'] ?? '',
      displayName: map['displayName'] ?? 'Miembro VIP',
      role: map['role'] ?? 'vip_member',
      tier: map['tier'] ?? 'Acceso VIP',
      createdAt: map['createdAt'] != null
          ? DateTime.parse(map['createdAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'email': email,
      'displayName': displayName,
      'role': role,
      'tier': tier,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
`,
  },
  {
    path: 'lib/features/auth/data/auth_repository.dart',
    title: 'auth_repository.dart',
    category: 'auth',
    description: 'Repositorio Firebase Auth y sincronización del perfil en Firestore.',
    code: `import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../domain/models/user_model.dart';

class AuthRepository {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  
  // Correo único con privilegios de Administrador
  static const String authorizedAdminEmail = 'astroarg02@gmail.com';

  bool isAuthorizedAdmin(String email) {
    return email.trim().toLowerCase() == authorizedAdminEmail.toLowerCase();
  }

  Stream<User?> get authStateChanges => _auth.authStateChanges();

  Future<AppUser?> getCurrentUserData() async {
    final currentFirebaseUser = _auth.currentUser;
    if (currentFirebaseUser == null) return null;

    final doc = await _firestore.collection('users').doc(currentFirebaseUser.uid).get();
    if (doc.exists && doc.data() != null) {
      return AppUser.fromMap(doc.data()!, currentFirebaseUser.uid);
    }
    return null;
  }

  Future<AppUser> signInWithEmailPassword(String email, String password) async {
    final credential = await _auth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    final uid = credential.user!.uid;
    final doc = await _firestore.collection('users').doc(uid).get();

    if (doc.exists && doc.data() != null) {
      return AppUser.fromMap(doc.data()!, uid);
    } else {
      final bool isAdmin = isAuthorizedAdmin(email);
      final newUser = AppUser(
        uid: uid,
        email: email,
        displayName: email.split('@').first,
        role: isAdmin ? 'admin' : 'vip_member',
        tier: isAdmin ? 'Bóveda Diamante' : 'Acceso VIP',
        createdAt: DateTime.now(),
      );
      await _firestore.collection('users').doc(uid).set(newUser.toMap());
      return newUser;
    }
  }

  Future<AppUser> registerWithEmailPassword(String email, String password, String displayName) async {
    final credential = await _auth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    final uid = credential.user!.uid;
    final bool isAdmin = isAuthorizedAdmin(email);
    final newUser = AppUser(
      uid: uid,
      email: email,
      displayName: displayName,
      role: isAdmin ? 'admin' : 'vip_member',
      tier: isAdmin ? 'Bóveda Diamante' : 'Acceso VIP',
      createdAt: DateTime.now(),
    );
    await _firestore.collection('users').doc(uid).set(newUser.toMap());
    return newUser;
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }
}
`,
  },
  {
    path: 'lib/features/auth/presentation/providers/auth_provider.dart',
    title: 'auth_provider.dart',
    category: 'auth',
    description: 'Gestor de estado Riverpod (AsyncNotifier) para controlar la sesión y autenticación.',
    code: `import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/auth_repository.dart';
import '../../domain/models/user_model.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository();
});

final authNotifierProvider = AsyncNotifierProvider<AuthNotifier, AppUser?>(() {
  return AuthNotifier();
});

class AuthNotifier extends AsyncNotifier<AppUser?> {
  late final AuthRepository _repository;

  @override
  FutureOr<AppUser?> build() async {
    _repository = ref.read(authRepositoryProvider);
    return await _repository.getCurrentUserData();
  }

  Future<void> login(String email, String password) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      return await _repository.signInWithEmailPassword(email, password);
    });
  }

  Future<void> register(String email, String password, String name) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      return await _repository.registerWithEmailPassword(email, password, name);
    });
  }

  Future<void> logout() async {
    state = const AsyncValue.loading();
    await _repository.signOut();
    state = const AsyncValue.data(null);
  }
}
`,
  },
  {
    path: 'lib/features/auth/presentation/screens/login_screen.dart',
    title: 'login_screen.dart',
    category: 'auth',
    description: 'Pantalla de acceso obligatoria (Puerta de Acceso) con estética de servidor privado y modo bóveda.',
    code: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../core/theme/vault_theme.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  bool _isRegisterMode = false;
  bool _isLoading = false;

  void _submit() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final name = _nameController.text.trim();

    if (email.isEmpty || password.isEmpty) return;

    setState(() => _isLoading = true);
    try {
      if (_isRegisterMode) {
        await ref.read(authNotifierProvider.notifier).register(email, password, name.isEmpty ? 'Miembro' : name);
      } else {
        await ref.read(authNotifierProvider.notifier).login(email, password);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error de autenticación: \${e.toString()}'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VaultTheme.backgroundBlack,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Ícono Bóveda con Aura Azul
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: VaultTheme.surfaceBlack,
                      shape: BoxShape.circle,
                      border: Border.all(color: VaultTheme.borderSubtle, width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: VaultTheme.primaryBlue.withOpacity(0.18),
                          blurRadius: 36,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: const Icon(
                      LucideIcons.shieldCheck,
                      color: VaultTheme.primaryBlue,
                      size: 44,
                    ),
                  ),
                ),
                const SizedBox(height: 28),

                // Títulos de Servidor Privado
                Text(
                  'SERVIDOR PRIVADO',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: VaultTheme.primaryBlue,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 2.5,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Bóveda de Contenido',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 26),
                ),
                const SizedBox(height: 8),
                Text(
                  'Acceso exclusivo para miembros verificados y administrador.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 36),

                // Campos de entrada
                if (_isRegisterMode) ...[
                  _buildTextField(
                    controller: _nameController,
                    hint: 'Nombre Completo',
                    icon: LucideIcons.user,
                  ),
                  const SizedBox(height: 14),
                ],
                _buildTextField(
                  controller: _emailController,
                  hint: 'Correo Electrónico',
                  icon: LucideIcons.mail,
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 14),
                _buildTextField(
                  controller: _passwordController,
                  hint: 'Contraseña Privada',
                  icon: LucideIcons.lock,
                  obscureText: true,
                ),
                const SizedBox(height: 24),

                // Botón Principal de Acción
                ElevatedButton(
                  onPressed: _isLoading ? null : _submit,
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : Text(_isRegisterMode ? 'SOLICITAR ACCESO A BÓVEDA' : 'INGRESAR AL SERVIDOR'),
                ),
                const SizedBox(height: 16),

                // Alternar Login / Registro
                TextButton(
                  onPressed: () => setState(() => _isRegisterMode = !_isRegisterMode),
                  child: Text(
                    _isRegisterMode
                        ? '¿Ya tienes credenciales? Iniciar Sesión'
                        : '¿Nuevo miembro? Registrarse en la Bóveda',
                    style: const TextStyle(color: VaultTheme.textSecondary, fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool obscureText = false,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: VaultTheme.surfaceBlack,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: VaultTheme.borderSubtle),
      ),
      child: TextField(
        controller: controller,
        obscureText: obscureText,
        keyboardType: keyboardType,
        style: const TextStyle(color: Colors.white, fontSize: 15),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: VaultTheme.textMuted, fontSize: 14),
          prefixIcon: Icon(icon, color: VaultTheme.textSecondary, size: 18),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/features/vault/domain/models/vault_item.dart',
    title: 'vault_item.dart',
    category: 'vault',
    description: 'Entidad de archivo/recurso alojado exclusivamente por el administrador.',
    code: `class VaultItem {
  final String id;
  final String title;
  final String description;
  final String category; // 'video' | 'document' | 'audio' | 'preset' | 'code'
  final String fileType;
  final String fileSize;
  final String downloadUrl;
  final String coverImage;
  final DateTime createdAt;
  final int likesCount;
  final List<String> likedBy;
  final String version;

  VaultItem({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.fileType,
    required this.fileSize,
    required this.downloadUrl,
    required this.coverImage,
    required this.createdAt,
    this.likesCount = 0,
    this.likedBy = const [],
    this.version = '1.0',
  });

  bool isLikedByUser(String userId) => likedBy.contains(userId);

  factory VaultItem.fromFirestore(Map<String, dynamic> map, String id) {
    return VaultItem(
      id: id,
      title: map['title'] ?? '',
      description: map['description'] ?? '',
      category: map['category'] ?? 'document',
      fileType: map['fileType'] ?? 'FILE',
      fileSize: map['fileSize'] ?? '0 MB',
      downloadUrl: map['downloadUrl'] ?? '',
      coverImage: map['coverImage'] ?? '',
      createdAt: map['createdAt'] != null
          ? DateTime.parse(map['createdAt'])
          : DateTime.now(),
      likesCount: map['likesCount'] ?? 0,
      likedBy: List<String>.from(map['likedBy'] ?? []),
      version: map['version'] ?? '1.0',
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'title': title,
      'description': description,
      'category': category,
      'fileType': fileType,
      'fileSize': fileSize,
      'downloadUrl': downloadUrl,
      'coverImage': coverImage,
      'createdAt': createdAt.toIso8601String(),
      'likesCount': likesCount,
      'likedBy': likedBy,
      'version': version,
    };
  }
}
`,
  },
  {
    path: 'lib/features/vault/domain/models/comment_model.dart',
    title: 'comment_model.dart',
    category: 'vault',
    description: 'Modelo de comentario para el foro privado interno de cada recurso.',
    code: `class VaultComment {
  final String id;
  final String userId;
  final String userDisplayName;
  final String userRole;
  final String userTier;
  final String text;
  final DateTime createdAt;

  VaultComment({
    required this.id,
    required this.userId,
    required this.userDisplayName,
    required this.userRole,
    required this.userTier,
    required this.text,
    required this.createdAt,
  });

  bool get isAdminComment => userRole == 'admin';

  factory VaultComment.fromFirestore(Map<String, dynamic> map, String id) {
    return VaultComment(
      id: id,
      userId: map['userId'] ?? '',
      userDisplayName: map['userDisplayName'] ?? 'Miembro',
      userRole: map['userRole'] ?? 'vip_member',
      userTier: map['userTier'] ?? 'Acceso VIP',
      text: map['text'] ?? '',
      createdAt: map['createdAt'] != null
          ? DateTime.parse(map['createdAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'userId': userId,
      'userDisplayName': userDisplayName,
      'userRole': userRole,
      'userTier': userTier,
      'text': text,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
`,
  },
  {
    path: 'lib/features/vault/data/vault_repository.dart',
    title: 'vault_repository.dart',
    category: 'vault',
    description: 'Repositorio Firestore y Firebase Storage para consultar recursos, registrar likes en tiempo real y debatir en comentarios.',
    code: `import 'package:cloud_firestore/cloud_firestore.dart';
import '../domain/models/vault_item.dart';
import '../domain/models/comment_model.dart';

class VaultRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Stream en tiempo real de recursos subidos exclusivamente por el Admin
  Stream<List<VaultItem>> getVaultItemsStream() {
    return _firestore
        .collection('vault_items')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => VaultItem.fromFirestore(doc.data(), doc.id))
            .toList());
  }

  // Stream de comentarios de un archivo específico
  Stream<List<VaultComment>> getCommentsStream(String itemId) {
    return _firestore
        .collection('vault_items')
        .doc(itemId)
        .collection('comments')
        .orderBy('createdAt', descending: false)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => VaultComment.fromFirestore(doc.data(), doc.id))
            .toList());
  }

  // Alternar Me Gusta (Like)
  Future<void> toggleLike({required String itemId, required String userId}) async {
    final itemRef = _firestore.collection('vault_items').doc(itemId);
    
    await _firestore.runTransaction((transaction) async {
      final snapshot = await transaction.get(itemRef);
      if (!snapshot.exists) return;

      List<dynamic> likedBy = List.from(snapshot.data()?['likedBy'] ?? []);
      int currentLikes = snapshot.data()?['likesCount'] ?? 0;

      if (likedBy.contains(userId)) {
        likedBy.remove(userId);
        currentLikes = (currentLikes - 1).clamp(0, 999999);
      } else {
        likedBy.add(userId);
        currentLikes += 1;
      }

      transaction.update(itemRef, {
        'likedBy': likedBy,
        'likesCount': currentLikes,
      });
    });
  }

  // Añadir Comentario al foro privado
  Future<void> addComment({
    required String itemId,
    required VaultComment comment,
  }) async {
    await _firestore
        .collection('vault_items')
        .doc(itemId)
        .collection('comments')
        .add(comment.toFirestore());
  }

  // Subir nuevo recurso (Acción estrictamente reservada para el Administrador / Root)
  // Las reglas de Firestore (firestore.rules) y este método validan que solo el Admin tenga permisos de escritura.
  Future<void> uploadVaultItem({
    required VaultItem item,
    required String userRole,
  }) async {
    if (userRole != 'admin') {
      throw Exception('Acceso Denegado: Solo el Administrador del servidor puede crear o publicar recursos en la bóveda.');
    }
    await _firestore.collection('vault_items').add(item.toFirestore());
  }
}
`,
  },
  {
    path: 'lib/features/vault/presentation/providers/vault_provider.dart',
    title: 'vault_provider.dart',
    category: 'vault',
    description: 'Providers de Riverpod (StreamProviders) para sincronización reactiva de la bóveda, filtrado y detalles.',
    code: `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/vault_repository.dart';
import '../../domain/models/vault_item.dart';
import '../../domain/models/comment_model.dart';

final vaultRepositoryProvider = Provider<VaultRepository>((ref) {
  return VaultRepository();
});

// Stream de todos los items de la bóveda
final vaultItemsStreamProvider = StreamProvider<List<VaultItem>>((ref) {
  final repo = ref.watch(vaultRepositoryProvider);
  return repo.getVaultItemsStream();
});

// Filtro de categoría seleccionado
final selectedCategoryProvider = StateProvider<String>((ref) => 'all');

// Items filtrados según categoría seleccionada
final filteredVaultItemsProvider = Provider<AsyncValue<List<VaultItem>>>((ref) {
  final itemsAsync = ref.watch(vaultItemsStreamProvider);
  final category = ref.watch(selectedCategoryProvider);

  return itemsAsync.whenData((items) {
    if (category == 'all') return items;
    return items.where((item) => item.category == category).toList();
  });
});

// Stream de comentarios por ID de recurso
final itemCommentsProvider = StreamProvider.family<List<VaultComment>, String>((ref, itemId) {
  final repo = ref.watch(vaultRepositoryProvider);
  return repo.getCommentsStream(itemId);
});
`,
  },
  {
    path: 'lib/features/vault/presentation/screens/vault_screen.dart',
    title: 'vault_screen.dart',
    category: 'vault',
    description: 'Bóveda Principal (Directorio VIP) con diseño minimalista, lista elegante de archivos y filtros.',
    code: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../core/theme/vault_theme.dart';
import '../providers/vault_provider.dart';
import '../../domain/models/vault_item.dart';
import 'vault_detail_screen.dart';

class VaultScreen extends ConsumerWidget {
  const VaultScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filteredItemsAsync = ref.watch(filteredVaultItemsProvider);
    final selectedCategory = ref.watch(selectedCategoryProvider);
    final user = ref.watch(authNotifierProvider).value;

    return Scaffold(
      backgroundColor: VaultTheme.backgroundBlack,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'BÓVEDA PRIVADA',
              style: TextStyle(
                color: VaultTheme.primaryBlue,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 2.0,
              ),
            ),
            const SizedBox(height: 2),
            const Text(
              'Directorio de Recursos',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: VaultTheme.surfaceBlack,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: VaultTheme.borderSubtle),
            ),
            child: Row(
              children: [
                Icon(
                  user?.isAdmin == true ? LucideIcons.shieldCheck : LucideIcons.lock,
                  color: VaultTheme.primaryBlue,
                  size: 13,
                ),
                const SizedBox(width: 6),
                Text(
                  user?.isAdmin == true ? 'ADMIN ROOT' : 'SOLO LECTURA',
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: VaultTheme.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
      // Solo el Administrador puede ver y usar el botón para subir publicaciones
      floatingActionButton: user?.isAdmin == true
          ? FloatingActionButton.extended(
              backgroundColor: VaultTheme.primaryBlue,
              icon: const Icon(LucideIcons.plus, color: Colors.white),
              label: const Text(
                'Subir Material (Admin)',
                style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
              ),
              onPressed: () => _showAdminUploadDialog(context, ref),
            )
          : null,
      body: Column(
        children: [
          // Banner informativo de seguridad según el rol
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: VaultTheme.surfaceBlack,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: user?.isAdmin == true ? VaultTheme.primaryBlue.withOpacity(0.3) : VaultTheme.borderSubtle,
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  margin: const EdgeInsets.only(top: 4, right: 10),
                  decoration: const BoxDecoration(
                    color: VaultTheme.primaryBlue,
                    shape: BoxShape.circle,
                  ),
                ),
                Expanded(
                  child: Text(
                    user?.isAdmin == true
                      ? 'Modo Administrador: Tienes permisos exclusivos para publicar y alojar nuevos recursos en el servidor.'
                      : 'Bóveda de Solo Lectura: Solo el Administrador publica contenido. Puedes descargar archivos, dar Me Gusta y comentar.',
                    style: const TextStyle(color: VaultTheme.textSecondary, fontSize: 12, height: 1.3),
                  ),
                ),
              ],
            ),
          ),

          // Selector de categorías minimalista
          _buildCategoryPills(ref, selectedCategory),
          
          // Lista de recursos
          Expanded(
            child: filteredItemsAsync.when(
              data: (items) {
                if (items.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(LucideIcons.folderClosed, color: VaultTheme.textMuted, size: 48),
                        SizedBox(height: 12),
                        Text('Sin archivos en esta categoría', style: TextStyle(color: VaultTheme.textSecondary)),
                      ],
                    ),
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 14),
                  itemBuilder: (context, index) {
                    final item = items[index];
                    return _buildVaultCard(context, item);
                  },
                );
              },
              loading: () => const Center(
                child: CircularProgressIndicator(color: VaultTheme.primaryBlue),
              ),
              error: (err, _) => Center(
                child: Text('Error al sincronizar bóveda: $err', style: const TextStyle(color: Colors.redAccent)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showAdminUploadDialog(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: VaultTheme.surfaceBlack,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          left: 20,
          right: 20,
          top: 20,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: const [
                      Icon(LucideIcons.uploadCloud, color: VaultTheme.primaryBlue, size: 22),
                      SizedBox(width: 10),
                      Text(
                        'Publicar en la Bóveda',
                        style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x, color: VaultTheme.textMuted),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              // Botón de Carga de Archivo Principal (Todo tipo de archivos)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: VaultTheme.backgroundBlack,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: VaultTheme.primaryBlue.withOpacity(0.4)),
                ),
                child: Column(
                  children: const [
                    Icon(LucideIcons.fileUp, color: VaultTheme.primaryBlue, size: 32),
                    SizedBox(height: 8),
                    Text(
                      'Subir Archivo Principal (Cualquier Formato)',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Auto-detección de peso, extensión (.zip, .mp4, .pdf, .flac) y categoría',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: VaultTheme.textSecondary, fontSize: 11),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Botón de Carga de Portada (Imagen)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: VaultTheme.backgroundBlack,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: VaultTheme.borderSubtle),
                ),
                child: Row(
                  children: const [
                    Icon(LucideIcons.image, color: VaultTheme.primaryBlue, size: 22),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Subir Portada de la Publicación', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                          Text('Seleccionar imagen desde galería / cámara', style: TextStyle(color: VaultTheme.textSecondary, fontSize: 11)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: const Icon(LucideIcons.check, color: Colors.white, size: 18),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: VaultTheme.primaryBlue,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () => Navigator.pop(ctx),
                  label: const Text('Confirmar y Publicar en Bóveda', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryPills(WidgetRef ref, String selected) {
    final categories = [
      {'id': 'all', 'label': 'Todos'},
      {'id': 'video', 'label': 'Videos'},
      {'id': 'code', 'label': 'Código'},
      {'id': 'document', 'label': 'PDFs'},
      {'id': 'audio', 'label': 'Audio'},
      {'id': 'preset', 'label': 'Presets'},
    ];

    return Container(
      height: 44,
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final cat = categories[index];
          final isSelected = selected == cat['id'];

          return GestureDetector(
            onTap: () => ref.read(selectedCategoryProvider.notifier).state = cat['id']!,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: isSelected ? VaultTheme.primaryBlue : VaultTheme.surfaceBlack,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected ? VaultTheme.primaryBlue : VaultTheme.borderSubtle,
                ),
              ),
              child: Text(
                cat['label']!,
                style: TextStyle(
                  color: isSelected ? Colors.white : VaultTheme.textSecondary,
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildVaultCard(BuildContext context, VaultItem item) {
    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => VaultDetailScreen(item: item)),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: VaultTheme.surfaceBlack,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: VaultTheme.borderSubtle),
        ),
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ícono o Miniatura según tipo
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: VaultTheme.cardBlack,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: VaultTheme.borderSubtle),
              ),
              child: Center(
                child: Icon(
                  _getCategoryIcon(item.category),
                  color: VaultTheme.primaryBlue,
                  size: 24,
                ),
              ),
            ),
            const SizedBox(width: 14),

            // Metadatos
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: VaultTheme.primaryBlue.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          item.fileType.toUpperCase(),
                          style: const TextStyle(
                            color: VaultTheme.vibrantBlueLight,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      Text(
                        item.fileSize,
                        style: const TextStyle(color: VaultTheme.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    item.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(LucideIcons.heart, size: 13, color: VaultTheme.textSecondary),
                      const SizedBox(width: 4),
                      Text(
                        '\${item.likesCount}',
                        style: const TextStyle(color: VaultTheme.textSecondary, fontSize: 12),
                      ),
                      const SizedBox(width: 14),
                      const Icon(LucideIcons.messageSquare, size: 13, color: VaultTheme.textSecondary),
                      const SizedBox(width: 4),
                      const Text(
                        'Foro',
                        style: TextStyle(color: VaultTheme.textSecondary, fontSize: 12),
                      ),
                      const Spacer(),
                      const Icon(LucideIcons.chevronRight, size: 16, color: VaultTheme.textMuted),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'video': return LucideIcons.playCircle;
      case 'code': return LucideIcons.code2;
      case 'audio': return LucideIcons.headphones;
      case 'preset': return LucideIcons.sliders;
      default: return LucideIcons.fileText;
    }
  }
}
`,
  },
  {
    path: 'lib/features/vault/presentation/screens/vault_detail_screen.dart',
    title: 'vault_detail_screen.dart',
    category: 'vault',
    description: 'Ficha de Contenido con Descarga destacada en azul, Me Gusta animado, Foro privado y Compartir.',
    code: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../core/theme/vault_theme.dart';
import '../../../../core/services/download_service.dart';
import '../../../../core/services/share_service.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../domain/models/vault_item.dart';
import '../providers/vault_provider.dart';
import '../widgets/animated_like_button.dart';
import '../widgets/comment_section.dart';

class VaultDetailScreen extends ConsumerStatefulWidget {
  final VaultItem item;
  const VaultDetailScreen({super.key, required this.item});

  @override
  ConsumerState<VaultDetailScreen> createState() => _VaultDetailScreenState();
}

class _VaultDetailScreenState extends ConsumerState<VaultDetailScreen> {
  double _downloadProgress = 0.0;
  bool _isDownloading = false;
  bool _isDownloaded = false;

  void _startDownload() async {
    setState(() {
      _isDownloading = true;
      _downloadProgress = 0.0;
    });

    try {
      final downloader = DownloadService();
      await downloader.downloadFile(
        fileUrl: widget.item.downloadUrl,
        fileName: '\${widget.item.id}_\${widget.item.title.replaceAll(' ', '_')}.\${widget.item.fileType.toLowerCase()}',
        onProgress: (received, total) {
          if (total != -1) {
            setState(() {
              _downloadProgress = received / total;
            });
          }
        },
      );

      setState(() {
        _isDownloaded = true;
        _isDownloading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Archivo guardado localmente en el dispositivo'),
            backgroundColor: VaultTheme.primaryBlue,
          ),
        );
      }
    } catch (e) {
      setState(() => _isDownloading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al descargar: $e'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authNotifierProvider).value;
    final isLiked = user != null && widget.item.isLikedByUser(user.uid);

    return Scaffold(
      backgroundColor: VaultTheme.backgroundBlack,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text('Ficha de Contenido', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.share2, color: Colors.white),
            tooltip: 'Compartir Invitación',
            onPressed: () => ShareService.shareVaultInvite(
              resourceTitle: widget.item.title,
              resourceId: widget.item.id,
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        children: [
          // Imagen de Portada / Encabezado de la Ficha
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Stack(
              children: [
                Image.network(
                  widget.item.coverImage,
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 200,
                    color: VaultTheme.cardBlack,
                    child: const Center(child: Icon(LucideIcons.fileBox, size: 48, color: VaultTheme.textMuted)),
                  ),
                ),
                Positioned(
                  bottom: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.8),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: VaultTheme.borderSubtle),
                    ),
                    child: Text(
                      widget.item.fileType,
                      style: const TextStyle(color: VaultTheme.vibrantBlueLight, fontWeight: FontWeight.bold, fontSize: 11),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // Título y Metadatos
          Text(
            widget.item.title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 22),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: VaultTheme.surfaceBlack,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: VaultTheme.borderSubtle),
                ),
                child: Text(
                  widget.item.fileSize,
                  style: const TextStyle(color: VaultTheme.textSecondary, fontSize: 12),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Versión \${widget.item.version}',
                style: const TextStyle(color: VaultTheme.textMuted, fontSize: 12),
              ),
              const Spacer(),
              
              // Botón Me Gusta Animado
              AnimatedLikeButton(
                isLiked: isLiked,
                likesCount: widget.item.likesCount,
                onTap: () {
                  if (user != null) {
                    ref.read(vaultRepositoryProvider).toggleLike(
                      itemId: widget.item.id,
                      userId: user.uid,
                    );
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Descripción del Administrador
          Text(
            widget.item.description,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: VaultTheme.textSecondary),
          ),
          const SizedBox(height: 24),

          // BOTÓN PRINCIPAL DE DESCARGA (Destacado en Azul Vibrante)
          ElevatedButton.icon(
            onPressed: _isDownloading ? null : _startDownload,
            icon: Icon(_isDownloaded ? LucideIcons.checkCircle : LucideIcons.download),
            label: Text(
              _isDownloading
                  ? 'DESCARGANDO (\${(_downloadProgress * 100).toInt()}%)'
                  : _isDownloaded
                      ? 'ARCHIVO DESCARGADO'
                      : 'DESCARGAR ARCHIVO (\${widget.item.fileSize})',
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: _isDownloaded ? const Color(0xFF10B981) : VaultTheme.primaryBlue,
              padding: const EdgeInsets.symmetric(vertical: 18),
            ),
          ),
          
          if (_isDownloading) ...[
            const SizedBox(height: 10),
            LinearProgressIndicator(
              value: _downloadProgress,
              backgroundColor: VaultTheme.surfaceBlack,
              valueColor: const AlwaysStoppedAnimation<Color>(VaultTheme.primaryBlue),
            ),
          ],
          
          const SizedBox(height: 32),

          // SECCIÓN DE FORO PRIVADO (Comentarios debajo del recurso)
          const Divider(color: VaultTheme.borderSubtle),
          const SizedBox(height: 16),
          CommentSection(itemId: widget.item.id),
        ],
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/features/vault/presentation/widgets/animated_like_button.dart',
    title: 'animated_like_button.dart',
    category: 'vault',
    description: 'Botón de Me Gusta con animación sutil al pulsar mediante AnimatedSwitcher y escala.',
    code: `import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../core/theme/vault_theme.dart';

class AnimatedLikeButton extends StatefulWidget {
  final bool isLiked;
  final int likesCount;
  final VoidCallback onTap;

  const AnimatedLikeButton({
    super.key,
    required this.isLiked,
    required this.likesCount,
    required this.onTap,
  });

  @override
  State<AnimatedLikeButton> createState() => _AnimatedLikeButtonState();
}

class _AnimatedLikeButtonState extends State<AnimatedLikeButton> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.3).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleTap() {
    _controller.forward().then((_) => _controller.reverse());
    widget.onTap();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _handleTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: widget.isLiked ? VaultTheme.primaryBlue.withOpacity(0.2) : VaultTheme.surfaceBlack,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: widget.isLiked ? VaultTheme.primaryBlue : VaultTheme.borderSubtle,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            ScaleTransition(
              scale: _scaleAnimation,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 250),
                transitionBuilder: (child, anim) => ScaleTransition(scale: anim, child: child),
                child: Icon(
                  widget.isLiked ? LucideIcons.heart : LucideIcons.heart,
                  key: ValueKey<bool>(widget.isLiked),
                  size: 18,
                  color: widget.isLiked ? const Color(0xFFFF2E63) : VaultTheme.textSecondary,
                ),
              ),
            ),
            const SizedBox(width: 6),
            Text(
              '\${widget.likesCount}',
              style: TextStyle(
                color: widget.isLiked ? Colors.white : VaultTheme.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/features/vault/presentation/widgets/comment_section.dart',
    title: 'comment_section.dart',
    category: 'vault',
    description: 'Foro privado y debate debajo de cada recurso para interacción exclusiva entre miembros y administrador.',
    code: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../core/theme/vault_theme.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../domain/models/comment_model.dart';
import '../providers/vault_provider.dart';

class CommentSection extends ConsumerStatefulWidget {
  final String itemId;
  const CommentSection({super.key, required this.itemId});

  @override
  ConsumerState<CommentSection> createState() => _CommentSectionState();
}

class _CommentSectionState extends ConsumerState<CommentSection> {
  final _commentController = TextEditingController();
  bool _isPosting = false;

  void _postComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;

    final user = ref.read(authNotifierProvider).value;
    if (user == null) return;

    setState(() => _isPosting = true);

    try {
      final newComment = VaultComment(
        id: '',
        userId: user.uid,
        userDisplayName: user.displayName,
        userRole: user.role,
        userTier: user.tier,
        text: text,
        createdAt: DateTime.now(),
      );

      await ref.read(vaultRepositoryProvider).addComment(
        itemId: widget.itemId,
        comment: newComment,
      );

      _commentController.clear();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al enviar comentario: $e'), backgroundColor: Colors.redAccent),
        );
      }
    } finally {
      if (mounted) setState(() => _isPosting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final commentsAsync = ref.watch(itemCommentsProvider(widget.itemId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: const [
            Icon(LucideIcons.messagesSquare, color: VaultTheme.primaryBlue, size: 18),
            SizedBox(width: 8),
            Text(
              'FORO PRIVADO',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 14,
                letterSpacing: 1.0,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Campo para nuevo comentario
        Row(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: VaultTheme.surfaceBlack,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: VaultTheme.borderSubtle),
                ),
                child: TextField(
                  controller: _commentController,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: const InputDecoration(
                    hintText: 'Añadir feedback o pregunta privada...',
                    hintStyle: TextStyle(color: VaultTheme.textMuted, fontSize: 13),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: _isPosting ? null : _postComment,
              icon: _isPosting
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: VaultTheme.primaryBlue))
                  : const Icon(LucideIcons.send, color: VaultTheme.primaryBlue),
            ),
          ],
        ),
        const SizedBox(height: 18),

        // Lista de comentarios reactivos
        commentsAsync.when(
          data: (comments) {
            if (comments.isEmpty) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 16.0),
                child: Text('Sé el primero en dejar feedback al administrador.', style: TextStyle(color: VaultTheme.textMuted, fontSize: 13)),
              );
            }

            return ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: comments.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final comment = comments[index];
                return Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: comment.isAdminComment
                        ? VaultTheme.primaryBlue.withOpacity(0.08)
                        : VaultTheme.surfaceBlack,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: comment.isAdminComment ? VaultTheme.primaryBlue.withOpacity(0.3) : VaultTheme.borderSubtle,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            comment.userDisplayName,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                          ),
                          if (comment.isAdminComment) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: VaultTheme.primaryBlue,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: const [
                                  Icon(LucideIcons.badgeCheck, color: Colors.white, size: 11),
                                  SizedBox(width: 3),
                                  Text('ADMIN', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                          ],
                          const Spacer(),
                          Text(
                            comment.userTier,
                            style: const TextStyle(color: VaultTheme.textMuted, fontSize: 11),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(comment.text, style: const TextStyle(color: VaultTheme.textSecondary, fontSize: 13, height: 1.4)),
                    ],
                  ),
                );
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator(color: VaultTheme.primaryBlue)),
          error: (e, _) => Text('Error al cargar comentarios: $e', style: const TextStyle(color: Colors.redAccent)),
        ),
      ],
    );
  }
}
`,
  },
  {
    path: 'lib/features/membership/presentation/screens/membership_screen.dart',
    title: 'membership_screen.dart',
    category: 'membership',
    description: 'Pantalla minimalista con fondo negro profundo y cartel centralizado "PRÓXIMAMENTE" sin referencias a membresías.',
    code: `import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../core/theme/vault_theme.dart';

class MembershipScreen extends StatelessWidget {
  const MembershipScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VaultTheme.backgroundBlack,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Icono central minimalista
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: VaultTheme.surfaceBlack,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: VaultTheme.borderSubtle),
                  boxShadow: [
                    BoxShadow(
                      color: VaultTheme.primaryBlue.withOpacity(0.25),
                      blurRadius: 30,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: const Icon(
                  LucideIcons.clock,
                  color: VaultTheme.primaryBlue,
                  size: 30,
                ),
              ),
              const SizedBox(height: 24),

              // Cartel Centralizado en Mayúsculas
              const Text(
                'PRÓXIMAMENTE',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 30,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 4.5,
                ),
              ),
              const SizedBox(height: 12),
              Container(
                width: 48,
                height: 3,
                decoration: BoxDecoration(
                  color: VaultTheme.primaryBlue,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/features/common/widgets/verified_badge.dart',
    title: 'verified_badge.dart',
    category: 'core',
    description: 'Insignia de verificación con animación destellante e ícono de escudo para el administrador verificado.',
    code: `import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../core/theme/vault_theme.dart';

class VerifiedBadge extends StatefulWidget {
  final double size;
  const VerifiedBadge({super.key, this.size = 16});

  @override
  State<VerifiedBadge> createState() => _VerifiedBadgeState();
}

class _VerifiedBadgeState extends State<VerifiedBadge> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: widget.size,
      height: widget.size,
      decoration: const BoxDecoration(
        color: VaultTheme.primaryBlue,
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Icon(
          LucideIcons.check,
          color: Colors.white,
          size: widget.size * 0.65,
        ),
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/features/navigation/presentation/main_nav_screen.dart',
    title: 'main_nav_screen.dart',
    category: 'vault',
    description: 'Navegación principal (BottomNavigationBar) con cambio de pestañas entre Bóveda, Próximamente y Perfil/Admin con selector de Tema.',
    code: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../core/theme/vault_theme.dart';
import '../../../../core/theme/theme_provider.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../vault/presentation/screens/vault_screen.dart';
import '../../membership/presentation/screens/membership_screen.dart';
import '../../common/widgets/verified_badge.dart';

class MainNavScreen extends ConsumerStatefulWidget {
  const MainNavScreen({super.key});

  @override
  ConsumerState<MainNavScreen> createState() => _MainNavScreenState();
}

class _MainNavScreenState extends ConsumerState<MainNavScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    VaultScreen(),
    MembershipScreen(),
    _ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(
              color: isDark ? VaultTheme.borderSubtle : VaultTheme.borderLight,
              width: 1.0,
            ),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          selectedItemColor: VaultTheme.primaryBlue,
          unselectedItemColor: isDark ? VaultTheme.textMutedDark : VaultTheme.textMutedLight,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.folderClosed),
              activeIcon: Icon(LucideIcons.folderOpen),
              label: 'Bóveda',
            ),
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.clock),
              activeIcon: Icon(LucideIcons.clock),
              label: 'Próximamente',
            ),
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.user),
              activeIcon: Icon(LucideIcons.userCheck),
              label: 'Perfil',
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileScreen extends ConsumerWidget {
  const _ProfileScreen();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).value;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeNotifier = ref.read(themeModeProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Credenciales de Servidor', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: isDark ? VaultTheme.surfaceBlack : VaultTheme.surfaceLight,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? VaultTheme.borderSubtle : VaultTheme.borderLight),
              ),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: VaultTheme.primaryBlue.withOpacity(0.2),
                    child: Text(
                      user?.displayName.substring(0, 1).toUpperCase() ?? 'U',
                      style: const TextStyle(fontSize: 26, color: VaultTheme.primaryBlue, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        user?.displayName ?? 'Usuario',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : VaultTheme.textPrimaryLight,
                        ),
                      ),
                      if (user?.isAdmin == true) ...[
                        const SizedBox(width: 6),
                        const VerifiedBadge(size: 18),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?.email ?? '',
                    style: TextStyle(
                      color: isDark ? VaultTheme.textSecondaryDark : VaultTheme.textSecondaryLight,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: user?.isAdmin == true
                          ? VaultTheme.primaryBlue.withOpacity(0.15)
                          : (isDark ? VaultTheme.cardBlack : Colors.grey.shade100),
                      border: Border.all(
                        color: user?.isAdmin == true
                            ? VaultTheme.primaryBlue
                            : (isDark ? VaultTheme.borderSubtle : VaultTheme.borderLight),
                      ),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (user?.isAdmin == true) ...[
                          const Icon(LucideIcons.shieldCheck, color: VaultTheme.primaryBlue, size: 14),
                          const SizedBox(width: 4),
                        ],
                        Text(
                          user?.isAdmin == true ? 'ADMINISTRADOR ROOT (astroarg02@gmail.com)' : 'MIEMBRO VIP',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: user?.isAdmin == true ? VaultTheme.primaryBlue : (isDark ? Colors.white : Colors.black),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Selector de Tema (Modo Oscuro / Claro)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? VaultTheme.surfaceBlack : VaultTheme.surfaceLight,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? VaultTheme.borderSubtle : VaultTheme.borderLight),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(isDark ? LucideIcons.moon : LucideIcons.sun, color: VaultTheme.primaryBlue, size: 20),
                      const SizedBox(width: 12),
                      Text(
                        'Apariencia Visual',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                          color: isDark ? Colors.white : VaultTheme.textPrimaryLight,
                        ),
                      ),
                    ],
                  ),
                  Switch(
                    value: isDark,
                    activeColor: VaultTheme.primaryBlue,
                    onChanged: (val) {
                      themeNotifier.setTheme(val ? ThemeMode.dark : ThemeMode.light);
                    },
                  ),
                ],
              ),
            ),
            const Spacer(),
            ElevatedButton.icon(
              onPressed: () => ref.read(authNotifierProvider.notifier).logout(),
              icon: const Icon(LucideIcons.logOut, size: 18),
              label: const Text('CERRAR SESIÓN DEL SERVIDOR'),
              style: ElevatedButton.styleFrom(
                backgroundColor: isDark ? VaultTheme.surfaceBlack : Colors.white,
                foregroundColor: Colors.redAccent,
                side: BorderSide(color: isDark ? VaultTheme.borderSubtle : VaultTheme.borderLight),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/core/config/supabase_config.dart',
    title: 'supabase_config.dart',
    category: 'config',
    description: 'Inicializador oficial del SDK Supabase Flutter y cliente singleton global.',
    code: `import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfig {
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://tu-proyecto.supabase.co',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  );

  // Correo del Administrador Root Autorizado
  static const String authorizedAdminEmail = 'astroarg02@gmail.com';

  static Future<void> initialize() async {
    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
      ),
    );
  }

  static SupabaseClient get client => Supabase.instance.client;
}
`,
  },
  {
    path: 'lib/features/auth/data/supabase_auth_repository.dart',
    title: 'supabase_auth_repository.dart',
    category: 'auth',
    description: 'Repositorio de Autenticación con Supabase Auth y mapeo de perfiles desde PostgreSQL.',
    code: `import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/config/supabase_config.dart';
import '../models/app_user.dart';

class SupabaseAuthRepository {
  final SupabaseClient _supabase = SupabaseConfig.client;

  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;

  User? get currentAuthUser => _supabase.auth.currentUser;

  bool isAuthorizedAdmin(String email) {
    return email.trim().toLowerCase() == SupabaseConfig.authorizedAdminEmail.toLowerCase();
  }

  Future<AppUser?> getCurrentProfile() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    final response = await _supabase
        .from('profiles')
        .select()
        .eq('id', user.id)
        .maybeSingle();

    if (response != null) {
      return AppUser.fromMap(response, user.id);
    }
    
    // Si aún no existe en profiles, sincronizar
    final bool isAdmin = isAuthorizedAdmin(user.email ?? '');
    final newProfile = {
      'id': user.id,
      'email': user.email,
      'display_name': user.email?.split('@').first ?? 'Miembro VIP',
      'role': isAdmin ? 'admin' : 'vip_member',
      'tier': isAdmin ? 'Bóveda Diamante' : 'Acceso VIP',
    };

    await _supabase.from('profiles').upsert(newProfile);
    return AppUser.fromMap(newProfile, user.id);
  }

  Future<AppUser> signIn({required String email, required String password}) async {
    final response = await _supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );

    if (response.user == null) {
      throw Exception('Credenciales no válidas en el servidor Supabase');
    }

    final profile = await getCurrentProfile();
    return profile!;
  }

  Future<AppUser> signUp({required String email, required String password}) async {
    final response = await _supabase.auth.signUp(
      email: email,
      password: password,
    );

    if (response.user == null) {
      throw Exception('No se pudo registrar el usuario en Supabase Auth');
    }

    final profile = await getCurrentProfile();
    return profile!;
  }

  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }
}
`,
  },
  {
    path: 'lib/features/vault/data/supabase_vault_repository.dart',
    title: 'supabase_vault_repository.dart',
    category: 'vault',
    description: 'Gestor CRUD de Bóveda y Comentarios con Supabase PostgreSQL, Realtime y RLS estricto.',
    code: `import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/config/supabase_config.dart';
import '../models/vault_item.dart';
import '../models/vault_comment.dart';

class SupabaseVaultRepository {
  final SupabaseClient _supabase = SupabaseConfig.client;

  // Stream en tiempo real de recursos de la Bóveda protegida por RLS
  Stream<List<VaultItem>> watchVaultItems() {
    return _supabase
        .from('vault_items')
        .stream(primaryKey: ['id'])
        .order('created_at', ascending: false)
        .map((records) => records.map((r) => VaultItem.fromMap(r)).toList());
  }

  // Creación de recurso (Protegido por RLS en Supabase: solo astroarg02@gmail.com)
  Future<void> createVaultItem(VaultItem item) async {
    final user = _supabase.auth.currentUser;
    if (user == null || user.email?.toLowerCase() != SupabaseConfig.authorizedAdminEmail) {
      throw Exception('ACCESO DENEGADO: Solo astroarg02@gmail.com puede publicar material.');
    }

    await _supabase.from('vault_items').insert({
      'title': item.title,
      'description': item.description,
      'category': item.category,
      'file_type': item.fileType,
      'file_size': item.fileSize,
      'download_url': item.downloadUrl,
      'cover_image': item.coverImage,
      'version': item.version,
      'author_id': user.id,
      'author_name': 'Administrador (astroarg02)',
    });
  }

  // Toggle Like con sincronización en PostgreSQL
  Future<void> toggleLike(String vaultItemId) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    final existing = await _supabase
        .from('vault_likes')
        .select()
        .eq('vault_item_id', vaultItemId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (existing != null) {
      await _supabase
          .from('vault_likes')
          .delete()
          .eq('vault_item_id', vaultItemId)
          .eq('user_id', user.id);
    } else {
      await _supabase.from('vault_likes').insert({
        'vault_item_id': vaultItemId,
        'user_id': user.id,
      });
    }
  }

  // Agregar comentario al foro privado
  Future<void> addComment({
    required String vaultItemId,
    required String text,
    required String userName,
    required String userTier,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    final bool isAdmin = user.email?.toLowerCase() == SupabaseConfig.authorizedAdminEmail;

    await _supabase.from('vault_comments').insert({
      'vault_item_id': vaultItemId,
      'user_id': user.id,
      'user_name': userName,
      'user_role': isAdmin ? 'admin' : 'vip_member',
      'user_tier': userTier,
      'text': text,
    });
  }
}
`,
  },
  {
    path: 'lib/features/vault/data/supabase_storage_service.dart',
    title: 'supabase_storage_service.dart',
    category: 'vault',
    description: 'Gestor de subida y URLs firmadas de descarga con Supabase Storage (Bucket vault_files).',
    code: `import 'dart:io';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/config/supabase_config.dart';

class SupabaseStorageService {
  final SupabaseClient _supabase = SupabaseConfig.client;
  static const String bucketName = 'vault_files';

  // Obtener URL de descarga firmada o pública para miembros VIP
  Future<String> getFileDownloadUrl(String filePath) async {
    return _supabase.storage.from(bucketName).getPublicUrl(filePath);
  }

  // Subir archivo a Storage (Solo astroarg02@gmail.com autorizado por RLS)
  Future<String> uploadVaultFile({
    required File file,
    required String remotePath,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null || user.email?.toLowerCase() != SupabaseConfig.authorizedAdminEmail) {
      throw Exception('ACCESO DENEGADO: Solo astroarg02@gmail.com tiene permisos de subida en Storage.');
    }

    final response = await _supabase.storage.from(bucketName).upload(
      remotePath,
      file,
      fileOptions: const FileOptions(cacheControl: '3600', upsert: true),
    );

    return _supabase.storage.from(bucketName).getPublicUrl(remotePath);
  }
}
`,
  },
  {
    path: 'supabase/schema.sql',
    title: 'schema.sql',
    category: 'config',
    description: 'Script SQL maestro para Supabase con tablas, triggers y políticas RLS para astroarg02@gmail.com.',
    code: `-- Script maestro para el SQL Editor de Supabase
-- Habilita RLS y asigna permisos exclusivos a astroarg02@gmail.com

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'vip_member' CHECK (role IN ('admin', 'vip_member')),
  tier TEXT NOT NULL DEFAULT 'Acceso VIP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vault_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size TEXT NOT NULL,
  download_url TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  version TEXT DEFAULT '1.0.0',
  likes_count INTEGER NOT NULL DEFAULT 0,
  author_name TEXT NOT NULL DEFAULT 'Administrador Root',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault_items_read_all" ON public.vault_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "vault_items_admin_all" ON public.vault_items FOR ALL TO authenticated
USING (LOWER(auth.jwt() ->> 'email') = 'astroarg02@gmail.com')
WITH CHECK (LOWER(auth.jwt() ->> 'email') = 'astroarg02@gmail.com');
`,
  },
  {
    path: '.github/workflows/build_apk.yml',
    title: 'build_apk.yml (Compilación APK Automática)',
    category: 'config',
    description: 'Flujo de GitHub Actions para compilar el APK instalable en la nube automáticamente.',
    code: `name: Generar APK de Flutter en la Nube
on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build:
    name: Compilar APK Android Release
    runs-on: ubuntu-latest
    steps:
      - name: Clonar repositorio
        uses: actions/checkout@v4

      - name: Configurar Java 17
        uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: '17'
          cache: 'gradle'

      - name: Configurar Flutter SDK
        uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
          cache: true

      - name: Instalar dependencias
        run: flutter pub get

      - name: Compilar APK Release
        run: flutter build apk --release --split-per-abi

      - name: Compilar APK Universal
        run: flutter build apk --release

      - name: Subir APKs compilados como artefacto
        uses: actions/upload-artifact@v4
        with:
          name: Vault-Private-Server-APK
          path: build/app/outputs/flutter-apk/*.apk
          retention-days: 14
`,
  },
];

