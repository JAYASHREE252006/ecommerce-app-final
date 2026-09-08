import { recentlyViewedStorage } from '../storage/recentlyViewedStorage';
import { productActivityService } from './recentlyViewedService';

let syncInFlight = null;

/**
 * Call right after a successful login/register.
 * Sends whatever guest history exists locally to the server merge endpoint,
 * then clears local storage so it isn't merged again on a future login.
 * Guarded against double-invocation (e.g. React StrictMode / rapid re-renders).
 */
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
      // Don't lose local history if the sync call fails - try again next login.
      console.warn('[authSyncService] guest history sync failed, will retry later', err);
      return null;
    })
    .finally(() => {
      syncInFlight = null;
    });

  return syncInFlight;
}

export const authSyncService = { syncGuestHistoryToServer };
