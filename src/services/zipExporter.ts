import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { DART_CODEBASE } from '../data/dartCodebase';
import { VaultItem } from '../types';

/**
 * Exports full repository and flutter project zip
 */
export async function exportProjectZip(): Promise<void> {
  const zip = new JSZip();

  // Add README.md
  zip.file(
    'README.md',
    `# App 66 - Vault Private Server (Flutter & Android/iOS)

Aplicación móvil multiplataforma de Bóveda y Servidor Privado exclusivo.

## 🚀 Compilación del APK para Android (Sin GitHub)
1. Extrae este archivo ZIP.
2. Abre la terminal en la carpeta y ejecuta:
   \`\`\`bash
   flutter create . --platforms=android --org=com.vault.privateserver
   flutter pub get
   flutter build apk --release --no-tree-shake-icons
   \`\`\`
3. Tu APK estará listo en:
   \`build/app/outputs/flutter-apk/app-release.apk\`
`
  );

  // Add all codebase files
  DART_CODEBASE.forEach((file) => {
    zip.file(file.path, file.code);
  });

  // Generate and trigger download
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'App-66-Flutter-Android-Vault.zip');
}

/**
 * Downloads the actual resource package corresponding to a Vault publication
 */
export async function downloadVaultItemResource(item: VaultItem): Promise<boolean> {
  try {
    const zip = new JSZip();
    const slug = (item.title || 'recurso')
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_');
    
    const folderName = `vault_${slug}`;
    const mainFolder = zip.folder(folderName);

    if (!mainFolder) return false;

    // 1. README del recurso
    const readme = `# ${item.title}
*Vault Private Server - Recurso Oficial Exclusivo*

---
- **Categoría:** ${item.category.toUpperCase()}
- **Tipo de Archivo:** ${item.fileType || 'Paquete Oficial'}
- **Versión:** ${item.version || 'v1.0'}
- **Tamaño:** ${item.fileSize || 'Descarga Directa'}
- **Publicado por:** ${item.author?.name || 'Administrador'} (${item.author?.badge || 'Admin Master'})
- **Fecha:** ${item.createdAt || new Date().toISOString().split('T')[0]}

---

## 📖 Descripción del Recurso
${item.description}

---

## 🚀 Instrucciones de Integración en Flutter (Android & iOS)

1. Descomprime este archivo en tu proyecto Flutter.
2. Añade las dependencias recomendadas en tu \`pubspec.yaml\`:
\`\`\`yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.5.1
  firebase_core: ^2.30.0
  cloud_firestore: ^4.17.0
  firebase_auth: ^4.19.0
  supabase_flutter: ^2.5.0
\`\`\`
3. Ejecuta \`flutter pub get\` e importa los archivos incluidos en \`lib/\`.
`;
    mainFolder.file('README.md', readme);

    // 2. Ficha de Metadatos
    const metadata = {
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      fileType: item.fileType,
      fileSize: item.fileSize,
      version: item.version || 'v1.0',
      author: item.author,
      createdAt: item.createdAt,
      likesCount: item.likesCount,
      commentsCount: item.comments?.length || 0,
      exportedAt: new Date().toISOString(),
    };
    mainFolder.file('metadata.json', JSON.stringify(metadata, null, 2));

    // 3. Código y recursos incluidos
    const libFolder = mainFolder.folder('lib');
    if (libFolder) {
      libFolder.file(
        `${slug}.dart`,
        `// ${item.title} - Código de Implementación
// Generado por Vault Private Server

import 'package:flutter/material.dart';

class VaultResourceWidget extends StatelessWidget {
  const VaultResourceWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0A0C),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF0066FF)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              const Icon(Icons.verified, color: Color(0xFF0066FF), size: 20),
              const SizedBox(width: 8),
              Text(
                '${item.title.replace(/'/g, "\\'")}',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            '${item.description.replace(/'/g, "\\'")}',
            style: const TextStyle(color: Colors.grey, fontSize: 13),
          ),
        ],
      ),
    );
  }
}
`
      );
    }

    // 4. Si la descarga tiene un archivo adjunto Blob real en memoria, lo incluimos
    if (item.downloadUrl && item.downloadUrl.startsWith('blob:')) {
      try {
        const response = await fetch(item.downloadUrl);
        const fileBlob = await response.blob();
        mainFolder.file(`archivo_original_${item.fileType?.replace(/[^a-z0-9]/gi, '_') || 'adjunto'}.bin`, fileBlob);
      } catch (e) {
        console.warn('Could not fetch blob download URL:', e);
      }
    }

    // Generar archivo ZIP y disparar descarga en el navegador
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const outputName = `${slug}_vault_package.zip`;
    saveAs(zipBlob, outputName);
    return true;
  } catch (error) {
    console.error('Error al descargar archivo del vault:', error);
    return false;
  }
}
