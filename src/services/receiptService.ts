import {
  doc,
  getDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { PaymentReceipt, ReceiptStatus, MembershipPlanType } from '../types';
import {
  db,
  firebaseConfig,
  FIRESTORE_REST_BASE,
  isFirestoreQuotaExhausted,
  isFirestoreReadQuotaExhausted,
  isFirestoreWriteQuotaExhausted,
  handleFirestoreError,
  withFirestoreTimeout,
  firestoreRestFetch,
  resolveApiUrl,
} from './firebaseService';

const STORAGE_KEY = 'vault_payment_receipts_v1';
const DELETED_RECEIPTS_KEY = 'vault_deleted_receipts_v1';
const RECEIPTS_COLLECTION = 'payment_receipts';

// In-memory cache so receipts are always available even if localStorage hits quota limits
let memoryReceipts: PaymentReceipt[] = [];

function getDeletedReceiptIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_RECEIPTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map(String));
      }
    }
  } catch {}
  return new Set<string>();
}

function markDeletedReceiptId(id: string): void {
  try {
    const set = getDeletedReceiptIds();
    set.add(id);
    localStorage.setItem(DELETED_RECEIPTS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

function unmarkDeletedReceiptId(id: string): void {
  try {
    const set = getDeletedReceiptIds();
    if (set.has(id)) {
      set.delete(id);
      localStorage.setItem(DELETED_RECEIPTS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {}
}

function isValidRealReceipt(r: any, deletedSet: Set<string>): r is PaymentReceipt {
  return Boolean(
    r &&
      typeof r.id === 'string' &&
      r.id.trim().length > 0 &&
      !r.id.startsWith('rec-demo') &&
      !r.id.includes('demo') &&
      !deletedSet.has(r.id)
  );
}

function mergeTwoReceipts(existing: PaymentReceipt | undefined, incoming: PaymentReceipt): PaymentReceipt {
  if (!existing) return incoming;

  const existingTime = existing.reviewedAt ? new Date(existing.reviewedAt).getTime() : 0;
  const incomingTime = incoming.reviewedAt ? new Date(incoming.reviewedAt).getTime() : 0;

  const merged: PaymentReceipt =
    incomingTime >= existingTime ? { ...existing, ...incoming } : { ...incoming, ...existing };

  // Preserve full base64 receipt image if one record has it and the other has a path or empty string
  const existingImg = String(existing.receiptImageUrl || '');
  const incomingImg = String(incoming.receiptImageUrl || '');
  if (existingImg.startsWith('data:image/') && !incomingImg.startsWith('data:image/')) {
    merged.receiptImageUrl = existingImg;
  } else if (incomingImg.startsWith('data:image/')) {
    merged.receiptImageUrl = incomingImg;
  }

  return merged;
}

function saveReceiptsToLocalStore(receipts: PaymentReceipt[]): void {
  const deletedSet = getDeletedReceiptIds();
  const clean = receipts
    .filter((r) => isValidRealReceipt(r, deletedSet))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  memoryReceipts = clean;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch (quotaErr) {
    // If localStorage is full due to large base64 images, store a lightweight version in localStorage
    // while keeping full images in memoryReceipts, server, and Firestore
    try {
      const compact = clean.map((r, idx) => {
        if (idx > 8 && r.receiptImageUrl && r.receiptImageUrl.length > 250000) {
          return {
            ...r,
            receiptImageUrl: `/api/vault/receipts/${encodeURIComponent(r.id)}/image`,
          };
        }
        return r;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
    } catch {
      console.warn('localStorage quota reached for receipts; using memory + server + Firestore store');
    }
  }
}

function buildFirestoreRegistryPayload(receipts: PaymentReceipt[]) {
  const deletedSet = getDeletedReceiptIds();
  const clean = receipts
    .filter((r) => isValidRealReceipt(r, deletedSet))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  let serialized = JSON.stringify(clean);
  if (serialized.length > 650000) {
    const compact = clean.map((r, idx) => {
      if (idx > 2 && r.receiptImageUrl && r.receiptImageUrl.length > 180000) {
        return {
          ...r,
          receiptImageUrl: `/api/vault/receipts/${encodeURIComponent(r.id)}/image`,
        };
      }
      return r;
    });
    serialized = JSON.stringify(compact);
    if (serialized.length > 750000) {
      const ultraCompact = clean.map((r) => ({
        ...r,
        receiptImageUrl: `/api/vault/receipts/${encodeURIComponent(r.id)}/image`,
      }));
      serialized = JSON.stringify(ultraCompact);
    }
  }

  return {
    receiptsJson: serialized,
    receiptIds: clean.map((r) => String(r.id)),
    deletedIds: Array.from(deletedSet),
    updatedAt: new Date().toISOString(),
  };
}

async function saveReceiptsRegistryToFirestore(allReceipts: PaymentReceipt[]): Promise<boolean> {
  if (isFirestoreQuotaExhausted()) return false;
  const regPayload = buildFirestoreRegistryPayload(allReceipts);

  try {
    const fields = {
      receiptsJson: { stringValue: regPayload.receiptsJson },
      receiptIds: {
        arrayValue: {
          values: regPayload.receiptIds.map((id) => ({ stringValue: id })),
        },
      },
      deletedIds: {
        arrayValue: {
          values: regPayload.deletedIds.map((id) => ({ stringValue: id })),
        },
      },
      updatedAt: { stringValue: regPayload.updatedAt },
    };
    const res = await firestoreRestFetch('/system_config/receipts_registry', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    return Boolean(res && res.ok);
  } catch {
    return false;
  }
}

async function saveReceiptToFirestoreSDK(receipt: PaymentReceipt, allReceipts?: PaymentReceipt[]): Promise<boolean> {
  if (!receipt?.id || isFirestoreQuotaExhausted()) return false;
  const payload: Record<string, any> = {
    id: receipt.id,
    userId: receipt.userId,
    userDisplayName: receipt.userDisplayName || 'Usuario',
    userEmail: receipt.userEmail || '',
    plan: receipt.plan || 'monthly',
    amount: Number(receipt.amount) || 1,
    currency: receipt.currency || 'USD',
    paymentMethod: receipt.paymentMethod || 'Transferencia',
    referenceCode: receipt.referenceCode || '',
    receiptFileName: receipt.receiptFileName || 'comprobante.jpg',
    notes: receipt.notes || '',
    whatsappContact: receipt.whatsappContact || '+54 9 11 6554-6038',
    status: receipt.status || 'pending',
    createdAt: receipt.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (receipt.userAvatar && receipt.userAvatar.length < 250000) {
    payload.userAvatar = receipt.userAvatar;
  }

  // Keep image under Firestore 1MB document limit
  if (receipt.receiptImageUrl && receipt.receiptImageUrl.length < 750000) {
    payload.receiptImageUrl = receipt.receiptImageUrl;
  } else if (receipt.receiptImageUrl) {
    payload.receiptImageUrl = `/api/vault/receipts/${encodeURIComponent(receipt.id)}/image`;
  }

  if (receipt.reviewedAt) payload.reviewedAt = receipt.reviewedAt;
  if (receipt.reviewedBy) payload.reviewedBy = receipt.reviewedBy;
  if (receipt.adminNote !== undefined) payload.adminNote = receipt.adminNote;
  if (receipt.membershipStartsAt) payload.membershipStartsAt = receipt.membershipStartsAt;
  if (receipt.membershipExpiresAt) payload.membershipExpiresAt = receipt.membershipExpiresAt;

  let savedDoc = false;
  try {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'number') {
        fields[k] = { doubleValue: v };
      } else {
        fields[k] = { stringValue: String(v) };
      }
    }
    const res = await firestoreRestFetch(`/${RECEIPTS_COLLECTION}/${encodeURIComponent(receipt.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    savedDoc = Boolean(res && res.ok);
  } catch {}

  if (!isFirestoreQuotaExhausted()) {
    const listForReg = allReceipts || memoryReceipts;
    await saveReceiptsRegistryToFirestore(listForReg);
  }
  return savedDoc;
}

async function fetchSingleReceiptFromFirestore(receiptId: string, deletedSet: Set<string>): Promise<PaymentReceipt | null> {
  if (!receiptId || deletedSet.has(receiptId) || isFirestoreReadQuotaExhausted()) return null;
  if (db) {
    try {
      const snap = await withFirestoreTimeout(getDoc(doc(db, RECEIPTS_COLLECTION, receiptId)), 1200, true);
      if (snap.exists()) {
        const data = snap.data() as any;
        const id = data?.id || snap.id;
        return {
          id,
          userId: data.userId || 'user',
          userDisplayName: data.userDisplayName || 'Usuario',
          userEmail: data.userEmail || '',
          userAvatar: data.userAvatar,
          plan: data.plan === 'annual' ? 'annual' : 'monthly',
          amount: Number(data.amount) || 1,
          currency: data.currency || 'USD',
          paymentMethod: data.paymentMethod || 'Transferencia',
          referenceCode: data.referenceCode || '',
          receiptImageUrl: data.receiptImageUrl || `/api/vault/receipts/${encodeURIComponent(id)}/image`,
          receiptFileName: data.receiptFileName || 'comprobante.jpg',
          notes: data.notes || '',
          whatsappContact: data.whatsappContact || '+54 9 11 6554-6038',
          status: ['pending', 'approved', 'rejected'].includes(data.status) ? data.status : 'pending',
          createdAt: data.createdAt || new Date().toISOString(),
          reviewedAt: data.reviewedAt,
          reviewedBy: data.reviewedBy,
          adminNote: data.adminNote,
          membershipStartsAt: data.membershipStartsAt,
          membershipExpiresAt: data.membershipExpiresAt,
        };
      }
    } catch {}
  }

  try {
    const url = `${FIRESTORE_REST_BASE}/${RECEIPTS_COLLECTION}/${encodeURIComponent(receiptId)}?key=${firebaseConfig.apiKey}`;
    const res = await fetch(url);
    if (res.ok) {
      const docSnap: any = await res.json();
      const fields = docSnap?.fields;
      if (fields) {
        const id = fields.id?.stringValue || receiptId;
        const amountVal =
          fields.amount?.doubleValue !== undefined
            ? Number(fields.amount.doubleValue)
            : fields.amount?.integerValue !== undefined
            ? Number(fields.amount.integerValue)
            : 1;
        return {
          id,
          userId: fields.userId?.stringValue || 'user',
          userDisplayName: fields.userDisplayName?.stringValue || 'Usuario',
          userEmail: fields.userEmail?.stringValue || '',
          userAvatar: fields.userAvatar?.stringValue,
          plan: fields.plan?.stringValue === 'annual' ? 'annual' : 'monthly',
          amount: amountVal,
          currency: fields.currency?.stringValue || 'USD',
          paymentMethod: fields.paymentMethod?.stringValue || 'Transferencia',
          referenceCode: fields.referenceCode?.stringValue || '',
          receiptImageUrl: fields.receiptImageUrl?.stringValue || `/api/vault/receipts/${encodeURIComponent(id)}/image`,
          receiptFileName: fields.receiptFileName?.stringValue || 'comprobante.jpg',
          notes: fields.notes?.stringValue || '',
          whatsappContact: fields.whatsappContact?.stringValue || '+54 9 11 6554-6038',
          status: ['pending', 'approved', 'rejected'].includes(fields.status?.stringValue)
            ? (fields.status.stringValue as ReceiptStatus)
            : 'pending',
          createdAt: fields.createdAt?.stringValue || new Date().toISOString(),
          reviewedAt: fields.reviewedAt?.stringValue,
          reviewedBy: fields.reviewedBy?.stringValue,
          adminNote: fields.adminNote?.stringValue,
          membershipStartsAt: fields.membershipStartsAt?.stringValue,
          membershipExpiresAt: fields.membershipExpiresAt?.stringValue,
        };
      }
    }
  } catch {}
  return null;
}

async function fetchReceiptsFromFirestoreSDK(): Promise<PaymentReceipt[]> {
  if (isFirestoreReadQuotaExhausted()) return [];
  const deletedSet = getDeletedReceiptIds();
  const map = new Map<string, PaymentReceipt>();
  let receiptIdsFromReg: string[] = [];

  // 1. Read single-document master registry via SDK or REST
  let parsedRegistry = false;
  if (db) {
    try {
      const regSnap = await withFirestoreTimeout(getDoc(doc(db, 'system_config', 'receipts_registry')), 1500, true);
      if (regSnap.exists()) {
        const data = regSnap.data() as any;
        if (Array.isArray(data?.deletedIds)) {
          for (const delId of data.deletedIds) {
            deletedSet.add(String(delId));
            markDeletedReceiptId(String(delId));
          }
        }
        if (data?.receiptsJson) {
          try {
            const arr = JSON.parse(data.receiptsJson);
            if (Array.isArray(arr)) {
              for (const r of arr) {
                if (isValidRealReceipt(r, deletedSet)) {
                  map.set(r.id, r);
                }
              }
            }
          } catch {}
        }
        if (Array.isArray(data?.receiptIds)) {
          receiptIdsFromReg = data.receiptIds.map(String);
        }
        parsedRegistry = true;
      }
    } catch (err) {
      handleFirestoreError(err, true);
    }
  }

  if (!parsedRegistry) {
    try {
      const url = `${FIRESTORE_REST_BASE}/system_config/receipts_registry?key=${firebaseConfig.apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const regData: any = await res.json();
        const fields = regData?.fields || {};
        if (fields.deletedIds?.arrayValue?.values) {
          for (const v of fields.deletedIds.arrayValue.values) {
            if (v?.stringValue) {
              deletedSet.add(v.stringValue);
              markDeletedReceiptId(v.stringValue);
            }
          }
        }
        if (fields.receiptsJson?.stringValue) {
          try {
            const arr = JSON.parse(fields.receiptsJson.stringValue);
            if (Array.isArray(arr)) {
              for (const r of arr) {
                if (isValidRealReceipt(r, deletedSet)) {
                  map.set(r.id, r);
                }
              }
            }
          } catch {}
        }
        if (fields.receiptIds?.arrayValue?.values) {
          receiptIdsFromReg = fields.receiptIds.arrayValue.values
            .map((v: any) => v?.stringValue)
            .filter(Boolean);
        }
      }
    } catch {}
  }

  // Hydrate any receipt from payment_receipts/{id} whose base64 image was compacted in the registry
  const idsToHydrate = receiptIdsFromReg.filter((rid) => {
    if (!rid || deletedSet.has(rid) || rid.startsWith('rec-demo')) return false;
    const existing = map.get(rid);
    return !existing || !existing.receiptImageUrl || !String(existing.receiptImageUrl).startsWith('data:image/');
  });

  if (idsToHydrate.length > 0) {
    const hydrated = await Promise.all(
      idsToHydrate.slice(0, 12).map((rid) => fetchSingleReceiptFromFirestore(rid, deletedSet))
    );
    for (const h of hydrated) {
      if (h && isValidRealReceipt(h, deletedSet)) {
        map.set(h.id, mergeTwoReceipts(map.get(h.id), h));
      }
    }
  }

  return Array.from(map.values());
}

export const receiptService = {
  // Compress image before saving so it loads fast and never exceeds localStorage (5MB) or Firestore (1MB) limits
  async compressReceiptImage(dataUrl: string, maxDimension = 1280, quality = 0.78): Promise<string> {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) return dataUrl;
    return new Promise((resolve) => {
      let settled = false;
      const done = (result: string) => {
        if (!settled) {
          settled = true;
          resolve(result);
        }
      };
      const safetyTimer = setTimeout(() => done(dataUrl), 1500);

      try {
        const img = new Image();
        img.onload = () => {
          try {
            let { width, height } = img;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              clearTimeout(safetyTimer);
              done(dataUrl);
              return;
            }
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            let compressed = canvas.toDataURL('image/jpeg', quality);
            // If still > 550KB, compress slightly more so Firestore document is guaranteed < 1MB
            if (compressed.length > 550000) {
              compressed = canvas.toDataURL('image/jpeg', 0.6);
            }
            clearTimeout(safetyTimer);
            done(compressed);
          } catch {
            clearTimeout(safetyTimer);
            done(dataUrl);
          }
        };
        img.onerror = () => {
          clearTimeout(safetyTimer);
          done(dataUrl);
        };
        img.src = dataUrl;
      } catch {
        clearTimeout(safetyTimer);
        done(dataUrl);
      }
    });
  },

  getAllReceipts(): PaymentReceipt[] {
    const deletedSet = getDeletedReceiptIds();
    const map = new Map<string, PaymentReceipt>();

    for (const r of memoryReceipts) {
      if (isValidRealReceipt(r, deletedSet)) {
        map.set(r.id, r);
      }
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const r of parsed) {
            if (isValidRealReceipt(r, deletedSet)) {
              map.set(r.id, mergeTwoReceipts(map.get(r.id), r));
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error reading receipts from localStorage:', e);
    }

    const merged = Array.from(map.values())
      .map((r) => ({
        ...r,
        receiptImageUrl:
          r.receiptImageUrl && r.receiptImageUrl.startsWith('/api/')
            ? resolveApiUrl(r.receiptImageUrl)
            : r.receiptImageUrl,
      }))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    memoryReceipts = merged;
    return merged;
  },

  getReceiptsByUser(userId: string, userEmail?: string): PaymentReceipt[] {
    const all = this.getAllReceipts();
    const cleanEmail = userEmail?.toLowerCase().trim();
    return all.filter(
      (r) =>
        r.userId === userId ||
        (cleanEmail && r.userEmail?.toLowerCase().trim() === cleanEmail)
    );
  },

  getPendingCount(): number {
    const all = this.getAllReceipts();
    return all.filter((r) => r.status === 'pending').length;
  },

  // Real-time Firestore single-document listener on system_config/receipts_registry so AdminApprovalsScreen receives new receipts immediately
  onReceiptsSnapshot(callback: (receipts: PaymentReceipt[]) => void): Unsubscribe {
    if (!db || isFirestoreReadQuotaExhausted()) return () => {};
    try {
      const regDocRef = doc(db, 'system_config', 'receipts_registry');
      let unsub: Unsubscribe | null = null;
      unsub = onSnapshot(
        regDocRef,
        (snapshot) => {
          if (!snapshot.exists()) return;
          const data = snapshot.data() as any;
          const deletedSet = getDeletedReceiptIds();
          if (Array.isArray(data?.deletedIds)) {
            for (const delId of data.deletedIds) {
              deletedSet.add(String(delId));
              markDeletedReceiptId(String(delId));
            }
          }

          const currentLocal = this.getAllReceipts();
          const map = new Map<string, PaymentReceipt>();
          for (const r of currentLocal) {
            if (isValidRealReceipt(r, deletedSet)) {
              map.set(r.id, r);
            }
          }

          if (data?.receiptsJson) {
            try {
              const parsed = JSON.parse(data.receiptsJson);
              if (Array.isArray(parsed)) {
                for (const r of parsed) {
                  if (isValidRealReceipt(r, deletedSet)) {
                    map.set(r.id, mergeTwoReceipts(map.get(r.id), r));
                  }
                }
              }
            } catch {}
          }

          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          saveReceiptsToLocalStore(merged);
          window.dispatchEvent(
            new CustomEvent('vault_receipts_changed', { detail: { receipts: merged } })
          );
          callback(merged);
        },
        (err) => {
          handleFirestoreError(err, true);
          if (unsub) {
            try { unsub(); } catch {}
          }
        }
      );
      return () => {
        if (unsub) {
          try { unsub(); } catch {}
        }
      };
    } catch (err) {
      handleFirestoreError(err, true);
      return () => {};
    }
  },

  // Full two-way synchronization between LocalStorage, Central Server, and Firebase Firestore
  async syncFromServer(): Promise<PaymentReceipt[]> {
    const deletedSet = getDeletedReceiptIds();
    const localReceipts = this.getAllReceipts();
    const map = new Map<string, PaymentReceipt>();

    for (const r of localReceipts) {
      if (isValidRealReceipt(r, deletedSet)) {
        map.set(r.id, r);
      }
    }

    // 1. Primary Two-Way Sync with Central Server (/api/vault/receipts/sync & /api/vault/receipts) FIRST so Admin never waits on Firestore
    try {
      const currentCandidates = Array.from(map.values());
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const syncRes = await fetch(resolveApiUrl(`/api/vault/receipts/sync?t=${Date.now()}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({ receipts: currentCandidates }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (syncRes.ok) {
        const data = await syncRes.json();
        if (data && Array.isArray(data.deletedIds)) {
          for (const delId of data.deletedIds) {
            deletedSet.add(String(delId));
            markDeletedReceiptId(String(delId));
            map.delete(String(delId));
          }
        }
        if (data && Array.isArray(data.receipts)) {
          for (const r of data.receipts) {
            if (isValidRealReceipt(r, deletedSet)) {
              map.set(r.id, mergeTwoReceipts(map.get(r.id), r));
            }
          }
        }
      } else {
        const getRes = await fetch(resolveApiUrl(`/api/vault/receipts?t=${Date.now()}`), {
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (getRes.ok) {
          const getData = await getRes.json();
          if (getData && Array.isArray(getData.receipts)) {
            for (const r of getData.receipts) {
              if (isValidRealReceipt(r, deletedSet)) {
                map.set(r.id, mergeTwoReceipts(map.get(r.id), r));
              }
            }
          }
        }
      }
    } catch (e) {
      // Fallback to fast GET if POST failed or timed out
      try {
        const getRes = await fetch(resolveApiUrl(`/api/vault/receipts?t=${Date.now()}`), {
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (getRes.ok) {
          const getData = await getRes.json();
          if (getData && Array.isArray(getData.receipts)) {
            for (const r of getData.receipts) {
              if (isValidRealReceipt(r, deletedSet)) {
                map.set(r.id, mergeTwoReceipts(map.get(r.id), r));
              }
            }
          }
        }
      } catch {}
    }

    // 2. Firestore single-document registry fetch (works even on static/Vercel/APK without Express server)
    let fsReceiptIds = new Set<string>();
    if (!isFirestoreReadQuotaExhausted()) {
      try {
        const fsReceipts = await fetchReceiptsFromFirestoreSDK();
        for (const r of fsReceipts) {
          fsReceiptIds.add(r.id);
          if (isValidRealReceipt(r, deletedSet)) {
            map.set(r.id, mergeTwoReceipts(map.get(r.id), r));
          }
        }
      } catch {}
    }

    const merged = Array.from(map.values())
      .filter((r) => isValidRealReceipt(r, deletedSet))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // If local has any receipt not yet recorded in Firestore registry, push it in background
    if (!isFirestoreWriteQuotaExhausted() && merged.some((r) => !fsReceiptIds.has(r.id))) {
      saveReceiptsRegistryToFirestore(merged).catch(() => {});
    }

    saveReceiptsToLocalStore(merged);
    window.dispatchEvent(new CustomEvent('vault_receipts_changed', { detail: { receipts: merged } }));
    return merged;
  },

  // Calcula el plan, los días de vigencia y las etiquetas exactas dependiendo del monto establecido por el usuario ($1 USD = 30 días, $12 USD = 365 días)
  resolveMembershipByAmount(
    amount: number,
    fallbackPlan?: MembershipPlanType
  ): {
    amount: number;
    plan: MembershipPlanType;
    durationDays: number;
    monthsCount: number;
    planName: string;
    durationLabel: string;
    summaryLabel: string;
  } {
    const rawNum = Number(amount);
    const validAmount =
      !isNaN(rawNum) && rawNum > 0
        ? Math.round(rawNum * 100) / 100
        : fallbackPlan === 'annual'
        ? 12
        : 1;

    const plan: MembershipPlanType = validAmount >= 12 ? 'annual' : 'monthly';
    const durationDays =
      validAmount >= 12
        ? Math.max(365, Math.round((validAmount / 12) * 365))
        : Math.max(1, Math.round(validAmount * 30));

    const monthsCount = Math.max(0.5, Math.round(validAmount * 10) / 10);
    const planName = plan === 'annual' ? 'Plan Anual' : 'Plan Mensual';

    let durationLabel = `${durationDays} días`;
    if (validAmount === 12) {
      durationLabel = '365 días (12 meses)';
    } else if (validAmount === 1) {
      durationLabel = '30 días (1 mes)';
    } else if (validAmount > 12 && validAmount % 12 === 0) {
      const years = validAmount / 12;
      durationLabel = `${durationDays} días (${years} ${years === 1 ? 'año' : 'años'})`;
    } else if (Number.isInteger(validAmount)) {
      durationLabel = `${durationDays} días (${validAmount} ${validAmount === 1 ? 'mes' : 'meses'})`;
    } else {
      durationLabel = `${durationDays} días`;
    }

    const summaryLabel = `${planName} • ${durationLabel} ($${validAmount} USD)`;

    return {
      amount: validAmount,
      plan,
      durationDays,
      monthsCount,
      planName,
      durationLabel,
      summaryLabel,
    };
  },

  createReceipt(data: {
    userId: string;
    userDisplayName: string;
    userEmail: string;
    userAvatar?: string;
    plan: MembershipPlanType;
    amount: number;
    paymentMethod: string;
    referenceCode?: string;
    receiptImageUrl: string;
    receiptFileName?: string;
    notes?: string;
    whatsappContact?: string;
  }): PaymentReceipt {
    const all = this.getAllReceipts();
    const id = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    unmarkDeletedReceiptId(id);

    const resolved = this.resolveMembershipByAmount(data.amount, data.plan);

    const newReceipt: PaymentReceipt = {
      id,
      userId: data.userId,
      userDisplayName: data.userDisplayName || 'Usuario',
      userEmail: data.userEmail || '',
      userAvatar: data.userAvatar,
      plan: resolved.plan,
      amount: resolved.amount,
      currency: 'USD',
      paymentMethod: data.paymentMethod || 'Transferencia',
      referenceCode: data.referenceCode?.trim() || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      receiptImageUrl: data.receiptImageUrl,
      receiptFileName: data.receiptFileName || 'comprobante.jpg',
      notes: data.notes?.trim() || '',
      whatsappContact: data.whatsappContact || '+54 9 11 6554-6038',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const updated = [newReceipt, ...all];
    saveReceiptsToLocalStore(updated);
    window.dispatchEvent(new CustomEvent('vault_receipts_changed', { detail: { receipt: newReceipt, receipts: updated } }));

    // Always persist to Server API and Firebase Firestore (independent of localStorage quota!)
    (async () => {
      try {
        const compressedImg = await this.compressReceiptImage(newReceipt.receiptImageUrl);
        const receiptToPersist: PaymentReceipt = {
          ...newReceipt,
          receiptImageUrl: compressedImg || newReceipt.receiptImageUrl,
        };

        // Update local store with compressed image so localStorage stays light
        const latestAll = this.getAllReceipts().map((r) =>
          r.id === receiptToPersist.id ? receiptToPersist : r
        );
        saveReceiptsToLocalStore(latestAll);

        await Promise.allSettled([
          fetch(resolveApiUrl('/api/vault/receipts'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(receiptToPersist),
          }),
          saveReceiptToFirestoreSDK(receiptToPersist),
        ]);

        window.dispatchEvent(
          new CustomEvent('vault_receipts_changed', { detail: { receipt: receiptToPersist } })
        );
      } catch (err) {
        console.warn('Error persisting receipt to server/Firestore:', err);
      }
    })();

    return newReceipt;
  },

  async createReceiptAsync(data: {
    userId: string;
    userDisplayName: string;
    userEmail: string;
    userAvatar?: string;
    plan: MembershipPlanType;
    amount: number;
    paymentMethod: string;
    referenceCode?: string;
    receiptImageUrl: string;
    receiptFileName?: string;
    notes?: string;
    whatsappContact?: string;
  }): Promise<PaymentReceipt> {
    const compressedImage = await this.compressReceiptImage(data.receiptImageUrl);
    const all = this.getAllReceipts();
    const id = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    unmarkDeletedReceiptId(id);

    const resolved = this.resolveMembershipByAmount(data.amount, data.plan);

    const newReceipt: PaymentReceipt = {
      id,
      userId: data.userId,
      userDisplayName: data.userDisplayName || 'Usuario',
      userEmail: data.userEmail || '',
      userAvatar: data.userAvatar,
      plan: resolved.plan,
      amount: resolved.amount,
      currency: 'USD',
      paymentMethod: data.paymentMethod || 'Transferencia',
      referenceCode: data.referenceCode?.trim() || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      receiptImageUrl: compressedImage || data.receiptImageUrl,
      receiptFileName: data.receiptFileName || 'comprobante.jpg',
      notes: data.notes?.trim() || '',
      whatsappContact: data.whatsappContact || '+54 9 11 6554-6038',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const updated = [newReceipt, ...all];
    saveReceiptsToLocalStore(updated);
    window.dispatchEvent(
      new CustomEvent('vault_receipts_changed', { detail: { receipt: newReceipt, receipts: updated } })
    );

    // 1. Persist to Central Server API and Firestore Registry in parallel, bounded by a 1.6s max UI wait so submission never hangs on "Confirmando envío..."
    const serverUploadPromise = (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(resolveApiUrl('/api/vault/receipts'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newReceipt),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.receipts)) {
            const deletedSet = getDeletedReceiptIds();
            const map = new Map<string, PaymentReceipt>();
            for (const r of updated) {
              if (isValidRealReceipt(r, deletedSet)) map.set(r.id, r);
            }
            for (const r of json.receipts) {
              if (isValidRealReceipt(r, deletedSet)) {
                map.set(r.id, mergeTwoReceipts(map.get(r.id), r));
              }
            }
            const finalMerged = Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            saveReceiptsToLocalStore(finalMerged);
            window.dispatchEvent(
              new CustomEvent('vault_receipts_changed', { detail: { receipt: newReceipt, receipts: finalMerged } })
            );
          }
        }
      } catch (err) {
        console.warn('Server receipt upload warning (saved locally & Firestore):', err);
      }
    })();

    const firestoreUploadPromise = saveReceiptToFirestoreSDK(newReceipt, updated).catch(() => false);

    await Promise.race([
      Promise.allSettled([serverUploadPromise, firestoreUploadPromise]),
      new Promise((resolve) => setTimeout(resolve, 1600)),
    ]);

    window.dispatchEvent(
      new CustomEvent('vault_receipts_changed', { detail: { receipt: newReceipt, receipts: this.getAllReceipts() } })
    );

    return newReceipt;
  },

  updateReceiptStatus(
    receiptId: string,
    status: ReceiptStatus,
    adminNote?: string,
    reviewerName?: string,
    overrideAmount?: number
  ): PaymentReceipt | null {
    const all = this.getAllReceipts();
    const idx = all.findIndex((r) => r.id === receiptId);
    if (idx === -1) return null;

    const target = all[idx];
    const now = new Date();
    const nowIso = now.toISOString();

    const targetAmount =
      overrideAmount !== undefined && !isNaN(Number(overrideAmount)) && Number(overrideAmount) > 0
        ? Number(overrideAmount)
        : Number(target.amount);

    const resolved = this.resolveMembershipByAmount(targetAmount, target.plan);
    const expiresIso = new Date(
      now.getTime() + resolved.durationDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const updatedReceipt: PaymentReceipt = {
      ...target,
      plan: resolved.plan,
      amount: resolved.amount,
      status,
      adminNote: adminNote !== undefined ? adminNote : target.adminNote,
      reviewedAt: nowIso,
      reviewedBy: reviewerName || 'Administrador',
      membershipStartsAt: status === 'approved' ? nowIso : undefined,
      membershipExpiresAt: status === 'approved' ? expiresIso : undefined,
    };

    all[idx] = updatedReceipt;
    saveReceiptsToLocalStore(all);
    window.dispatchEvent(
      new CustomEvent('vault_receipts_changed', { detail: { receipt: updatedReceipt, receipts: all } })
    );

    // Persist to Server API and Firebase Firestore
    Promise.allSettled([
      fetch(resolveApiUrl(`/api/vault/receipts/${encodeURIComponent(receiptId)}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          amount: resolved.amount,
          plan: resolved.plan,
          adminNote: updatedReceipt.adminNote,
          reviewerName: updatedReceipt.reviewedBy,
          receipt: updatedReceipt,
        }),
      }),
      saveReceiptToFirestoreSDK(updatedReceipt, all),
    ]).catch(() => {});

    return updatedReceipt;
  },

  deleteReceipt(receiptId: string): boolean {
    markDeletedReceiptId(receiptId);
    const all = this.getAllReceipts();
    const filtered = all.filter((r) => r.id !== receiptId);
    saveReceiptsToLocalStore(filtered);
    window.dispatchEvent(
      new CustomEvent('vault_receipts_changed', { detail: { deletedId: receiptId, receipts: filtered } })
    );

    Promise.allSettled([
      fetch(resolveApiUrl(`/api/vault/receipts/${encodeURIComponent(receiptId)}`), {
        method: 'DELETE',
      }),
      !isFirestoreQuotaExhausted()
        ? firestoreRestFetch(`/${RECEIPTS_COLLECTION}/${encodeURIComponent(receiptId)}`, {
            method: 'DELETE',
          })
        : Promise.resolve(null),
      saveReceiptsRegistryToFirestore(filtered),
    ]).catch(() => {});

    return true;
  },
};

