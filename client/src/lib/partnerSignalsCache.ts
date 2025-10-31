import type { OrderRecord } from './types';

export interface PartnerSignal {
  id: string;
  type: 'order_decline' | 'interval_increase' | 'sku_decline' | 'inactive';
  message: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
}

// Simple cache: partner name -> signals
const signalsCache = new Map<string, PartnerSignal[]>();
const loadingCache = new Set<string>();

/**
 * Generate simple signals for a partner
 * Uses only basic metrics to avoid complexity
 */
function generatePartnerSignals(partnerId: string, partnerData: OrderRecord[]): PartnerSignal[] {
  const signals: PartnerSignal[] = [];

  if (partnerData.length === 0) {
    return signals;
  }

  try {
    // Sort by date
    const sorted = [...partnerData].sort((a, b) => {
      const dateA = new Date((a as any)['Дата заказа (orders)'] || (a as any)['Дата заказа (report)'] || '').getTime();
      const dateB = new Date((b as any)['Дата заказа (orders)'] || (b as any)['Дата заказа (report)'] || '').getTime();
      return dateB - dateA;
    });

    // Last 30 days vs previous 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const last30 = sorted.filter(r => {
      const date = new Date((r as any)['Дата заказа (orders)'] || (r as any)['Дата заказа (report)'] || '');
      return date >= thirtyDaysAgo;
    });

    const prev30 = sorted.filter(r => {
      const date = new Date((r as any)['Дата заказа (orders)'] || (r as any)['Дата заказа (report)'] || '');
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    });

    // Signal 1: Order decline
    if (prev30.length > 0 && last30.length > 0) {
      const decline = ((prev30.length - last30.length) / prev30.length) * 100;
      if (decline > 30) {
        signals.push({
          id: `${partnerId}_decline`,
          type: 'order_decline',
          message: `Заказы упали на ${decline.toFixed(0)}% (${prev30.length} → ${last30.length})`,
          severity: decline > 70 ? 'high' : 'medium',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Signal 2: No recent orders
    if (last30.length === 0 && prev30.length > 0) {
      signals.push({
        id: `${partnerId}_inactive`,
        type: 'inactive',
        message: 'Нет заказов в последние 30 дней',
        severity: 'high',
        timestamp: new Date().toISOString()
      });
    }

    // Signal 3: Interval increase (days between orders)
    if (last30.length >= 2) {
      const dates = last30
        .map(r => new Date((r as any)['Дата заказа (orders)'] || (r as any)['Дата заказа (report)'] || '').getTime())
        .sort((a, b) => b - a);

      const intervals: number[] = [];
      for (let i = 0; i < dates.length - 1; i++) {
        const interval = (dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24);
        intervals.push(interval);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const maxInterval = Math.max(...intervals);

      if (maxInterval > avgInterval * 2) {
        signals.push({
          id: `${partnerId}_interval`,
          type: 'interval_increase',
          message: `Большой интервал между заказами: ${maxInterval.toFixed(0)} дней (среднее: ${avgInterval.toFixed(0)})`,
          severity: 'medium',
          timestamp: new Date().toISOString()
        });
      }
    }

    return signals;
  } catch (err) {
    console.error(`Error generating signals for ${partnerId}:`, err);
    return [];
  }
}

/**
 * Get signals for a partner (cached)
 */
export function getPartnerSignals(partnerId: string, allData: OrderRecord[]): PartnerSignal[] {
  // Return cached if available
  if (signalsCache.has(partnerId)) {
    return signalsCache.get(partnerId) || [];
  }

  // Filter data for this partner
  const partnerData = allData.filter(r => (r as any)['Партнер'] === partnerId);

  // Generate signals
  const signals = generatePartnerSignals(partnerId, partnerData);

  // Cache result
  signalsCache.set(partnerId, signals);

  return signals;
}

/**
 * Preload signals for multiple partners asynchronously
 */
export async function preloadPartnerSignalsAsync(
  allData: OrderRecord[],
  partnerIds: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  // Polyfill for requestIdleCallback if not available
  const scheduleTask = typeof requestIdleCallback !== 'undefined' 
    ? requestIdleCallback 
    : (cb: () => void) => setTimeout(cb, 0);
  return new Promise((resolve) => {
    let processed = 0;
    const total = partnerIds.length;

    const processNext = () => {
      if (processed >= total) {
        resolve();
        return;
      }

      const partnerId = partnerIds[processed];
      
      // Mark as loading
      loadingCache.add(partnerId);

      // Generate signals
      getPartnerSignals(partnerId, allData);

      // Mark as done loading
      loadingCache.delete(partnerId);

      processed++;
      onProgress?.(processed, total);

      // Schedule next batch (non-blocking)
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => processNext(), { timeout: 100 });
      } else {
        setTimeout(processNext, 10);
      }
    };

    // Start processing
    processNext();
  });
}

/**
 * Check if signals are currently loading for a partner
 */
export function isLoadingPartnerSignals(partnerId: string): boolean {
  return loadingCache.has(partnerId);
}

/**
 * Clear all cached signals
 */
export function clearSignalsCache(): void {
  signalsCache.clear();
  loadingCache.clear();
}

/**
 * Get cache statistics
 */
export function getSignalsCacheStats(): { size: number; partners: string[] } {
  return {
    size: signalsCache.size,
    partners: Array.from(signalsCache.keys())
  };
}
