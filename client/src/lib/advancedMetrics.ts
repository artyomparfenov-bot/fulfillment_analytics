import { parseISO, differenceInDays, subDays, startOfMonth, format } from 'date-fns';
import type { OrderRecord, PartnerStats } from './types';

export interface BusinessMetrics {
  retentionRate: number; // % partners active in both current and previous period
  churnRate: number; // % partners that churned in current period
  momGrowth: number; // month-over-month order growth
  concentrationRisk: number; // % orders from top 20% partners
  healthScore: number; // 0-100 composite score
  avgOrdersPerActivePartner: number;
}

export interface DetailedDirectionStats {
  direction: string;
  subType?: string; // For Express/FBS breakdown: "Express", "FBS"
  totalOrders: number;
  totalPartners: number;
  activePartners: number;
  churnedPartners: number;
  avgOrdersPerPartner: number;
  retentionRate: number;
  churnRate: number;
}

export interface SKUMetrics {
  month: string; // YYYY-MM
  totalSKU: number;
  activeSKU: number; // SKU with orders in this month
  newSKU: number; // SKU that appeared for first time
  churnedSKU: number; // SKU with no orders for 60+ days
  avgOrdersPerSKU: number;
  topSKUConcentration: number; // % orders from top 20% SKU
}

export function calculateBusinessMetrics(
  allData: OrderRecord[],
  currentPeriodDays: number
): BusinessMetrics {
  const now = new Date();
  const currentPeriodStart = subDays(now, currentPeriodDays);
  const previousPeriodStart = subDays(now, currentPeriodDays * 2);
  
  // Current period data
  const currentData = allData.filter(r => {
    const date = parseISO(r["Дата заказа (orders)"]);
    return date >= currentPeriodStart;
  });
  
  // Previous period data
  const previousData = allData.filter(r => {
    const date = parseISO(r["Дата заказа (orders)"]);
    return date >= previousPeriodStart && date < currentPeriodStart;
  });
  
  // Get unique partners in each period
  const currentPartners = new Set(currentData.map(r => r["Партнер"]));
  const previousPartners = new Set(previousData.map(r => r["Партнер"]));
  
  // Retention: partners active in both periods
  const retainedPartners = Array.from(currentPartners).filter(p => previousPartners.has(p));
  const retentionRate = previousPartners.size > 0 
    ? (retainedPartners.length / previousPartners.size) * 100 
    : 0;
  
  // Churn: partners from previous period that are now churned (no orders in 60+ days)
  const allPartnersLastOrder = new Map<string, Date>();
  allData.forEach(r => {
    const partner = r["Партнер"];
    const date = parseISO(r["Дата заказа (orders)"]);
    if (!allPartnersLastOrder.has(partner) || date > allPartnersLastOrder.get(partner)!) {
      allPartnersLastOrder.set(partner, date);
    }
  });
  
  const churnedCount = Array.from(previousPartners).filter(p => {
    const lastOrder = allPartnersLastOrder.get(p);
    return lastOrder && differenceInDays(now, lastOrder) > 60;
  }).length;
  
  const churnRate = previousPartners.size > 0 
    ? (churnedCount / previousPartners.size) * 100 
    : 0;
  
  // MoM Growth
  const momGrowth = previousData.length > 0
    ? ((currentData.length - previousData.length) / previousData.length) * 100
    : 0;
  
  // Concentration Risk: top 20% partners
  const partnerOrderCounts = new Map<string, number>();
  currentData.forEach(r => {
    const partner = r["Партнер"];
    partnerOrderCounts.set(partner, (partnerOrderCounts.get(partner) || 0) + 1);
  });
  
  const sortedPartners = Array.from(partnerOrderCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  
  const top20Count = Math.max(1, Math.ceil(sortedPartners.length * 0.2));
  const top20Orders = sortedPartners.slice(0, top20Count).reduce((sum, [, count]) => sum + count, 0);
  const concentrationRisk = currentData.length > 0 
    ? (top20Orders / currentData.length) * 100 
    : 0;
  
  // Avg orders per active partner
  const avgOrdersPerActivePartner = currentPartners.size > 0
    ? currentData.length / currentPartners.size
    : 0;
  
  // Health Score (0-100)
  // Components:
  // - Retention Rate (25%): higher is better
  // - Inverse Churn Rate (30%): lower churn is better
  // - Growth positivity (25%): positive growth is better
  // - Inverse Concentration Risk (20%): lower concentration is better
  
  const retentionScore = retentionRate; // 0-100
  const churnScore = Math.max(0, 100 - churnRate); // inverse
  const growthScore = momGrowth >= 0 
    ? Math.min(100, 50 + momGrowth) // positive growth: 50-100
    : Math.max(0, 50 + momGrowth); // negative growth: 0-50
  const concentrationScore = Math.max(0, 100 - concentrationRisk); // inverse
  
  const healthScore = 
    retentionScore * 0.25 +
    churnScore * 0.30 +
    growthScore * 0.25 +
    concentrationScore * 0.20;
  
  return {
    retentionRate,
    churnRate,
    momGrowth,
    concentrationRisk,
    healthScore,
    avgOrdersPerActivePartner
  };
}

export function calculateDetailedDirectionStats(
  allData: OrderRecord[],
  currentPeriodDays: number
): DetailedDirectionStats[] {
  const now = new Date();
  const currentPeriodStart = subDays(now, currentPeriodDays);
  const previousPeriodStart = subDays(now, currentPeriodDays * 2);
  
  const currentData = allData.filter(r => {
    const date = parseISO(r["Дата заказа (orders)"]);
    return date >= currentPeriodStart;
  });
  
  const previousData = allData.filter(r => {
    const date = parseISO(r["Дата заказа (orders)"]);
    return date >= previousPeriodStart && date < currentPeriodStart;
  });
  
  // Get all partners' last order dates
  const allPartnersLastOrder = new Map<string, Date>();
  allData.forEach(r => {
    const partner = r["Партнер"];
    const date = parseISO(r["Дата заказа (orders)"]);
    if (!allPartnersLastOrder.has(partner) || date > allPartnersLastOrder.get(partner)!) {
      allPartnersLastOrder.set(partner, date);
    }
  });
  
  const stats: DetailedDirectionStats[] = [];
  
  // Group by direction
  const directionGroups = new Map<string, OrderRecord[]>();
  currentData.forEach(r => {
    const direction = r["Направление (расчёт)"];
    if (!directionGroups.has(direction)) {
      directionGroups.set(direction, []);
    }
    directionGroups.get(direction)!.push(r);
  });
  
  directionGroups.forEach((records, direction) => {
    // For Express/FBS, break down by type
    if (direction === "Express/FBS") {
      const expressRecords = records.filter(r => {
        const type = r["Тип заказа"];
        return !type.includes("FBS");
      });
      
      const fbsRecords = records.filter(r => {
        const type = r["Тип заказа"];
        return type.includes("FBS");
      });
      
      // Add Express stats
      if (expressRecords.length > 0) {
        stats.push(calculateStatsForGroup(expressRecords, "Express/FBS", "Express", previousData, allPartnersLastOrder, now));
      }
      
      // Add FBS stats
      if (fbsRecords.length > 0) {
        stats.push(calculateStatsForGroup(fbsRecords, "Express/FBS", "FBS", previousData, allPartnersLastOrder, now));
      }
    }
    
    // Add overall direction stats
    stats.push(calculateStatsForGroup(records, direction, undefined, previousData, allPartnersLastOrder, now));
  });
  
  return stats.sort((a, b) => b.totalOrders - a.totalOrders);
}

function calculateStatsForGroup(
  records: OrderRecord[],
  direction: string,
  subType: string | undefined,
  previousData: OrderRecord[],
  allPartnersLastOrder: Map<string, Date>,
  now: Date
): DetailedDirectionStats {
  const partners = new Set(records.map(r => r["Партнер"]));
  const activePartners = Array.from(partners).filter(p => {
    const lastOrder = allPartnersLastOrder.get(p);
    return lastOrder && differenceInDays(now, lastOrder) <= 30;
  }).length;
  
  const churnedPartners = Array.from(partners).filter(p => {
    const lastOrder = allPartnersLastOrder.get(p);
    return lastOrder && differenceInDays(now, lastOrder) > 60;
  }).length;
  
  // Previous period partners for this direction/subtype
  const previousRecords = previousData.filter(r => {
    if (r["Направление (расчёт)"] !== direction) return false;
    if (subType === "Express") return !r["Тип заказа"].includes("FBS");
    if (subType === "FBS") return r["Тип заказа"].includes("FBS");
    return true;
  });
  
  const previousPartners = new Set(previousRecords.map(r => r["Партнер"]));
  const retainedPartners = Array.from(partners).filter(p => previousPartners.has(p));
  
  const retentionRate = previousPartners.size > 0
    ? (retainedPartners.length / previousPartners.size) * 100
    : 0;
  
  const churnedFromPrevious = Array.from(previousPartners).filter(p => {
    const lastOrder = allPartnersLastOrder.get(p);
    return lastOrder && differenceInDays(now, lastOrder) > 60;
  }).length;
  
  const churnRate = previousPartners.size > 0
    ? (churnedFromPrevious / previousPartners.size) * 100
    : 0;
  
  return {
    direction,
    subType,
    totalOrders: records.length,
    totalPartners: partners.size,
    activePartners,
    churnedPartners,
    avgOrdersPerPartner: partners.size > 0 ? records.length / partners.size : 0,
    retentionRate,
    churnRate
  };
}

export function calculateSKUMetrics(allData: OrderRecord[]): SKUMetrics[] {
  // Group orders by month
  const monthlyData = new Map<string, OrderRecord[]>();
  
  allData.forEach(r => {
    const date = parseISO(r["Дата заказа (orders)"]);
    const monthKey = format(date, 'yyyy-MM');
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, []);
    }
    monthlyData.get(monthKey)!.push(r);
  });
  
  const sortedMonths = Array.from(monthlyData.keys()).sort();
  const metrics: SKUMetrics[] = [];
  
  const skuFirstSeen = new Map<string, string>(); // SKU -> first month
  const skuLastSeen = new Map<string, string>(); // SKU -> last month
  
  // First pass: record first and last seen dates
  allData.forEach(r => {
    const sku = r["Артикул"];
    const date = parseISO(r["Дата заказа (orders)"]);
    const monthKey = format(date, 'yyyy-MM');
    
    if (!skuFirstSeen.has(sku) || monthKey < skuFirstSeen.get(sku)!) {
      skuFirstSeen.set(sku, monthKey);
    }
    
    if (!skuLastSeen.has(sku) || monthKey > skuLastSeen.get(sku)!) {
      skuLastSeen.set(sku, monthKey);
    }
  });
  
  const now = new Date();
  const currentMonth = format(now, 'yyyy-MM');
  
  sortedMonths.forEach((month, index) => {
    const records = monthlyData.get(month)!;
    const skusThisMonth = new Set(records.map(r => r["Артикул"]));
    
    // New SKUs: first seen this month
    const newSKU = Array.from(skusThisMonth).filter(sku => skuFirstSeen.get(sku) === month).length;
    
    // Churned SKUs: last seen more than 2 months ago from current month
    const monthDate = parseISO(month + '-01');
    const twoMonthsAgo = format(subDays(now, 60), 'yyyy-MM');
    
    const churnedSKU = Array.from(skuLastSeen.entries()).filter(([sku, lastMonth]) => {
      return lastMonth < twoMonthsAgo && lastMonth <= month;
    }).length;
    
    // SKU order counts for concentration
    const skuOrderCounts = new Map<string, number>();
    records.forEach(r => {
      const sku = r["Артикул"];
      skuOrderCounts.set(sku, (skuOrderCounts.get(sku) || 0) + 1);
    });
    
    const sortedSKUs = Array.from(skuOrderCounts.entries()).sort((a, b) => b[1] - a[1]);
    const top20Count = Math.max(1, Math.ceil(sortedSKUs.length * 0.2));
    const top20Orders = sortedSKUs.slice(0, top20Count).reduce((sum, [, count]) => sum + count, 0);
    const topSKUConcentration = records.length > 0 ? (top20Orders / records.length) * 100 : 0;
    
    metrics.push({
      month,
      totalSKU: skuFirstSeen.size, // cumulative total
      activeSKU: skusThisMonth.size,
      newSKU,
      churnedSKU,
      avgOrdersPerSKU: skusThisMonth.size > 0 ? records.length / skusThisMonth.size : 0,
      topSKUConcentration
    });
  });
  
  return metrics;
}

