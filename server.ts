import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Storage directory for persistent server-side vault items
const DATA_DIR = path.join(process.cwd(), 'server_data');
const VAULT_FILE = path.join(DATA_DIR, 'vault_items.json');

// Ensure storage directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GET /api/vault/items - Fetch all items for all users/devices
app.get('/api/vault/items', (req, res) => {
  const items = readVaultItems();
  res.json({ success: true, items });
});

// POST /api/vault/upload - Add or update a vault item (Admin)
app.post('/api/vault/upload', (req, res) => {
  try {
    const newItem = req.body;
    if (!newItem || !newItem.title) {
      return res.status(400).json({ success: false, error: 'Título requerido' });
    }

    const currentItems = readVaultItems();
    // Replace if item already exists by ID, otherwise prepend
    const existingIndex = currentItems.findIndex((i) => i.id === newItem.id);
    let updatedItems: any[];

    if (existingIndex >= 0) {
      updatedItems = [...currentItems];
      updatedItems[existingIndex] = { ...updatedItems[existingIndex], ...newItem };
    } else {
      updatedItems = [newItem, ...currentItems];
    }

    writeVaultItems(updatedItems);
    console.log(`[VAULT] New item saved: "${newItem.title}" (${newItem.id})`);
    return res.json({ success: true, item: newItem, total: updatedItems.length });
  } catch (err: any) {
    console.error('Error uploading item:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/vault/sync - Batch sync items from admin client
app.post('/api/vault/sync', (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Array de items requerido' });
    }

    const currentItems = readVaultItems();
    const map = new Map<string, any>();

    // Put current items first
    currentItems.forEach((it) => {
      if (it && it.id) map.set(it.id, it);
    });

    // Merge incoming items
    items.forEach((it) => {
      if (it && it.id) {
        if (!map.has(it.id)) {
          map.set(it.id, it);
        }
      }
    });

    const merged = Array.from(map.values());
    writeVaultItems(merged);
    return res.json({ success: true, items: merged });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/vault/items/:id/like - Toggle like
app.post('/api/vault/items/:id/like', (req, res) => {
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
      return res.json({ success: true, item: items[index] });
    }
    return res.status(404).json({ success: false, error: 'Item no encontrado' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/vault/items/:id/comment - Add comment
app.post('/api/vault/items/:id/comment', (req, res) => {
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
      return res.json({ success: true, item: items[index] });
    }
    return res.status(404).json({ success: false, error: 'Item no encontrado' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/vault/items/:id - Delete item (Admin)
app.delete('/api/vault/items/:id', (req, res) => {
  try {
    const { id } = req.params;
    const items = readVaultItems();
    const updated = items.filter((i) => i.id !== id);
    writeVaultItems(updated);
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
