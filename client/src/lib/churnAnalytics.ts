import { parseISO, differenceInDays, subDays, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import type { PartnerStats, OrderRecord } from './types';

export interface PartnerSegment {
  size: 'small' | 'medium' | 'large';
  label: string;
}

export interface PartnerWithSegment extends PartnerStats {
  segment: PartnerSegment;
  churnScore: number;
  riskTrend: 'improving' | 'stable' | 'degrading';
  riskChange: number; // percentage change
}

export interface CohortData {
  cohortMonth: string;
  startDate: Date;
  partnersCount: number;
  retention: {
    month0: number; // 100%
    month1: number; // %
    month2: number; // %
    month3: number; // %
  };
}

export interface SegmentPortrait {
  segment: string;
  direction: string;
  partnersCount: number;
  churnRate: number;
  avgOrders: number;
  avgSKU: number;
  avgWarehouses: number;
  avgInterval: number;
  avgVolatility: number;
  avgChurnScore: number;
}

/**
 * Determine partner size based on orders and warehouses
 */
export function getPartnerSegment(partner: PartnerStats): PartnerSegment {
  // Scoring: orders (60%) + warehouses (40%)
  const orderScore = partner.totalOrders; // 0-1000+
  const warehouseScore = partner.uniqueWarehouses * 50; // Scale warehouses to comparable range
  
  const totalScore = (orderScore * 0.6) + (warehouseScore * 0.4);
  
  if (totalScore < 50) {
    return { size: 'small', label: 'Маленький' };
  } else if (totalScore < 200) {
    return { size: 'medium', label: 'Средний' };
  } else {
    return { size: 'large', label: 'Крупный' };
  }
}

/**
 * Calculate churn score for a partner (0-100)
 * Based on: interval, volatility, warehouse count, SKU count
 */
export function calculateChurnScore(partner: PartnerStats, benchmark: {
  avgInterval: number;
  avgVolatility: number;
  avgSKU: number;
  avgWarehouses: number;
}): number {
  if (partner.isChurned) return 100;
  
  let score = 0;
  
  // Interval score (0-40 points)
  if (benchmark.avgInterval > 0) {
    const intervalRatio = partner.orderFrequency / benchmark.avgInterval;
    score += Math.min(40, intervalRatio * 40); // Higher interval = higher risk
  }
  
  // Volatility score (0-30 points)
  if (benchmark.avgVolatility > 0) {
    const volatilityRatio = partner.volatility / benchmark.avgVolatility;
    score += Math.min(30, volatilityRatio * 30); // Higher volatility = higher risk
  }
  
  // SKU diversity score (0-20 points)
  if (benchmark.avgSKU > 0) {
    const skuRatio = partner.uniqueSKU / benchmark.avgSKU;
    score += Math.max(0, 20 - (skuRatio * 20)); // Fewer SKU = higher risk
  }
  
  // Warehouse score (0-10 points)
  if (benchmark.avgWarehouses > 0) {
    const warehouseRatio = partner.uniqueWarehouses / benchmark.avgWarehouses;
    score += Math.max(0, 10 - (warehouseRatio * 10)); // Fewer warehouses = higher risk
  }
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate risk trajectory for a partner over time
 */
export function calculateRiskTrajectory(
  partnerOrders: OrderRecord[],
  partnerId: string,
  allData: OrderRecord[]
): { current: number; previous: number; trend: 'improving' | 'stable' | 'degrading'; change: number } {
  const now = new Date();
  
  // Current period: last 30 days
  const currentOrders = partnerOrders.filter(r => {
    const date = parseISO(r["Дата заказа (orders)"]);
    return date >= subDays(now, 30);
  });
  
  // Previous period: 30-60 days ago
  const previousOrders = partnerOrders.filter(r => {
    const date = parseISO(r["Дата заказа (orders)"]);
    return date >= subDays(now, 60) && date < subDays(now, 30);
  });
  
  // Calculate simple churn risk based on order frequency
  const currentRisk = currentOrders.length === 0 ? 100 : Math.max(0, 100 - (currentOrders.length * 5));
  const previousRisk = previousOrders.length === 0 ? 100 : Math.max(0, 100 - (previousOrders.length * 5));
  
  const change = currentRisk - previousRisk;
  let trend: 'improving' | 'stable' | 'degrading' = 'stable';
  
  if (change < -5) trend = 'improving';
  else if (change > 5) trend = 'degrading';
  
  return {
    current: Math.min(100, currentRisk),
    previous: Math.min(100, previousRisk),
    trend,
    change: change
  };
}

/**
 * Build cohort analysis data
 */
export function buildCohortAnalysis(
  allData: OrderRecord[],
  direction: string
): CohortData[] {
  const filteredData = direction === 'all' 
    ? allData 
    : allData.filter(r => r["Направление (расчёт)"] === direction);
  
  // Get unique partners and their first order date
  const partnerFirstOrder = new Map<string, Date>();
  
  filteredData.forEach(order => {
    const partner = order["Партнер"];
    const direction = order["Направление (расчёт)"];
    if (!partner || !direction) return;
    
    const date = parseISO(order["Дата заказа (orders)"]);
    const existing = partnerFirstOrder.get(partner);
    
    if (!existing || date < existing) {
      partnerFirstOrder.set(partner, date);
    }
  });
  
  // Group partners by cohort month
  const cohorts = new Map<string, { partners: Set<string>; startDate: Date }>();
  
  partnerFirstOrder.forEach((date, partner) => {
    const monthKey = date.toISOString().substring(0, 7); // YYYY-MM
    
    if (!cohorts.has(monthKey)) {
      cohorts.set(monthKey, {
        partners: new Set(),
        startDate: startOfMonth(date)
      });
    }
    
    cohorts.get(monthKey)!.partners.add(partner);
  });
  
  // Calculate retention for each cohort
  const cohortData: CohortData[] = [];
  
  cohorts.forEach((cohortInfo, monthKey) => {
    const startDate = cohortInfo.startDate;
    const partnersCount = cohortInfo.partners.size;
    
    // Check retention at different months
    const month0 = partnersCount; // 100%
    
    // Month 1: still active 30-60 days after first order
    const month1Partners = new Set<string>();
    filteredData.forEach(order => {
      const partner = order["Партнер"];
      const orderDirection = order["Направление (расчёт)"];
      if (!partner || !orderDirection || !cohortInfo.partners.has(partner)) return;
      
      const date = parseISO(order["Дата заказа (orders)"]);
      const daysAfterCohort = differenceInDays(date, startDate);
      
      if (daysAfterCohort >= 30 && daysAfterCohort < 60) {
        month1Partners.add(partner);
      }
    });
    
    // Month 2: still active 60-90 days after first order
    const month2Partners = new Set<string>();
    filteredData.forEach(order => {
      const partner = order["Партнер"];
      const orderDirection = order["Направление (расчёт)"];
      if (!partner || !orderDirection || !cohortInfo.partners.has(partner)) return;
      
      const date = parseISO(order["Дата заказа (orders)"]);
      const daysAfterCohort = differenceInDays(date, startDate);
      
      if (daysAfterCohort >= 60 && daysAfterCohort < 90) {
        month2Partners.add(partner);
      }
    });
    
    // Month 3: still active 90-120 days after first order
    const month3Partners = new Set<string>();
    filteredData.forEach(order => {
      const partner = order["Партнер"];
      const orderDirection = order["Направление (расчёт)"];
      if (!partner || !orderDirection || !cohortInfo.partners.has(partner)) return;
      
      const date = parseISO(order["Дата заказа (orders)"]);
      const daysAfterCohort = differenceInDays(date, startDate);
      
      if (daysAfterCohort >= 90 && daysAfterCohort < 120) {
        month3Partners.add(partner);
      }
    });
    
    cohortData.push({
      cohortMonth: monthKey,
      startDate,
      partnersCount,
      retention: {
        month0: 100,
        month1: (month1Partners.size / partnersCount) * 100,
        month2: (month2Partners.size / partnersCount) * 100,
        month3: (month3Partners.size / partnersCount) * 100
      }
    });
  });
  
  // Sort by date
  return cohortData.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * Generate segment-specific portraits
 */
export function generateSegmentPortraits(
  partnerStats: PartnerStats[],
  directions: string[]
): SegmentPortrait[] {
  const portraits: SegmentPortrait[] = [];
  
  const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
  const sizeLabels = { small: 'Маленький', medium: 'Средний', large: 'Крупный' };
  
  directions.forEach(direction => {
    sizes.forEach(size => {
      const filtered = partnerStats.filter(p => {
        const segment = getPartnerSegment(p);
        return segment.size === size && p.direction === direction;
      });
      
      if (filtered.length === 0) return;
      
      const churned = filtered.filter(p => p.isChurned).length;
      const active = filtered.filter(p => !p.isChurned);
      
      const avgOrders = filtered.reduce((sum, p) => sum + p.totalOrders, 0) / filtered.length;
      const avgSKU = filtered.reduce((sum, p) => sum + p.uniqueSKU, 0) / filtered.length;
      const avgWarehouses = filtered.reduce((sum, p) => sum + p.uniqueWarehouses, 0) / filtered.length;
      const avgInterval = active.length > 0 
        ? active.reduce((sum, p) => sum + p.orderFrequency, 0) / active.length 
        : 0;
      const avgVolatility = active.length > 0
        ? active.reduce((sum, p) => sum + p.volatility, 0) / active.length 
        : 0;
      
      // Calculate average churn score
      const benchmark = {
        avgInterval: active.length > 0 ? avgInterval : 1,
        avgVolatility: active.length > 0 ? avgVolatility : 0.5,
        avgSKU: avgSKU || 1,
        avgWarehouses: avgWarehouses || 1
      };
      
      const avgChurnScore = active.length > 0
        ? active.reduce((sum, p) => sum + calculateChurnScore(p, benchmark), 0) / active.length
        : 0;
      
      portraits.push({
        segment: `${sizeLabels[size]}`,
        direction,
        partnersCount: filtered.length,
        churnRate: (churned / filtered.length) * 100,
        avgOrders,
        avgSKU,
        avgWarehouses,
        avgInterval,
        avgVolatility,
        avgChurnScore
      });
    });
  });
  
  return portraits;
}

