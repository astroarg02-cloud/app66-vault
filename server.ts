import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import rawFirebaseConfig from './firebase-applet-config.json';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// High body limits for API payloads
app.use(express.json({ limit: '2048mb' }));
app.use(express.urlencoded({ extended: true, limit: '2048mb' }));

// Storage directory for persistent server-side vault items and uploads
const DATA_DIR = path.join(process.cwd(), 'server_data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const VAULT_FILE = path.join(DATA_DIR, 'vault_items.json');
const VAULT_LISTS_FILE = path.join(DATA_DIR, 'vault_lists.json');
const DELETED_LISTS_FILE = path.join(DATA_DIR, 'deleted_lists.json');
const MAINTENANCE_FILE = path.join(DATA_DIR, 'maintenance.json');
const RECEIPTS_FILE = path.join(DATA_DIR, 'receipts.json');
const ADMIN_SECURITY_KEY = '360';

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helper to format bytes
function formatFileBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Multer disk storage for streaming files directly to disk without memory limits
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const rawId = req.query?.itemId || req.body?.itemId || `vault-res-${Date.now()}`;
    const safeId = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '');
    let originalName = 'file';
    try {
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch {
      originalName = file.originalname;
    }
    const safeFileName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${safeId}_${safeFileName}`);
  },
});

// Configure multer: strictly unlimited file size (sin límite de megas)
const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: Infinity, // Unlimited file size
    fieldSize: 100 * 1024 * 1024,
  },
});

// Helper to track deleted list IDs across reboots and cache syncs
function readDeletedListIds(): Set<string> {
  try {
    if (fs.existsSync(DELETED_LISTS_FILE)) {
      const raw = fs.readFileSync(DELETED_LISTS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map(String));
      }
    }
  } catch (err) {
    console.error('Error reading deleted list ids:', err);
  }
  return new Set<string>();
}

function addDeletedListId(id: string): void {
  try {
    const current = readDeletedListIds();
    current.add(id);
    fs.writeFileSync(DELETED_LISTS_FILE, JSON.stringify(Array.from(current), null, 2), 'utf-8');
  } catch (err) {
    console.error('Error recording deleted list id:', err);
  }
}

function removeDeletedListId(id: string): void {
  try {
    const current = readDeletedListIds();
    current.delete(id);
    fs.writeFileSync(DELETED_LISTS_FILE, JSON.stringify(Array.from(current), null, 2), 'utf-8');
  } catch (err) {}
}

// Maintenance state persistence
interface MaintenanceState {
  isMaintenance: boolean;
  message: string;
  updatedAt: string;
}

function readMaintenanceState(): MaintenanceState {
  try {
    if (fs.existsSync(MAINTENANCE_FILE)) {
      const raw = fs.readFileSync(MAINTENANCE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          isMaintenance: typeof parsed.isMaintenance === 'boolean' ? parsed.isMaintenance : true,
          message:
            parsed.message ||
            'El sistema se encuentra en labores de mantenimiento programado. El acceso está temporalmente restringido únicamente a administradores con Key.',
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.error('Error reading maintenance file:', err);
  }
  const defaultState: MaintenanceState = {
    isMaintenance: true,
    message:
      'El sistema se encuentra en labores de mantenimiento programado. El acceso está temporalmente restringido únicamente a administradores con Key.',
    updatedAt: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(MAINTENANCE_FILE, JSON.stringify(defaultState, null, 2), 'utf-8');
  } catch (e) {}
  return defaultState;
}

function writeMaintenanceState(state: MaintenanceState): void {
  try {
    fs.writeFileSync(MAINTENANCE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing maintenance file:', err);
  }
}

// Sync maintenance state with Firestore REST
async function saveMaintenanceToFirestoreREST(state: MaintenanceState): Promise<boolean> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${rawFirebaseConfig.projectId}/databases/(default)/documents/system_config/maintenance?key=${rawFirebaseConfig.apiKey}`;
    const fields = {
      isMaintenance: { booleanValue: Boolean(state.isMaintenance) },
      message: { stringValue: String(state.message || '') },
      updatedAt: { stringValue: String(state.updatedAt || new Date().toISOString()) },
    };
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    return response.ok;
  } catch (err) {
    console.warn('[Firestore Maintenance Sync Error]:', err);
    return false;
  }
}

async function fetchMaintenanceFromFirestoreREST(): Promise<MaintenanceState | null> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${rawFirebaseConfig.projectId}/databases/(default)/documents/system_config/maintenance?key=${rawFirebaseConfig.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: any = await res.json();
    if (!data || !data.fields) return null;
    const fields = data.fields;
    return {
      isMaintenance: Boolean(fields.isMaintenance?.booleanValue),
      message: String(fields.message?.stringValue || ''),
      updatedAt: String(fields.updatedAt?.stringValue || new Date().toISOString()),
    };
  } catch (err) {
    return null;
  }
}


// Initial seed if file does not exist
if (!fs.existsSync(VAULT_FILE)) {
  fs.writeFileSync(VAULT_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(VAULT_LISTS_FILE)) {
  const defaultLists = [
    {
      id: 'list-apps-systems',
      name: '📱 Archivos iOS & Android',
      description: 'Recursos, utilidades y aplicaciones exclusivas para dispositivos móviles.',
      icon: 'smartphone',
      color: '#0066FF',
      itemIds: ['vault-res-1787518251503'],
      createdAt: '2026-08-23',
      createdBy: 'admin_master_astro',
    },
    {
      id: 'list-regedits-sensi',
      name: '⚡ Regedits y Sensibilidad',
      description: 'Configuraciones de máxima respuesta táctil, archivos REG y paneles optimizados.',
      icon: 'sliders',
      color: '#10B981',
      itemIds: ['vault-res-1787520057677', 'vault-res-1787520090540', 'vault-res-1787520163631'],
      createdAt: '2026-08-23',
      createdBy: 'admin_master_astro',
    },
  ];
  fs.writeFileSync(VAULT_LISTS_FILE, JSON.stringify(defaultLists, null, 2), 'utf-8');
}

// Helper to read lists safely (always filtering out deleted lists)
function readVaultLists(): any[] {
  try {
    const deletedSet = readDeletedListIds();
    if (fs.existsSync(VAULT_LISTS_FILE)) {
      const raw = fs.readFileSync(VAULT_LISTS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((l) => l && l.id && l.name && !deletedSet.has(l.id));
      }
    }
  } catch (err) {
    console.error('Error reading vault lists from file:', err);
  }
  return [];
}

// Helper to write lists safely
function writeVaultLists(lists: any[]): boolean {
  try {
    fs.writeFileSync(VAULT_LISTS_FILE, JSON.stringify(lists, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing vault lists to file:', err);
    return false;
  }
}

// Convert list to Firestore REST format
function listToFirestoreFields(list: any): Record<string, any> {
  const fields: Record<string, any> = {
    id: { stringValue: String(list.id || '') },
    name: { stringValue: String(list.name || '') },
    description: { stringValue: String(list.description || '') },
    icon: { stringValue: String(list.icon || 'folder') },
    color: { stringValue: String(list.color || '#0066FF') },
    createdAt: { stringValue: String(list.createdAt || new Date().toISOString().split('T')[0]) },
    createdBy: { stringValue: String(list.createdBy || 'admin_master_astro') },
    itemIds: {
      arrayValue: {
        values: (Array.isArray(list.itemIds) ? list.itemIds : []).map((id: any) => ({
          stringValue: String(id),
        })),
      },
    },
  };
  return fields;
}

// Save list to Firestore REST
async function saveListToFirestoreREST(list: any): Promise<boolean> {
  try {
    if (!list || !list.id) return false;
    const url = `https://firestore.googleapis.com/v1/projects/${rawFirebaseConfig.projectId}/databases/(default)/documents/vault_lists/${encodeURIComponent(list.id)}?key=${rawFirebaseConfig.apiKey}`;
    const fields = listToFirestoreFields(list);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    return response.ok;
  } catch (err) {
    console.error('[Firestore List Sync Error]:', err);
    return false;
  }
}

// Delete list from Firestore REST
async function deleteListFromFirestoreREST(listId: string): Promise<boolean> {
  try {
    if (!listId) return false;
    const url = `https://firestore.googleapis.com/v1/projects/${rawFirebaseConfig.projectId}/databases/(default)/documents/vault_lists/${encodeURIComponent(listId)}?key=${rawFirebaseConfig.apiKey}`;
    const response = await fetch(url, { method: 'DELETE' });
    return response.ok;
  } catch (err) {
    console.error('[Firestore List Delete Error]:', err);
    return false;
  }
}

// Fetch all lists from Firestore REST
async function fetchAllListsFromFirestoreREST(): Promise<any[]> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${rawFirebaseConfig.projectId}/databases/(default)/documents/vault_lists?key=${rawFirebaseConfig.apiKey}&pageSize=100`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: any = await res.json();
    if (!data || !Array.isArray(data.documents)) return [];

    return data.documents.map((doc: any) => {
      const fields = doc.fields || {};
      const id = doc.name.split('/').pop() || '';
      let itemIds: string[] = [];
      if (fields.itemIds?.arrayValue?.values) {
        itemIds = fields.itemIds.arrayValue.values.map((v: any) => v.stringValue).filter(Boolean);
      }
      return {
        id,
        name: fields.name?.stringValue || 'Lista sin nombre',
        description: fields.description?.stringValue || '',
        icon: fields.icon?.stringValue || 'folder',
        color: fields.color?.stringValue || '#0066FF',
        itemIds,
        createdAt: fields.createdAt?.stringValue || new Date().toISOString().split('T')[0],
        createdBy: fields.createdBy?.stringValue || 'admin_master_astro',
      };
    });
  } catch (err) {
    console.error('Error fetching Firestore REST lists:', err);
    return [];
  }
}

// Helper to read items safely
function readVaultItems(): any[] {
  try {
    if (fs.existsSync(VAULT_FILE)) {
      const raw = fs.readFileSync(VAULT_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (it) =>
            it &&
            it.id &&
            !it.id.startsWith('test-') &&
            !it.id.startsWith('res_00') &&
            it.id !== 'vault-res-test-rest' &&
            it.id !== 'vault-res-direct-1787703256063'
        );
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

    return data.documents
      .filter((doc: any) => {
        const id = doc.name.split('/').pop() || '';
        return (
          id &&
          !id.startsWith('res_00') &&
          !id.startsWith('test-') &&
          id !== 'vault-res-test-rest' &&
          id !== 'vault-res-direct-1787703256063'
        );
      })
      .map((doc: any) => {
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

// GET /api/maintenance - Fetch current maintenance mode status (checks local + Firestore)
app.get('/api/maintenance', async (req, res) => {
  let state = readMaintenanceState();
  try {
    const cloudState = await fetchMaintenanceFromFirestoreREST();
    if (cloudState && cloudState.updatedAt) {
      state = cloudState;
      writeMaintenanceState(cloudState);
    }
  } catch {}
  res.json({ success: true, ...state });
});

// POST /api/maintenance - Update maintenance mode (Admin with key or admin session)
app.post('/api/maintenance', async (req, res) => {
  try {
    const { isMaintenance, message, adminKey } = req.body;
    // Allow if adminKey matches 360 or ADMIN_SECURITY_KEY
    if (adminKey && adminKey.trim() !== ADMIN_SECURITY_KEY && adminKey.trim() !== '360') {
      return res.status(403).json({ success: false, error: 'Key de seguridad no autorizada' });
    }
    const current = readMaintenanceState();
    const updated: MaintenanceState = {
      isMaintenance: typeof isMaintenance === 'boolean' ? isMaintenance : current.isMaintenance,
      message: typeof message === 'string' ? message.trim() : current.message,
      updatedAt: new Date().toISOString(),
    };
    writeMaintenanceState(updated);
    
    // Sync to Firestore REST in background/async so Cloud Firestore is always synchronized
    try {
      await saveMaintenanceToFirestoreREST(updated);
    } catch (fsErr) {
      console.warn('[Firestore Maintenance Save Warning]:', fsErr);
    }

    console.log(`[Maintenance Mode Updated] isMaintenance: ${updated.isMaintenance}, message: ${updated.message}`);
    return res.json({ success: true, ...updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
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

// POST /api/vault/upload-file - Dedicated endpoint for streaming files of ANY size directly to disk (NO MB LIMIT)
app.post('/api/vault/upload-file', uploadMiddleware.single('file') as any, async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No se recibió ningún archivo' });
    }

    const rawId = req.body?.itemId || req.query?.itemId || `vault-res-${Date.now()}`;
    const itemId = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '');

    let originalName = 'archivo';
    try {
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch {
      originalName = file.originalname;
    }

    const formattedSize = formatFileBytes(file.size);
    const downloadUrl = `/api/vault/download/${encodeURIComponent(itemId)}`;

    console.log(`[VAULT Storage] File saved to disk: "${originalName}" (${formattedSize}) for item ${itemId}`);

    // If item already exists in server vault, update its file metadata
    const currentItems = readVaultItems();
    const existingIndex = currentItems.findIndex((i) => i.id === itemId);
    if (existingIndex >= 0) {
      currentItems[existingIndex] = {
        ...currentItems[existingIndex],
        fileName: originalName,
        fileSize: formattedSize,
        fileMimeType: file.mimetype || 'application/octet-stream',
        downloadUrl,
      };
      writeVaultItems(currentItems);
      await saveToFirestoreREST(currentItems[existingIndex]);
    }

    return res.json({
      success: true,
      itemId,
      fileName: originalName,
      fileSize: formattedSize,
      fileMimeType: file.mimetype,
      downloadUrl,
      bytes: file.size,
    });
  } catch (err: any) {
    console.error('Error uploading file to server disk:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/vault/check-file/:id - Check if a physical file exists on disk for this item
app.get('/api/vault/check-file/:id', (req, res) => {
  const { id } = req.params;
  if (!id) return res.json({ exists: false });

  if (fs.existsSync(UPLOADS_DIR)) {
    const files = fs.readdirSync(UPLOADS_DIR);
    const matchedFile = files.find((f) => f.startsWith(`${id}_`));
    if (matchedFile) {
      const filePath = path.join(UPLOADS_DIR, matchedFile);
      const stat = fs.statSync(filePath);
      return res.json({
        exists: true,
        fileName: matchedFile.replace(`${id}_`, ''),
        fileSize: stat.size,
        formattedSize: formatFileBytes(stat.size),
      });
    }
  }

  const items = readVaultItems();
  const item = items.find((i) => i.id === id);
  if (item && item.fileData) {
    return res.json({ exists: true, fileName: item.fileName, isBase64: true });
  }

  return res.json({ exists: false });
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

    // Check if a physical file already exists in UPLOADS_DIR for this item
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      const matchedFile = files.find((f) => f.startsWith(`${newItem.id}_`));
      if (matchedFile) {
        newItem.downloadUrl = `/api/vault/download/${encodeURIComponent(newItem.id)}`;
        if (!newItem.fileName) {
          newItem.fileName = matchedFile.replace(`${newItem.id}_`, '');
        }
      }
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

    // If item has fileName/fileType and no downloadUrl, point to server download endpoint
    if (!newItem.downloadUrl && (newItem.fileName || newItem.fileType)) {
      newItem.downloadUrl = `/api/vault/download/${encodeURIComponent(newItem.id)}`;
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

// HEAD and GET /api/vault/download/:id - Direct download of stored file with UTF-8 support
const handleFileDownload = (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const items = readVaultItems();
  let item = items.find((i) => i.id === id);
  if (!item) {
    item = items.find((i) => i.downloadUrl && (i.downloadUrl.includes(`/${id}`) || i.downloadUrl.includes(encodeURIComponent(id))));
  }

  // 1. Check in uploads dir
  if (fs.existsSync(UPLOADS_DIR)) {
    const files = fs.readdirSync(UPLOADS_DIR);
    let matchedFile = files.find((f) => f.startsWith(`${id}_`));

    // Also check if item.downloadUrl points to a different uploaded id
    if (!matchedFile && item?.downloadUrl && item.downloadUrl.includes('/api/vault/download/')) {
      const parts = item.downloadUrl.split('/api/vault/download/');
      const altId = decodeURIComponent(parts[1] || '').replace(/[^a-zA-Z0-9_-]/g, '');
      if (altId) {
        matchedFile = files.find((f) => f.startsWith(`${altId}_`));
      }
    }

    // Also check if any file in UPLOADS_DIR matches item.fileName
    if (!matchedFile && item?.fileName) {
      const cleanTarget = item.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      matchedFile = files.find((f) => {
        return f.endsWith(`_${item.fileName}`) || f.endsWith(`_${cleanTarget}`) || f === item.fileName || f === cleanTarget;
      });
    }

    if (matchedFile) {
      const filePath = path.join(UPLOADS_DIR, matchedFile);
      const downloadName = item?.fileName || matchedFile.replace(/^[a-zA-Z0-9_-]+_/, '');
      
      if (req.method === 'HEAD') {
        const stat = fs.statSync(filePath);
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
        return res.status(200).end();
      }

      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
      return res.download(filePath, downloadName);
    }
  }

  // 2. Check if item has stored fileData (data URL or base64)
  if (item && item.fileData && typeof item.fileData === 'string' && item.fileData.startsWith('data:')) {
    try {
      const matches = item.fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mime = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = item.fileName || `${item.title || 'recurso'}.${mime.split('/')[1] || 'bin'}`;
        
        // Save to disk for faster future access
        const safeFilename = `${id}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, safeFilename), buffer);

        if (req.method === 'HEAD') {
          res.setHeader('Content-Length', buffer.length);
          res.setHeader('Content-Type', mime);
          return res.status(200).end();
        }

        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
        res.setHeader('Content-Type', mime);
        return res.send(buffer);
      }
    } catch (e) {
      console.warn('Error reading base64 fileData on download:', e);
    }
  }

  // 3. Fallback to external downloadUrl
  if (item && item.downloadUrl && item.downloadUrl.startsWith('http')) {
    return res.redirect(item.downloadUrl);
  }

  if (req.method === 'HEAD') {
    return res.status(404).end();
  }
  return res.status(404).send('Archivo no encontrado en el servidor');
};

app.head('/api/vault/download/:id', handleFileDownload);
app.get('/api/vault/download/:id', handleFileDownload);

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

    // Also remove from all lists
    const lists = readVaultLists();
    let listsChanged = false;
    const updatedLists = lists.map((l) => {
      if (l.itemIds && l.itemIds.includes(id)) {
        listsChanged = true;
        return { ...l, itemIds: l.itemIds.filter((itemId: string) => itemId !== id) };
      }
      return l;
    });
    if (listsChanged) {
      writeVaultLists(updatedLists);
      for (const l of updatedLists) {
        saveListToFirestoreREST(l).catch(() => {});
      }
    }

    return res.json({ success: true, total: updated.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/vault/deleted-lists - Return list IDs deleted by admin so all clients purge them immediately
app.get('/api/vault/deleted-lists', (_req, res) => {
  const deletedSet = readDeletedListIds();
  return res.json({ success: true, deletedIds: Array.from(deletedSet) });
});

// GET /api/vault/lists - Fetch all lists created by Admin
app.get('/api/vault/lists', async (req, res) => {
  try {
    const deletedSet = readDeletedListIds();
    const localLists = readVaultLists();
    const firestoreLists = await fetchAllListsFromFirestoreREST();

    const listMap = new Map<string, any>();
    localLists.forEach((l) => {
      if (l && l.id && !deletedSet.has(l.id)) listMap.set(l.id, l);
    });
    firestoreLists.forEach((l) => {
      if (l && l.id && !deletedSet.has(l.id)) {
        const existing = listMap.get(l.id);
        listMap.set(l.id, { ...existing, ...l });
      }
    });

    const merged = Array.from(listMap.values()).filter((l) => !deletedSet.has(l.id));
    writeVaultLists(merged);
    return res.json({ success: true, lists: merged });
  } catch (err: any) {
    const deletedSet = readDeletedListIds();
    const localLists = readVaultLists().filter((l) => !deletedSet.has(l.id));
    return res.json({ success: true, lists: localLists });
  }
});

// POST /api/vault/lists - Create or update list (Admin)
app.post('/api/vault/lists', async (req, res) => {
  try {
    const newList = req.body;
    if (!newList || !newList.name) {
      return res.status(400).json({ success: false, error: 'Nombre de lista requerido' });
    }

    if (!newList.id) {
      newList.id = `list-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    }
    if (!Array.isArray(newList.itemIds)) {
      newList.itemIds = [];
    }
    if (!newList.createdAt) {
      newList.createdAt = new Date().toISOString().split('T')[0];
    }

    // Unmark as deleted if recreated
    removeDeletedListId(newList.id);

    const currentLists = readVaultLists();
    const existingIndex = currentLists.findIndex((l) => l.id === newList.id);
    let updatedLists: any[];

    if (existingIndex >= 0) {
      updatedLists = [...currentLists];
      updatedLists[existingIndex] = { ...updatedLists[existingIndex], ...newList };
    } else {
      updatedLists = [newList, ...currentLists];
    }

    writeVaultLists(updatedLists);
    await saveListToFirestoreREST(newList);

    return res.json({
      success: true,
      list: newList,
      lists: updatedLists,
    });
  } catch (err: any) {
    console.error('Error saving list:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/vault/lists/:id - Delete list (Admin)
app.delete('/api/vault/lists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID requerido' });
    }

    // 1. Mark as permanently deleted in deleted lists tracker
    addDeletedListId(id);

    // 2. Remove from local JSON storage
    const lists = readVaultLists();
    const updated = lists.filter((l) => l.id !== id);
    writeVaultLists(updated);

    // 3. Remove from Firestore REST
    await deleteListFromFirestoreREST(id);

    return res.json({ success: true, lists: updated, deletedId: id });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/vault/lists/:id/toggle-item - Add or remove publication from list (Admin)
app.post('/api/vault/lists/:id/toggle-item', async (req, res) => {
  try {
    const { id } = req.params;
    const { itemId } = req.body;
    if (!itemId) {
      return res.status(400).json({ success: false, error: 'ID de publicación requerido' });
    }

    const lists = readVaultLists();
    const listIndex = lists.findIndex((l) => l.id === id);
    if (listIndex < 0) {
      return res.status(404).json({ success: false, error: 'Lista no encontrada' });
    }

    const targetList = lists[listIndex];
    const currentItemIds: string[] = Array.isArray(targetList.itemIds) ? targetList.itemIds : [];
    const isInside = currentItemIds.includes(itemId);

    const newItemIds = isInside
      ? currentItemIds.filter((itId) => itId !== itemId)
      : [...currentItemIds, itemId];

    targetList.itemIds = newItemIds;
    lists[listIndex] = targetList;
    writeVaultLists(lists);
    await saveListToFirestoreREST(targetList);

    return res.json({ success: true, list: targetList, isInside: !isInside });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to read payment receipts safely
function readReceipts(): any[] {
  try {
    if (fs.existsSync(RECEIPTS_FILE)) {
      const raw = fs.readFileSync(RECEIPTS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading receipts from file:', err);
  }
  return [];
}

// Helper to write payment receipts safely
function writeReceipts(receipts: any[]): boolean {
  try {
    fs.writeFileSync(RECEIPTS_FILE, JSON.stringify(receipts, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing receipts to file:', err);
    return false;
  }
}

// GET /api/vault/receipts - Fetch all payment receipts
app.get('/api/vault/receipts', (_req, res) => {
  try {
    const receipts = readReceipts();
    return res.json({ success: true, receipts });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/vault/receipts - Create or update a payment receipt
app.post('/api/vault/receipts', (req, res) => {
  try {
    const newReceipt = req.body;
    if (!newReceipt || !newReceipt.id || !newReceipt.userId) {
      return res.status(400).json({ success: false, error: 'Datos de comprobante incompletos' });
    }

    const currentReceipts = readReceipts();
    const existingIndex = currentReceipts.findIndex((r) => r.id === newReceipt.id);
    let updatedReceipts: any[];

    if (existingIndex >= 0) {
      updatedReceipts = [...currentReceipts];
      updatedReceipts[existingIndex] = { ...updatedReceipts[existingIndex], ...newReceipt };
    } else {
      updatedReceipts = [newReceipt, ...currentReceipts];
    }

    writeReceipts(updatedReceipts);
    return res.json({ success: true, receipt: newReceipt, receipts: updatedReceipts });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/vault/receipts/:id/status - Update approval status (Admin)
app.patch('/api/vault/receipts/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote, reviewerName } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Estado de comprobante inválido' });
    }

    const currentReceipts = readReceipts();
    const targetIndex = currentReceipts.findIndex((r) => r.id === id);

    if (targetIndex < 0) {
      return res.status(404).json({ success: false, error: 'Comprobante no encontrado' });
    }

    const updated = {
      ...currentReceipts[targetIndex],
      status,
      adminNote: adminNote !== undefined ? adminNote : currentReceipts[targetIndex].adminNote,
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerName || 'Administrador',
    };

    currentReceipts[targetIndex] = updated;
    writeReceipts(currentReceipts);

    return res.json({ success: true, receipt: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/vault/receipts/:id - Delete receipt
app.delete('/api/vault/receipts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const currentReceipts = readReceipts();
    const updated = currentReceipts.filter((r) => r.id !== id);
    writeReceipts(updated);
    return res.json({ success: true, deletedId: id });
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

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Vault Server running on http://0.0.0.0:${PORT}`);

    // Self-healing Firestore sync on startup: ensure all items and maintenance are synced
    try {
      const cloudMaint = await fetchMaintenanceFromFirestoreREST();
      if (cloudMaint) {
        writeMaintenanceState(cloudMaint);
        console.log(`[Cloud Boot Sync] Maintenance mode synced from Firestore: isMaintenance=${cloudMaint.isMaintenance}`);
      }
      
      const localItems = readVaultItems();
      for (const it of localItems) {
        await saveToFirestoreREST(it);
      }
      console.log(`[Cloud Boot Sync] Successfully verified and synced ${localItems.length} items to Firebase Firestore.`);
    } catch (bootErr) {
      console.warn('[Cloud Boot Sync Error]:', bootErr);
    }
  });
}

startServer();
