import { generateAllAlerts } from './alertsEngine';
import { groupAndPrioritizeAlerts } from './alertPrioritization';
import type { OrderRecord } from './types';
import type { AlertGroup } from './alertPrioritization';

// Cache for alerts by partner
const alertsCache = new Map<string, AlertGroup[]>();
let isCaching = false;

/**
 * Generate alerts for a specific partner (optimized with caching)
 */
export function getPartnerAlerts(partnerId: string, allData: OrderRecord[]): AlertGroup[] {
  // Return cached result if available
  if (alertsCache.has(partnerId)) {
    return alertsCache.get(partnerId) || [];
  }

  // Filter data for this partner only
  const partnerData = allData.filter(record => record['Партнер'] === partnerId);
  
  if (partnerData.length === 0) {
    return [];
  }

  try {
    // Generate alerts only for this partner
    const alerts = generateAllAlerts(partnerData);
    const grouped = groupAndPrioritizeAlerts(alerts as any);
    
    // Cache the result
    alertsCache.set(partnerId, grouped);
    return grouped;
  } catch (err) {
    console.error(`Error generating alerts for partner ${partnerId}:`, err);
    return [];
  }
}

/**
 * Preload alerts for all partners in background
 * This runs asynchronously and doesn't block the UI
 */
export function preloadAllAlertsAsync(allData: OrderRecord[], partners: string[]): Promise<void> {
  if (isCaching) return Promise.resolve();
  
  isCaching = true;
  
  return new Promise((resolve) => {
    // Process in batches to avoid blocking
    const batchSize = 10;
    let index = 0;

    const processBatch = () => {
      const batch = partners.slice(index, index + batchSize);
      
      batch.forEach(partnerId => {
        getPartnerAlerts(partnerId, allData);
      });

      index += batchSize;

      if (index < partners.length) {
        // Schedule next batch
        setTimeout(processBatch, 50);
      } else {
        isCaching = false;
        resolve();
      }
    };

    // Start processing
    setTimeout(processBatch, 100);
  });
}

/**
 * Clear the cache
 */
export function clearAlertsCache(): void {
  alertsCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; partners: string[] } {
  return {
    size: alertsCache.size,
    partners: Array.from(alertsCache.keys())
  };
}
