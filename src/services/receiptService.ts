import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { PaymentReceipt, ReceiptStatus, MembershipPlanType } from '../types';
import { db } from './firebaseService';

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

async function saveReceiptToFirestoreSDK(receipt: PaymentReceipt): Promise<boolean> {
  if (!db || !receipt?.id) return false;
  try {
    const docRef = doc(db, RECEIPTS_COLLECTION, receipt.id);
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

    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore SDK receipt save warning:', err);
    return false;
  }
}

async function fetchReceiptsFromFirestoreSDK(): Promise<PaymentReceipt[]> {
  if (!db) return [];
  try {
    const deletedSet = getDeletedReceiptIds();
    const snap = await getDocs(collection(db, RECEIPTS_COLLECTION));
    const list: PaymentReceipt[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const id = data?.id || docSnap.id;
      if (!id || deletedSet.has(id) || String(id).startsWith('rec-demo')) return;
      list.push({
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
      });
    });
    return list;
  } catch (err) {
    console.warn('Firestore SDK receipt fetch warning:', err);
    return [];
  }
}

export const receiptService = {
  // Compress image before saving so it loads fast and never exceeds localStorage (5MB) or Firestore (1MB) limits
  async compressReceiptImage(dataUrl: string, maxDimension = 1280, quality = 0.78): Promise<string> {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) return dataUrl;
    return new Promise((resolve) => {
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
              resolve(dataUrl);
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
            resolve(compressed);
          } catch {
            resolve(dataUrl);
          }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      } catch {
        resolve(dataUrl);
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

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
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

  // Real-time Firestore listener so AdminApprovalsScreen receives new receipts immediately
  onReceiptsSnapshot(callback: (receipts: PaymentReceipt[]) => void): Unsubscribe {
    if (!db) return () => {};
    try {
      const colRef = collection(db, RECEIPTS_COLLECTION);
      return onSnapshot(
        colRef,
        (snapshot) => {
          const deletedSet = getDeletedReceiptIds();
          const currentLocal = this.getAllReceipts();
          const map = new Map<string, PaymentReceipt>();

          for (const r of currentLocal) {
            if (isValidRealReceipt(r, deletedSet)) {
              map.set(r.id, r);
            }
          }

          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as any;
            const id = data?.id || docSnap.id;
            if (!id || deletedSet.has(id) || String(id).startsWith('rec-demo')) return;
            const fsRec: PaymentReceipt = {
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
              receiptImageUrl:
                data.receiptImageUrl || `/api/vault/receipts/${encodeURIComponent(id)}/image`,
              receiptFileName: data.receiptFileName || 'comprobante.jpg',
              notes: data.notes || '',
              whatsappContact: data.whatsappContact || '+54 9 11 6554-6038',
              status: ['pending', 'approved', 'rejected'].includes(data.status)
                ? data.status
                : 'pending',
              createdAt: data.createdAt || new Date().toISOString(),
              reviewedAt: data.reviewedAt,
              reviewedBy: data.reviewedBy,
              adminNote: data.adminNote,
              membershipStartsAt: data.membershipStartsAt,
              membershipExpiresAt: data.membershipExpiresAt,
            };
            map.set(id, mergeTwoReceipts(map.get(id), fsRec));
          });

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
          console.warn('Firestore onReceiptsSnapshot warning:', err);
        }
      );
    } catch {
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

    // 1. Fetch from Firebase Firestore SDK directly
    try {
      const fsReceipts = await fetchReceiptsFromFirestoreSDK();
      for (const r of fsReceipts) {
        if (isValidRealReceipt(r, deletedSet)) {
          map.set(r.id, mergeTwoReceipts(map.get(r.id), r));
        }
      }
    } catch (e) {
      console.warn('Error syncing receipts from Firestore SDK:', e);
    }

    // 2. Two-way sync with Central Server (/api/vault/receipts/sync) + cache-busted GET fallback
    try {
      const currentCandidates = Array.from(map.values());
      const syncRes = await fetch(`/api/vault/receipts/sync?t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({ receipts: currentCandidates }),
      });

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
        // Fallback to GET /api/vault/receipts
        const getRes = await fetch(`/api/vault/receipts?t=${Date.now()}`, {
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
      console.warn('Server receipts sync warning:', e);
    }

    const merged = Array.from(map.values())
      .filter((r) => isValidRealReceipt(r, deletedSet))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    saveReceiptsToLocalStore(merged);

    // Ensure any local receipts are also pushed to Firestore SDK in background
    (async () => {
      for (const r of merged) {
        await saveReceiptToFirestoreSDK(r);
      }
    })().catch(() => {});

    window.dispatchEvent(new CustomEvent('vault_receipts_changed', { detail: { receipts: merged } }));
    return merged;
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

    const newReceipt: PaymentReceipt = {
      id,
      userId: data.userId,
      userDisplayName: data.userDisplayName || 'Usuario',
      userEmail: data.userEmail || '',
      userAvatar: data.userAvatar,
      plan: data.plan,
      amount: Number(data.amount) || (data.plan === 'annual' ? 12 : 1),
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
          fetch('/api/vault/receipts', {
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

    const newReceipt: PaymentReceipt = {
      id,
      userId: data.userId,
      userDisplayName: data.userDisplayName || 'Usuario',
      userEmail: data.userEmail || '',
      userAvatar: data.userAvatar,
      plan: data.plan,
      amount: Number(data.amount) || (data.plan === 'annual' ? 12 : 1),
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

    await Promise.allSettled([
      fetch('/api/vault/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReceipt),
      }),
      saveReceiptToFirestoreSDK(newReceipt),
    ]);

    window.dispatchEvent(
      new CustomEvent('vault_receipts_changed', { detail: { receipt: newReceipt, receipts: updated } })
    );

    return newReceipt;
  },

  updateReceiptStatus(
    receiptId: string,
    status: ReceiptStatus,
    adminNote?: string,
    reviewerName?: string
  ): PaymentReceipt | null {
    const all = this.getAllReceipts();
    const idx = all.findIndex((r) => r.id === receiptId);
    if (idx === -1) return null;

    const target = all[idx];
    const now = new Date();
    const nowIso = now.toISOString();
    const durationDays = target.plan === 'annual' ? 365 : 30;
    const expiresIso = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    const updatedReceipt: PaymentReceipt = {
      ...target,
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
      fetch(`/api/vault/receipts/${encodeURIComponent(receiptId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          adminNote: updatedReceipt.adminNote,
          reviewerName: updatedReceipt.reviewedBy,
          receipt: updatedReceipt,
        }),
      }),
      saveReceiptToFirestoreSDK(updatedReceipt),
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
      fetch(`/api/vault/receipts/${encodeURIComponent(receiptId)}`, {
        method: 'DELETE',
      }),
      db ? deleteDoc(doc(db, RECEIPTS_COLLECTION, receiptId)) : Promise.resolve(),
    ]).catch(() => {});

    return true;
  },
};

