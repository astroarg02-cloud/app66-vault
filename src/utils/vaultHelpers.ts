import { VaultItem } from '../types';

/**
 * Checks if a vault item has a real attached file uploaded by the user/admin
 */
export function hasVaultItemFile(item?: VaultItem | null): boolean {
  if (!item) return false;
  if (item.rawFileBlob) return true;
  if (item.fileData && item.fileData.trim().length > 0) return true;
  if (
    item.downloadUrl &&
    item.downloadUrl.trim().length > 0 &&
    !item.downloadUrl.startsWith('#')
  ) {
    return true;
  }
  return false;
}
