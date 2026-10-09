import { PaymentReceipt, ReceiptStatus, MembershipPlanType } from '../types';

const STORAGE_KEY = 'vault_payment_receipts_v1';

export const receiptService = {
  getAllReceipts(): PaymentReceipt[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Filtrar y eliminar de raíz cualquier simulación previa
          const realOnly = parsed.filter(
            (r) => r && r.id && !r.id.startsWith('rec-demo') && !r.id.includes('demo')
          );
          if (realOnly.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(realOnly));
          }
          return realOnly;
        }
      }
    } catch (e) {
      console.warn('Error reading receipts from localStorage:', e);
    }
    return [];
  },

  getReceiptsByUser(userId: string): PaymentReceipt[] {
    const all = this.getAllReceipts();
    return all.filter((r) => r.userId === userId);
  },

  getPendingCount(): number {
    const all = this.getAllReceipts();
    return all.filter((r) => r.status === 'pending').length;
  },

  async syncFromServer(): Promise<PaymentReceipt[]> {
    try {
      const res = await fetch('/api/vault/receipts');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.receipts)) {
          const realOnly = data.receipts.filter(
            (r: any) => r && r.id && !r.id.startsWith('rec-demo') && !r.id.includes('demo')
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(realOnly));
          window.dispatchEvent(new CustomEvent('vault_receipts_changed', { detail: { receipts: realOnly } }));
          return realOnly;
        }
      }
    } catch (e) {
      // offline fallback
    }
    return this.getAllReceipts();
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
    const newReceipt: PaymentReceipt = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: data.userId,
      userDisplayName: data.userDisplayName,
      userEmail: data.userEmail,
      userAvatar: data.userAvatar,
      plan: data.plan,
      amount: data.amount,
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('vault_receipts_changed', { detail: { receipt: newReceipt } }));

      // Persist to server in background
      fetch('/api/vault/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReceipt),
      }).catch(() => {});
    } catch (e) {
      console.error('Error saving receipt:', e);
    }

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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      window.dispatchEvent(new CustomEvent('vault_receipts_changed', { detail: { receipt: updatedReceipt } }));

      // Persist to server in background
      fetch(`/api/vault/receipts/${receiptId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          adminNote: updatedReceipt.adminNote,
          reviewerName: updatedReceipt.reviewedBy,
        }),
      }).catch(() => {});
    } catch (e) {
      console.error('Error updating receipt status:', e);
    }

    return updatedReceipt;
  },

  deleteReceipt(receiptId: string): boolean {
    const all = this.getAllReceipts();
    const filtered = all.filter((r) => r.id !== receiptId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('vault_receipts_changed', { detail: { deletedId: receiptId } }));

      // Persist to server in background
      fetch(`/api/vault/receipts/${receiptId}`, {
        method: 'DELETE',
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error('Error deleting receipt:', e);
      return false;
    }
  }
};
