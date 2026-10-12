import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

// ============================================================================
// CONFIGURACIÓN DE FIREBASE FIRESTORE Y CONSTANTES GLOBALES (IDÉNTICO A VITE)
// ============================================================================
const String kFirebaseProjectId = 'gen-lang-client-0680329207';
const String kFirestoreDatabaseId =
    'ai-studio-app66vault-ca23ce90-8fec-45b1-89e4-68259be955e7';
const String kFirebaseApiKey = 'AIzaSyA6EK3sbxaaCsiH6XR3IMO23A4XwsilAkE';
const String kAdminSecurityKey = '360';
const String kWhatsAppContactPhone = '+54 9 11 6554-6038';
const String kWhatsAppPhoneRaw = '5491165546038';

const List<String> kAuthorizedAdminEmails = [
  'astroarg02@gmail.com',
  'cuentaninja989@gmail.com',
  'creadorffx@gmail.com',
  'admin@vault.private',
];

const List<Map<String, String>> kAvatarPresets = [
  {
    'id': 'admin-astro',
    'url':
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'label': 'Astro',
  },
  {
    'id': 'vip-alex',
    'url':
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'label': 'Alex',
  },
  {
    'id': 'user-neo',
    'url':
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    'label': 'Neo',
  },
  {
    'id': 'user-luna',
    'url':
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'label': 'Luna',
  },
  {
    'id': 'user-cyber',
    'url':
        'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    'label': 'Cyber',
  },
  {
    'id': 'user-maya',
    'url':
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    'label': 'Maya',
  },
];

// Paleta exacta de la app en Vite
const Color kPrimaryBlue = Color(0xFF0066FF);
const Color kDarkBg = Color(0xFF000000);
const Color kDarkCard = Color(0xFF0A0A0C);
const Color kDarkSurface = Color(0xFF121216);
const Color kDarkBorder = Color(0xFF1E1E24);
const Color kMutedText = Color(0xFF8E8E93);
const Color kDimText = Color(0xFF5A5A62);
const Color kEmerald = Color(0xFF10B981);
const Color kWhatsAppGreen = Color(0xFF25D366);
const Color kAmber = Color(0xFFF59E0B);
const Color kHeartPink = Color(0xFFFF2E63);

String get kFirestoreDocsBase =>
    'https://firestore.googleapis.com/v1/projects/$kFirebaseProjectId/databases/${Uri.encodeComponent(kFirestoreDatabaseId)}/documents';

bool isAuthorizedAdminEmail(String? email) {
  if (email == null || email.trim().isEmpty) return false;
  final clean = email.trim().toLowerCase();
  return kAuthorizedAdminEmails.any((e) => e.toLowerCase() == clean);
}

bool isAuthorizedAdminKey(String? key) {
  if (key == null) return false;
  return key.trim() == kAdminSecurityKey;
}

Color parseHexColor(String? hex, [Color fallback = kPrimaryBlue]) {
  if (hex == null || hex.isEmpty) return fallback;
  final clean = hex.replaceFirst('#', '');
  if (clean.length == 6) {
    final val = int.tryParse('FF$clean', radix: 16);
    if (val != null) return Color(val);
  }
  return fallback;
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Colors.black,
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  runApp(const Seis6VaultNativeApp());
}

// ============================================================================
// MODELOS DE DATOS
// ============================================================================
class UserProfile {
  final String uid;
  final String email;
  final String displayName;
  final String role; // 'admin' | 'vip_member'
  final String tier;
  final String joinedAt;
  final String? avatarUrl;
  final String? bio;
  final String? phone;
  final String? instagram;
  final String? customStatus;
  final String? membershipPlan; // 'monthly' | 'annual'
  final String membershipStatus; // 'active' | 'none' | 'cancelled'
  final String? subscribedAt;
  final String? membershipExpiresAt;
  final double? lastPaymentAmount;
  final String? updatedAt;

  const UserProfile({
    required this.uid,
    required this.email,
    required this.displayName,
    required this.role,
    required this.tier,
    required this.joinedAt,
    this.avatarUrl,
    this.bio,
    this.phone,
    this.instagram,
    this.customStatus,
    this.membershipPlan,
    this.membershipStatus = 'none',
    this.subscribedAt,
    this.membershipExpiresAt,
    this.lastPaymentAmount,
    this.updatedAt,
  });

  bool get isAdmin => role == 'admin' || isAuthorizedAdminEmail(email);

  bool get hasActiveMembership =>
      membershipStatus == 'active' &&
      membershipPlan != null &&
      membershipPlan!.isNotEmpty;

  UserProfile copyWith({
    String? uid,
    String? email,
    String? displayName,
    String? role,
    String? tier,
    String? joinedAt,
    String? avatarUrl,
    String? bio,
    String? phone,
    String? instagram,
    String? customStatus,
    String? membershipPlan,
    String? membershipStatus,
    String? subscribedAt,
    String? membershipExpiresAt,
    double? lastPaymentAmount,
    String? updatedAt,
  }) {
    return UserProfile(
      uid: uid ?? this.uid,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      role: role ?? this.role,
      tier: tier ?? this.tier,
      joinedAt: joinedAt ?? this.joinedAt,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      bio: bio ?? this.bio,
      phone: phone ?? this.phone,
      instagram: instagram ?? this.instagram,
      customStatus: customStatus ?? this.customStatus,
      membershipPlan: membershipPlan ?? this.membershipPlan,
      membershipStatus: membershipStatus ?? this.membershipStatus,
      subscribedAt: subscribedAt ?? this.subscribedAt,
      membershipExpiresAt: membershipExpiresAt ?? this.membershipExpiresAt,
      lastPaymentAmount: lastPaymentAmount ?? this.lastPaymentAmount,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'uid': uid,
        'email': email,
        'displayName': displayName,
        'role': role,
        'tier': tier,
        'joinedAt': joinedAt,
        'avatarUrl': avatarUrl,
        'bio': bio,
        'phone': phone,
        'instagram': instagram,
        'customStatus': customStatus,
        'membershipPlan': membershipPlan,
        'membershipStatus': membershipStatus,
        'subscribedAt': subscribedAt,
        'membershipExpiresAt': membershipExpiresAt,
        'lastPaymentAmount': lastPaymentAmount,
        'updatedAt': updatedAt,
      };

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    final email = (json['email'] ?? '').toString().trim();
    final admin = isAuthorizedAdminEmail(email) || json['role'] == 'admin';
    return UserProfile(
      uid: (json['uid'] ?? 'usr_${DateTime.now().millisecondsSinceEpoch}')
          .toString(),
      email: email,
      displayName: (json['displayName'] ??
              (email.isNotEmpty ? email.split('@').first : 'Miembro VIP'))
          .toString(),
      role: admin ? 'admin' : 'vip_member',
      tier: admin
          ? 'Bóveda Diamante'
          : (json['tier']?.toString() ?? 'Invitado'),
      joinedAt: (json['joinedAt'] ?? '2026-08-23').toString(),
      avatarUrl: json['avatarUrl']?.toString(),
      bio: json['bio']?.toString(),
      phone: json['phone']?.toString(),
      instagram: json['instagram']?.toString(),
      customStatus: json['customStatus']?.toString(),
      membershipPlan: json['membershipPlan']?.toString(),
      membershipStatus: (json['membershipStatus'] ?? 'none').toString(),
      subscribedAt: json['subscribedAt']?.toString(),
      membershipExpiresAt: json['membershipExpiresAt']?.toString(),
      lastPaymentAmount: json['lastPaymentAmount'] != null
          ? double.tryParse(json['lastPaymentAmount'].toString())
          : null,
      updatedAt: json['updatedAt']?.toString(),
    );
  }
}

class VaultComment {
  final String id;
  final String userId;
  final String userDisplayName;
  final String userRole;
  final String text;
  final String createdAt;

  const VaultComment({
    required this.id,
    required this.userId,
    required this.userDisplayName,
    required this.userRole,
    required this.text,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'userDisplayName': userDisplayName,
        'userRole': userRole,
        'text': text,
        'createdAt': createdAt,
      };

  factory VaultComment.fromJson(Map<String, dynamic> json) => VaultComment(
        id: (json['id'] ?? 'c_${DateTime.now().millisecondsSinceEpoch}')
            .toString(),
        userId: (json['userId'] ?? '').toString(),
        userDisplayName:
            (json['userDisplayName'] ?? json['userName'] ?? 'Miembro VIP')
                .toString(),
        userRole: (json['userRole'] ?? 'vip_member').toString(),
        text: (json['text'] ?? '').toString(),
        createdAt: (json['createdAt'] ?? 'Reciente').toString(),
      );
}

class VaultItem {
  final String id;
  final String title;
  final String description;
  final String category;
  final String fileType;
  final String fileSize;
  final String? fileName;
  final String downloadUrl;
  final String coverImage;
  final String createdAt;
  final int likesCount;
  final List<String> likedBy;
  final List<VaultComment> comments;
  final List<String> listIds;
  final bool isLockedForTier;
  final String version;
  final String authorName;
  final String authorBadge;

  const VaultItem({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.fileType,
    required this.fileSize,
    this.fileName,
    required this.downloadUrl,
    required this.coverImage,
    required this.createdAt,
    required this.likesCount,
    required this.likedBy,
    required this.comments,
    this.listIds = const [],
    this.isLockedForTier = false,
    this.version = 'v1.0',
    this.authorName = 'Administrador (astroarg02)',
    this.authorBadge = 'ADMIN ROOT',
  });

  VaultItem copyWith({
    String? title,
    String? description,
    String? category,
    String? fileType,
    String? fileSize,
    String? fileName,
    String? downloadUrl,
    String? coverImage,
    int? likesCount,
    List<String>? likedBy,
    List<VaultComment>? comments,
    List<String>? listIds,
    bool? isLockedForTier,
    String? version,
  }) {
    return VaultItem(
      id: id,
      title: title ?? this.title,
      description: description ?? this.description,
      category: category ?? this.category,
      fileType: fileType ?? this.fileType,
      fileSize: fileSize ?? this.fileSize,
      fileName: fileName ?? this.fileName,
      downloadUrl: downloadUrl ?? this.downloadUrl,
      coverImage: coverImage ?? this.coverImage,
      createdAt: createdAt,
      likesCount: likesCount ?? this.likesCount,
      likedBy: likedBy ?? this.likedBy,
      comments: comments ?? this.comments,
      listIds: listIds ?? this.listIds,
      isLockedForTier: isLockedForTier ?? this.isLockedForTier,
      version: version ?? this.version,
      authorName: authorName,
      authorBadge: authorBadge,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'category': category,
        'fileType': fileType,
        'fileSize': fileSize,
        'fileName': fileName,
        'downloadUrl': downloadUrl,
        'coverImage': coverImage,
        'createdAt': createdAt,
        'likesCount': likesCount,
        'likedBy': likedBy,
        'listIds': listIds,
        'comments': comments.map((c) => c.toJson()).toList(),
        'isLockedForTier': isLockedForTier,
        'version': version,
        'author': {'name': authorName, 'badge': authorBadge},
      };

  factory VaultItem.fromJson(Map<String, dynamic> json) {
    final authorMap = json['author'] is Map ? json['author'] as Map : {};
    final rawLikedBy = json['likedBy'] is List ? json['likedBy'] as List : [];
    final rawListIds = json['listIds'] is List ? json['listIds'] as List : [];
    final rawComments =
        json['comments'] is List ? json['comments'] as List : [];

    return VaultItem(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Sin título').toString(),
      description: (json['description'] ?? '').toString(),
      category: (json['category'] ?? 'code').toString(),
      fileType: (json['fileType'] ?? '').toString(),
      fileSize: (json['fileSize'] ?? '').toString(),
      fileName: json['fileName']?.toString(),
      downloadUrl: (json['downloadUrl'] ?? '').toString(),
      coverImage: (json['coverImage'] ??
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80')
          .toString(),
      createdAt: (json['createdAt'] ?? '2026-08-23').toString(),
      likesCount: int.tryParse(json['likesCount']?.toString() ?? '0') ?? 0,
      likedBy: rawLikedBy.map((e) => e.toString()).toList(),
      listIds: rawListIds.map((e) => e.toString()).toList(),
      comments: rawComments.map((c) {
        if (c is Map<String, dynamic>) return VaultComment.fromJson(c);
        if (c is String) {
          try {
            return VaultComment.fromJson(
                jsonDecode(c) as Map<String, dynamic>);
          } catch (_) {}
        }
        return VaultComment(
          id: 'c_1',
          userId: '',
          userDisplayName: 'Usuario',
          userRole: 'vip_member',
          text: c.toString(),
          createdAt: 'Reciente',
        );
      }).toList(),
      isLockedForTier: json['isLockedForTier'] == true,
      version: (json['version'] ?? 'v1.0').toString(),
      authorName:
          (authorMap['name'] ?? 'Administrador (astroarg02)').toString(),
      authorBadge: (authorMap['badge'] ?? 'ADMIN ROOT').toString(),
    );
  }
}

class VaultList {
  final String id;
  final String name;
  final String description;
  final String icon;
  final String colorHex;
  final List<String> itemIds;
  final String createdAt;

  const VaultList({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.colorHex,
    required this.itemIds,
    required this.createdAt,
  });

  VaultList copyWith({
    String? name,
    String? description,
    String? icon,
    String? colorHex,
    List<String>? itemIds,
  }) {
    return VaultList(
      id: id,
      name: name ?? this.name,
      description: description ?? this.description,
      icon: icon ?? this.icon,
      colorHex: colorHex ?? this.colorHex,
      itemIds: itemIds ?? this.itemIds,
      createdAt: createdAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'description': description,
        'icon': icon,
        'color': colorHex,
        'itemIds': itemIds,
        'createdAt': createdAt,
      };

  factory VaultList.fromJson(Map<String, dynamic> json) {
    final rawIds = json['itemIds'] is List ? json['itemIds'] as List : [];
    return VaultList(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? 'Colección').toString(),
      description: (json['description'] ?? '').toString(),
      icon: (json['icon'] ?? 'folder').toString(),
      colorHex: (json['color'] ?? '#0066FF').toString(),
      itemIds: rawIds.map((e) => e.toString()).toList(),
      createdAt: (json['createdAt'] ?? '2026-08-23').toString(),
    );
  }
}

class PaymentReceipt {
  final String id;
  final String userId;
  final String userEmail;
  final String userDisplayName;
  final String plan; // 'monthly' | 'annual'
  final double amount;
  final String currency;
  final String paymentMethod;
  final String referenceCode;
  final String status; // 'pending' | 'approved' | 'rejected'
  final String createdAt;
  final String? imageDataUrl;
  final String? adminNote;

  const PaymentReceipt({
    required this.id,
    required this.userId,
    required this.userEmail,
    required this.userDisplayName,
    required this.plan,
    required this.amount,
    this.currency = 'USD',
    this.paymentMethod = 'Mercado Pago',
    required this.referenceCode,
    required this.status,
    required this.createdAt,
    this.imageDataUrl,
    this.adminNote,
  });

  PaymentReceipt copyWith({
    String? status,
    String? adminNote,
    double? amount,
    String? plan,
  }) {
    return PaymentReceipt(
      id: id,
      userId: userId,
      userEmail: userEmail,
      userDisplayName: userDisplayName,
      plan: plan ?? this.plan,
      amount: amount ?? this.amount,
      currency: currency,
      paymentMethod: paymentMethod,
      referenceCode: referenceCode,
      status: status ?? this.status,
      createdAt: createdAt,
      imageDataUrl: imageDataUrl,
      adminNote: adminNote ?? this.adminNote,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'userEmail': userEmail,
        'userDisplayName': userDisplayName,
        'plan': plan,
        'amount': amount,
        'currency': currency,
        'paymentMethod': paymentMethod,
        'referenceCode': referenceCode,
        'status': status,
        'createdAt': createdAt,
        'imageDataUrl': imageDataUrl,
        'adminNote': adminNote,
      };

  factory PaymentReceipt.fromJson(Map<String, dynamic> json) => PaymentReceipt(
        id: (json['id'] ?? '').toString(),
        userId: (json['userId'] ?? '').toString(),
        userEmail: (json['userEmail'] ?? '').toString(),
        userDisplayName: (json['userDisplayName'] ?? 'Usuario').toString(),
        plan: (json['plan'] ?? 'monthly').toString(),
        amount: double.tryParse(json['amount']?.toString() ?? '1') ?? 1.0,
        currency: (json['currency'] ?? 'USD').toString(),
        paymentMethod: (json['paymentMethod'] ?? 'Mercado Pago').toString(),
        referenceCode: (json['referenceCode'] ?? 'REF-000').toString(),
        status: (json['status'] ?? 'pending').toString(),
        createdAt:
            (json['createdAt'] ?? DateTime.now().toIso8601String()).toString(),
        imageDataUrl:
            (json['imageDataUrl'] ?? json['receiptImageUrl'])?.toString(),
        adminNote: json['adminNote']?.toString(),
      );
}

// ============================================================================
// DATOS SEMILLA INICIALES (IDÉNTICOS A initialVaultData.ts)
// ============================================================================
final List<VaultItem> kInitialVaultItems = [
  const VaultItem(
    id: 'vault-res-1787518251503',
    title: 'BIENVENIDOS A MI PÁGINA WEB 😍',
    description:
        'En esta página web encontrarás todo tipo de archivos para iOS y Android totalmente gratis',
    category: 'code',
    fileType: '',
    fileSize: '',
    downloadUrl: '',
    coverImage:
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    createdAt: '2026-08-23',
    likesCount: 3,
    likedBy: ['admin_master_astro'],
    comments: [],
  ),
  const VaultItem(
    id: 'vault-res-1787520057677',
    title: 'REGEDIT 66👹📂',
    description: 'Regedit con alta sensibilidad para Android y emuladores',
    category: 'code',
    fileType: 'REG Archivo',
    fileSize: '1.8 KB',
    downloadUrl: '',
    coverImage:
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    createdAt: '2026-08-23',
    likesCount: 2,
    likedBy: ['admin_master_astro'],
    comments: [],
  ),
  const VaultItem(
    id: 'vault-res-1787520090540',
    title: 'Regedit iOS 66',
    description:
        'Configuración y optimización de sensibilidad exclusiva para dispositivos iOS',
    category: 'code',
    fileType: 'REG Archivo',
    fileSize: '2.2 KB',
    downloadUrl: '',
    coverImage:
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    createdAt: '2026-08-23',
    likesCount: 2,
    likedBy: ['admin_master_astro'],
    comments: [],
  ),
  const VaultItem(
    id: 'vault-res-1787520163631',
    title: 'Aimbot modificado66',
    description: 'Este panel hará que tu sensi mejore casi un 80%',
    category: 'code',
    fileType: '',
    fileSize: '',
    downloadUrl: '',
    coverImage:
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    createdAt: '2026-08-23',
    likesCount: 2,
    likedBy: ['admin_master_astro'],
    comments: [],
  ),
];

final List<VaultList> kInitialVaultLists = [
  const VaultList(
    id: 'list-apps-systems',
    name: '📱 Archivos iOS & Android',
    description:
        'Recursos, utilidades, tutoriales y aplicaciones exclusivas para dispositivos móviles.',
    icon: 'smartphone',
    colorHex: '#0066FF',
    itemIds: ['vault-res-1787518251503'],
    createdAt: '2026-08-23',
  ),
  const VaultList(
    id: 'list-regedits-sensi',
    name: '⚡ Regedits y Sensibilidad',
    description:
        'Configuraciones de máxima respuesta táctil, archivos REG, atajos, scripts y paneles optimizados.',
    icon: 'sliders',
    colorHex: '#10B981',
    itemIds: [
      'vault-res-1787520057677',
      'vault-res-1787520090540',
      'vault-res-1787520163631',
    ],
    createdAt: '2026-08-23',
  ),
];

// ============================================================================
// SERVICIO NATIVO DE CONEXIÓN CON FIREBASE FIRESTORE Y ALMACENAMIENTO LOCAL
// ============================================================================
class NativeFirestoreService {
  static Future<http.Response?> _fetch(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? body,
  }) async {
    try {
      final sep = path.contains('?') ? '&' : '?';
      final uri = Uri.parse(
          '$kFirestoreDocsBase$path${sep}key=${Uri.encodeComponent(kFirebaseApiKey)}');
      final headers = {'Content-Type': 'application/json'};

      if (method == 'GET') {
        return await http
            .get(uri, headers: headers)
            .timeout(const Duration(seconds: 5));
      } else if (method == 'PATCH') {
        return await http
            .patch(uri, headers: headers, body: jsonEncode(body))
            .timeout(const Duration(seconds: 5));
      } else if (method == 'DELETE') {
        return await http
            .delete(uri, headers: headers)
            .timeout(const Duration(seconds: 5));
      }
    } catch (_) {}
    return null;
  }

  static Future<Map<String, dynamic>?> fetchMaintenanceState() async {
    final res = await _fetch('/system_config/maintenance');
    if (res != null && res.statusCode == 200) {
      try {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final fields = data['fields'] as Map<String, dynamic>?;
        if (fields != null) {
          return {
            'isMaintenance':
                fields['isMaintenance']?['booleanValue'] == true,
            'message': fields['message']?['stringValue']?.toString() ??
                'Estamos realizando labores de mantenimiento y optimización en la plataforma. Volveremos muy pronto.',
          };
        }
      } catch (_) {}
    }
    return null;
  }

  static Future<bool> saveMaintenanceState(
      bool isMaintenance, String message) async {
    final res = await _fetch(
      '/system_config/maintenance',
      method: 'PATCH',
      body: {
        'fields': {
          'isMaintenance': {'booleanValue': isMaintenance},
          'message': {'stringValue': message},
          'updatedAt': {'stringValue': DateTime.now().toIso8601String()},
        }
      },
    );
    return res != null && res.statusCode >= 200 && res.statusCode < 300;
  }

  static Future<List<VaultItem>> fetchVaultItems() async {
    final res = await _fetch('/vault_items?pageSize=200');
    if (res == null || res.statusCode != 200) return [];
    try {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final docs = data['documents'] as List?;
      if (docs == null) return [];
      final List<VaultItem> items = [];
      for (final d in docs) {
        final fields = (d['fields'] ?? {}) as Map<String, dynamic>;
        final id = fields['id']?['stringValue']?.toString() ??
            (d['name']?.toString().split('/').last ?? '');
        if (id.isEmpty ||
            id.startsWith('test-') ||
            id.startsWith('res_00')) {
          continue;
        }
        final likedValues =
            fields['likedBy']?['arrayValue']?['values'] as List? ?? [];
        final listIdValues =
            fields['listIds']?['arrayValue']?['values'] as List? ?? [];
        final commentValues =
            fields['comments']?['arrayValue']?['values'] as List? ?? [];

        String authorName = 'Administrador (astroarg02)';
        String authorBadge = 'ADMIN ROOT';
        final rawAuthor = fields['author']?['stringValue']?.toString();
        if (rawAuthor != null && rawAuthor.isNotEmpty) {
          try {
            final parsedAuthor = jsonDecode(rawAuthor) as Map<String, dynamic>;
            authorName =
                parsedAuthor['name']?.toString() ?? authorName;
            authorBadge =
                parsedAuthor['badge']?.toString() ?? authorBadge;
          } catch (_) {}
        }

        items.add(VaultItem(
          id: id,
          title: fields['title']?['stringValue']?.toString() ?? 'Sin título',
          description:
              fields['description']?['stringValue']?.toString() ?? '',
          category: fields['category']?['stringValue']?.toString() ?? 'code',
          fileType: fields['fileType']?['stringValue']?.toString() ?? '',
          fileSize: fields['fileSize']?['stringValue']?.toString() ?? '',
          fileName: fields['fileName']?['stringValue']?.toString(),
          downloadUrl:
              fields['downloadUrl']?['stringValue']?.toString() ?? '',
          coverImage: fields['coverImage']?['stringValue']?.toString() ??
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
          createdAt:
              fields['createdAt']?['stringValue']?.toString() ?? '2026-08-23',
          likesCount: int.tryParse(
                  fields['likesCount']?['integerValue']?.toString() ?? '0') ??
              0,
          likedBy: likedValues
              .map((v) => v['stringValue']?.toString() ?? '')
              .where((s) => s.isNotEmpty)
              .toList(),
          listIds: listIdValues
              .map((v) => v['stringValue']?.toString() ?? '')
              .where((s) => s.isNotEmpty)
              .toList(),
          comments: commentValues.map((v) {
            final str = v['stringValue']?.toString() ?? '';
            try {
              return VaultComment.fromJson(
                  jsonDecode(str) as Map<String, dynamic>);
            } catch (_) {
              return VaultComment(
                id: 'c_1',
                userId: '',
                userDisplayName: 'Miembro',
                userRole: 'vip_member',
                text: str,
                createdAt: 'Reciente',
              );
            }
          }).toList(),
          isLockedForTier:
              fields['isLockedForTier']?['booleanValue'] == true,
          version: fields['version']?['stringValue']?.toString() ?? 'v1.0',
          authorName: authorName,
          authorBadge: authorBadge,
        ));
      }
      return items;
    } catch (_) {
      return [];
    }
  }

  static Future<bool> saveVaultItem(VaultItem item) async {
    final fields = <String, dynamic>{
      'id': {'stringValue': item.id},
      'title': {'stringValue': item.title},
      'description': {'stringValue': item.description},
      'category': {'stringValue': item.category},
      'fileType': {'stringValue': item.fileType},
      'fileSize': {'stringValue': item.fileSize},
      'fileName': {'stringValue': item.fileName ?? ''},
      'downloadUrl': {'stringValue': item.downloadUrl},
      'coverImage': {'stringValue': item.coverImage},
      'createdAt': {'stringValue': item.createdAt},
      'likesCount': {'integerValue': item.likesCount.toString()},
      'isLockedForTier': {'booleanValue': item.isLockedForTier},
      'version': {'stringValue': item.version},
      'author': {
        'stringValue': jsonEncode({
          'name': item.authorName,
          'badge': item.authorBadge,
        })
      },
      'likedBy': {
        'arrayValue': {
          'values': item.likedBy.map((u) => {'stringValue': u}).toList(),
        }
      },
      'listIds': {
        'arrayValue': {
          'values': item.listIds.map((l) => {'stringValue': l}).toList(),
        }
      },
      'comments': {
        'arrayValue': {
          'values': item.comments
              .map((c) => {'stringValue': jsonEncode(c.toJson())})
              .toList(),
        }
      },
    };
    final res = await _fetch(
      '/vault_items/${Uri.encodeComponent(item.id)}',
      method: 'PATCH',
      body: {'fields': fields},
    );
    return res != null && res.statusCode >= 200 && res.statusCode < 300;
  }

  static Future<bool> deleteVaultItem(String itemId) async {
    final res = await _fetch(
      '/vault_items/${Uri.encodeComponent(itemId)}',
      method: 'DELETE',
    );
    return res != null && res.statusCode >= 200 && res.statusCode < 300;
  }

  static Future<List<VaultList>> fetchVaultLists() async {
    final res = await _fetch('/vault_lists?pageSize=100');
    if (res == null || res.statusCode != 200) return [];
    try {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final docs = data['documents'] as List?;
      if (docs == null) return [];
      final List<VaultList> lists = [];
      for (final d in docs) {
        final fields = (d['fields'] ?? {}) as Map<String, dynamic>;
        final id = fields['id']?['stringValue']?.toString() ??
            (d['name']?.toString().split('/').last ?? '');
        if (id.isEmpty) continue;
        final itemValues =
            fields['itemIds']?['arrayValue']?['values'] as List? ?? [];
        lists.add(VaultList(
          id: id,
          name: fields['name']?['stringValue']?.toString() ?? 'Colección',
          description:
              fields['description']?['stringValue']?.toString() ?? '',
          icon: fields['icon']?['stringValue']?.toString() ?? 'folder',
          colorHex: fields['color']?['stringValue']?.toString() ?? '#0066FF',
          itemIds: itemValues
              .map((v) => v['stringValue']?.toString() ?? '')
              .where((s) => s.isNotEmpty)
              .toList(),
          createdAt:
              fields['createdAt']?['stringValue']?.toString() ?? '2026-08-23',
        ));
      }
      return lists;
    } catch (_) {
      return [];
    }
  }

  static Future<bool> saveVaultList(VaultList list) async {
    final res = await _fetch(
      '/vault_lists/${Uri.encodeComponent(list.id)}',
      method: 'PATCH',
      body: {
        'fields': {
          'id': {'stringValue': list.id},
          'name': {'stringValue': list.name},
          'description': {'stringValue': list.description},
          'icon': {'stringValue': list.icon},
          'color': {'stringValue': list.colorHex},
          'createdAt': {'stringValue': list.createdAt},
          'itemIds': {
            'arrayValue': {
              'values':
                  list.itemIds.map((id) => {'stringValue': id}).toList(),
            }
          },
        }
      },
    );
    return res != null && res.statusCode >= 200 && res.statusCode < 300;
  }

  static Future<bool> deleteVaultList(String listId) async {
    final res = await _fetch(
      '/vault_lists/${Uri.encodeComponent(listId)}',
      method: 'DELETE',
    );
    return res != null && res.statusCode >= 200 && res.statusCode < 300;
  }

  static Future<List<PaymentReceipt>> fetchReceipts() async {
    final res = await _fetch('/system_config/receipts_registry');
    if (res != null && res.statusCode == 200) {
      try {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final rawJson =
            data['fields']?['receiptsJson']?['stringValue']?.toString();
        if (rawJson != null && rawJson.isNotEmpty) {
          final parsed = jsonDecode(rawJson) as List;
          return parsed
              .map((e) => PaymentReceipt.fromJson(e as Map<String, dynamic>))
              .toList();
        }
      } catch (_) {}
    }
    return [];
  }

  static Future<bool> saveReceiptsRegistry(
      List<PaymentReceipt> receipts) async {
    final compact = receipts.map((r) => r.toJson()).toList();
    final res = await _fetch(
      '/system_config/receipts_registry',
      method: 'PATCH',
      body: {
        'fields': {
          'receiptsJson': {'stringValue': jsonEncode(compact)},
          'updatedAt': {'stringValue': DateTime.now().toIso8601String()},
        }
      },
    );
    return res != null && res.statusCode >= 200 && res.statusCode < 300;
  }
}

// ============================================================================
// WIDGET INSIGNIA VERIFICADA AZUL (IDÉNTICA A VerifiedBadge.tsx)
// ============================================================================
class VerifiedBadgeWidget extends StatelessWidget {
  final double size;
  const VerifiedBadgeWidget({super.key, this.size = 16});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: kPrimaryBlue,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: kPrimaryBlue.withOpacity(0.6),
            blurRadius: 6,
          ),
        ],
      ),
      child: Icon(Icons.check, color: Colors.white, size: size * 0.68),
    );
  }
}

// ============================================================================
// APLICACIÓN PRINCIPAL FLUTTER NATIVA CON LA ESTÉTICA EXACTA DE VITE
// ============================================================================
class Seis6VaultNativeApp extends StatefulWidget {
  const Seis6VaultNativeApp({super.key});

  @override
  State<Seis6VaultNativeApp> createState() => _Seis6VaultNativeAppState();
}

class _Seis6VaultNativeAppState extends State<Seis6VaultNativeApp> {
  bool _isDark = true;
  bool _isLoading = true;
  bool _isPreviewingAsVisitor = false;
  UserProfile? _currentUser;
  List<VaultItem> _items = kInitialVaultItems;
  List<VaultList> _lists = kInitialVaultLists;
  List<PaymentReceipt> _receipts = [];
  bool _isMaintenance = false;
  String _maintenanceMessage =
      'Estamos realizando labores de mantenimiento y optimización en la plataforma. Volveremos muy pronto.';

  @override
  void initState() {
    super.initState();
    _initializeAppState();
  }

  Future<void> _initializeAppState() async {
    final prefs = await SharedPreferences.getInstance();
    final savedDark = prefs.getBool('vault_theme_dark');
    if (savedDark != null) _isDark = savedDark;

    final savedUserJson = prefs.getString('vault_active_user');
    if (savedUserJson != null) {
      try {
        _currentUser = UserProfile.fromJson(
            jsonDecode(savedUserJson) as Map<String, dynamic>);
      } catch (_) {}
    }

    final savedItemsJson = prefs.getString('vault_items_cache');
    if (savedItemsJson != null) {
      try {
        final list = jsonDecode(savedItemsJson) as List;
        if (list.isNotEmpty) {
          _items = list
              .map((e) => VaultItem.fromJson(e as Map<String, dynamic>))
              .toList();
        }
      } catch (_) {}
    }

    final savedListsJson = prefs.getString('vault_lists_cache');
    if (savedListsJson != null) {
      try {
        final list = jsonDecode(savedListsJson) as List;
        if (list.isNotEmpty) {
          _lists = list
              .map((e) => VaultList.fromJson(e as Map<String, dynamic>))
              .toList();
        }
      } catch (_) {}
    }

    final savedReceiptsJson = prefs.getString('vault_receipts_cache');
    if (savedReceiptsJson != null) {
      try {
        final list = jsonDecode(savedReceiptsJson) as List;
        _receipts = list
            .map((e) => PaymentReceipt.fromJson(e as Map<String, dynamic>))
            .toList();
      } catch (_) {}
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }

    await _syncWithCloud();
  }

  Future<void> _syncWithCloud() async {
    final prefs = await SharedPreferences.getInstance();

    final maint = await NativeFirestoreService.fetchMaintenanceState();
    if (maint != null && mounted) {
      setState(() {
        _isMaintenance = maint['isMaintenance'] == true;
        _maintenanceMessage =
            maint['message']?.toString() ?? _maintenanceMessage;
      });
    }

    final cloudItems = await NativeFirestoreService.fetchVaultItems();
    if (cloudItems.isNotEmpty && mounted) {
      final map = <String, VaultItem>{};
      for (final it in _items) {
        map[it.id] = it;
      }
      for (final it in cloudItems) {
        map[it.id] = it;
      }
      final merged = map.values.toList();
      setState(() => _items = merged);
      await prefs.setString(
          'vault_items_cache',
          jsonEncode(merged.map((e) => e.toJson()).toList()));
    }

    final cloudLists = await NativeFirestoreService.fetchVaultLists();
    if (cloudLists.isNotEmpty && mounted) {
      final map = <String, VaultList>{};
      for (final l in _lists) {
        map[l.id] = l;
      }
      for (final l in cloudLists) {
        map[l.id] = l;
      }
      final merged = map.values.toList();
      setState(() => _lists = merged);
      await prefs.setString(
          'vault_lists_cache',
          jsonEncode(merged.map((e) => e.toJson()).toList()));
    }

    final cloudReceipts = await NativeFirestoreService.fetchReceipts();
    if (cloudReceipts.isNotEmpty && mounted) {
      final map = <String, PaymentReceipt>{};
      for (final r in _receipts) {
        map[r.id] = r;
      }
      for (final r in cloudReceipts) {
        map[r.id] = r;
      }
      final merged = map.values.toList();
      setState(() => _receipts = merged);
      await prefs.setString(
          'vault_receipts_cache',
          jsonEncode(merged.map((e) => e.toJson()).toList()));
    }
  }

  Future<void> _updateCurrentUser(UserProfile? user) async {
    final prefs = await SharedPreferences.getInstance();
    if (user == null) {
      await prefs.remove('vault_active_user');
    } else {
      await prefs.setString('vault_active_user', jsonEncode(user.toJson()));
    }
    setState(() => _currentUser = user);
  }

  Future<void> _toggleTheme(bool dark) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('vault_theme_dark', dark);
    setState(() => _isDark = dark);
  }

  @override
  Widget build(BuildContext context) {
    final darkTheme = ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: kDarkBg,
      primaryColor: kPrimaryBlue,
      colorScheme: const ColorScheme.dark(
        primary: kPrimaryBlue,
        secondary: kEmerald,
        surface: kDarkCard,
      ),
      useMaterial3: true,
    );

    final lightTheme = ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      primaryColor: kPrimaryBlue,
      colorScheme: const ColorScheme.light(
        primary: kPrimaryBlue,
        secondary: kEmerald,
        surface: Colors.white,
      ),
      useMaterial3: true,
    );

    final showMaintenanceBlock = _isMaintenance &&
        ((_currentUser == null || !_currentUser!.isAdmin) ||
            _isPreviewingAsVisitor);

    return MaterialApp(
      title: 'App 66 - Servidor Privado',
      debugShowCheckedModeBanner: false,
      theme: _isDark ? darkTheme : lightTheme,
      home: _isLoading
          ? Scaffold(
              backgroundColor: _isDark ? kDarkBg : const Color(0xFFF1F4F9),
              body: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: kPrimaryBlue,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: kPrimaryBlue.withOpacity(0.4),
                            blurRadius: 20,
                          ),
                        ],
                      ),
                      child: const Icon(Icons.verified_user_outlined,
                          color: Colors.white, size: 28),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'VERIFICANDO ACCESO A LA BÓVEDA...',
                      style: TextStyle(
                        color: kPrimaryBlue,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            )
          : showMaintenanceBlock
              ? NativeMaintenanceScreen(
                  isDark: _isDark,
                  message: _maintenanceMessage,
                  isPreviewingAsVisitor: _isPreviewingAsVisitor,
                  onExitVisitorPreview: () =>
                      setState(() => _isPreviewingAsVisitor = false),
                  onToggleTheme: () => _toggleTheme(!_isDark),
                  onAdminUnlock: (user) {
                    setState(() => _isPreviewingAsVisitor = false);
                    _updateCurrentUser(user);
                  },
                )
              : _currentUser == null
                  ? NativeAuthScreen(
                      isDark: _isDark,
                      onAuthenticated: (user) => _updateCurrentUser(user),
                    )
                  : NativeAppShell(
                      currentUser: _currentUser!,
                      isDark: _isDark,
                      items: _items,
                      lists: _lists,
                      receipts: _receipts,
                      isMaintenance: _isMaintenance,
                      maintenanceMessage: _maintenanceMessage,
                      onToggleTheme: _toggleTheme,
                      onUpdateUser: _updateCurrentUser,
                      onRefreshCloud: _syncWithCloud,
                      onPreviewVisitor: () =>
                          setState(() => _isPreviewingAsVisitor = true),
                      onItemsChanged: (updated) async {
                        setState(() => _items = updated);
                        final prefs = await SharedPreferences.getInstance();
                        await prefs.setString(
                          'vault_items_cache',
                          jsonEncode(updated.map((e) => e.toJson()).toList()),
                        );
                      },
                      onListsChanged: (updated) async {
                        setState(() => _lists = updated);
                        final prefs = await SharedPreferences.getInstance();
                        await prefs.setString(
                          'vault_lists_cache',
                          jsonEncode(updated.map((e) => e.toJson()).toList()),
                        );
                      },
                      onReceiptsChanged: (updated) async {
                        setState(() => _receipts = updated);
                        final prefs = await SharedPreferences.getInstance();
                        await prefs.setString(
                          'vault_receipts_cache',
                          jsonEncode(updated.map((e) => e.toJson()).toList()),
                        );
                        await NativeFirestoreService.saveReceiptsRegistry(
                            updated);
                      },
                      onMaintenanceChanged: (active, msg) async {
                        setState(() {
                          _isMaintenance = active;
                          _maintenanceMessage = msg;
                        });
                        await NativeFirestoreService.saveMaintenanceState(
                            active, msg);
                      },
                    ),
    );
  }
}

// ============================================================================
// PANTALLA DE MANTENIMIENTO (RÉPLICA EXACTA DE MaintenanceScreen.tsx)
// ============================================================================
class NativeMaintenanceScreen extends StatefulWidget {
  final bool isDark;
  final String message;
  final bool isPreviewingAsVisitor;
  final VoidCallback onExitVisitorPreview;
  final VoidCallback onToggleTheme;
  final ValueChanged<UserProfile> onAdminUnlock;

  const NativeMaintenanceScreen({
    super.key,
    required this.isDark,
    required this.message,
    required this.isPreviewingAsVisitor,
    required this.onExitVisitorPreview,
    required this.onToggleTheme,
    required this.onAdminUnlock,
  });

  @override
  State<NativeMaintenanceScreen> createState() =>
      _NativeMaintenanceScreenState();
}

class _NativeMaintenanceScreenState extends State<NativeMaintenanceScreen> {
  final _keyController = TextEditingController();
  bool _showAdminPortal = false;
  bool _showKey = false;
  String? _error;

  void _unlockAdmin() {
    if (isAuthorizedAdminKey(_keyController.text)) {
      widget.onAdminUnlock(const UserProfile(
        uid: 'admin_master_astro',
        email: 'astroarg02@gmail.com',
        displayName: 'Seis6 Mod',
        role: 'admin',
        tier: 'Bóveda Diamante',
        joinedAt: '2025-01-01',
        bio: 'Owner Oficial del Sei6 🛠️',
        phone: '+54 9 11 6554-6038',
        instagram: 'spig9tv',
        customStatus: 'En línea 🟢',
        avatarUrl:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      ));
    } else {
      setState(() => _error =
          'Key de administrador no válida. Acceso estrictamente restringido.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF060608) : const Color(0xFFF4F6FB),
      body: SafeArea(
        child: Column(
          children: [
            if (widget.isPreviewingAsVisitor)
              Container(
                width: double.infinity,
                color: kAmber,
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                child: Row(
                  children: [
                    const Icon(Icons.build, color: Colors.black, size: 16),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'VISTA PREVIA DE VISITANTE (ADMIN) • Así ven el bloqueo los usuarios',
                        style: TextStyle(
                          color: Colors.black,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    TextButton(
                      style: TextButton.styleFrom(
                        backgroundColor: Colors.black,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        minimumSize: Size.zero,
                      ),
                      onPressed: widget.onExitVisitorPreview,
                      child: const Text('Volver a Admin',
                          style: TextStyle(
                              fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: kAmber.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: kAmber.withOpacity(0.35)),
                        ),
                        child: const Icon(Icons.build_outlined,
                            color: kAmber, size: 18),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                'App 66',
                                style: TextStyle(
                                  color: isDark
                                      ? Colors.white
                                      : const Color(0xFF0F172A),
                                  fontWeight: FontWeight.w900,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: kAmber.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(99),
                                  border: Border.all(
                                      color: kAmber.withOpacity(0.3)),
                                ),
                                child: const Text(
                                  'SISTEMA EN MANTENIMIENTO',
                                  style: TextStyle(
                                    color: kAmber,
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const Text(
                            'Servidor Privado & Bóveda Exclusiva',
                            style:
                                TextStyle(color: kMutedText, fontSize: 10),
                          ),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: widget.onToggleTheme,
                    icon: Icon(
                      isDark ? Icons.wb_sunny_outlined : Icons.dark_mode_outlined,
                      color: isDark ? Colors.amber : Colors.blueGrey,
                      size: 20,
                    ),
                  ),
                ],
              ),
            ),
            // Main Card
            Expanded(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 440),
                    padding: const EdgeInsets.all(28),
                    decoration: BoxDecoration(
                      color: isDark
                          ? const Color(0xFF0E0E13)
                          : Colors.white,
                      borderRadius: BorderRadius.circular(28),
                      border:
                          Border.all(color: kAmber.withOpacity(0.3)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.5),
                          blurRadius: 30,
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Container(
                              width: 78,
                              height: 78,
                              decoration: BoxDecoration(
                                color: kAmber.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(
                                    color: kAmber.withOpacity(0.35),
                                    width: 2),
                              ),
                              child: const Icon(Icons.build_rounded,
                                  color: kAmber, size: 38),
                            ),
                            Positioned(
                              bottom: -6,
                              right: -6,
                              child: Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  color: Colors.redAccent,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                      color: const Color(0xFF0E0E13), width: 2),
                                ),
                                child: const Icon(Icons.lock,
                                    color: Colors.white, size: 14),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            color: kAmber.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(99),
                            border: Border.all(
                                color: kAmber.withOpacity(0.3)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.circle, color: kAmber, size: 8),
                              SizedBox(width: 6),
                              Text(
                                'MANTENIMIENTO ACTIVO',
                                style: TextStyle(
                                  color: kAmber,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Sitio en Mantenimiento',
                          style: TextStyle(
                            color:
                                isDark ? Colors.white : const Color(0xFF0F172A),
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          widget.message,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: kMutedText,
                            fontSize: 13,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 18),
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: isDark
                                ? const Color(0xFF15151C)
                                : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                                color: isDark
                                    ? const Color(0xFF22222E)
                                    : Colors.black12),
                          ),
                          child: const Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(Icons.gpp_maybe_outlined,
                                  color: kAmber, size: 20),
                              SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Acceso restringido temporalmente',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                    SizedBox(height: 2),
                                    Text(
                                      'Estamos realizando mejoras en la bóveda. El servicio volverá a estar disponible en breve.',
                                      style: TextStyle(
                                          color: kMutedText, fontSize: 11),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Divider(height: 1, color: kDarkBorder),
                        const SizedBox(height: 12),
                        if (!_showAdminPortal)
                          TextButton.icon(
                            onPressed: () =>
                                setState(() => _showAdminPortal = true),
                            icon: const Icon(Icons.vpn_key_outlined,
                                size: 15, color: kPrimaryBlue),
                            label: const Text(
                              'Acceso Administrador',
                              style: TextStyle(
                                color: kPrimaryBlue,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          )
                        else ...[
                          if (_error != null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Text(
                                _error!,
                                style: const TextStyle(
                                    color: Colors.redAccent, fontSize: 11),
                              ),
                            ),
                          TextField(
                            controller: _keyController,
                            obscureText: !_showKey,
                            style: TextStyle(
                              color: isDark ? Colors.white : Colors.black,
                              fontSize: 13,
                              fontFamily: 'monospace',
                            ),
                            decoration: InputDecoration(
                              hintText: 'Key de Administrador...',
                              prefixIcon: const Icon(Icons.vpn_key_outlined,
                                  color: kPrimaryBlue, size: 18),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _showKey
                                      ? Icons.visibility_off
                                      : Icons.visibility,
                                  size: 18,
                                  color: kMutedText,
                                ),
                                onPressed: () =>
                                    setState(() => _showKey = !_showKey),
                              ),
                              filled: true,
                              fillColor: isDark
                                  ? const Color(0xFF121218)
                                  : Colors.white,
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 12),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide:
                                    const BorderSide(color: kDarkBorder),
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: kPrimaryBlue,
                                foregroundColor: Colors.white,
                                padding:
                                    const EdgeInsets.symmetric(vertical: 13),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              onPressed: _unlockAdmin,
                              icon: const Icon(Icons.verified_user_outlined,
                                  size: 16),
                              label: const Text(
                                'Entrar como Administrador',
                                style: TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// PANTALLA DE AUTENTICACIÓN (RÉPLICA EXACTA DE AuthScreen.tsx)
// ============================================================================
class NativeAuthScreen extends StatefulWidget {
  final bool isDark;
  final ValueChanged<UserProfile> onAuthenticated;

  const NativeAuthScreen({
    super.key,
    required this.isDark,
    required this.onAuthenticated,
  });

  @override
  State<NativeAuthScreen> createState() => _NativeAuthScreenState();
}

class _NativeAuthScreenState extends State<NativeAuthScreen> {
  bool _isSignUp = false;
  bool _isAdminMode = false;
  bool _showPassword = false;
  bool _showAdminKey = false;
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _adminKeyCtrl = TextEditingController();
  String? _error;

  void _handleAdminKeyLogin() {
    final cleanKey = _adminKeyCtrl.text.trim();
    if (cleanKey.isEmpty) {
      setState(() => _error = 'Por favor introduce la Key de Administrador.');
      return;
    }
    if (!isAuthorizedAdminKey(cleanKey)) {
      setState(() => _error = 'Key de Administrador incorrecta. Acceso denegado.');
      return;
    }
    widget.onAuthenticated(const UserProfile(
      uid: 'admin_master_astro',
      email: 'astroarg02@gmail.com',
      displayName: 'Seis6 Mod',
      role: 'admin',
      tier: 'Bóveda Diamante',
      joinedAt: '2025-01-01',
      bio: 'Owner Oficial del Sei6 🛠️',
      phone: '+54 9 11 6554-6038',
      instagram: 'spig9tv',
      customStatus: 'En línea 🟢',
      avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    ));
  }

  void _handleStandardSubmit() {
    final email = _emailCtrl.text.trim().toLowerCase();
    final pass = _passCtrl.text.trim();
    final name = _nameCtrl.text.trim();

    if (email.isEmpty || !email.contains('@')) {
      setState(
          () => _error = 'Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (pass.length < 6) {
      setState(() =>
          _error = 'La contraseña debe contener al menos 6 caracteres.');
      return;
    }

    final isAdmin = isAuthorizedAdminEmail(email);
    widget.onAuthenticated(UserProfile(
      uid: isAdmin
          ? 'admin_master_astro'
          : 'usr_${DateTime.now().millisecondsSinceEpoch}',
      email: email,
      displayName: name.isNotEmpty
          ? name
          : (isAdmin ? 'Seis6 Mod' : email.split('@').first),
      role: isAdmin ? 'admin' : 'vip_member',
      tier: isAdmin ? 'Bóveda Diamante' : 'Invitado',
      joinedAt: DateTime.now().toIso8601String().split('T').first,
      avatarUrl: isAdmin
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      customStatus: isAdmin ? 'En línea 🟢' : '💎 Miembro VIP',
    ));
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    return Scaffold(
      backgroundColor: isDark ? kDarkBg : const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Emblema circular con escudo y llave (idéntico a AuthScreen.tsx)
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        width: 74,
                        height: 74,
                        decoration: BoxDecoration(
                          color: isDark ? kDarkCard : Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(
                              color: isDark ? kDarkBorder : Colors.blue.shade100),
                          boxShadow: [
                            BoxShadow(
                              color: kPrimaryBlue.withOpacity(0.4),
                              blurRadius: 36,
                              spreadRadius: -4,
                            ),
                          ],
                        ),
                        child: const Icon(Icons.shield_outlined,
                            color: kPrimaryBlue, size: 36),
                      ),
                      Positioned(
                        top: -2,
                        right: -2,
                        child: Container(
                          width: 22,
                          height: 22,
                          decoration: const BoxDecoration(
                            color: kPrimaryBlue,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.vpn_key,
                              color: Colors.white, size: 11),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.local_fire_department,
                          color: Colors.amber, size: 14),
                      SizedBox(width: 4),
                      Text(
                        'BÓVEDA PRIVADA',
                        style: TextStyle(
                          color: kPrimaryBlue,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2.0,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _isAdminMode
                        ? 'Acceso Administrador'
                        : _isSignUp
                            ? 'Crear Cuenta'
                            : 'Acceso al Servidor',
                    style: TextStyle(
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _isAdminMode
                        ? 'Ingresa la Key de seguridad para entrar como Administrador.'
                        : _isSignUp
                            ? 'Crea tu cuenta de acceso a la bóveda privada.'
                            : 'Servidor privado con autenticación segura.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: kMutedText, fontSize: 12),
                  ),
                  const SizedBox(height: 18),

                  if (_error != null)
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 14),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.redAccent.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                            color: Colors.redAccent.withOpacity(0.35)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline,
                              color: Colors.redAccent, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _error!,
                              style: const TextStyle(
                                  color: Colors.redAccent, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Tarjeta Switch Modo Administrador
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: _isAdminMode
                          ? kPrimaryBlue.withOpacity(0.1)
                          : (isDark ? kDarkCard : Colors.white),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: _isAdminMode
                            ? kPrimaryBlue.withOpacity(0.45)
                            : (isDark ? kDarkBorder : Colors.black12),
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color:
                                _isAdminMode ? kPrimaryBlue : kDarkSurface,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            Icons.vpn_key_outlined,
                            color: _isAdminMode ? Colors.white : kPrimaryBlue,
                            size: 16,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Modo Administrador',
                                style: TextStyle(
                                  color: isDark
                                      ? Colors.white
                                      : const Color(0xFF0F172A),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                              const Text(
                                'Acceso al panel con Key de seguridad',
                                style:
                                    TextStyle(color: kMutedText, fontSize: 10),
                              ),
                            ],
                          ),
                        ),
                        Switch(
                          value: _isAdminMode,
                          activeColor: Colors.white,
                          activeTrackColor: kPrimaryBlue,
                          onChanged: (v) => setState(() {
                            _isAdminMode = v;
                            _error = null;
                          }),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  if (_isAdminMode) ...[
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'KEY DE ADMINISTRADOR',
                        style: TextStyle(
                          color: kMutedText,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _adminKeyCtrl,
                      obscureText: !_showAdminKey,
                      style: TextStyle(
                        color: isDark ? Colors.white : Colors.black,
                        fontSize: 13,
                        fontFamily: 'monospace',
                      ),
                      decoration: InputDecoration(
                        hintText: 'Ingresa la Key de seguridad...',
                        hintStyle: const TextStyle(color: kDimText),
                        prefixIcon: const Icon(Icons.vpn_key_outlined,
                            color: kPrimaryBlue, size: 18),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _showAdminKey
                                ? Icons.visibility_off
                                : Icons.visibility,
                            size: 18,
                            color: kMutedText,
                          ),
                          onPressed: () =>
                              setState(() => _showAdminKey = !_showAdminKey),
                        ),
                        filled: true,
                        fillColor: isDark ? kDarkCard : Colors.white,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: kDarkBorder),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: kDarkBorder),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: kPrimaryBlue,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        onPressed: _handleAdminKeyLogin,
                        icon: const Icon(Icons.shield_outlined, size: 18),
                        label: const Text(
                          'ENTRAR COMO ADMINISTRADOR',
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ),
                    ),
                  ] else ...[
                    // Selector de Pestaña Iniciar Sesión / Registrarse
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: isDark ? kDarkCard : Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                            color: isDark ? kDarkBorder : Colors.black12),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() {
                                _isSignUp = false;
                                _error = null;
                              }),
                              child: Container(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 9),
                                decoration: BoxDecoration(
                                  color: !_isSignUp
                                      ? kPrimaryBlue
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.login,
                                      size: 15,
                                      color: !_isSignUp
                                          ? Colors.white
                                          : kMutedText,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Iniciar Sesión',
                                      style: TextStyle(
                                        color: !_isSignUp
                                            ? Colors.white
                                            : kMutedText,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() {
                                _isSignUp = true;
                                _error = null;
                              }),
                              child: Container(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 9),
                                decoration: BoxDecoration(
                                  color: _isSignUp
                                      ? kPrimaryBlue
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.person_add_alt_1_outlined,
                                      size: 15,
                                      color: _isSignUp
                                          ? Colors.white
                                          : kMutedText,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Registrarse',
                                      style: TextStyle(
                                        color: _isSignUp
                                            ? Colors.white
                                            : kMutedText,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    if (_isSignUp) ...[
                      _buildInputField(
                        label: 'NOMBRE O USUARIO',
                        hint: 'Tu nombre o apodo',
                        icon: Icons.person_outline,
                        controller: _nameCtrl,
                        isDark: isDark,
                      ),
                      const SizedBox(height: 10),
                    ],
                    _buildInputField(
                      label: 'CORREO ELECTRÓNICO',
                      hint: 'usuario@ejemplo.com',
                      icon: Icons.mail_outline,
                      controller: _emailCtrl,
                      isDark: isDark,
                    ),
                    const SizedBox(height: 10),
                    _buildInputField(
                      label: 'CONTRASEÑA',
                      hint: 'Mínimo 6 caracteres',
                      icon: Icons.lock_outline,
                      controller: _passCtrl,
                      isDark: isDark,
                      obscure: !_showPassword,
                      suffix: IconButton(
                        icon: Icon(
                          _showPassword
                              ? Icons.visibility_off
                              : Icons.visibility,
                          size: 18,
                          color: kMutedText,
                        ),
                        onPressed: () =>
                            setState(() => _showPassword = !_showPassword),
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: kPrimaryBlue,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        onPressed: _handleStandardSubmit,
                        icon: Icon(
                            _isSignUp ? Icons.person_add : Icons.login,
                            size: 18),
                        label: Text(
                          _isSignUp ? 'CREAR CUENTA' : 'ENTRAR AL SERVIDOR',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInputField({
    required String label,
    required String hint,
    required IconData icon,
    required TextEditingController controller,
    required bool isDark,
    bool obscure = false,
    Widget? suffix,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: kMutedText,
            fontSize: 10,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        TextField(
          controller: controller,
          obscureText: obscure,
          style: TextStyle(
              color: isDark ? Colors.white : Colors.black, fontSize: 13),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: kDimText, fontSize: 12),
            prefixIcon: Icon(icon, color: kMutedText, size: 18),
            suffixIcon: suffix,
            filled: true,
            fillColor: isDark ? kDarkCard : Colors.white,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: kDarkBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(
                  color: isDark ? kDarkBorder : Colors.grey.shade300),
            ),
          ),
        ),
      ],
    );
  }
}

// ============================================================================
// SHELL PRINCIPAL CON HEADER "App 66 / SERVIDOR PRIVADO" Y HOME BAR PILL
// (RÉPLICA EXACTA DE src/App.tsx)
// ============================================================================
class NativeAppShell extends StatefulWidget {
  final UserProfile currentUser;
  final bool isDark;
  final List<VaultItem> items;
  final List<VaultList> lists;
  final List<PaymentReceipt> receipts;
  final bool isMaintenance;
  final String maintenanceMessage;
  final ValueChanged<bool> onToggleTheme;
  final ValueChanged<UserProfile?> onUpdateUser;
  final Future<void> Function() onRefreshCloud;
  final VoidCallback onPreviewVisitor;
  final ValueChanged<List<VaultItem>> onItemsChanged;
  final ValueChanged<List<VaultList>> onListsChanged;
  final ValueChanged<List<PaymentReceipt>> onReceiptsChanged;
  final void Function(bool active, String message) onMaintenanceChanged;

  const NativeAppShell({
    super.key,
    required this.currentUser,
    required this.isDark,
    required this.items,
    required this.lists,
    required this.receipts,
    required this.isMaintenance,
    required this.maintenanceMessage,
    required this.onToggleTheme,
    required this.onUpdateUser,
    required this.onRefreshCloud,
    required this.onPreviewVisitor,
    required this.onItemsChanged,
    required this.onListsChanged,
    required this.onReceiptsChanged,
    required this.onMaintenanceChanged,
  });

  @override
  State<NativeAppShell> createState() => _NativeAppShellState();
}

class _NativeAppShellState extends State<NativeAppShell> {
  // 'vault' | 'membership' | 'receipts' | 'approvals' | 'profile'
  String _currentTab = 'vault';
  // 'items' | 'collections'
  late String _vaultTabMode;
  String? _selectedListId;

  @override
  void initState() {
    super.initState();
    _vaultTabMode = widget.currentUser.isAdmin ? 'items' : 'collections';
  }

  void _openMaintenanceModal() {
    bool tempActive = widget.isMaintenance;
    final msgCtrl = TextEditingController(text: widget.maintenanceMessage);

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor:
              widget.isDark ? const Color(0xFF0E0E12) : Colors.white,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: const Row(
            children: [
              Icon(Icons.build_circle_outlined, color: kAmber),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Control de Mantenimiento',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Modo Mantenimiento Activo',
                    style:
                        TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                subtitle: const Text(
                    'Bloquea el acceso a usuarios no administradores',
                    style: TextStyle(fontSize: 11, color: kMutedText)),
                value: tempActive,
                activeColor: kAmber,
                onChanged: (v) => setDialogState(() => tempActive = v),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: msgCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: 'Mensaje para visitantes',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: kPrimaryBlue,
                foregroundColor: Colors.white,
              ),
              onPressed: () {
                widget.onMaintenanceChanged(tempActive, msgCtrl.text.trim());
                Navigator.pop(ctx);
              },
              child: const Text('Guardar Estado'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final isAdmin = widget.currentUser.isAdmin;
    final pendingApprovalsCount =
        widget.receipts.where((r) => r.status == 'pending').length;

    return Scaffold(
      backgroundColor: isDark ? kDarkBg : const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Column(
          children: [
            // ================================================================
            // TOP HEADER BAR (IDÉNTICO A App.tsx líneas 1005-1149)
            // ================================================================
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: isDark ? kDarkBg : Colors.white,
                border: Border(
                  bottom: BorderSide(
                      color: isDark ? kDarkBorder : const Color(0xFFE2E8F0)),
                ),
              ),
              child: Row(
                children: [
                  // Logo & App 66 + SERVIDOR PRIVADO
                  GestureDetector(
                    onTap: () => setState(() {
                      _currentTab = 'vault';
                      if (!isAdmin) _vaultTabMode = 'collections';
                    }),
                    child: Row(
                      children: [
                        Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: kPrimaryBlue,
                            borderRadius: BorderRadius.circular(11),
                            boxShadow: [
                              BoxShadow(
                                color: kPrimaryBlue.withOpacity(0.35),
                                blurRadius: 8,
                              ),
                            ],
                          ),
                          child: const Icon(Icons.verified_user_outlined,
                              color: Colors.white, size: 18),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'App 66',
                          style: TextStyle(
                            color:
                                isDark ? Colors.white : const Color(0xFF0F172A),
                            fontWeight: FontWeight.w900,
                            fontSize: 15,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: kPrimaryBlue.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(99),
                            border: Border.all(
                                color: kPrimaryBlue.withOpacity(0.3)),
                          ),
                          child: const Text(
                            'SERVIDOR PRIVADO',
                            style: TextStyle(
                              color: kPrimaryBlue,
                              fontSize: 8.5,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  // Botón de Mantenimiento (Admin)
                  if (isAdmin) ...[
                    GestureDetector(
                      onTap: _openMaintenanceModal,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 5),
                        decoration: BoxDecoration(
                          color: widget.isMaintenance
                              ? kAmber.withOpacity(0.2)
                              : (isDark
                                  ? Colors.white.withOpacity(0.05)
                                  : Colors.black.withOpacity(0.05)),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: widget.isMaintenance
                                ? kAmber.withOpacity(0.4)
                                : (isDark ? kDarkBorder : Colors.black12),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.build_outlined,
                              size: 13,
                              color:
                                  widget.isMaintenance ? kAmber : kMutedText,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              widget.isMaintenance ? 'ON' : 'OFF',
                              style: TextStyle(
                                color:
                                    widget.isMaintenance ? kAmber : kMutedText,
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                  ],
                  // User Profile Pill con Avatar, Nombre y VerifiedBadge
                  GestureDetector(
                    onTap: () => setState(() => _currentTab = 'profile'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _currentTab == 'profile'
                            ? kPrimaryBlue.withOpacity(0.15)
                            : (isDark ? kDarkCard : Colors.white),
                        borderRadius: BorderRadius.circular(99),
                        border: Border.all(
                          color: _currentTab == 'profile'
                              ? kPrimaryBlue
                              : (isDark ? kDarkBorder : Colors.black12),
                        ),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 10,
                            backgroundColor: kPrimaryBlue,
                            backgroundImage: widget.currentUser.avatarUrl !=
                                        null &&
                                    widget.currentUser.avatarUrl!
                                        .startsWith('http')
                                ? NetworkImage(widget.currentUser.avatarUrl!)
                                : null,
                            child: widget.currentUser.avatarUrl == null ||
                                    !widget.currentUser.avatarUrl!
                                        .startsWith('http')
                                ? Text(
                                    widget.currentUser.displayName.isNotEmpty
                                        ? widget.currentUser.displayName[0]
                                            .toUpperCase()
                                        : 'U',
                                    style: const TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white),
                                  )
                                : null,
                          ),
                          const SizedBox(width: 6),
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 78),
                            child: Text(
                              widget.currentUser.displayName,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: _currentTab == 'profile'
                                    ? kPrimaryBlue
                                    : (isDark
                                        ? Colors.white
                                        : const Color(0xFF0F172A)),
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          if (isAdmin) ...[
                            const SizedBox(width: 4),
                            const VerifiedBadgeWidget(size: 13),
                          ] else if (widget.currentUser.hasActiveMembership) ...[
                            const SizedBox(width: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 5, vertical: 1),
                              decoration: BoxDecoration(
                                color: kPrimaryBlue.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(99),
                              ),
                              child: const Text(
                                'VIP',
                                style: TextStyle(
                                  color: kPrimaryBlue,
                                  fontSize: 8,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  // Botón Tema Sol/Luna
                  GestureDetector(
                    onTap: () => widget.onToggleTheme(!isDark),
                    child: Container(
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(11),
                        border: Border.all(
                            color: isDark ? kDarkBorder : Colors.black12),
                      ),
                      child: Icon(
                        isDark ? Icons.wb_sunny_outlined : Icons.dark_mode_outlined,
                        size: 15,
                        color: isDark ? Colors.amber : Colors.blueGrey,
                      ),
                    ),
                  ),
                  const SizedBox(width: 5),
                  // Botón Cerrar Sesión
                  GestureDetector(
                    onTap: () => widget.onUpdateUser(null),
                    child: Container(
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(11),
                        border: Border.all(
                            color: isDark ? kDarkBorder : Colors.black12),
                      ),
                      child: const Icon(
                        Icons.logout,
                        size: 15,
                        color: kMutedText,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Banner Superior de Modo Mantenimiento Activo (Solo Admin)
            if (widget.isMaintenance && isAdmin)
              Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                decoration: BoxDecoration(
                  color: kAmber.withOpacity(0.15),
                  border: Border(
                    bottom:
                        BorderSide(color: kAmber.withOpacity(0.35)),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.circle, color: kAmber, size: 8),
                    const SizedBox(width: 6),
                    const Expanded(
                      child: Text(
                        'MODO MANTENIMIENTO ACTIVO: Bloqueado para visitantes.',
                        style: TextStyle(
                          color: kAmber,
                          fontSize: 10.5,
                          fontWeight: FontWeight.bold,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    GestureDetector(
                      onTap: widget.onPreviewVisitor,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: kAmber.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                              color: kAmber.withOpacity(0.4)),
                        ),
                        child: const Text(
                          'Probar Visitante',
                          style: TextStyle(
                            color: kAmber,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    GestureDetector(
                      onTap: () => widget.onMaintenanceChanged(
                          false, widget.maintenanceMessage),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: kEmerald.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                              color: kEmerald.withOpacity(0.4)),
                        ),
                        child: const Text(
                          'Desactivar',
                          style: TextStyle(
                            color: kEmerald,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // ================================================================
            // CONTENIDO PRINCIPAL DE LA PESTAÑA ACTIVA
            // ================================================================
            Expanded(
              child: _buildCurrentTabContent(),
            ),

            // ================================================================
            // GLOBAL BOTTOM HOME BAR PILL (SOLO ICONOS - IDÉNTICA A App.tsx)
            // ================================================================
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isDark ? kDarkBg : Colors.white,
                border: Border(
                  top: BorderSide(
                      color: isDark ? kDarkBorder : const Color(0xFFE2E8F0)),
                ),
              ),
              child: Center(
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 420),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                  decoration: BoxDecoration(
                    color: isDark ? kDarkCard : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(99),
                    border: Border.all(
                        color: isDark ? kDarkBorder : const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      // 1. Publicaciones (Solo Admin)
                      if (isAdmin)
                        _buildHomeBarIcon(
                          icon: Icons.folder_outlined,
                          active: _currentTab == 'vault' &&
                              _vaultTabMode == 'items' &&
                              _selectedListId == null,
                          isDark: isDark,
                          onTap: () => setState(() {
                            _currentTab = 'vault';
                            _vaultTabMode = 'items';
                            _selectedListId = null;
                          }),
                        ),

                      // 2. Colecciones
                      _buildHomeBarIcon(
                        icon: Icons.layers_outlined,
                        active: _currentTab == 'vault' &&
                            (_vaultTabMode == 'collections' ||
                                _selectedListId != null),
                        isDark: isDark,
                        onTap: () => setState(() {
                          _currentTab = 'vault';
                          _vaultTabMode = 'collections';
                          _selectedListId = null;
                        }),
                      ),

                      _buildVerticalDivider(isDark),

                      // 3. Membresía VIP (Corona dorada)
                      _buildHomeBarIcon(
                        icon: Icons.workspace_premium,
                        iconColor: Colors.amber,
                        active: _currentTab == 'membership',
                        isDark: isDark,
                        onTap: () =>
                            setState(() => _currentTab = 'membership'),
                      ),

                      // 4. Comprobantes de Pago (con punto esmeralda)
                      _buildHomeBarIcon(
                        icon: Icons.description_outlined,
                        active: _currentTab == 'receipts',
                        showDot: _currentTab != 'receipts',
                        isDark: isDark,
                        onTap: () => setState(() => _currentTab = 'receipts'),
                      ),

                      // 5. Aprobaciones (Solo Admin con contador)
                      if (isAdmin) ...[
                        _buildVerticalDivider(isDark),
                        _buildHomeBarIcon(
                          icon: Icons.verified_user_outlined,
                          active: _currentTab == 'approvals',
                          badgeCount: pendingApprovalsCount,
                          isDark: isDark,
                          onTap: () =>
                              setState(() => _currentTab = 'approvals'),
                        ),
                      ],

                      _buildVerticalDivider(isDark),

                      // 6. Ajustes y Sistema
                      _buildHomeBarIcon(
                        icon: Icons.settings_outlined,
                        active: _currentTab == 'profile',
                        isDark: isDark,
                        onTap: () => setState(() => _currentTab = 'profile'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVerticalDivider(bool isDark) {
    return Container(
      width: 1,
      height: 20,
      color: isDark ? kDarkBorder : Colors.grey.shade300,
    );
  }

  Widget _buildHomeBarIcon({
    required IconData icon,
    required bool active,
    required bool isDark,
    required VoidCallback onTap,
    Color? iconColor,
    bool showDot = false,
    int badgeCount = 0,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: active ? kPrimaryBlue : Colors.transparent,
          shape: BoxShape.circle,
          boxShadow: active
              ? [
                  BoxShadow(
                    color: kPrimaryBlue.withOpacity(0.35),
                    blurRadius: 10,
                  )
                ]
              : null,
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(
              icon,
              size: 19,
              color: iconColor ??
                  (active
                      ? Colors.white
                      : (isDark ? Colors.grey.shade400 : Colors.blueGrey)),
            ),
            if (showDot)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  width: 7,
                  height: 7,
                  decoration: const BoxDecoration(
                    color: kEmerald,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            if (badgeCount > 0)
              Positioned(
                top: 4,
                right: 4,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(
                    color: Colors.amber,
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    '$badgeCount',
                    style: const TextStyle(
                      color: Colors.black,
                      fontSize: 8.5,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentTabContent() {
    switch (_currentTab) {
      case 'membership':
        return NativeMembershipScreen(
          currentUser: widget.currentUser,
          isDark: widget.isDark,
          onUpdateUser: widget.onUpdateUser,
          onGoToReceipts: () => setState(() => _currentTab = 'receipts'),
          onGoToVault: () => setState(() => _currentTab = 'vault'),
        );
      case 'receipts':
        return NativeReceiptsScreen(
          currentUser: widget.currentUser,
          isDark: widget.isDark,
          receipts: widget.receipts,
          onReceiptsChanged: widget.onReceiptsChanged,
        );
      case 'approvals':
        return NativeAdminApprovalsScreen(
          currentUser: widget.currentUser,
          isDark: widget.isDark,
          receipts: widget.receipts,
          onReceiptsChanged: widget.onReceiptsChanged,
          onUpdateUser: widget.onUpdateUser,
        );
      case 'profile':
        return NativeProfileScreen(
          currentUser: widget.currentUser,
          isDark: widget.isDark,
          items: widget.items,
          receipts: widget.receipts,
          isMaintenance: widget.isMaintenance,
          maintenanceMessage: widget.maintenanceMessage,
          onToggleTheme: widget.onToggleTheme,
          onUpdateUser: widget.onUpdateUser,
          onOpenMaintenanceModal: _openMaintenanceModal,
          onPreviewVisitor: widget.onPreviewVisitor,
          onGoToMembership: () => setState(() => _currentTab = 'membership'),
          onGoToReceipts: () => setState(() => _currentTab = 'receipts'),
          onGoToVault: () => setState(() => _currentTab = 'vault'),
        );
      case 'vault':
      default:
        return NativeVaultScreen(
          currentUser: widget.currentUser,
          isDark: widget.isDark,
          items: widget.items,
          lists: widget.lists,
          vaultTabMode: _vaultTabMode,
          selectedListId: _selectedListId,
          onTabModeChanged: (m) => setState(() => _vaultTabMode = m),
          onSelectedListChanged: (id) => setState(() => _selectedListId = id),
          onItemsChanged: widget.onItemsChanged,
          onListsChanged: widget.onListsChanged,
          onRefreshCloud: widget.onRefreshCloud,
        );
    }
  }
}

// ============================================================================
// PANTALLA DE BÓVEDA (RÉPLICA EXACTA DE VaultScreen.tsx & VaultDetailModal.tsx)
// ============================================================================
class NativeVaultScreen extends StatefulWidget {
  final UserProfile currentUser;
  final bool isDark;
  final List<VaultItem> items;
  final List<VaultList> lists;
  final String vaultTabMode;
  final String? selectedListId;
  final ValueChanged<String> onTabModeChanged;
  final ValueChanged<String?> onSelectedListChanged;
  final ValueChanged<List<VaultItem>> onItemsChanged;
  final ValueChanged<List<VaultList>> onListsChanged;
  final Future<void> Function() onRefreshCloud;

  const NativeVaultScreen({
    super.key,
    required this.currentUser,
    required this.isDark,
    required this.items,
    required this.lists,
    required this.vaultTabMode,
    required this.selectedListId,
    required this.onTabModeChanged,
    required this.onSelectedListChanged,
    required this.onItemsChanged,
    required this.onListsChanged,
    required this.onRefreshCloud,
  });

  @override
  State<NativeVaultScreen> createState() => _NativeVaultScreenState();
}

class _NativeVaultScreenState extends State<NativeVaultScreen> {
  String _search = '';
  bool _isGridView = false;

  Future<void> _downloadResourceNatively(VaultItem item) async {
    try {
      if (item.downloadUrl.startsWith('http')) {
        final uri = Uri.parse(item.downloadUrl);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
          return;
        }
      }

      final dir = await getTemporaryDirectory();
      final slug = item.title
          .toLowerCase()
          .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
          .replaceAll(RegExp(r'^_|_$'), '');
      final fileName = item.fileName != null && item.fileName!.isNotEmpty
          ? item.fileName!
          : '${slug.isEmpty ? "recurso" : slug}.txt';
      final file = File('${dir.path}/$fileName');

      final content = '''# ${item.title}
Versión: ${item.version}
Autor: ${item.authorName} (${item.authorBadge})
Fecha: ${item.createdAt}
Categoría: ${item.category}

Descripción:
${item.description}
''';
      await file.writeAsString(content);
      await Share.shareXFiles(
        [XFile(file.path)],
        text: 'Recurso oficial Seis6 Vault: ${item.title}',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al descargar archivo: $e')),
        );
      }
    }
  }

  void _toggleLike(VaultItem item) async {
    final uid = widget.currentUser.uid;
    final liked = item.likedBy.contains(uid);
    final newLikedBy = liked
        ? item.likedBy.where((id) => id != uid).toList()
        : [...item.likedBy, uid];
    final newLikesCount = liked
        ? (item.likesCount > 0 ? item.likesCount - 1 : 0)
        : item.likesCount + 1;

    final updatedItem =
        item.copyWith(likesCount: newLikesCount, likedBy: newLikedBy);
    final updatedList =
        widget.items.map((i) => i.id == item.id ? updatedItem : i).toList();
    widget.onItemsChanged(updatedList);
    await NativeFirestoreService.saveVaultItem(updatedItem);
  }

  void _showUploadDialog() {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final urlCtrl = TextEditingController();
    final typeCtrl = TextEditingController(text: 'REG Archivo');
    final sizeCtrl = TextEditingController(text: '2.4 KB');
    String? selectedList =
        widget.lists.isNotEmpty ? widget.lists.first.id : null;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor:
              widget.isDark ? const Color(0xFF0E0E12) : Colors.white,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: const Text('Subir Nuevo Material',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titleCtrl,
                  decoration: const InputDecoration(labelText: 'Título'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: descCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Descripción'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: typeCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Tipo de Archivo (ej: REG Archivo, APK)'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: sizeCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Tamaño (ej: 1.8 KB)'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: urlCtrl,
                  decoration: const InputDecoration(
                      labelText: 'URL de Descarga Directa (Opcional)'),
                ),
                const SizedBox(height: 12),
                if (widget.lists.isNotEmpty)
                  DropdownButtonFormField<String>(
                    value: selectedList,
                    decoration: const InputDecoration(
                        labelText: 'Asignar a Colección'),
                    items: widget.lists
                        .map((l) => DropdownMenuItem(
                              value: l.id,
                              child: Text(l.name),
                            ))
                        .toList(),
                    onChanged: (val) =>
                        setDialogState(() => selectedList = val),
                  ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: kPrimaryBlue,
                foregroundColor: Colors.white,
              ),
              onPressed: () async {
                if (titleCtrl.text.trim().isEmpty) return;
                final newItem = VaultItem(
                  id: 'vault-res-${DateTime.now().millisecondsSinceEpoch}',
                  title: titleCtrl.text.trim(),
                  description: descCtrl.text.trim(),
                  category: 'code',
                  fileType: typeCtrl.text.trim(),
                  fileSize: sizeCtrl.text.trim(),
                  downloadUrl: urlCtrl.text.trim(),
                  coverImage:
                      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
                  createdAt: DateTime.now().toIso8601String().split('T').first,
                  likesCount: 1,
                  likedBy: [widget.currentUser.uid],
                  listIds: selectedList != null ? [selectedList!] : [],
                  comments: const [],
                  authorName: widget.currentUser.displayName,
                  authorBadge: 'ADMIN ROOT',
                );
                final updatedItems = [newItem, ...widget.items];
                widget.onItemsChanged(updatedItems);
                await NativeFirestoreService.saveVaultItem(newItem);

                if (selectedList != null) {
                  final updatedLists = widget.lists.map((l) {
                    if (l.id == selectedList &&
                        !l.itemIds.contains(newItem.id)) {
                      final updatedL =
                          l.copyWith(itemIds: [...l.itemIds, newItem.id]);
                      NativeFirestoreService.saveVaultList(updatedL);
                      return updatedL;
                    }
                    return l;
                  }).toList();
                  widget.onListsChanged(updatedLists);
                }
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('Publicar Ahora'),
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateOrEditListDialog([VaultList? editing]) {
    final nameCtrl = TextEditingController(text: editing?.name ?? '');
    final descCtrl = TextEditingController(text: editing?.description ?? '');
    String selectedColor = editing?.colorHex ?? '#0066FF';
    final selectedItemIds = <String>{...(editing?.itemIds ?? [])};

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor:
              widget.isDark ? const Color(0xFF0E0E12) : Colors.white,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: Text(
            editing != null ? 'Editar Colección' : 'Nueva Colección',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          content: SizedBox(
            width: 360,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(
                        labelText: 'Nombre de la Colección'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: descCtrl,
                    maxLines: 2,
                    decoration:
                        const InputDecoration(labelText: 'Descripción'),
                  ),
                  const SizedBox(height: 12),
                  const Text('Color de Colección:',
                      style:
                          TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    children: [
                      '#0066FF',
                      '#10B981',
                      '#F59E0B',
                      '#EC4899',
                      '#8B5CF6'
                    ].map((hex) {
                      final active = selectedColor == hex;
                      return GestureDetector(
                        onTap: () =>
                            setDialogState(() => selectedColor = hex),
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: parseHexColor(hex),
                            shape: BoxShape.circle,
                            border: active
                                ? Border.all(color: Colors.white, width: 2.5)
                                : null,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 12),
                  const Text('Publicaciones Incluidas:',
                      style:
                          TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  ...widget.items.map((it) {
                    final inside = selectedItemIds.contains(it.id);
                    return CheckboxListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      value: inside,
                      activeColor: kPrimaryBlue,
                      title: Text(it.title,
                          style: const TextStyle(fontSize: 12),
                          overflow: TextOverflow.ellipsis),
                      onChanged: (v) {
                        setDialogState(() {
                          if (v == true) {
                            selectedItemIds.add(it.id);
                          } else {
                            selectedItemIds.remove(it.id);
                          }
                        });
                      },
                    );
                  }),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: kPrimaryBlue,
                foregroundColor: Colors.white,
              ),
              onPressed: () async {
                if (nameCtrl.text.trim().isEmpty) return;
                final savedList = VaultList(
                  id: editing?.id ??
                      'list-${DateTime.now().millisecondsSinceEpoch}',
                  name: nameCtrl.text.trim(),
                  description: descCtrl.text.trim(),
                  icon: editing?.icon ?? 'folder',
                  colorHex: selectedColor,
                  itemIds: selectedItemIds.toList(),
                  createdAt: editing?.createdAt ??
                      DateTime.now().toIso8601String().split('T').first,
                );
                final exists =
                    widget.lists.any((l) => l.id == savedList.id);
                final updated = exists
                    ? widget.lists
                        .map((l) => l.id == savedList.id ? savedList : l)
                        .toList()
                    : [savedList, ...widget.lists];
                widget.onListsChanged(updated);
                await NativeFirestoreService.saveVaultList(savedList);
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('Guardar'),
            ),
          ],
        ),
      ),
    );
  }

  void _openItemDetailModal(VaultItem item) {
    final commentCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor:
          widget.isDark ? const Color(0xFF0A0A0E) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          final currentItem = widget.items
                  .where((i) => i.id == item.id)
                  .firstOrNull ??
              item;
          final isLiked =
              currentItem.likedBy.contains(widget.currentUser.uid);

          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 16,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Imagen de Portada con Badges
                  ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: Stack(
                      children: [
                        Image.network(
                          currentItem.coverImage,
                          height: 150,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            height: 150,
                            color: kDarkSurface,
                            child: const Center(
                              child: Icon(Icons.folder_outlined,
                                  color: kPrimaryBlue, size: 42),
                            ),
                          ),
                        ),
                        Positioned(
                          top: 10,
                          left: 10,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.8),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              currentItem.fileType.isNotEmpty
                                  ? currentItem.fileType
                                  : 'PUBLICACIÓN OFICIAL',
                              style: const TextStyle(
                                color: kPrimaryBlue,
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          currentItem.title,
                          style: TextStyle(
                            color: widget.isDark
                                ? Colors.white
                                : const Color(0xFF0F172A),
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      if (widget.currentUser.isAdmin)
                        IconButton(
                          icon: const Icon(Icons.delete_outline,
                              color: Colors.redAccent),
                          onPressed: () async {
                            widget.onItemsChanged(widget.items
                                .where((i) => i.id != currentItem.id)
                                .toList());
                            await NativeFirestoreService.deleteVaultItem(
                                currentItem.id);
                            if (ctx.mounted) Navigator.pop(ctx);
                          },
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    currentItem.description,
                    style: const TextStyle(
                        color: kMutedText, fontSize: 13, height: 1.4),
                  ),
                  const SizedBox(height: 14),
                  // Botones de Me Gusta + Descarga Nativa
                  Row(
                    children: [
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor:
                              isLiked ? kHeartPink : kMutedText,
                          side: BorderSide(
                            color: isLiked ? kHeartPink : kDarkBorder,
                          ),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        onPressed: () {
                          _toggleLike(currentItem);
                          setSheetState(() {});
                        },
                        icon: Icon(
                          isLiked ? Icons.favorite : Icons.favorite_border,
                          size: 18,
                        ),
                        label: Text('${currentItem.likesCount}'),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: kPrimaryBlue,
                            foregroundColor: Colors.white,
                            padding:
                                const EdgeInsets.symmetric(vertical: 13),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          onPressed: () =>
                              _downloadResourceNatively(currentItem),
                          icon: const Icon(Icons.download_rounded, size: 18),
                          label: const Text(
                            'Descargar Archivo Original',
                            style: TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  const Divider(color: kDarkBorder),
                  const SizedBox(height: 8),
                  Text(
                    'Foro de Debate (${currentItem.comments.length})',
                    style: TextStyle(
                      color: widget.isDark
                          ? Colors.white
                          : const Color(0xFF0F172A),
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...currentItem.comments.map(
                    (c) => Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: widget.isDark
                            ? kDarkSurface
                            : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                c.userDisplayName,
                                style: const TextStyle(
                                  color: kPrimaryBlue,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                ),
                              ),
                              if (c.userRole == 'admin') ...[
                                const SizedBox(width: 4),
                                const VerifiedBadgeWidget(size: 11),
                              ],
                              const Spacer(),
                              Text(
                                c.createdAt,
                                style: const TextStyle(
                                    color: kDimText, fontSize: 10),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            c.text,
                            style: TextStyle(
                              color: widget.isDark
                                  ? Colors.white70
                                  : Colors.black87,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: commentCtrl,
                          style: TextStyle(
                            color:
                                widget.isDark ? Colors.white : Colors.black,
                            fontSize: 12,
                          ),
                          decoration: InputDecoration(
                            hintText: 'Participar en el foro privado...',
                            hintStyle: const TextStyle(
                                color: kDimText, fontSize: 12),
                            filled: true,
                            fillColor: widget.isDark
                                ? kDarkSurface
                                : const Color(0xFFF1F5F9),
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 10),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        style: IconButton.styleFrom(
                          backgroundColor: kPrimaryBlue,
                          foregroundColor: Colors.white,
                        ),
                        icon: const Icon(Icons.send, size: 16),
                        onPressed: () async {
                          if (commentCtrl.text.trim().isEmpty) return;
                          final newComment = VaultComment(
                            id: 'c_${DateTime.now().millisecondsSinceEpoch}',
                            userId: widget.currentUser.uid,
                            userDisplayName: widget.currentUser.displayName,
                            userRole: widget.currentUser.role,
                            text: commentCtrl.text.trim(),
                            createdAt: 'Justo ahora',
                          );
                          final updatedItem = currentItem.copyWith(
                            comments: [newComment, ...currentItem.comments],
                          );
                          widget.onItemsChanged(widget.items
                              .map((i) =>
                                  i.id == currentItem.id ? updatedItem : i)
                              .toList());
                          commentCtrl.clear();
                          setSheetState(() {});
                          await NativeFirestoreService.saveVaultItem(
                              updatedItem);
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final isAdmin = widget.currentUser.isAdmin;
    final activeList = widget.selectedListId != null
        ? widget.lists
            .where((l) => l.id == widget.selectedListId)
            .firstOrNull
        : null;

    final showCollectionsView =
        widget.vaultTabMode == 'collections' || (!isAdmin && activeList == null);

    final filteredItems = widget.items.where((item) {
      if (activeList != null) {
        final inList = activeList.itemIds.contains(item.id) ||
            item.listIds.contains(activeList.id);
        if (!inList) return false;
      } else if (!isAdmin) {
        return false;
      }
      if (_search.trim().isNotEmpty) {
        final q = _search.toLowerCase();
        return item.title.toLowerCase().contains(q) ||
            item.description.toLowerCase().contains(q) ||
            item.fileType.toLowerCase().contains(q);
      }
      return true;
    }).toList();

    return Column(
      children: [
        // Sub-header idéntico a VaultScreen.tsx
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: isDark ? kDarkBg : Colors.white,
            border: Border(
              bottom: BorderSide(
                  color: isDark ? kDarkBorder : const Color(0xFFE2E8F0)),
            ),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              isAdmin
                                  ? 'BÓVEDA PRIVADA'
                                  : activeList != null
                                      ? 'COLECCIÓN SELECCIONADA'
                                      : 'COLECCIONES EXCLUSIVAS',
                              style: const TextStyle(
                                color: kPrimaryBlue,
                                fontSize: 9.5,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1.5,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 1),
                              decoration: BoxDecoration(
                                color: kPrimaryBlue.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(99),
                                border: Border.all(
                                    color:
                                        kPrimaryBlue.withOpacity(0.3)),
                              ),
                              child: Text(
                                '${widget.lists.length} COLECCIONES',
                                style: const TextStyle(
                                  color: kPrimaryBlue,
                                  fontSize: 8.5,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          activeList != null
                              ? activeList.name
                              : isAdmin
                                  ? (showCollectionsView
                                      ? 'Gestión de Colecciones'
                                      : 'Directorio de Recursos')
                                  : 'Colecciones de Publicaciones',
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: isDark
                                ? Colors.white
                                : const Color(0xFF0F172A),
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (isAdmin)
                    Row(
                      children: [
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            backgroundColor:
                                isDark ? kDarkSurface : Colors.white,
                            foregroundColor:
                                isDark ? Colors.white : Colors.black,
                            side: const BorderSide(color: kDarkBorder),
                            visualDensity: VisualDensity.compact,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(11),
                            ),
                          ),
                          onPressed: () => _showCreateOrEditListDialog(),
                          icon: const Icon(Icons.create_new_folder_outlined,
                              size: 14, color: kPrimaryBlue),
                          label: const Text('+ Lista',
                              style: TextStyle(
                                  fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                        const SizedBox(width: 6),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: kPrimaryBlue,
                            foregroundColor: Colors.white,
                            visualDensity: VisualDensity.compact,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(11),
                            ),
                          ),
                          onPressed: _showUploadDialog,
                          icon: const Icon(Icons.add, size: 15),
                          label: const Text('Subir',
                              style: TextStyle(
                                  fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    )
                  else
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(
                        color: isDark ? kDarkCard : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(99),
                        border: Border.all(
                            color: isDark ? kDarkBorder : Colors.black12),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.lock_outline,
                              color: kPrimaryBlue, size: 12),
                          SizedBox(width: 4),
                          Text(
                            'SOLO LECTURA',
                            style: TextStyle(
                              color: kMutedText,
                              fontSize: 9.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
              if (activeList != null) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isDark ? kDarkSurface : Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                        color: isDark ? kDarkBorder : Colors.blue.shade200),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: parseHexColor(activeList.colorHex),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.folder_outlined,
                            color: Colors.white, size: 17),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              activeList.name,
                              style: TextStyle(
                                color: isDark ? Colors.white : Colors.black,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                            Text(
                              '${filteredItems.length} publicaciones',
                              style: const TextStyle(
                                  color: kPrimaryBlue,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        icon: Icon(
                          _isGridView ? Icons.view_list : Icons.grid_view,
                          size: 17,
                          color: kMutedText,
                        ),
                        onPressed: () =>
                            setState(() => _isGridView = !_isGridView),
                      ),
                      if (isAdmin)
                        IconButton(
                          visualDensity: VisualDensity.compact,
                          icon: const Icon(Icons.edit_outlined,
                              size: 17, color: kPrimaryBlue),
                          onPressed: () =>
                              _showCreateOrEditListDialog(activeList),
                        ),
                      TextButton.icon(
                        style: TextButton.styleFrom(
                          backgroundColor: kPrimaryBlue,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 6),
                          minimumSize: Size.zero,
                        ),
                        onPressed: () {
                          widget.onSelectedListChanged(null);
                          widget.onTabModeChanged('collections');
                        },
                        icon: const Icon(Icons.arrow_back, size: 13),
                        label: const Text('Colecciones',
                            style: TextStyle(
                                fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),

        // Contenido de Colecciones o Publicaciones
        Expanded(
          child: RefreshIndicator(
            onRefresh: widget.onRefreshCloud,
            child: showCollectionsView
                ? ListView(
                    padding: const EdgeInsets.all(14),
                    children: [
                      ...widget.lists.map((list) {
                        final count = widget.items
                            .where((it) =>
                                list.itemIds.contains(it.id) ||
                                it.listIds.contains(list.id))
                            .length;
                        final listColor = parseHexColor(list.colorHex);

                        return GestureDetector(
                          onTap: () {
                            widget.onSelectedListChanged(list.id);
                            widget.onTabModeChanged('items');
                          },
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isDark ? kDarkCard : Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                  color: isDark
                                      ? kDarkBorder
                                      : const Color(0xFFE2E8F0)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: listColor,
                                        borderRadius:
                                            BorderRadius.circular(12),
                                      ),
                                      child: Icon(
                                        list.icon == 'smartphone'
                                            ? Icons.smartphone
                                            : list.icon == 'sliders'
                                                ? Icons.tune
                                                : Icons.folder_outlined,
                                        color: Colors.white,
                                        size: 20,
                                      ),
                                    ),
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: kPrimaryBlue.withOpacity(0.15),
                                            borderRadius:
                                                BorderRadius.circular(8),
                                            border: Border.all(
                                                color: kPrimaryBlue.withOpacity(0.3)),
                                          ),
                                          child: Text(
                                            '$count ${count == 1 ? "publicación" : "publicaciones"}',
                                            style: const TextStyle(
                                              color: kPrimaryBlue,
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                        if (isAdmin) ...[
                                          IconButton(
                                            visualDensity:
                                                VisualDensity.compact,
                                            icon: const Icon(
                                                Icons.edit_outlined,
                                                size: 16,
                                                color: kMutedText),
                                            onPressed: () =>
                                                _showCreateOrEditListDialog(
                                                    list),
                                          ),
                                          IconButton(
                                            visualDensity:
                                                VisualDensity.compact,
                                            icon: const Icon(
                                                Icons.delete_outline,
                                                size: 16,
                                                color: Colors.redAccent),
                                            onPressed: () async {
                                              widget.onListsChanged(widget.lists
                                                  .where(
                                                      (l) => l.id != list.id)
                                                  .toList());
                                              await NativeFirestoreService
                                                  .deleteVaultList(list.id);
                                            },
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  list.name,
                                  style: TextStyle(
                                    color: isDark
                                        ? Colors.white
                                        : const Color(0xFF0F172A),
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  list.description,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      color: kMutedText,
                                      fontSize: 12,
                                      height: 1.35),
                                ),
                                const SizedBox(height: 12),
                                Divider(
                                    height: 1,
                                    color: isDark
                                        ? Colors.white10
                                        : Colors.grey.shade200),
                                const SizedBox(height: 10),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Creada: ${list.createdAt}',
                                      style: const TextStyle(
                                          color: kDimText, fontSize: 11),
                                    ),
                                    const Row(
                                      children: [
                                        Text(
                                          'Ver publicaciones',
                                          style: TextStyle(
                                            color: kPrimaryBlue,
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        SizedBox(width: 2),
                                        Icon(Icons.chevron_right,
                                            color: kPrimaryBlue, size: 15),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(14),
                    itemCount: filteredItems.length,
                    itemBuilder: (ctx, idx) {
                      final item = filteredItems[idx];
                      final itemLists = widget.lists
                          .where((l) =>
                              l.itemIds.contains(item.id) ||
                              item.listIds.contains(l.id))
                          .toList();

                      // Tarjeta de Publicación idéntica a VaultScreen.tsx (List View)
                      return GestureDetector(
                        onTap: () => _openItemDetailModal(item),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: isDark ? kDarkCard : Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                                color: isDark
                                    ? kDarkBorder
                                    : const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Miniatura 56x56 redondeada
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.network(
                                  item.coverImage,
                                  width: 56,
                                  height: 56,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    width: 56,
                                    height: 56,
                                    color: kDarkSurface,
                                    child: const Icon(Icons.folder_outlined,
                                        color: kPrimaryBlue),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Wrap(
                                      spacing: 6,
                                      runSpacing: 4,
                                      crossAxisAlignment:
                                          WrapCrossAlignment.center,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 7, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: item.fileType.isNotEmpty
                                                ? kPrimaryBlue.withOpacity(0.15)
                                                : Colors.white10,
                                            borderRadius:
                                                BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            item.fileType.isNotEmpty
                                                ? item.fileType.toUpperCase()
                                                : 'PUBLICACIÓN',
                                            style: TextStyle(
                                              color: item.fileType.isNotEmpty
                                                  ? kPrimaryBlue
                                                  : kMutedText,
                                              fontSize: 9.5,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                        ...itemLists.map(
                                          (l) => Container(
                                            padding:
                                                const EdgeInsets.symmetric(
                                                    horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color:
                                                  parseHexColor(l.colorHex),
                                              borderRadius:
                                                  BorderRadius.circular(5),
                                            ),
                                            child: Text(
                                              l.name,
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 8.5,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                        ),
                                        if (item.fileSize.isNotEmpty)
                                          Text(
                                            item.fileSize,
                                            style: const TextStyle(
                                              color: kDimText,
                                              fontSize: 10.5,
                                              fontFamily: 'monospace',
                                            ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 5),
                                    Text(
                                      item.title,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: isDark
                                            ? Colors.white
                                            : const Color(0xFF0F172A),
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      item.description,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                          color: kMutedText, fontSize: 12),
                                    ),
                                    const SizedBox(height: 8),
                                    Divider(
                                        height: 1,
                                        color: isDark
                                            ? kDarkBorder
                                            : Colors.grey.shade200),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        const Icon(Icons.favorite_border,
                                            size: 13, color: kDimText),
                                        const SizedBox(width: 4),
                                        Text('${item.likesCount}',
                                            style: const TextStyle(
                                                color: kMutedText,
                                                fontSize: 11)),
                                        const SizedBox(width: 14),
                                        const Icon(
                                            Icons.chat_bubble_outline_rounded,
                                            size: 13,
                                            color: kDimText),
                                        const SizedBox(width: 4),
                                        Text(
                                            '${item.comments.length} en debate',
                                            style: const TextStyle(
                                                color: kMutedText,
                                                fontSize: 11)),
                                        const Spacer(),
                                        Text(
                                          item.version,
                                          style: const TextStyle(
                                              color: kDimText, fontSize: 10),
                                        ),
                                        const SizedBox(width: 4),
                                        const Icon(Icons.chevron_right,
                                            size: 16, color: kMutedText),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ),
      ],
    );
  }
}

// ============================================================================
// PANTALLA DE MEMBRESÍA VIP (RÉPLICA EXACTA DE MembershipScreen.tsx)
// ============================================================================
class NativeMembershipScreen extends StatefulWidget {
  final UserProfile currentUser;
  final bool isDark;
  final ValueChanged<UserProfile?> onUpdateUser;
  final VoidCallback onGoToReceipts;
  final VoidCallback onGoToVault;

  const NativeMembershipScreen({
    super.key,
    required this.currentUser,
    required this.isDark,
    required this.onUpdateUser,
    required this.onGoToReceipts,
    required this.onGoToVault,
  });

  @override
  State<NativeMembershipScreen> createState() => _NativeMembershipScreenState();
}

class _NativeMembershipScreenState extends State<NativeMembershipScreen> {
  String _selectedBillingTab = 'monthly';

  Future<void> _openWhatsAppDirect(String plan) async {
    final planLabel = plan == 'annual'
        ? 'ANUAL (12\$ USD AL AÑO)'
        : 'MENSUAL (1\$ USD AL MES)';
    final text = Uri.encodeComponent(
        '¡Hola! 👋 Quiero activar mi membresía $planLabel en la Bóveda App 66.\n\n'
        '• Nombre: ${widget.currentUser.displayName}\n'
        '• Email: ${widget.currentUser.email}\n'
        '• ID: #${widget.currentUser.uid}');
    final uri = Uri.parse('https://wa.me/$kWhatsAppPhoneRaw?text=$text');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final isSubscribed = widget.currentUser.hasActiveMembership;
    final activePlan = widget.currentUser.membershipPlan ?? _selectedBillingTab;
    final totalDays = activePlan == 'annual' ? 365 : 30;

    DateTime startD = DateTime.now();
    if (widget.currentUser.subscribedAt != null) {
      startD =
          DateTime.tryParse(widget.currentUser.subscribedAt!) ?? DateTime.now();
    }
    DateTime expireD = startD.add(Duration(days: totalDays));
    if (widget.currentUser.membershipExpiresAt != null) {
      expireD =
          DateTime.tryParse(widget.currentUser.membershipExpiresAt!) ?? expireD;
    }

    final diffHours = expireD.difference(DateTime.now()).inHours;
    final daysRemaining = (diffHours / 24).ceil().clamp(0, totalDays);
    final percentRemaining =
        ((daysRemaining / totalDays) * 100).clamp(0.0, 100.0);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Badge MEMBRESÍA VIP
        Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            decoration: BoxDecoration(
              color: kEmerald.withOpacity(0.12),
              borderRadius: BorderRadius.circular(99),
              border: Border.all(color: kEmerald.withOpacity(0.35)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.workspace_premium, color: kEmerald, size: 15),
                SizedBox(width: 6),
                Text(
                  'MEMBRESÍA VIP',
                  style: TextStyle(
                    color: kEmerald,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.8,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 10),
        Text(
          'Acceso Ilimitado a la Bóveda',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: isDark ? Colors.white : const Color(0xFF0F172A),
            fontSize: 22,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Disfruta de descargas sin restricciones, servidores de alta velocidad, insignias exclusivas y nuevos recursos semanales con precios accesibles.',
          textAlign: TextAlign.center,
          style: TextStyle(color: kMutedText, fontSize: 12, height: 1.4),
        ),
        const SizedBox(height: 12),

        // WhatsApp Direct Contact Banner
        Center(
          child: GestureDetector(
            onTap: () => _openWhatsAppDirect(_selectedBillingTab),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
              decoration: BoxDecoration(
                color: kWhatsAppGreen.withOpacity(0.15),
                borderRadius: BorderRadius.circular(16),
                border:
                    Border.all(color: kWhatsAppGreen.withOpacity(0.45)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.chat_bubble, color: kWhatsAppGreen, size: 15),
                  SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      'Pago directo por WhatsApp: $kWhatsAppContactPhone',
                      style: TextStyle(
                        color: kWhatsAppGreen,
                        fontSize: 11.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  SizedBox(width: 6),
                  Icon(Icons.open_in_new, color: kWhatsAppGreen, size: 13),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Selector Mensual (1$) / Anual (12$)
        if (!isSubscribed)
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: isDark ? kDarkCard : Colors.grey.shade200,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                  color: isDark ? kDarkBorder : Colors.grey.shade300),
            ),
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () =>
                        setState(() => _selectedBillingTab = 'monthly'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: _selectedBillingTab == 'monthly'
                            ? kPrimaryBlue
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'Plan Mensual (1\$)',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: _selectedBillingTab == 'monthly'
                              ? Colors.white
                              : kMutedText,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () =>
                        setState(() => _selectedBillingTab = 'annual'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: _selectedBillingTab == 'annual'
                            ? kAmber
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Plan Anual (12\$)',
                            style: TextStyle(
                              color: _selectedBillingTab == 'annual'
                                  ? Colors.white
                                  : kMutedText,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(width: 5),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: Colors.amberAccent,
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: const Text(
                              '365 DÍAS',
                              style: TextStyle(
                                color: Colors.black,
                                fontSize: 8.5,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

        const SizedBox(height: 16),

        // Barra de Días Restantes Dinámica (si está suscrito) o Teaser Banner
        if (isSubscribed)
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  kEmerald.withOpacity(0.2),
                  isDark ? kDarkCard : Colors.white,
                ],
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: kEmerald.withOpacity(0.4)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.verified_user, color: kEmerald, size: 22),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'MEMBRESÍA ACTIVA • ${activePlan == "annual" ? "PLAN ANUAL (365 DÍAS)" : "PLAN MENSUAL (30 DÍAS)"}',
                        style: const TextStyle(
                          color: kEmerald,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '$daysRemaining Días restantes',
                      style: TextStyle(
                        color: isDark ? Colors.white : Colors.black,
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      '${percentRemaining.round()}% disponible',
                      style: const TextStyle(
                        color: kEmerald,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: percentRemaining / 100,
                    minHeight: 14,
                    backgroundColor: Colors.black54,
                    color: kEmerald,
                  ),
                ),
              ],
            ),
          )
        else
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? kDarkCard : Colors.white,
              borderRadius: BorderRadius.circular(22),
              border:
                  Border.all(color: kPrimaryBlue.withOpacity(0.35)),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: kPrimaryBlue.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.schedule, color: kPrimaryBlue),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'BARRA DE DÍAS RESTANTES • TIEMPO REAL',
                        style: TextStyle(
                          color: kPrimaryBlue,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Seguimiento automático de tu vigencia día tras día al activar tu plan.',
                        style: TextStyle(color: kMutedText, fontSize: 11.5),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

        const SizedBox(height: 16),

        // Tarjeta Principal del Plan Seleccionado
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark ? kDarkCard : Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: _selectedBillingTab == 'annual'
                  ? kAmber.withOpacity(0.5)
                  : kPrimaryBlue.withOpacity(0.5),
              width: 1.5,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _selectedBillingTab == 'annual'
                        ? 'Plan Anual Diamante'
                        : 'Plan Mensual VIP',
                    style: TextStyle(
                      color:
                          isDark ? Colors.white : const Color(0xFF0F172A),
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  Text(
                    _selectedBillingTab == 'annual'
                        ? '\$12 USD / año'
                        : '\$1 USD / mes',
                    style: TextStyle(
                      color: _selectedBillingTab == 'annual'
                          ? kAmber
                          : kPrimaryBlue,
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              ...[
                'Acceso completo a todas las colecciones iOS & Android',
                'Descargas directas de Regedits y paneles sin esperas',
                'Insignia VIP y barra de días restantes en tiempo real',
                'Soporte prioritario directo por WhatsApp',
              ].map(
                (feat) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle,
                          color: kEmerald, size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          feat,
                          style: TextStyle(
                            color:
                                isDark ? Colors.white70 : Colors.black87,
                            fontSize: 12.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kWhatsAppGreen,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      onPressed: () =>
                          _openWhatsAppDirect(_selectedBillingTab),
                      icon: const Icon(Icons.chat_bubble, size: 16),
                      label: const Text(
                        'Coordinar por WhatsApp',
                        style: TextStyle(
                            fontWeight: FontWeight.w900, fontSize: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kPrimaryBlue,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      onPressed: widget.onGoToReceipts,
                      icon: const Icon(Icons.upload_file, size: 16),
                      label: const Text(
                        'Subir Comprobante',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ============================================================================
// PANTALLA DE COMPROBANTES (RÉPLICA EXACTA DE ReceiptsScreen.tsx)
// ============================================================================
class NativeReceiptsScreen extends StatefulWidget {
  final UserProfile currentUser;
  final bool isDark;
  final List<PaymentReceipt> receipts;
  final ValueChanged<List<PaymentReceipt>> onReceiptsChanged;

  const NativeReceiptsScreen({
    super.key,
    required this.currentUser,
    required this.isDark,
    required this.receipts,
    required this.onReceiptsChanged,
  });

  @override
  State<NativeReceiptsScreen> createState() => _NativeReceiptsScreenState();
}

class _NativeReceiptsScreenState extends State<NativeReceiptsScreen> {
  String _activeTab = 'upload'; // 'upload' | 'history'
  String _selectedPlan = 'monthly';
  double _amount = 1.0;
  String _paymentMethod = 'Mercado Pago';
  final _refCtrl = TextEditingController();
  String? _imageBase64;

  Future<void> _pickReceiptImage() async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
          source: ImageSource.gallery, maxWidth: 900, imageQuality: 78);
      if (picked != null) {
        final bytes = await picked.readAsBytes();
        setState(() {
          _imageBase64 = 'data:image/jpeg;base64,${base64Encode(bytes)}';
        });
      }
    } catch (_) {}
  }

  void _submitReceipt() {
    if (_imageBase64 == null && _refCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text(
                'Adjunta la foto del comprobante o el número de referencia.')),
      );
      return;
    }

    final newReceipt = PaymentReceipt(
      id: 'rec-${DateTime.now().millisecondsSinceEpoch}',
      userId: widget.currentUser.uid,
      userEmail: widget.currentUser.email,
      userDisplayName: widget.currentUser.displayName,
      plan: _selectedPlan,
      amount: _amount,
      paymentMethod: _paymentMethod,
      referenceCode: _refCtrl.text.trim().isEmpty
          ? 'COMP-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}'
          : _refCtrl.text.trim(),
      status: 'pending',
      createdAt: DateTime.now().toIso8601String(),
      imageDataUrl: _imageBase64,
    );

    final updated = [newReceipt, ...widget.receipts];
    widget.onReceiptsChanged(updated);
    _refCtrl.clear();
    setState(() {
      _imageBase64 = null;
      _activeTab = 'history';
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        backgroundColor: kEmerald,
        content: Text(
            '¡Comprobante enviado con éxito! Ya está disponible para revisión.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final myReceipts = widget.currentUser.isAdmin
        ? widget.receipts
        : widget.receipts
            .where((r) =>
                r.userId == widget.currentUser.uid ||
                r.userEmail.toLowerCase() ==
                    widget.currentUser.email.toLowerCase())
            .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Tabs Subir Comprobante / Historial
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: isDark ? kDarkCard : Colors.grey.shade200,
            borderRadius: BorderRadius.circular(16),
            border:
                Border.all(color: isDark ? kDarkBorder : Colors.black12),
          ),
          child: Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _activeTab = 'upload'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    decoration: BoxDecoration(
                      color: _activeTab == 'upload'
                          ? kPrimaryBlue
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'Subir Comprobante',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: _activeTab == 'upload'
                            ? Colors.white
                            : kMutedText,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _activeTab = 'history'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    decoration: BoxDecoration(
                      color: _activeTab == 'history'
                          ? kPrimaryBlue
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'Mis Comprobantes (${myReceipts.length})',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: _activeTab == 'history'
                            ? Colors.white
                            : kMutedText,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        if (_activeTab == 'upload')
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: isDark ? kDarkCard : Colors.white,
              borderRadius: BorderRadius.circular(22),
              border:
                  Border.all(color: isDark ? kDarkBorder : Colors.black12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'VALIDACIÓN DE PAGO OFICIAL',
                  style: TextStyle(
                    color: kPrimaryBlue,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Enviar Comprobante para Activación VIP',
                  style: TextStyle(
                    color: isDark ? Colors.white : Colors.black,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() {
                          _selectedPlan = 'monthly';
                          _amount = 1.0;
                        }),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: _selectedPlan == 'monthly'
                                ? kPrimaryBlue.withOpacity(0.15)
                                : kDarkSurface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: _selectedPlan == 'monthly'
                                  ? kPrimaryBlue
                                  : kDarkBorder,
                            ),
                          ),
                          child: const Column(
                            children: [
                              Text('Plan Mensual',
                                  style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12)),
                              SizedBox(height: 2),
                              Text('\$1 USD • 30 Días',
                                  style: TextStyle(
                                      color: kPrimaryBlue,
                                      fontWeight: FontWeight.w900,
                                      fontSize: 13)),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() {
                          _selectedPlan = 'annual';
                          _amount = 12.0;
                        }),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: _selectedPlan == 'annual'
                                ? kAmber.withOpacity(0.15)
                                : kDarkSurface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: _selectedPlan == 'annual'
                                  ? kAmber
                                  : kDarkBorder,
                            ),
                          ),
                          child: const Column(
                            children: [
                              Text('Plan Anual',
                                  style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12)),
                              SizedBox(height: 2),
                              Text('\$12 USD • 365 Días',
                                  style: TextStyle(
                                      color: kAmber,
                                      fontWeight: FontWeight.w900,
                                      fontSize: 13)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _paymentMethod,
                  decoration: InputDecoration(
                    labelText: 'Método de Pago Utilizado',
                    filled: true,
                    fillColor: isDark ? kDarkSurface : Colors.grey.shade100,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  items: const [
                    DropdownMenuItem(
                        value: 'Mercado Pago', child: Text('Mercado Pago')),
                    DropdownMenuItem(
                        value: 'Transferencia Bancaria',
                        child: Text('Transferencia Bancaria')),
                    DropdownMenuItem(
                        value: 'Binance / USDT',
                        child: Text('Binance / USDT')),
                    DropdownMenuItem(value: 'PayPal', child: Text('PayPal')),
                  ],
                  onChanged: (v) =>
                      setState(() => _paymentMethod = v ?? 'Mercado Pago'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _refCtrl,
                  decoration: InputDecoration(
                    labelText: 'Código de Operación / Referencia',
                    filled: true,
                    fillColor: isDark ? kDarkSurface : Colors.grey.shade100,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                GestureDetector(
                  onTap: _pickReceiptImage,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                        vertical: 20, horizontal: 16),
                    decoration: BoxDecoration(
                      color: isDark ? kDarkSurface : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: _imageBase64 != null
                            ? kEmerald
                            : kPrimaryBlue.withOpacity(0.4),
                      ),
                    ),
                    child: Column(
                      children: [
                        Icon(
                          _imageBase64 != null
                              ? Icons.check_circle
                              : Icons.cloud_upload_outlined,
                          color:
                              _imageBase64 != null ? kEmerald : kPrimaryBlue,
                          size: 32,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _imageBase64 != null
                              ? '¡Captura de comprobante lista!'
                              : 'Toca para subir foto o captura del comprobante',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: kPrimaryBlue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    onPressed: _submitReceipt,
                    icon: const Icon(Icons.send_rounded, size: 17),
                    label: const Text(
                      'Enviar Comprobante a Revisión',
                      style:
                          TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ),
              ],
            ),
          )
        else if (myReceipts.isEmpty)
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: isDark ? kDarkCard : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: kDarkBorder),
            ),
            child: const Column(
              children: [
                Icon(Icons.receipt_long_outlined,
                    color: kMutedText, size: 38),
                SizedBox(height: 8),
                Text(
                  'No hay comprobantes registrados todavía.',
                  style: TextStyle(color: kMutedText, fontSize: 12),
                ),
              ],
            ),
          )
        else
          ...myReceipts.map((r) {
            final statusColor = r.status == 'approved'
                ? kEmerald
                : r.status == 'rejected'
                    ? Colors.redAccent
                    : kAmber;
            final statusText = r.status == 'approved'
                ? '✓ Aprobado'
                : r.status == 'rejected'
                    ? '✗ Rechazado'
                    : '⏳ En Revisión';

            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? kDarkCard : Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                    color: isDark ? kDarkBorder : Colors.grey.shade200),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${r.plan == "annual" ? "Plan Anual" : "Plan Mensual"} (\$${r.amount} ${r.currency})',
                          style: TextStyle(
                            color: isDark ? Colors.white : Colors.black,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Ref: ${r.referenceCode} • ${r.paymentMethod}',
                          style: const TextStyle(
                              color: kMutedText, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(99),
                      border: Border.all(
                          color: statusColor.withOpacity(0.35)),
                    ),
                    child: Text(
                      statusText,
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }
}

// ============================================================================
// PANTALLA DE APROBACIONES ADMIN (RÉPLICA DE AdminApprovalsScreen.tsx)
// ============================================================================
class NativeAdminApprovalsScreen extends StatelessWidget {
  final UserProfile currentUser;
  final bool isDark;
  final List<PaymentReceipt> receipts;
  final ValueChanged<List<PaymentReceipt>> onReceiptsChanged;
  final ValueChanged<UserProfile?> onUpdateUser;

  const NativeAdminApprovalsScreen({
    super.key,
    required this.currentUser,
    required this.isDark,
    required this.receipts,
    required this.onReceiptsChanged,
    required this.onUpdateUser,
  });

  void _updateReceiptStatus(
      BuildContext context, PaymentReceipt target, String status) {
    final updated = receipts
        .map((r) => r.id == target.id ? r.copyWith(status: status) : r)
        .toList();
    onReceiptsChanged(updated);

    if (status == 'approved' &&
        (target.userId == currentUser.uid ||
            target.userEmail.toLowerCase() ==
                currentUser.email.toLowerCase())) {
      final now = DateTime.now();
      final expires =
          now.add(Duration(days: target.plan == 'annual' ? 365 : 30));
      onUpdateUser(currentUser.copyWith(
        membershipStatus: 'active',
        membershipPlan: target.plan,
        subscribedAt: now.toIso8601String(),
        membershipExpiresAt: expires.toIso8601String(),
        lastPaymentAmount: target.amount,
      ));
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: status == 'approved' ? kEmerald : Colors.redAccent,
        content: Text(status == 'approved'
            ? '¡Comprobante aprobado y membresía VIP activada!'
            : 'Comprobante marcado como rechazado.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'PANEL DE VERIFICACIÓN ADMIN',
          style: TextStyle(
            color: kPrimaryBlue,
            fontSize: 10,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          'Aprobación de Membresías VIP (${receipts.length})',
          style: TextStyle(
            color: isDark ? Colors.white : const Color(0xFF0F172A),
            fontSize: 18,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 14),
        if (receipts.isEmpty)
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: isDark ? kDarkCard : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: kDarkBorder),
            ),
            child: const Center(
              child: Text(
                'No hay comprobantes pendientes de revisión.',
                style: TextStyle(color: kMutedText, fontSize: 12),
              ),
            ),
          )
        else
          ...receipts.map((r) {
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? kDarkCard : Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                    color: isDark ? kDarkBorder : Colors.grey.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          '${r.userDisplayName} (${r.userEmail})',
                          style: TextStyle(
                            color: isDark ? Colors.white : Colors.black,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      Text(
                        '\$${r.amount} ${r.currency}',
                        style: const TextStyle(
                          color: kEmerald,
                          fontWeight: FontWeight.w900,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Plan: ${r.plan == "annual" ? "Anual (365 Días)" : "Mensual (30 Días)"} • Ref: ${r.referenceCode}',
                    style: const TextStyle(color: kMutedText, fontSize: 11.5),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: kEmerald,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          onPressed: () =>
                              _updateReceiptStatus(context, r, 'approved'),
                          icon: const Icon(Icons.check_circle_outline,
                              size: 16),
                          label: const Text('Aprobar VIP',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.redAccent,
                            side: const BorderSide(color: Colors.redAccent),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          onPressed: () =>
                              _updateReceiptStatus(context, r, 'rejected'),
                          icon: const Icon(Icons.cancel_outlined, size: 16),
                          label: const Text('Rechazar',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }
}

// ============================================================================
// PANTALLA DE AJUSTES Y PERFIL (RÉPLICA EXACTA DE ProfileScreen.tsx)
// ============================================================================
class NativeProfileScreen extends StatefulWidget {
  final UserProfile currentUser;
  final bool isDark;
  final List<VaultItem> items;
  final List<PaymentReceipt> receipts;
  final bool isMaintenance;
  final String maintenanceMessage;
  final ValueChanged<bool> onToggleTheme;
  final ValueChanged<UserProfile?> onUpdateUser;
  final VoidCallback onOpenMaintenanceModal;
  final VoidCallback onPreviewVisitor;
  final VoidCallback onGoToMembership;
  final VoidCallback onGoToReceipts;
  final VoidCallback onGoToVault;

  const NativeProfileScreen({
    super.key,
    required this.currentUser,
    required this.isDark,
    required this.items,
    required this.receipts,
    required this.isMaintenance,
    required this.maintenanceMessage,
    required this.onToggleTheme,
    required this.onUpdateUser,
    required this.onOpenMaintenanceModal,
    required this.onPreviewVisitor,
    required this.onGoToMembership,
    required this.onGoToReceipts,
    required this.onGoToVault,
  });

  @override
  State<NativeProfileScreen> createState() => _NativeProfileScreenState();
}

class _NativeProfileScreenState extends State<NativeProfileScreen> {
  // 'settings' | 'info' | 'activity'
  String _activeProfileTab = 'settings';

  void _openEditModal() {
    final nameCtrl =
        TextEditingController(text: widget.currentUser.displayName);
    final statusCtrl =
        TextEditingController(text: widget.currentUser.customStatus ?? '');
    final phoneCtrl =
        TextEditingController(text: widget.currentUser.phone ?? '');
    final igCtrl =
        TextEditingController(text: widget.currentUser.instagram ?? '');
    final bioCtrl = TextEditingController(text: widget.currentUser.bio ?? '');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor:
            widget.isDark ? const Color(0xFF0E0E12) : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Text('Editar Perfil Personal',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration:
                    const InputDecoration(labelText: 'Nombre / Alias'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: statusCtrl,
                decoration: const InputDecoration(
                    labelText: 'Estado o Lema Corto'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: phoneCtrl,
                decoration: const InputDecoration(
                    labelText: 'WhatsApp / Teléfono'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: igCtrl,
                decoration: const InputDecoration(labelText: 'Instagram'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: bioCtrl,
                maxLines: 3,
                decoration:
                    const InputDecoration(labelText: 'Biografía / Sobre mí'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: kPrimaryBlue,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              widget.onUpdateUser(widget.currentUser.copyWith(
                displayName: nameCtrl.text.trim(),
                customStatus: statusCtrl.text.trim(),
                phone: phoneCtrl.text.trim(),
                instagram: igCtrl.text.trim().replaceFirst('@', ''),
                bio: bioCtrl.text.trim(),
                updatedAt: DateTime.now().toIso8601String(),
              ));
              Navigator.pop(ctx);
            },
            child: const Text('Guardar Cambios'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final user = widget.currentUser;
    final favoriteItems = widget.items
        .where((it) => it.likedBy.contains(user.uid))
        .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Header del Apartado (APARTADO OFICIAL - Ajustes y Sistema + Botón Editar Perfil)
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: kPrimaryBlue.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: const Icon(Icons.settings_outlined,
                      color: kPrimaryBlue, size: 18),
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'APARTADO OFICIAL',
                      style: TextStyle(
                        color: kPrimaryBlue,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.8,
                      ),
                    ),
                    Text(
                      'Ajustes y Sistema',
                      style: TextStyle(
                        color:
                            isDark ? Colors.white : const Color(0xFF0F172A),
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: kPrimaryBlue,
                foregroundColor: Colors.white,
                visualDensity: VisualDensity.compact,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: _openEditModal,
              icon: const Icon(Icons.edit_outlined, size: 14),
              label: const Text('Editar Perfil',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // TARJETA PRINCIPAL DE PERFIL + CARRUSEL DE AVATARES RÁPIDOS (1 TOQUE)
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? kDarkCard : Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
                color: isDark ? kDarkBorder : const Color(0xFFE2E8F0)),
          ),
          child: Column(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: user.avatarUrl != null &&
                                user.avatarUrl!.startsWith('http')
                            ? Image.network(
                                user.avatarUrl!,
                                width: 76,
                                height: 76,
                                fit: BoxFit.cover,
                              )
                            : Container(
                                width: 76,
                                height: 76,
                                color: kPrimaryBlue,
                                child: Center(
                                  child: Text(
                                    user.displayName.isNotEmpty
                                        ? user.displayName[0].toUpperCase()
                                        : 'U',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 28,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ),
                              ),
                      ),
                      Positioned(
                        bottom: -4,
                        right: -4,
                        child: GestureDetector(
                          onTap: _openEditModal,
                          child: Container(
                            padding: const EdgeInsets.all(5),
                            decoration: BoxDecoration(
                              color: kPrimaryBlue,
                              shape: BoxShape.circle,
                              border:
                                  Border.all(color: Colors.black, width: 2),
                            ),
                            child: const Icon(Icons.camera_alt,
                                color: Colors.white, size: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                user.displayName,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: isDark
                                      ? Colors.white
                                      : const Color(0xFF0F172A),
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                            if (user.isAdmin) ...[
                              const SizedBox(width: 6),
                              const VerifiedBadgeWidget(size: 15),
                            ],
                          ],
                        ),
                        Text(user.email,
                            style: const TextStyle(
                                color: kMutedText, fontSize: 11.5)),
                        if (user.customStatus != null &&
                            user.customStatus!.isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Text(
                            '"${user.customStatus!}"',
                            style: const TextStyle(
                              color: kPrimaryBlue,
                              fontSize: 11.5,
                              fontStyle: FontStyle.italic,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            if (user.isAdmin)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color:
                                      kPrimaryBlue.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(99),
                                ),
                                child: const Text(
                                  'ADMINISTRADOR',
                                  style: TextStyle(
                                    color: kPrimaryBlue,
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                            if (user.hasActiveMembership)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: kEmerald.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(99),
                                ),
                                child: const Text(
                                  'MIEMBRO VIP',
                                  style: TextStyle(
                                    color: kEmerald,
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Divider(
                  height: 1,
                  color: isDark ? kDarkBorder : Colors.grey.shade200),
              const SizedBox(height: 10),
              const Align(
                alignment: Alignment.centerLeft,
                child: Row(
                  children: [
                    Icon(Icons.camera_alt_outlined,
                        color: kPrimaryBlue, size: 14),
                    SizedBox(width: 6),
                    Text(
                      'Cambiar Foto Rápida (1 toque):',
                      style:
                          TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 44,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: kAvatarPresets.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (ctx, i) {
                    final preset = kAvatarPresets[i];
                    final selected = user.avatarUrl == preset['url'];
                    return GestureDetector(
                      onTap: () => widget.onUpdateUser(
                        user.copyWith(
                          avatarUrl: preset['url'],
                          updatedAt: DateTime.now().toIso8601String(),
                        ),
                      ),
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color:
                                selected ? kPrimaryBlue : Colors.transparent,
                            width: 2,
                          ),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(9),
                          child: Image.network(
                            preset['url']!,
                            width: 36,
                            height: 36,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // 3 Pestañas del Perfil: Ajustes & Sistema | Datos de Perfil | Actividades
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: isDark ? kDarkCard : Colors.grey.shade200,
            borderRadius: BorderRadius.circular(16),
            border:
                Border.all(color: isDark ? kDarkBorder : Colors.black12),
          ),
          child: Row(
            children: [
              _buildSubTab('settings', 'Ajustes & Sistema', Icons.shield_outlined),
              _buildSubTab('info', 'Datos de Perfil', Icons.person_outline),
              _buildSubTab('activity', 'Actividades (${favoriteItems.length})',
                  Icons.favorite_border),
            ],
          ),
        ),
        const SizedBox(height: 14),

        if (_activeProfileTab == 'settings') ...[
          // Tarjeta Selector de Tema Oscuro / Claro
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? kDarkCard : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                  color: isDark ? kDarkBorder : const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(
                            color: kPrimaryBlue.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(9),
                          ),
                          child: const Icon(Icons.palette_outlined,
                              color: kPrimaryBlue, size: 16),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Tema de Visualización',
                              style: TextStyle(
                                color: isDark ? Colors.white : Colors.black,
                                fontWeight: FontWeight.bold,
                                fontSize: 12.5,
                              ),
                            ),
                            Text(
                              isDark ? 'Modo Oscuro (#000000)' : 'Modo Claro',
                              style: const TextStyle(
                                  color: kMutedText, fontSize: 10.5),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: kPrimaryBlue.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        isDark ? 'Oscuro' : 'Claro',
                        style: const TextStyle(
                          color: kPrimaryBlue,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor:
                              isDark ? kPrimaryBlue : Colors.grey.shade200,
                          foregroundColor:
                              isDark ? Colors.white : Colors.black87,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: () => widget.onToggleTheme(true),
                        icon: const Icon(Icons.dark_mode_outlined, size: 15),
                        label: const Text('Modo Oscuro',
                            style: TextStyle(
                                fontSize: 11.5, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor:
                              !isDark ? kPrimaryBlue : kDarkSurface,
                          foregroundColor:
                              !isDark ? Colors.white : kMutedText,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: () => widget.onToggleTheme(false),
                        icon: const Icon(Icons.wb_sunny_outlined, size: 15),
                        label: const Text('Modo Claro',
                            style: TextStyle(
                                fontSize: 11.5, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Control de Modo Mantenimiento (Exclusivo Admin)
          if (user.isAdmin) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? kDarkCard : Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                    color: isDark ? kDarkBorder : const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.build_circle_outlined,
                              color: kAmber, size: 22),
                          SizedBox(width: 8),
                          Text(
                            'Control de Modo Mantenimiento',
                            style: TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 12.5),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: (widget.isMaintenance ? kAmber : kEmerald)
                              .withOpacity(0.15),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: Text(
                          widget.isMaintenance ? 'ACTIVO (ON)' : 'INACTIVO (OFF)',
                          style: TextStyle(
                            color: widget.isMaintenance ? kAmber : kEmerald,
                            fontSize: 9.5,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor:
                                widget.isMaintenance ? kAmber : kDarkSurface,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          onPressed: widget.onOpenMaintenanceModal,
                          icon: const Icon(Icons.build_outlined, size: 14),
                          label: const Text('Configurar Mantenimiento',
                              style: TextStyle(
                                  fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      if (widget.isMaintenance) ...[
                        const SizedBox(width: 8),
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: kAmber,
                            side: const BorderSide(color: kAmber),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          onPressed: widget.onPreviewVisitor,
                          icon: const Icon(Icons.visibility_outlined, size: 14),
                          label: const Text('Vista Visitante',
                              style: TextStyle(
                                  fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Metadatos de Conexión
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isDark ? kDarkCard : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                  color: isDark ? kDarkBorder : const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.vpn_key_outlined,
                            color: kPrimaryBlue, size: 15),
                        SizedBox(width: 8),
                        Text('ID de Usuario',
                            style: TextStyle(color: kMutedText, fontSize: 12)),
                      ],
                    ),
                    Row(
                      children: [
                        Text(
                          user.uid,
                          style: const TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        IconButton(
                          visualDensity: VisualDensity.compact,
                          icon: const Icon(Icons.copy,
                              size: 14, color: kPrimaryBlue),
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: user.uid));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content: Text('ID de Usuario copiado')),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
                const Divider(height: 14, color: kDarkBorder),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.calendar_today_outlined,
                            color: kPrimaryBlue, size: 15),
                        SizedBox(width: 8),
                        Text('Fecha de Registro',
                            style: TextStyle(color: kMutedText, fontSize: 12)),
                      ],
                    ),
                    Text(user.joinedAt,
                        style: const TextStyle(
                            fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
                const Divider(height: 14, color: kDarkBorder),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.dns_outlined,
                            color: kPrimaryBlue, size: 15),
                        SizedBox(width: 8),
                        Text('Servidor Vault',
                            style: TextStyle(color: kMutedText, fontSize: 12)),
                      ],
                    ),
                    Row(
                      children: [
                        Icon(Icons.circle, color: kEmerald, size: 8),
                        SizedBox(width: 5),
                        Text(
                          'Conectado',
                          style: TextStyle(
                            color: kEmerald,
                            fontSize: 11.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ] else if (_activeProfileTab == 'info') ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? kDarkCard : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                  color: isDark ? kDarkBorder : const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Biografía Personal:',
                    style: TextStyle(
                        color: kMutedText,
                        fontSize: 11,
                        fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(
                  user.bio != null && user.bio!.isNotEmpty
                      ? user.bio!
                      : 'Sin biografía añadida todavía.',
                  style: const TextStyle(fontSize: 12.5),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('WhatsApp / Teléfono:',
                        style: TextStyle(color: kMutedText, fontSize: 12)),
                    Text(
                      user.phone != null && user.phone!.isNotEmpty
                          ? user.phone!
                          : 'No configurado',
                      style: const TextStyle(
                          color: kEmerald,
                          fontWeight: FontWeight.bold,
                          fontSize: 12),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ] else ...[
          if (favoriteItems.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: isDark ? kDarkCard : Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: kDarkBorder),
              ),
              child: const Center(
                child: Text(
                  'Aún no has guardado publicaciones en tus favoritos.',
                  style: TextStyle(color: kMutedText, fontSize: 12),
                ),
              ),
            )
          else
            ...favoriteItems.map(
              (item) => Card(
                color: isDark ? kDarkCard : Colors.white,
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(item.coverImage,
                        width: 42, height: 42, fit: BoxFit.cover),
                  ),
                  title: Text(item.title,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 12.5)),
                  trailing: const Icon(Icons.favorite,
                      color: kHeartPink, size: 18),
                ),
              ),
            ),
        ],

        const SizedBox(height: 18),
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.redAccent,
            backgroundColor: Colors.redAccent.withOpacity(0.1),
            side: BorderSide(color: Colors.redAccent.withOpacity(0.35)),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          onPressed: () => widget.onUpdateUser(null),
          icon: const Icon(Icons.logout, size: 18),
          label: const Text(
            'Cerrar Sesión Segura',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5),
          ),
        ),
      ],
    );
  }

  Widget _buildSubTab(String id, String label, IconData icon) {
    final active = _activeProfileTab == id;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _activeProfileTab = id),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          decoration: BoxDecoration(
            color: active ? kPrimaryBlue : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon,
                  size: 13, color: active ? Colors.white : kMutedText),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: active ? Colors.white : kMutedText,
                    fontSize: 10.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
