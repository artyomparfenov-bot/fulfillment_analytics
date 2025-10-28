import type { OrderRecord, PartnerStats } from './types';
import { parseISO, subDays, differenceInDays } from 'date-fns';

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type CustomerSize = 'LARGE' | 'MEDIUM' | 'SMALL';
export type AlertCategory = 'CHURN_RISK' | 'REVENUE_DROP' | 'VOLATILITY' | 'WAREHOUSE_ANOMALY' | 'SKU_ANOMALY' | 'CONCENTRATION';

export interface PrioritizedAlert {
  id: string;
  partnerId: string;
  partnerName: string;
  alertType: AlertCategory;
  severity: AlertSeverity;
  priorityScore: number; // 0-100, higher = more critical
  message: string;
  
  // Business impact metrics
  customerSize: CustomerSize;
  churnRisk: number; // 0-100
  
  // Alert details
  currentValue?: string;
  benchmarkValue?: string;
  percentageChange?: number;
  direction?: string;
  
  // Metadata
  detectedAt: Date;
  lastUpdated: Date;
  isNew: boolean;
}

export interface AlertGroup {
  category: AlertCategory;
  severity: AlertSeverity;
  alerts: PrioritizedAlert[];
  count: number;
  totalPriorityScore: number;
}

/**
 * Calculate customer size based on order volume and warehouse count
 */
export function calculateCustomerSize(
  partnerOrders: OrderRecord[],
  allPartners: Map<string, OrderRecord[]>
): CustomerSize {
  const orderCount = partnerOrders.length;
  
  // Get warehouse count
  const warehouses = new Set(partnerOrders.map(r => r['Склад'])).size;
  
  // Calculate percentile
  const allOrderCounts = Array.from(allPartners.values()).map(orders => orders.length);
  const sortedCounts = [...allOrderCounts].sort((a, b) => a - b);
  const percentile = sortedCounts.indexOf(orderCount) / sortedCounts.length;
  
  if (percentile >= 0.75 || (orderCount >= 500 && warehouses >= 2)) {
    return 'LARGE';
  } else if (percentile >= 0.40 || (orderCount >= 100 && warehouses >= 1)) {
    return 'MEDIUM';
  }
  return 'SMALL';
}

/**
 * Estimate monthly revenue based on order patterns
 */
export function estimateMonthlyRevenue(
  partnerOrders: OrderRecord[],
  avgOrderValue: number = 5000 // Default avg order value in rubles
): number {
  const now = new Date();
  const last30Days = partnerOrders.filter(r => {
    try {
      const date = parseISO(r['Дата заказа (orders)']);
      return !isNaN(date.getTime()) && date >= subDays(now, 30);
    } catch {
      return false;
    }
  });
  
  const avgOrdersPerDay = last30Days.length / 30;
  return Math.round(avgOrdersPerDay * 30 * avgOrderValue);
}

/**
 * Calculate priority score based on multiple factors (0-100)
 */
export function calculatePriorityScore(
  customerSize: CustomerSize,
  churnRisk: number,
  anomalySeverity: number,
  revenueAtRisk: number,
  isNew: boolean
): number {
  let score = 0;
  
  // Customer size weight (20%)
  const sizeWeights: Record<CustomerSize, number> = {
    'LARGE': 20,
    'MEDIUM': 12,
    'SMALL': 5
  };
  score += sizeWeights[customerSize];
  
  // Churn risk weight (30%)
  score += (churnRisk / 100) * 30;
  
  // Anomaly severity weight (25%)
  score += (anomalySeverity / 100) * 25;
  
  // Revenue at risk weight (20%)
  const revenueScore = Math.min((revenueAtRisk / 100000) * 20, 20); // Cap at 20
  score += revenueScore;
  
  // Freshness bonus (5%)
  if (isNew) {
    score += 5;
  }
  
  return Math.min(Math.round(score), 100);
}

/**
 * Map priority score to severity level
 */
export function scoreTtoSeverity(score: number): AlertSeverity {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

/**
 * Group and sort alerts by priority
 */
export function groupAndPrioritizeAlerts(
  alerts: PrioritizedAlert[]
): AlertGroup[] {
  // Group by category and severity
  const grouped = new Map<string, PrioritizedAlert[]>();
  
  alerts.forEach(alert => {
    const key = `${alert.alertType}_${alert.severity}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(alert);
  });
  
  // Create groups and sort by priority
  const groups: AlertGroup[] = Array.from(grouped.entries()).map(([key, groupAlerts]) => {
    const [category, severity] = key.split('_') as [AlertCategory, AlertSeverity];
    
    // Sort alerts within group by priority score
    const sorted = [...groupAlerts].sort((a, b) => b.priorityScore - a.priorityScore);
    
    return {
      category,
      severity,
      alerts: sorted,
      count: sorted.length,
      totalPriorityScore: sorted.reduce((sum, a) => sum + a.priorityScore, 0)
    };
  });
  
  // Sort groups by severity and total priority
  const severityOrder: Record<AlertSeverity, number> = {
    'CRITICAL': 0,
    'HIGH': 1,
    'MEDIUM': 2,
    'LOW': 3
  };
  
  return groups.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.totalPriorityScore - a.totalPriorityScore;
  });
}

/**
 * Filter alerts by criteria
 */
export function filterAlerts(
  alerts: PrioritizedAlert[],
  filters: {
    severity?: AlertSeverity[];
    customerSize?: CustomerSize[];
    category?: AlertCategory[];
    minPriorityScore?: number;
    isNew?: boolean;
  }
): PrioritizedAlert[] {
  return alerts.filter(alert => {
    if (filters.severity && !filters.severity.includes(alert.severity)) {
      return false;
    }
    if (filters.customerSize && !filters.customerSize.includes(alert.customerSize)) {
      return false;
    }
    if (filters.category && !filters.category.includes(alert.alertType)) {
      return false;
    }
    if (filters.minPriorityScore && alert.priorityScore < filters.minPriorityScore) {
      return false;
    }
    if (filters.isNew !== undefined && alert.isNew !== filters.isNew) {
      return false;
    }
    return true;
  });
}

/**
 * Get top N critical alerts for dashboard
 */
export function getTopCriticalAlerts(
  alerts: PrioritizedAlert[],
  limit: number = 10
): PrioritizedAlert[] {
  return alerts
    .filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH')
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, limit);
}

/**
 * Calculate alert statistics
 */
export function calculateAlertStats(alerts: PrioritizedAlert[]) {
  const bySeverity = {
    CRITICAL: alerts.filter(a => a.severity === 'CRITICAL').length,
    HIGH: alerts.filter(a => a.severity === 'HIGH').length,
    MEDIUM: alerts.filter(a => a.severity === 'MEDIUM').length,
    LOW: alerts.filter(a => a.severity === 'LOW').length
  };
  
  const byCustomerSize = {
    LARGE: alerts.filter(a => a.customerSize === 'LARGE').length,
    MEDIUM: alerts.filter(a => a.customerSize === 'MEDIUM').length,
    SMALL: alerts.filter(a => a.customerSize === 'SMALL').length
  };
  
  const byCategory: Record<AlertCategory, number> = {
    CHURN_RISK: alerts.filter(a => a.alertType === 'CHURN_RISK').length,
    REVENUE_DROP: alerts.filter(a => a.alertType === 'REVENUE_DROP').length,
    VOLATILITY: alerts.filter(a => a.alertType === 'VOLATILITY').length,
    WAREHOUSE_ANOMALY: alerts.filter(a => a.alertType === 'WAREHOUSE_ANOMALY').length,
    SKU_ANOMALY: alerts.filter(a => a.alertType === 'SKU_ANOMALY').length,
    CONCENTRATION: alerts.filter(a => a.alertType === 'CONCENTRATION').length
  };
  
  const avgPriorityScore = alerts.length > 0 
    ? Math.round(alerts.reduce((sum, a) => sum + a.priorityScore, 0) / alerts.length)
    : 0;
  
  return {
    total: alerts.length,
    bySeverity,
    byCustomerSize,
    byCategory,
    avgPriorityScore,
    newAlerts: alerts.filter(a => a.isNew).length
  };
}

