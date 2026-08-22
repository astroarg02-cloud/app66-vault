import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { DART_CODEBASE } from '../data/dartCodebase';

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
