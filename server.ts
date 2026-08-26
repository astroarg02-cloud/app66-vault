import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import rawFirebaseConfig from './firebase-applet-config.json';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Storage directory for persistent server-side vault items and uploads
const DATA_DIR = path.join(process.cwd(), 'server_data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const VAULT_FILE = path.join(DATA_DIR, 'vault_items.json');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initial seed if file does not exist
if (!fs.existsSync(VAULT_FILE)) {
  fs.writeFileSync(VAULT_FILE, JSON.stringify([], null, 2), 'utf-8');
}

// Helper to read items safely
function readVaultItems(): any[] {
  try {
    if (fs.existsSync(VAULT_FILE)) {
      const raw = fs.readFileSync(VAULT_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading vault items from file:', err);
  }
  return [];
}

// Helper to write items safely
function writeVaultItems(items: any[]): boolean {
  try {
    fs.writeFileSync(VAULT_FILE, JSON.stringify(items, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing vault items to file:', err);
    return false;
  }
}

// Helper to convert item into Firestore REST fields format
function itemToFirestoreFields(item: any): Record<string, any> {
  const fields: Record<string, any> = {};
  
  // Safe fields only - exclude raw huge binary blobs from Firestore doc to avoid 1MB limit
  const sanitized = {
    id: String(item.id || ''),
    title: String(item.title || ''),
    description: String(item.description || ''),
    category: String(item.category || 'code'),
    fileType: String(item.fileType || ''),
    fileSize: String(item.fileSize || ''),
    fileName: String(item.fileName || ''),
    fileMimeType: String(item.fileMimeType || ''),
    downloadUrl: String(item.downloadUrl || ''),
    coverImage: String(item.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'),
    createdAt: String(item.createdAt || new Date().toISOString().split('T')[0]),
    likesCount: Number(item.likesCount ?? 0),
    likedBy: Array.isArray(item.likedBy) ? item.likedBy : [],
    comments: Array.isArray(item.comments) ? item.comments : [],
    isLockedForTier: Boolean(item.isLockedForTier),
    version: String(item.version || 'v1.0'),
    author: item.author || { name: 'Administrador (astroarg02)', badge: 'ADMIN ROOT' },
  };

  for (const [key, value] of Object.entries(sanitized)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = { integerValue: String(Math.round(value)) };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map((v) => {
            if (typeof v === 'string') return { stringValue: v };
            if (typeof v === 'object') return { stringValue: JSON.stringify(v) };
            return { stringValue: String(v) };
          }),
        },
      };
    } else if (typeof value === 'object') {
      fields[key] = { stringValue: JSON.stringify(value) };
    }
  }

  return fields;
}

// Synchronize an item to Firebase Firestore REST API
async function saveToFirestoreREST(item: any): Promise<boolean> {
  try {
    if (!item || !item.id) return false;
    const url = `https://firestore.googleapis.com/v1/projects/${rawFirebaseConfig.projectId}/databases/(default)/documents/vault_items/${encodeURIComponent(item.id)}?key=${rawFirebaseConfig.apiKey}`;
    const fields = itemToFirestoreFields(item);
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });

    if (response.ok) {
      console.log(`[Firestore Server Sync] Item "${item.title}" (${item.id}) saved to Firestore.`);
      return true;
    } else {
      const errText = await response.text();
      console.warn(`[Firestore Server Sync Warning] Status ${response.status}:`, errText);
      return false;
    }
  } catch (err) {
    console.error('[Firestore Server Sync Error]:', err);
    return false;
  }
}

// Delete item from Firebase Firestore REST API
async function deleteFromFirestoreREST(itemId: string): Promise<boolean> {
  try {
    if (!itemId) return false;
    const url = `https://firestore.googleapis.com/v1/projects/${rawFirebaseConfig.projectId}/databases/(default)/documents/vault_items/${encodeURIComponent(itemId)}?key=${rawFirebaseConfig.apiKey}`;
    const response = await fetch(url, { method: 'DELETE' });
    return response.ok;
  } catch (err) {
    console.error('[Firestore Server Delete Error]:', err);
    return false;
  }
}

// Fetch all items from Firestore REST API
async function fetchAllFromFirestoreREST(): Promise<any[]> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${rawFirebaseConfig.projectId}/databases/(default)/documents/vault_items?key=${rawFirebaseConfig.apiKey}&pageSize=300`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: any = await res.json();
    if (!data || !Array.isArray(data.documents)) return [];

    return data.documents.map((doc: any) => {
      const fields = doc.fields || {};
      const id = doc.name.split('/').pop() || '';
      
      let author = { name: 'Administrador (astroarg02)', badge: 'ADMIN ROOT' };
      if (fields.author?.stringValue) {
        try {
          author = JSON.parse(fields.author.stringValue);
        } catch (e) {
          author = { name: fields.author.stringValue, badge: 'ADMIN ROOT' };
        }
      }

      let comments: any[] = [];
      if (fields.comments?.arrayValue?.values) {
        comments = fields.comments.arrayValue.values.map((v: any) => {
          try {
            return JSON.parse(v.stringValue);
          } catch (e) {
            return v.stringValue;
          }
        });
      }

      let likedBy: string[] = [];
      if (fields.likedBy?.arrayValue?.values) {
        likedBy = fields.likedBy.arrayValue.values.map((v: any) => v.stringValue).filter(Boolean);
      }

      return {
        id,
        title: fields.title?.stringValue || 'Sin título',
        description: fields.description?.stringValue || '',
        category: fields.category?.stringValue || 'code',
        fileType: fields.fileType?.stringValue || '',
        fileSize: fields.fileSize?.stringValue || '',
        fileName: fields.fileName?.stringValue || undefined,
        fileMimeType: fields.fileMimeType?.stringValue || undefined,
        downloadUrl: fields.downloadUrl?.stringValue || '',
        coverImage: fields.coverImage?.stringValue || '',
        createdAt: fields.createdAt?.stringValue || new Date().toISOString().split('T')[0],
        likesCount: Number(fields.likesCount?.integerValue || 0),
        likedBy,
        comments,
        isLockedForTier: Boolean(fields.isLockedForTier?.booleanValue),
        version: fields.version?.stringValue || 'v1.0',
        author,
      };
    });
  } catch (err) {
    console.error('Error fetching Firestore REST items:', err);
    return [];
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GET /api/vault/items - Fetch all items from Firestore + Server Store
app.get('/api/vault/items', async (req, res) => {
  try {
    const localItems = readVaultItems();
    const firestoreItems = await fetchAllFromFirestoreREST();

    // Merge without duplicates
    const itemMap = new Map<string, any>();
    localItems.forEach((i) => {
      if (i && i.id) itemMap.set(i.id, i);
    });
    firestoreItems.forEach((i) => {
      if (i && i.id) {
        const existing = itemMap.get(i.id);
        itemMap.set(i.id, { ...existing, ...i });
      }
    });

    const merged = Array.from(itemMap.values());
    if (merged.length > 0) {
      writeVaultItems(merged);
    }
    return res.json({ success: true, items: merged });
  } catch (err: any) {
    const localItems = readVaultItems();
    return res.json({ success: true, items: localItems });
  }
});

// POST /api/vault/upload - Add or update a vault item (Guaranteed Firebase Firestore + Server storage)
app.post('/api/vault/upload', async (req, res) => {
  try {
    const newItem = req.body;
    if (!newItem || !newItem.title) {
      return res.status(400).json({ success: false, error: 'Título requerido' });
    }

    if (!newItem.id) {
      newItem.id = `vault-res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // If file data is provided as base64, save to uploads directory
    if (newItem.fileData && typeof newItem.fileData === 'string' && newItem.fileData.startsWith('data:')) {
      try {
        const matches = newItem.fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          const safeFilename = `${newItem.id}_${(newItem.fileName || 'file').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const filePath = path.join(UPLOADS_DIR, safeFilename);
          fs.writeFileSync(filePath, buffer);
          // Set server download endpoint
          newItem.downloadUrl = `/api/vault/download/${encodeURIComponent(newItem.id)}`;
        }
      } catch (fileErr) {
        console.warn('Could not save raw file to server uploads disk:', fileErr);
      }
    }

    // Save locally
    const currentItems = readVaultItems();
    const existingIndex = currentItems.findIndex((i) => i.id === newItem.id);
    let updatedItems: any[];

    if (existingIndex >= 0) {
      updatedItems = [...currentItems];
      updatedItems[existingIndex] = { ...updatedItems[existingIndex], ...newItem };
    } else {
      updatedItems = [newItem, ...currentItems];
    }

    writeVaultItems(updatedItems);
    console.log(`[VAULT Server] New item saved: "${newItem.title}" (${newItem.id})`);

    // Persist to Firestore REST
    const firestoreOk = await saveToFirestoreREST(newItem);

    return res.json({
      success: true,
      item: newItem,
      firestoreSynced: firestoreOk,
      total: updatedItems.length,
    });
  } catch (err: any) {
    console.error('Error uploading item:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/vault/download/:id - Direct download of stored file
app.get('/api/vault/download/:id', (req, res) => {
  const { id } = req.params;
  const items = readVaultItems();
  const item = items.find((i) => i.id === id);

  // Check in uploads dir
  if (fs.existsSync(UPLOADS_DIR)) {
    const files = fs.readdirSync(UPLOADS_DIR);
    const matchedFile = files.find((f) => f.startsWith(`${id}_`));
    if (matchedFile) {
      const filePath = path.join(UPLOADS_DIR, matchedFile);
      const downloadName = item?.fileName || matchedFile.replace(`${id}_`, '');
      return res.download(filePath, downloadName);
    }
  }

  // Fallback to item downloadUrl if external
  if (item && item.downloadUrl && item.downloadUrl.startsWith('http')) {
    return res.redirect(item.downloadUrl);
  }

  return res.status(404).send('Archivo no encontrado');
});

// POST /api/vault/sync - Batch sync items from admin client
app.post('/api/vault/sync', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Array de items requerido' });
    }

    const currentItems = readVaultItems();
    const map = new Map<string, any>();

    currentItems.forEach((it) => {
      if (it && it.id) map.set(it.id, it);
    });

    items.forEach((it) => {
      if (it && it.id) {
        map.set(it.id, { ...(map.get(it.id) || {}), ...it });
      }
    });

    const merged = Array.from(map.values());
    writeVaultItems(merged);

    // Background sync to Firestore REST
    (async () => {
      for (const it of items) {
        await saveToFirestoreREST(it);
      }
    })().catch(() => {});

    return res.json({ success: true, items: merged });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/vault/items/:id/like - Toggle like
app.post('/api/vault/items/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { likesCount, likedBy } = req.body;
    const items = readVaultItems();
    const index = items.findIndex((i) => i.id === id);

    if (index >= 0) {
      items[index].likesCount = typeof likesCount === 'number' ? likesCount : items[index].likesCount;
      if (Array.isArray(likedBy)) {
        items[index].likedBy = likedBy;
      }
      writeVaultItems(items);
      saveToFirestoreREST(items[index]).catch(() => {});
      return res.json({ success: true, item: items[index] });
    }
    return res.status(404).json({ success: false, error: 'Item no encontrado' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/vault/items/:id/comment - Add comment
app.post('/api/vault/items/:id/comment', async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const items = readVaultItems();
    const index = items.findIndex((i) => i.id === id);

    if (index >= 0) {
      if (Array.isArray(comments)) {
        items[index].comments = comments;
      }
      writeVaultItems(items);
      saveToFirestoreREST(items[index]).catch(() => {});
      return res.json({ success: true, item: items[index] });
    }
    return res.status(404).json({ success: false, error: 'Item no encontrado' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/vault/items/:id - Delete item (Admin)
app.delete('/api/vault/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const items = readVaultItems();
    const updated = items.filter((i) => i.id !== id);
    writeVaultItems(updated);
    await deleteFromFirestoreREST(id);
    return res.json({ success: true, total: updated.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Setup Vite middleware or Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vault Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
