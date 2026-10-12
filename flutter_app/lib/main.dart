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
// CONFIGURACIÓN DE FIREBASE FIRESTORE Y CONSTANTES GLOBALES
// ============================================================================
const String kFirebaseProjectId = 'gen-lang-client-0680329207';
const String kFirestoreDatabaseId =
    'ai-studio-app66vault-ca23ce90-8fec-45b1-89e4-68259be955e7';
const String kFirebaseApiKey = 'AIzaSyA6EK3sbxaaCsiH6XR3IMO23A4XwsilAkE';
const String kAdminSecurityKey = '360';

const List<String> kAuthorizedAdminEmails = [
  'astroarg02@gmail.com',
  'cuentaninja989@gmail.com',
  'creadorffx@gmail.com',
  'admin@vault.private',
];

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
  final String userName;
  final String userRole;
  final String text;
  final String createdAt;

  const VaultComment({
    required this.id,
    required this.userId,
    required this.userName,
    required this.userRole,
    required this.text,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'userName': userName,
        'userRole': userRole,
        'text': text,
        'createdAt': createdAt,
      };

  factory VaultComment.fromJson(Map<String, dynamic> json) => VaultComment(
        id: (json['id'] ?? 'c_${DateTime.now().millisecondsSinceEpoch}')
            .toString(),
        userId: (json['userId'] ?? '').toString(),
        userName: (json['userName'] ?? 'Miembro VIP').toString(),
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
        'comments': comments.map((c) => c.toJson()).toList(),
        'isLockedForTier': isLockedForTier,
        'version': version,
        'author': {'name': authorName, 'badge': authorBadge},
      };

  factory VaultItem.fromJson(Map<String, dynamic> json) {
    final authorMap = json['author'] is Map ? json['author'] as Map : {};
    final rawLikedBy = json['likedBy'] is List ? json['likedBy'] as List : [];
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
          userName: 'Usuario',
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
        referenceCode: (json['referenceCode'] ?? 'REF-000').toString(),
        status: (json['status'] ?? 'pending').toString(),
        createdAt:
            (json['createdAt'] ?? DateTime.now().toIso8601String()).toString(),
        imageDataUrl: json['imageDataUrl']?.toString(),
        adminNote: json['adminNote']?.toString(),
      );
}

// ============================================================================
// DATOS SEMILLA INICIALES
// ============================================================================
final List<VaultItem> kInitialVaultItems = [
  const VaultItem(
    id: 'vault-res-1787518251503',
    title: 'BIENVENIDOS A MI PÁGINA WEB 😍',
    description:
        'En esta aplicación encontrarás todo tipo de archivos para iOS y Android totalmente gratis.',
    category: 'code',
    fileType: 'Guía Oficial',
    fileSize: '1.2 KB',
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
    description: 'Regedit con alta sensibilidad para Android y emuladores.',
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
        'Configuración y optimización de sensibilidad exclusiva para dispositivos iOS.',
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
    description: 'Este panel hará que tu sensi mejore casi un 80%.',
    category: 'code',
    fileType: 'CFG / Panel',
    fileSize: '4.5 KB',
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
        'Configuraciones de máxima respuesta táctil, archivos REG y paneles optimizados.',
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
                'El sistema se encuentra en labores de mantenimiento programado.',
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
          comments: commentValues.map((v) {
            final str = v['stringValue']?.toString() ?? '';
            try {
              return VaultComment.fromJson(
                  jsonDecode(str) as Map<String, dynamic>);
            } catch (_) {
              return VaultComment(
                id: 'c_1',
                userId: '',
                userName: 'Miembro',
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
// APLICACIÓN PRINCIPAL FLUTTER NATIVA
// ============================================================================
class Seis6VaultNativeApp extends StatefulWidget {
  const Seis6VaultNativeApp({super.key});

  @override
  State<Seis6VaultNativeApp> createState() => _Seis6VaultNativeAppState();
}

class _Seis6VaultNativeAppState extends State<Seis6VaultNativeApp> {
  bool _isDark = true;
  bool _isLoading = true;
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

    // Sincronización con Firebase Firestore en segundo plano
    await _syncWithCloud();
  }

  Future<void> _syncWithCloud() async {
    final prefs = await SharedPreferences.getInstance();

    final maint = await NativeFirestoreService.fetchMaintenanceState();
    if (maint != null && mounted) {
      setState(() {
        _isMaintenance = maint['isMaintenance'] == true;
        _maintenanceMessage = maint['message']?.toString() ?? _maintenanceMessage;
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
    const primaryBlue = Color(0xFF0066FF);
    final darkTheme = ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: Colors.black,
      primaryColor: primaryBlue,
      colorScheme: const ColorScheme.dark(
        primary: primaryBlue,
        secondary: Color(0xFF10B981),
        surface: Color(0xFF0A0A0C),
      ),
      useMaterial3: true,
    );

    final lightTheme = ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      primaryColor: primaryBlue,
      colorScheme: const ColorScheme.light(
        primary: primaryBlue,
        secondary: Color(0xFF10B981),
        surface: Colors.white,
      ),
      useMaterial3: true,
    );

    return MaterialApp(
      title: 'Seis6 Vault',
      debugShowCheckedModeBanner: false,
      theme: _isDark ? darkTheme : lightTheme,
      home: _isLoading
          ? const Scaffold(
              backgroundColor: Colors.black,
              body: Center(
                child: CircularProgressIndicator(color: primaryBlue),
              ),
            )
          : _isMaintenance && (_currentUser == null || !_currentUser!.isAdmin)
              ? NativeMaintenanceScreen(
                  message: _maintenanceMessage,
                  onAdminUnlock: (user) => _updateCurrentUser(user),
                )
              : _currentUser == null
                  ? NativeAuthScreen(
                      onAuthenticated: (user) => _updateCurrentUser(user),
                    )
                  : NativeHomeShell(
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
// PANTALLA DE MANTENIMIENTO NATIVA
// ============================================================================
class NativeMaintenanceScreen extends StatefulWidget {
  final String message;
  final ValueChanged<UserProfile> onAdminUnlock;

  const NativeMaintenanceScreen({
    super.key,
    required this.message,
    required this.onAdminUnlock,
  });

  @override
  State<NativeMaintenanceScreen> createState() =>
      _NativeMaintenanceScreenState();
}

class _NativeMaintenanceScreenState extends State<NativeMaintenanceScreen> {
  final _keyController = TextEditingController();
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
        customStatus: '🛡️ En línea - Modo Administrador',
      ));
    } else {
      setState(() => _error = 'Key de seguridad incorrecta.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: SingleChildScrollView(
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF0E0E12),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                      color: Colors.amber.withValues(alpha: 0.35)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.amber.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.build_circle_outlined,
                          color: Colors.amber, size: 48),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'MODO MANTENIMIENTO ACTIVO',
                      style: TextStyle(
                        color: Colors.amber,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Plataforma en Optimización',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      widget.message,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 24),
                    TextField(
                      controller: _keyController,
                      obscureText: true,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: 'Key de Seguridad Admin',
                        labelStyle: const TextStyle(color: Colors.white54),
                        filled: true,
                        fillColor: Colors.black,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 8),
                      Text(_error!,
                          style: const TextStyle(
                              color: Colors.redAccent, fontSize: 12)),
                    ],
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0066FF),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        onPressed: _unlockAdmin,
                        icon: const Icon(Icons.verified_user, size: 18),
                        label: const Text(
                          'Acceder como Administrador',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// PANTALLA DE AUTENTICACIÓN NATIVA
// ============================================================================
class NativeAuthScreen extends StatefulWidget {
  final ValueChanged<UserProfile> onAuthenticated;

  const NativeAuthScreen({super.key, required this.onAuthenticated});

  @override
  State<NativeAuthScreen> createState() => _NativeAuthScreenState();
}

class _NativeAuthScreenState extends State<NativeAuthScreen> {
  bool _isRegister = false;
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _adminKeyCtrl = TextEditingController();
  String? _error;

  void _submit() {
    final email = _emailCtrl.text.trim().toLowerCase();
    final pass = _passCtrl.text.trim();
    final name = _nameCtrl.text.trim();
    final adminKey = _adminKeyCtrl.text.trim();

    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Ingresa un correo electrónico válido.');
      return;
    }
    if (pass.length < 3) {
      setState(() => _error = 'Ingresa una contraseña válida.');
      return;
    }

    final wantsAdmin = adminKey.isNotEmpty || isAuthorizedAdminEmail(email);
    if (adminKey.isNotEmpty && !isAuthorizedAdminKey(adminKey)) {
      setState(() => _error = 'Clave de Administrador (Key) incorrecta.');
      return;
    }

    final isAdmin =
        isAuthorizedAdminEmail(email) || isAuthorizedAdminKey(adminKey);

    final profile = UserProfile(
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
      customStatus:
          isAdmin ? '🛡️ En línea - Modo Administrador' : '💎 Miembro de la Bóveda',
    );

    if (wantsAdmin && !isAdmin) {
      setState(() => _error = 'Se requiere la Key de seguridad para Admin.');
      return;
    }

    widget.onAuthenticated(profile);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 420),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFF0A0A0E),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: const Color(0xFF1E1E28)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 68,
                    height: 68,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0066FF), Color(0xFF0033AA)],
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(Icons.shield_rounded,
                        color: Colors.white, size: 36),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'SEIS6 VAULT NATIVE',
                    style: TextStyle(
                      color: Color(0xFF0066FF),
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _isRegister ? 'Crear Cuenta Nueva' : 'Iniciar Sesión',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 20),
                  if (_isRegister) ...[
                    TextField(
                      controller: _nameCtrl,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: 'Nombre o Alias',
                        prefixIcon: const Icon(Icons.person_outline,
                            color: Color(0xFF0066FF)),
                        filled: true,
                        fillColor: const Color(0xFF121218),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextField(
                    controller: _emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Correo Electrónico',
                      prefixIcon: const Icon(Icons.alternate_email,
                          color: Color(0xFF0066FF)),
                      filled: true,
                      fillColor: const Color(0xFF121218),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _passCtrl,
                    obscureText: true,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Contraseña',
                      prefixIcon: const Icon(Icons.lock_outline,
                          color: Color(0xFF0066FF)),
                      filled: true,
                      fillColor: const Color(0xFF121218),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _adminKeyCtrl,
                    obscureText: true,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Key de Administrador (Opcional)',
                      prefixIcon: const Icon(Icons.vpn_key_outlined,
                          color: Colors.amber),
                      filled: true,
                      fillColor: const Color(0xFF121218),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      _error!,
                      style: const TextStyle(
                          color: Colors.redAccent, fontSize: 12),
                    ),
                  ],
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0066FF),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      onPressed: _submit,
                      child: Text(
                        _isRegister ? 'Registrarme Ahora' : 'Entrar a la Bóveda',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => setState(() {
                      _isRegister = !_isRegister;
                      _error = null;
                    }),
                    child: Text(
                      _isRegister
                          ? '¿Ya tienes cuenta? Inicia sesión'
                          : '¿No tienes cuenta? Regístrate gratis',
                      style: const TextStyle(color: Color(0xFF0066FF)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// CONTENEDOR PRINCIPAL DE NAVEGACIÓN NATIVA
// ============================================================================
class NativeHomeShell extends StatefulWidget {
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
  final ValueChanged<List<VaultItem>> onItemsChanged;
  final ValueChanged<List<VaultList>> onListsChanged;
  final ValueChanged<List<PaymentReceipt>> onReceiptsChanged;
  final void Function(bool active, String message) onMaintenanceChanged;

  const NativeHomeShell({
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
    required this.onItemsChanged,
    required this.onListsChanged,
    required this.onReceiptsChanged,
    required this.onMaintenanceChanged,
  });

  @override
  State<NativeHomeShell> createState() => _NativeHomeShellState();
}

class _NativeHomeShellState extends State<NativeHomeShell> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final isAdmin = widget.currentUser.isAdmin;
    final pendingReceipts =
        widget.receipts.where((r) => r.status == 'pending').length;

    final pages = <Widget>[
      NativeVaultScreen(
        currentUser: widget.currentUser,
        items: widget.items,
        lists: widget.lists,
        onItemsChanged: widget.onItemsChanged,
        onListsChanged: widget.onListsChanged,
        onRefreshCloud: widget.onRefreshCloud,
      ),
      NativeMembershipScreen(
        currentUser: widget.currentUser,
        onGoToReceipts: () => setState(() => _selectedIndex = 2),
      ),
      NativeReceiptsScreen(
        currentUser: widget.currentUser,
        receipts: widget.receipts,
        onReceiptsChanged: widget.onReceiptsChanged,
      ),
      if (isAdmin)
        NativeAdminApprovalsScreen(
          receipts: widget.receipts,
          onReceiptsChanged: widget.onReceiptsChanged,
          currentUser: widget.currentUser,
          onUpdateUser: widget.onUpdateUser,
        ),
      NativeProfileScreen(
        currentUser: widget.currentUser,
        isDark: widget.isDark,
        items: widget.items,
        receipts: widget.receipts,
        isMaintenance: widget.isMaintenance,
        maintenanceMessage: widget.maintenanceMessage,
        onToggleTheme: widget.onToggleTheme,
        onUpdateUser: widget.onUpdateUser,
        onMaintenanceChanged: widget.onMaintenanceChanged,
      ),
    ];

    final destinations = <NavigationDestination>[
      const NavigationDestination(
        icon: Icon(Icons.folder_outlined),
        selectedIcon: Icon(Icons.folder, color: Color(0xFF0066FF)),
        label: 'Bóveda',
      ),
      const NavigationDestination(
        icon: Icon(Icons.workspace_premium_outlined),
        selectedIcon: Icon(Icons.workspace_premium, color: Color(0xFF0066FF)),
        label: 'Membresía',
      ),
      const NavigationDestination(
        icon: Icon(Icons.receipt_long_outlined),
        selectedIcon: Icon(Icons.receipt_long, color: Color(0xFF0066FF)),
        label: 'Pagos',
      ),
      if (isAdmin)
        NavigationDestination(
          icon: Badge(
            isLabelVisible: pendingReceipts > 0,
            label: Text('$pendingReceipts'),
            child: const Icon(Icons.fact_check_outlined),
          ),
          selectedIcon:
              const Icon(Icons.fact_check, color: Color(0xFF0066FF)),
          label: 'Revisión',
        ),
      const NavigationDestination(
        icon: Icon(Icons.person_outline),
        selectedIcon: Icon(Icons.person, color: Color(0xFF0066FF)),
        label: 'Ajustes',
      ),
    ];

    if (_selectedIndex >= pages.length) {
      _selectedIndex = 0;
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: widget.isDark ? Colors.black : Colors.white,
        surfaceTintColor: Colors.transparent,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF0066FF).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.shield,
                  color: Color(0xFF0066FF), size: 20),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      'Seis6 Vault',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                    ),
                    if (isAdmin) ...[
                      const SizedBox(width: 4),
                      const Icon(Icons.verified,
                          color: Color(0xFF0066FF), size: 16),
                    ],
                  ],
                ),
                Text(
                  isAdmin ? 'MODO ADMINISTRADOR ROOT' : 'SERVIDOR PRIVADO VIP',
                  style: const TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0066FF),
                    letterSpacing: 1.2,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: widget.onRefreshCloud,
            icon: const Icon(Icons.sync, size: 20),
            tooltip: 'Sincronizar con Firebase',
          ),
        ],
      ),
      body: pages[_selectedIndex],
      bottomNavigationBar: NavigationBar(
        backgroundColor:
            widget.isDark ? const Color(0xFF08080C) : Colors.white,
        indicatorColor: const Color(0xFF0066FF).withValues(alpha: 0.15),
        selectedIndex: _selectedIndex,
        onDestinationSelected: (idx) => setState(() => _selectedIndex = idx),
        destinations: destinations,
      ),
    );
  }
}

// ============================================================================
// PANTALLA DE BÓVEDA NATIVA (COLECCIONES Y PUBLICACIONES)
// ============================================================================
class NativeVaultScreen extends StatefulWidget {
  final UserProfile currentUser;
  final List<VaultItem> items;
  final List<VaultList> lists;
  final ValueChanged<List<VaultItem>> onItemsChanged;
  final ValueChanged<List<VaultList>> onListsChanged;
  final Future<void> Function() onRefreshCloud;

  const NativeVaultScreen({
    super.key,
    required this.currentUser,
    required this.items,
    required this.lists,
    required this.onItemsChanged,
    required this.onListsChanged,
    required this.onRefreshCloud,
  });

  @override
  State<NativeVaultScreen> createState() => _NativeVaultScreenState();
}

class _NativeVaultScreenState extends State<NativeVaultScreen> {
  String _search = '';
  String? _selectedListId;
  bool _showAllPublications = false;

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
        text: 'Recurso descargado desde Seis6 Vault: ${item.title}',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al exportar archivo: $e')),
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
    final newLikesCount =
        liked ? (item.likesCount > 0 ? item.likesCount - 1 : 0) : item.likesCount + 1;

    final updatedItem =
        item.copyWith(likesCount: newLikesCount, likedBy: newLikedBy);
    final updatedList = widget.items
        .map((i) => i.id == item.id ? updatedItem : i)
        .toList();
    widget.onItemsChanged(updatedList);
    await NativeFirestoreService.saveVaultItem(updatedItem);
  }

  void _showUploadDialog() {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final urlCtrl = TextEditingController();
    final typeCtrl = TextEditingController(text: 'Archivo VIP');
    String? selectedList =
        widget.lists.isNotEmpty ? widget.lists.first.id : null;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Publicar en Bóveda'),
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
                      labelText: 'Tipo (ej: APK, REG, ZIP)'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: urlCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Link de Descarga Directa (Opcional)'),
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
              onPressed: () async {
                if (titleCtrl.text.trim().isEmpty) return;
                final newItem = VaultItem(
                  id: 'vault-res-${DateTime.now().millisecondsSinceEpoch}',
                  title: titleCtrl.text.trim(),
                  description: descCtrl.text.trim(),
                  category: 'code',
                  fileType: typeCtrl.text.trim(),
                  fileSize: 'Original',
                  downloadUrl: urlCtrl.text.trim(),
                  coverImage:
                      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
                  createdAt: DateTime.now().toIso8601String().split('T').first,
                  likesCount: 1,
                  likedBy: [widget.currentUser.uid],
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
              child: const Text('Publicar'),
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateListDialog() {
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Nueva Colección'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration:
                  const InputDecoration(labelText: 'Nombre de la Colección'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: descCtrl,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Descripción'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameCtrl.text.trim().isEmpty) return;
              final newList = VaultList(
                id: 'list-${DateTime.now().millisecondsSinceEpoch}',
                name: nameCtrl.text.trim(),
                description: descCtrl.text.trim(),
                icon: 'folder',
                colorHex: '#0066FF',
                itemIds: const [],
                createdAt: DateTime.now().toIso8601String().split('T').first,
              );
              final updated = [newList, ...widget.lists];
              widget.onListsChanged(updated);
              await NativeFirestoreService.saveVaultList(newList);
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Crear'),
          ),
        ],
      ),
    );
  }

  void _openItemDetail(VaultItem item) {
    final commentCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0E0E14),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      item.title,
                      style: const TextStyle(
                        color: Colors.white,
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
                        final updated = widget.items
                            .where((i) => i.id != item.id)
                            .toList();
                        widget.onItemsChanged(updated);
                        await NativeFirestoreService.deleteVaultItem(item.id);
                        if (ctx.mounted) Navigator.pop(ctx);
                      },
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                item.description,
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0066FF),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  onPressed: () => _downloadResourceNatively(item),
                  icon: const Icon(Icons.download_rounded),
                  label: const Text(
                    'Descargar Archivo Nativo',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'Comentarios de la Comunidad',
                style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 13),
              ),
              const SizedBox(height: 8),
              ...item.comments.map(
                (c) => ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(c.userName,
                      style: const TextStyle(
                          color: Color(0xFF0066FF),
                          fontWeight: FontWeight.bold,
                          fontSize: 12)),
                  subtitle: Text(c.text,
                      style:
                          const TextStyle(color: Colors.white70, fontSize: 12)),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: commentCtrl,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Escribe un comentario...',
                        hintStyle: const TextStyle(color: Colors.white38),
                        filled: true,
                        fillColor: Colors.black,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.send, color: Color(0xFF0066FF)),
                    onPressed: () async {
                      if (commentCtrl.text.trim().isEmpty) return;
                      final newComment = VaultComment(
                        id: 'c_${DateTime.now().millisecondsSinceEpoch}',
                        userId: widget.currentUser.uid,
                        userName: widget.currentUser.displayName,
                        userRole: widget.currentUser.role,
                        text: commentCtrl.text.trim(),
                        createdAt:
                            DateTime.now().toIso8601String().split('T').first,
                      );
                      final updatedItem = item.copyWith(
                        comments: [...item.comments, newComment],
                      );
                      final updatedItems = widget.items
                          .map((i) => i.id == item.id ? updatedItem : i)
                          .toList();
                      widget.onItemsChanged(updatedItems);
                      await NativeFirestoreService.saveVaultItem(updatedItem);
                      if (ctx.mounted) Navigator.pop(ctx);
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isAdmin = widget.currentUser.isAdmin;
    final activeList = _selectedListId != null
        ? widget.lists.where((l) => l.id == _selectedListId).firstOrNull
        : null;

    final filteredItems = widget.items.where((it) {
      if (activeList != null && !activeList.itemIds.contains(it.id)) {
        return false;
      }
      if (_search.trim().isNotEmpty) {
        final q = _search.toLowerCase();
        return it.title.toLowerCase().contains(q) ||
            it.description.toLowerCase().contains(q);
      }
      return true;
    }).toList();

    return RefreshIndicator(
      onRefresh: widget.onRefreshCloud,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (isAdmin)
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0066FF),
                      foregroundColor: Colors.white,
                    ),
                    onPressed: _showUploadDialog,
                    icon: const Icon(Icons.upload_file, size: 18),
                    label: const Text('Subir Recurso'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _showCreateListDialog,
                    icon: const Icon(Icons.create_new_folder_outlined, size: 18),
                    label: const Text('Nueva Carpeta'),
                  ),
                ),
              ],
            ),
          if (isAdmin) const SizedBox(height: 12),
          TextField(
            onChanged: (v) => setState(() => _search = v),
            decoration: InputDecoration(
              hintText: 'Buscar en la bóveda...',
              prefixIcon: const Icon(Icons.search, color: Color(0xFF0066FF)),
              filled: true,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
          const SizedBox(height: 14),
          if (activeList != null) ...[
            Row(
              children: [
                TextButton.icon(
                  onPressed: () => setState(() => _selectedListId = null),
                  icon: const Icon(Icons.arrow_back, size: 18),
                  label: const Text('Volver a Colecciones'),
                ),
                const Spacer(),
                if (isAdmin)
                  IconButton(
                    icon: const Icon(Icons.delete_forever,
                        color: Colors.redAccent),
                    onPressed: () async {
                      final idToDelete = activeList.id;
                      setState(() => _selectedListId = null);
                      widget.onListsChanged(widget.lists
                          .where((l) => l.id != idToDelete)
                          .toList());
                      await NativeFirestoreService.deleteVaultList(idToDelete);
                    },
                  ),
              ],
            ),
            Text(
              activeList.name,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
          ] else if (!_showAllPublications) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'COLECCIONES OFICIALES',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0066FF),
                    letterSpacing: 1.2,
                  ),
                ),
                if (isAdmin)
                  TextButton(
                    onPressed: () =>
                        setState(() => _showAllPublications = true),
                    child: const Text('Ver todas las publicaciones'),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            ...widget.lists.map(
              (l) => Card(
                margin: const EdgeInsets.only(bottom: 10),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
                child: ListTile(
                  onTap: () => setState(() => _selectedListId = l.id),
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0066FF).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child:
                        const Icon(Icons.folder_special, color: Color(0xFF0066FF)),
                  ),
                  title: Text(l.name,
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(
                    '${l.description}\n${l.itemIds.length} publicaciones',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12),
                  ),
                  trailing: const Icon(Icons.chevron_right),
                ),
              ),
            ),
          ],
          if (activeList != null || _showAllPublications || _search.isNotEmpty) ...[
            if (_showAllPublications && activeList == null)
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: () =>
                      setState(() => _showAllPublications = false),
                  icon: const Icon(Icons.folder_outlined, size: 18),
                  label: const Text('Ver por Colecciones'),
                ),
              ),
            ...filteredItems.map(
              (item) => Card(
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
                child: InkWell(
                  borderRadius: BorderRadius.circular(18),
                  onTap: () => _openItemDetail(item),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0066FF)
                                    .withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                item.fileType.isNotEmpty
                                    ? item.fileType
                                    : item.category.toUpperCase(),
                                style: const TextStyle(
                                  color: Color(0xFF0066FF),
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            const Spacer(),
                            Text(
                              item.version,
                              style: const TextStyle(
                                  fontSize: 11, color: Colors.grey),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          item.title,
                          style: const TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 12, color: Colors.grey),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            InkWell(
                              onTap: () => _toggleLike(item),
                              child: Row(
                                children: [
                                  Icon(
                                    item.likedBy
                                            .contains(widget.currentUser.uid)
                                        ? Icons.favorite
                                        : Icons.favorite_border,
                                    color: Colors.redAccent,
                                    size: 18,
                                  ),
                                  const SizedBox(width: 4),
                                  Text('${item.likesCount}',
                                      style: const TextStyle(fontSize: 12)),
                                ],
                              ),
                            ),
                            const SizedBox(width: 16),
                            const Icon(Icons.chat_bubble_outline,
                                size: 16, color: Colors.grey),
                            const SizedBox(width: 4),
                            Text('${item.comments.length}',
                                style: const TextStyle(fontSize: 12)),
                            const Spacer(),
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0066FF),
                                foregroundColor: Colors.white,
                                visualDensity: VisualDensity.compact,
                              ),
                              onPressed: () => _downloadResourceNatively(item),
                              icon: const Icon(Icons.download, size: 15),
                              label: const Text('Descargar',
                                  style: TextStyle(fontSize: 12)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ============================================================================
// PANTALLA DE MEMBRESÍA VIP NATIVA
// ============================================================================
class NativeMembershipScreen extends StatelessWidget {
  final UserProfile currentUser;
  final VoidCallback onGoToReceipts;

  const NativeMembershipScreen({
    super.key,
    required this.currentUser,
    required this.onGoToReceipts,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0066FF), Color(0xFF002B7F)],
            ),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.workspace_premium, color: Colors.amber, size: 28),
                  SizedBox(width: 8),
                  Text(
                    'MEMBRESÍA OFICIAL SEIS6',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                currentUser.hasActiveMembership
                    ? 'Estado: SUSCRIPCIÓN ACTIVA (${currentUser.membershipPlan == 'annual' ? 'Plan Anual' : 'Plan Mensual'})'
                    : 'Activa tu acceso VIP para desbloquear soporte prioritario y todo el catálogo.',
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _buildPlanCard(
          title: 'Plan Mensual VIP',
          price: '\$1 USD / mes',
          features: const [
            'Acceso completo a colecciones iOS & Android',
            'Descargas directas sin anuncios ni esperas',
            'Insignia Miembro VIP verificada',
          ],
          onTap: onGoToReceipts,
        ),
        const SizedBox(height: 12),
        _buildPlanCard(
          title: 'Plan Anual Diamante',
          price: '\$12 USD / año',
          features: const [
            '12 meses de acceso total a Bóveda Privada',
            'Actualizaciones prioritarias de Regedits y paneles',
            'Soporte directo con Administración',
          ],
          onTap: onGoToReceipts,
        ),
      ],
    );
  }

  Widget _buildPlanCard({
    required String title,
    required String price,
    required List<String> features,
    required VoidCallback onTap,
  }) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.bold)),
                Text(price,
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0066FF))),
              ],
            ),
            const SizedBox(height: 12),
            ...features.map(
              (f) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle,
                        color: Color(0xFF10B981), size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                        child: Text(f, style: const TextStyle(fontSize: 12))),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0066FF),
                  foregroundColor: Colors.white,
                ),
                onPressed: onTap,
                child: const Text('Subir Comprobante de Pago'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// PANTALLA DE COMPROBANTES DE PAGO NATIVA
// ============================================================================
class NativeReceiptsScreen extends StatefulWidget {
  final UserProfile currentUser;
  final List<PaymentReceipt> receipts;
  final ValueChanged<List<PaymentReceipt>> onReceiptsChanged;

  const NativeReceiptsScreen({
    super.key,
    required this.currentUser,
    required this.receipts,
    required this.onReceiptsChanged,
  });

  @override
  State<NativeReceiptsScreen> createState() => _NativeReceiptsScreenState();
}

class _NativeReceiptsScreenState extends State<NativeReceiptsScreen> {
  String _plan = 'monthly';
  final _refCtrl = TextEditingController();
  String? _imageBase64;

  Future<void> _pickReceiptImage() async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
          source: ImageSource.gallery, maxWidth: 800, imageQuality: 75);
      if (picked != null) {
        final bytes = await picked.readAsBytes();
        setState(() {
          _imageBase64 = 'data:image/jpeg;base64,${base64Encode(bytes)}';
        });
      }
    } catch (_) {}
  }

  void _submitReceipt() {
    if (_refCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ingresa el código o referencia de pago')),
      );
      return;
    }

    final newReceipt = PaymentReceipt(
      id: 'rec-${DateTime.now().millisecondsSinceEpoch}',
      userId: widget.currentUser.uid,
      userEmail: widget.currentUser.email,
      userDisplayName: widget.currentUser.displayName,
      plan: _plan,
      amount: _plan == 'annual' ? 12.0 : 1.0,
      referenceCode: _refCtrl.text.trim(),
      status: 'pending',
      createdAt: DateTime.now().toIso8601String(),
      imageDataUrl: _imageBase64,
    );

    final updated = [newReceipt, ...widget.receipts];
    widget.onReceiptsChanged(updated);
    _refCtrl.clear();
    setState(() => _imageBase64 = null);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
          content: Text('Comprobante enviado a revisión exitosamente')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final myReceipts = widget.receipts
        .where((r) =>
            r.userId == widget.currentUser.uid ||
            r.userEmail.toLowerCase() ==
                widget.currentUser.email.toLowerCase())
        .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Enviar Comprobante de Pago',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _plan,
                  decoration:
                      const InputDecoration(labelText: 'Plan Seleccionado'),
                  items: const [
                    DropdownMenuItem(
                        value: 'monthly', child: Text('Plan Mensual (\$1 USD)')),
                    DropdownMenuItem(
                        value: 'annual', child: Text('Plan Anual (\$12 USD)')),
                  ],
                  onChanged: (v) => setState(() => _plan = v ?? 'monthly'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _refCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Número de Referencia / Comprobante',
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: _pickReceiptImage,
                  icon: const Icon(Icons.photo_library_outlined),
                  label: Text(_imageBase64 != null
                      ? 'Captura Adjuntada ✓'
                      : 'Adjuntar Captura desde Galería'),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0066FF),
                      foregroundColor: Colors.white,
                    ),
                    onPressed: _submitReceipt,
                    child: const Text('Enviar para Aprobación'),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Mis Comprobantes',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        if (myReceipts.isEmpty)
          const Padding(
            padding: EdgeInsets.all(24),
            child: Center(
              child: Text('No has subido comprobantes todavía.',
                  style: TextStyle(color: Colors.grey)),
            ),
          )
        else
          ...myReceipts.map(
            (r) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text(
                    '${r.plan == 'annual' ? 'Plan Anual' : 'Plan Mensual'} (\$${r.amount} ${r.currency})'),
                subtitle: Text('Ref: ${r.referenceCode}'),
                trailing: Chip(
                  label: Text(
                    r.status == 'approved'
                        ? 'Aprobado'
                        : r.status == 'rejected'
                            ? 'Rechazado'
                            : 'En Revisión',
                    style: const TextStyle(fontSize: 11),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// ============================================================================
// PANTALLA DE APROBACIONES ADMIN NATIVA
// ============================================================================
class NativeAdminApprovalsScreen extends StatelessWidget {
  final List<PaymentReceipt> receipts;
  final ValueChanged<List<PaymentReceipt>> onReceiptsChanged;
  final UserProfile currentUser;
  final ValueChanged<UserProfile?> onUpdateUser;

  const NativeAdminApprovalsScreen({
    super.key,
    required this.receipts,
    required this.onReceiptsChanged,
    required this.currentUser,
    required this.onUpdateUser,
  });

  void _updateStatus(PaymentReceipt target, String status) {
    final updated = receipts
        .map((r) => r.id == target.id ? r.copyWith(status: status) : r)
        .toList();
    onReceiptsChanged(updated);

    if (status == 'approved' && target.userId == currentUser.uid) {
      final now = DateTime.now();
      final expires = now.add(Duration(days: target.plan == 'annual' ? 365 : 30));
      onUpdateUser(currentUser.copyWith(
        membershipStatus: 'active',
        membershipPlan: target.plan,
        subscribedAt: now.toIso8601String(),
        membershipExpiresAt: expires.toIso8601String(),
        lastPaymentAmount: target.amount,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (receipts.isEmpty) {
      return const Center(
        child: Text('No hay comprobantes registrados.',
            style: TextStyle(color: Colors.grey)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: receipts.length,
      itemBuilder: (ctx, i) {
        final r = receipts[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${r.userDisplayName} (${r.userEmail})',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                    'Plan: ${r.plan == 'annual' ? 'Anual' : 'Mensual'} • \$${r.amount} USD • Ref: ${r.referenceCode}',
                    style: const TextStyle(fontSize: 12, color: Colors.grey)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () => _updateStatus(r, 'approved'),
                      icon: const Icon(Icons.check, size: 16),
                      label: const Text('Aprobar'),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      onPressed: () => _updateStatus(r, 'rejected'),
                      icon: const Icon(Icons.close,
                          size: 16, color: Colors.redAccent),
                      label: const Text('Rechazar'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ============================================================================
// PANTALLA DE PERFIL Y SISTEMA NATIVA
// ============================================================================
class NativeProfileScreen extends StatelessWidget {
  final UserProfile currentUser;
  final bool isDark;
  final List<VaultItem> items;
  final List<PaymentReceipt> receipts;
  final bool isMaintenance;
  final String maintenanceMessage;
  final ValueChanged<bool> onToggleTheme;
  final ValueChanged<UserProfile?> onUpdateUser;
  final void Function(bool active, String message) onMaintenanceChanged;

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
    required this.onMaintenanceChanged,
  });

  void _editProfileDialog(BuildContext context) {
    final nameCtrl = TextEditingController(text: currentUser.displayName);
    final bioCtrl = TextEditingController(text: currentUser.bio ?? '');
    final phoneCtrl = TextEditingController(text: currentUser.phone ?? '');
    final igCtrl = TextEditingController(text: currentUser.instagram ?? '');
    final statusCtrl =
        TextEditingController(text: currentUser.customStatus ?? '');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Editar Perfil'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Nombre / Alias'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: statusCtrl,
                decoration: const InputDecoration(labelText: 'Estado Corto'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: phoneCtrl,
                decoration: const InputDecoration(labelText: 'WhatsApp'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: igCtrl,
                decoration: const InputDecoration(labelText: 'Instagram'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: bioCtrl,
                maxLines: 2,
                decoration: const InputDecoration(labelText: 'Biografía'),
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
            onPressed: () {
              onUpdateUser(currentUser.copyWith(
                displayName: nameCtrl.text.trim(),
                customStatus: statusCtrl.text.trim(),
                phone: phoneCtrl.text.trim(),
                instagram: igCtrl.text.trim(),
                bio: bioCtrl.text.trim(),
                updatedAt: DateTime.now().toIso8601String(),
              ));
              Navigator.pop(ctx);
            },
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 36,
                  backgroundColor: const Color(0xFF0066FF),
                  child: Text(
                    currentUser.displayName.isNotEmpty
                        ? currentUser.displayName[0].toUpperCase()
                        : 'U',
                    style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Colors.white),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      currentUser.displayName,
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.w900),
                    ),
                    if (currentUser.isAdmin) ...[
                      const SizedBox(width: 6),
                      const Icon(Icons.verified,
                          color: Color(0xFF0066FF), size: 18),
                    ],
                  ],
                ),
                Text(currentUser.email,
                    style: const TextStyle(fontSize: 12, color: Colors.grey)),
                if (currentUser.customStatus != null &&
                    currentUser.customStatus!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    currentUser.customStatus!,
                    style: const TextStyle(
                        fontSize: 12, color: Color(0xFF0066FF)),
                  ),
                ],
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () => _editProfileDialog(context),
                  icon: const Icon(Icons.edit, size: 16),
                  label: const Text('Editar Perfil Personal'),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          child: SwitchListTile(
            title: const Text('Modo Oscuro Puro (#000000)',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: const Text('Interfaz optimizada para pantallas AMOLED',
                style: TextStyle(fontSize: 12)),
            value: isDark,
            activeColor: const Color(0xFF0066FF),
            onChanged: onToggleTheme,
          ),
        ),
        if (currentUser.isAdmin) ...[
          const SizedBox(height: 12),
          Card(
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18)),
            child: SwitchListTile(
              title: const Text('Modo Mantenimiento Global',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: Text(
                isMaintenance
                    ? 'ACTIVO: Solo administradores con Key pueden entrar'
                    : 'INACTIVO: Acceso abierto a miembros',
                style: const TextStyle(fontSize: 12),
              ),
              value: isMaintenance,
              activeColor: Colors.amber,
              onChanged: (val) =>
                  onMaintenanceChanged(val, maintenanceMessage),
            ),
          ),
        ],
        const SizedBox(height: 12),
        Card(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          child: ListTile(
            leading: const Icon(Icons.fingerprint, color: Color(0xFF0066FF)),
            title: const Text('ID Único de Usuario',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            subtitle: Text(currentUser.uid,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
            trailing: IconButton(
              icon: const Icon(Icons.copy, size: 18),
              onPressed: () {
                Clipboard.setData(ClipboardData(text: currentUser.uid));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('ID copiado al portapapeles')),
                );
              },
            ),
          ),
        ),
        const SizedBox(height: 20),
        ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.redAccent.withValues(alpha: 0.15),
            foregroundColor: Colors.redAccent,
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
          onPressed: () => onUpdateUser(null),
          icon: const Icon(Icons.logout),
          label: const Text('Cerrar Sesión Segura',
              style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
