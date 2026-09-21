import { recentlyViewedStorage } from '../storage/recentlyViewedStorage';
import { productActivityService } from './recentlyViewedService';

let syncInFlight = null;

async function syncGuestHistoryToServer() {
  if (syncInFlight) return syncInFlight;
  const localItems = recentlyViewedStorage.getRecentlyViewed();
  if (!localItems.length) return null;

  syncInFlight = productActivityService
    .syncRecentlyViewed(localItems)
    .then((canonicalItems) => {
      recentlyViewedStorage.clearRecentlyViewed();
      return canonicalItems;
    })
    .catch((err) => {
      console.warn('[authSyncService] guest history sync failed, will retry later', err);
      return null;
    })
    .finally(() => {
      syncInFlight = null;
    });

  return syncInFlight;
}

export const authSyncService = { syncGuestHistoryToServer };
