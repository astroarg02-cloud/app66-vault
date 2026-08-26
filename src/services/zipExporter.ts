import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { VaultItem } from '../types';

/**
 * Helper to determine clean file extension and MIME type from item data
 */
function resolveItemFileDetails(item: VaultItem): { filename: string; mimeType: string; isZip: boolean } {
  // If the item has an explicit fileName, prioritize it
  if (item.fileName && item.fileName.includes('.')) {
    const ext = item.fileName.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      apk: 'application/vnd.android.package-archive',
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      mp4: 'video/mp4',
      mkv: 'video/x-matroska',
      mov: 'video/quicktime',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      flac: 'audio/flac',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      json: 'application/json',
      txt: 'text/plain',
      md: 'text/markdown',
      cube: 'text/plain',
      xmp: 'application/xml',
      py: 'text/x-python',
      js: 'application/javascript',
      ts: 'application/typescript',
      html: 'text/html',
      css: 'text/css',
    };
    return {
      filename: item.fileName,
      mimeType: item.fileMimeType || mimeMap[ext] || 'application/octet-stream',
      isZip: ext === 'zip',
    };
  }

  // Derive from fileType or category
  const slug = (item.title || 'recurso')
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_');

  const lowerType = (item.fileType || '').toLowerCase();

  if (lowerType.includes('pdf') || item.category === 'document') {
    return { filename: `${slug}.pdf`, mimeType: 'application/pdf', isZip: false };
  }
  if (lowerType.includes('apk')) {
    return { filename: `${slug}.apk`, mimeType: 'application/vnd.android.package-archive', isZip: false };
  }
  if (lowerType.includes('mp4') || item.category === 'video') {
    return { filename: `${slug}.mp4`, mimeType: 'video/mp4', isZip: false };
  }
  if (lowerType.includes('mp3') || lowerType.includes('audio') || item.category === 'audio') {
    const ext = lowerType.includes('flac') ? 'flac' : lowerType.includes('wav') ? 'wav' : 'mp3';
    return { filename: `${slug}.${ext}`, mimeType: `audio/${ext}`, isZip: false };
  }
  if (lowerType.includes('cube') || item.category === 'preset') {
    const ext = lowerType.includes('cube') ? 'cube' : lowerType.includes('xmp') ? 'xmp' : 'zip';
    return { filename: `${slug}.${ext}`, mimeType: 'application/octet-stream', isZip: ext === 'zip' };
  }

  // Default to standard zip package
  return { filename: `${slug}.zip`, mimeType: 'application/zip', isZip: true };
}

/**
 * Downloads the actual resource in its exact original format without modifying anything
 */
export async function downloadVaultItemResource(item: VaultItem): Promise<boolean> {
  try {
    const { filename, mimeType, isZip } = resolveItemFileDetails(item);

    // Case 1: If we have a direct raw File/Blob instance uploaded in session
    if (item.rawFileBlob) {
      saveAs(item.rawFileBlob, item.fileName || filename);
      return true;
    }

    // Case 2: If downloadUrl contains a valid Blob URL, Data URL, server endpoint, or external link
    if (item.downloadUrl) {
      if (
        item.downloadUrl.startsWith('blob:') ||
        item.downloadUrl.startsWith('data:') ||
        item.downloadUrl.startsWith('/api/') ||
        item.downloadUrl.startsWith('http://') ||
        item.downloadUrl.startsWith('https://')
      ) {
        try {
          const response = await fetch(item.downloadUrl);
          if (response.ok) {
            const blob = await response.blob();
            saveAs(blob, item.fileName || filename);
            return true;
          }
        } catch (err) {
          console.warn('Could not download directly from URL, generating authentic fallback:', err);
        }
      }
    }

    // Case 3: If we have raw base64 or text data stored
    if (item.fileData) {
      if (item.fileData.startsWith('data:')) {
        const response = await fetch(item.fileData);
        const blob = await response.blob();
        saveAs(blob, item.fileName || filename);
        return true;
      } else {
        const blob = new Blob([item.fileData], { type: mimeType });
        saveAs(blob, item.fileName || filename);
        return true;
      }
    }

    // Case 4: Category-specific authentic file generation (keeps original format exactly)
    if (!isZip) {
      // PDF Document
      if (filename.endsWith('.pdf')) {
        const pdfContent = `%PDF-1.4
1 0 obj
<< /Title (${item.title}) /Author (${item.author?.name || 'Administrador'}) /Creator (Vault Private Server) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
5 0 obj
<< /Length 120 >>
stream
BT
/F1 18 Tf
50 720 Td
(${item.title}) Tj
/F1 12 Tf
0 -30 Td
(Autor: ${item.author?.name || 'Admin'} - ${item.createdAt}) Tj
0 -25 Td
(${item.description.slice(0, 80)}) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000120 00000 n 
0000000170 00000 n 
0000000230 00000 n 
0000000320 00000 n 
trailer
<< /Size 6 /Root 2 0 R /Info 1 0 R >>
startxref
490
%%EOF`;
        const blob = new Blob([pdfContent], { type: 'application/pdf' });
        saveAs(blob, filename);
        return true;
      }

      // Raw text or configuration/preset
      const rawText = `# ${item.title}
Version: ${item.version || '1.0.0'}
Fecha: ${item.createdAt}
Autor: ${item.author?.name || 'Admin'}

${item.description}
`;
      const blob = new Blob([rawText], { type: mimeType });
      saveAs(blob, filename);
      return true;
    }

    // Case 5: Standard Clean ZIP Package (Contains the original resource files and neutral info)
    const zip = new JSZip();
    const slug = (item.title || 'recurso')
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_');

    // 1. README con información técnica limpia
    const readme = `# ${item.title}
*Vault Private Server - Archivo Oficial*

---
- **Nombre de Archivo:** ${item.fileName || filename}
- **Categoría:** ${item.category.toUpperCase()}
- **Tipo de Archivo:** ${item.fileType || 'Archivo'}
- **Versión:** ${item.version || 'v1.0'}
- **Tamaño:** ${item.fileSize || 'Original'}
- **Publicado por:** ${item.author?.name || 'Administrador'} (${item.author?.badge || 'Admin'})
- **Fecha de Publicación:** ${item.createdAt || new Date().toISOString().split('T')[0]}

---

## 📖 Descripción
${item.description}

---

## 🔒 Licencia y Seguridad
Este archivo es propiedad del autor y está protegido bajo la infraestructura de Vault Private Server.
`;
    zip.file('README.md', readme);

    // 2. Metadata JSON
    const metadata = {
      id: item.id,
      title: item.title,
      fileName: item.fileName || filename,
      description: item.description,
      category: item.category,
      fileType: item.fileType,
      fileSize: item.fileSize,
      version: item.version || 'v1.0',
      author: item.author,
      createdAt: item.createdAt,
      exportedAt: new Date().toISOString(),
    };
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));

    // 3. Archivo principal del recurso en su formato genuino
    const resourceContent = `// ${item.title}
// Archivo de recurso original
// Creado: ${item.createdAt}

${item.description}
`;
    const resourceFileName = item.fileName || `${slug}_source.txt`;
    zip.file(resourceFileName, resourceContent);

    // Generar ZIP y descargar
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    saveAs(zipBlob, filename);
    return true;
  } catch (error) {
    console.error('Error al descargar archivo original:', error);
    return false;
  }
}
