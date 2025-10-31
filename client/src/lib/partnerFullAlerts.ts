/**
 * Optimized wrapper for generating full alerts for a specific partner
 * Uses the same alert engine as Signals section but optimized for single partner
 */

import { generateAllAlerts } from './alertsEngine';
import { groupAndPrioritizeAlerts, type AlertGroup, type PrioritizedAlert } from './alertPrioritization';
import type { OrderRecord } from './types';

// Cache for partner alerts
const partnerAlertsCache = new Map<string, AlertGroup[]>();
const processingPartners = new Set<string>();

/**
 * Generate all alerts for a specific partner
 * Optimized to process only that partner's data
 */
export function generatePartnerFullAlerts(
  partnerId: string,
  allData: OrderRecord[]
): AlertGroup[] {
  // Check cache first
  if (partnerAlertsCache.has(partnerId)) {
    return partnerAlertsCache.get(partnerId) || [];
  }

  try {
    // Generate alerts for all data (function filters by partner internally)
    const allAlerts = generateAllAlerts(allData);

    // Filter alerts for this partner only
    const partnerAlerts = allAlerts.filter(a => a.partnerId === partnerId);

    if (partnerAlerts.length === 0) {
      partnerAlertsCache.set(partnerId, []);
      return [];
    }

    // Convert to PrioritizedAlert format
    const now = new Date();
    const prioritizedAlerts = partnerAlerts.map(a => ({
      id: `${a.partnerId}_${a.alertType}`,
      partnerId: a.partnerId,
      partnerName: a.partnerId,
      sku: a.skuId,
      alertType: a.alertType as any,
      severity: a.severity as any,
      priorityScore: a.severity === 'critical' ? 100 : a.severity === 'high' ? 75 : a.severity === 'medium' ? 50 : 25,
      message: a.message,
      customerSize: 'MEDIUM' as const,
      size: 'MEDIUM' as const,
      churnRisk: 50,
      currentValue: a.currentValue,
      benchmarkValue: a.benchmarkValue,
      percentageChange: a.percentageChange ? parseFloat(a.percentageChange) : undefined,
      direction: a.direction,
      detectedAt: now,
      lastUpdated: now,
      isNew: true
    }));

    // Group and prioritize
    const grouped = groupAndPrioritizeAlerts(prioritizedAlerts as PrioritizedAlert[]);

    // Cache result
    partnerAlertsCache.set(partnerId, grouped);

    return grouped;
  } catch (err) {
    console.error(`Error generating alerts for partner ${partnerId}:`, err);
    return [];
  }
}

/**
 * Get alerts for a partner (cached)
 */
export function getPartnerFullAlerts(partnerId: string, allData: OrderRecord[]): AlertGroup[] {
  return generatePartnerFullAlerts(partnerId, allData);
}

/**
 * Flatten AlertGroup to individual alerts for display
 */
export function flattenAlertGroups(groups: AlertGroup[]): PrioritizedAlert[] {
  const alerts: PrioritizedAlert[] = [];

  for (const group of groups) {
    for (const alert of group.alerts) {
      alerts.push(alert);
    }
  }

  return alerts;
}

/**
 * Clear cache for a partner
 */
export function clearPartnerCache(partnerId?: string): void {
  if (partnerId) {
    partnerAlertsCache.delete(partnerId);
  } else {
    partnerAlertsCache.clear();
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; partners: string[] } {
  return {
    size: partnerAlertsCache.size,
    partners: Array.from(partnerAlertsCache.keys())
  };
}

/**
 * Check if alerts are being processed for a partner
 */
export function isProcessing(partnerId: string): boolean {
  return processingPartners.has(partnerId);
}

/**
 * Mark partner as processing
 */
export function setProcessing(partnerId: string, processing: boolean): void {
  if (processing) {
    processingPartners.add(partnerId);
  } else {
    processingPartners.delete(partnerId);
  }
}
