import Papa from 'papaparse';
import { parseISO, differenceInDays, subDays, parse } from 'date-fns';
import type { OrderRecord, PartnerStats, SKUStats, Alert, DirectionStats, ChurnPattern } from './types';

// Flexible date parser that handles multiple formats
function parseFlexibleDate(dateStr: string): Date {
  if (!dateStr) throw new Error('Empty date string');
  
  // Try ISO format first (2025-10-17 or 2025-10-17T09:44:38)
  try {
    const date = parseISO(dateStr);
    if (!isNaN(date.getTime())) return date;
  } catch (e) {
    // Continue to next format
  }
  
  // Try format with time (2025-10-17 09:44:38)
  try {
    const date = parse(dateStr, 'yyyy-MM-dd HH:mm:ss', new Date());
    if (!isNaN(date.getTime())) return date;
  } catch (e) {
    // Continue to next format
  }
  
  // Try format without time (2025-10-17)
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    if (!isNaN(date.getTime())) return date;
  } catch (e) {
    // Continue to next format
  }
  
  // Try DD.MM.YYYY format
  try {
    const date = parse(dateStr, 'dd.MM.yyyy', new Date());
    if (!isNaN(date.getTime())) return date;
  } catch (e) {
    // Continue to next format
  }
  
  throw new Error(`Unable to parse date: ${dateStr}`);
}

export async function loadCSVData(): Promise<OrderRecord[]> {
  const response = await fetch('/data_merged.csv');
  const csvText = await response.text();
  
  return new Promise((resolve, reject) => {
    Papa.parse<OrderRecord>(csvText, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';',
      complete: (results) => {
        resolve(results.data);
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
}

export function filterByTimeRange(records: OrderRecord[], days: number | null): OrderRecord[] {
  if (days === null) return records;
  
  const cutoffDate = subDays(new Date(), days);
  return records.filter(record => {
    try {
      const dateStr = record["Дата заказа (orders)"];
      if (!dateStr) return false;
      const orderDate = parseFlexibleDate(String(dateStr));
      return !isNaN(orderDate.getTime()) && orderDate >= cutoffDate;
    } catch (e) {
      return false;
    }
  });
}

export function getActualDirection(record: OrderRecord): string {
  // VSROK is a special partner that should be treated as its own direction
  if (record["Партнер"] === "VSROK") {
    return "VSROK";
  }
  return record["Направление (расчёт)"];
}

export function filterByDirection(records: OrderRecord[], direction: string): OrderRecord[] {
  if (direction === 'all') return records;
  return records.filter(record => getActualDirection(record) === direction);
}

export function getDirections(records: OrderRecord[]): string[] {
  const directions = new Set<string>();
  records.forEach(record => {
    const actualDirection = getActualDirection(record);
    if (actualDirection) {
      directions.add(actualDirection);
    }
  });
  return Array.from(directions).sort();
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

function coefficientOfVariation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg === 0) return 0;
  const sd = standardDeviation(values);
  return sd / avg;
}

export function calculatePartnerStats(records: OrderRecord[]): PartnerStats[] {
  const partnerMap = new Map<string, OrderRecord[]>();
  
  records.forEach(record => {
    // Skip records with empty or undefined partner names
    if (!record["Партнер"]) {
      return;
    }
    const actualDirection = getActualDirection(record);
    const key = `${record["Партнер"]}_${actualDirection}`;
    if (!partnerMap.has(key)) {
      partnerMap.set(key, []);
    }
    partnerMap.get(key)!.push(record);
  });
  
  const stats: PartnerStats[] = [];
  const now = new Date();
  
  partnerMap.forEach((partnerRecords, key) => {
    const partner = partnerRecords[0]["Партнер"];
    const direction = getActualDirection(partnerRecords[0]);
    
    // Sort by date
    const sortedRecords = partnerRecords.sort((a, b) => 
      parseISO(a["Дата заказа (orders)"]).getTime() - parseISO(b["Дата заказа (orders)"]).getTime()
    );
    
    const firstOrderDate = parseISO(sortedRecords[0]["Дата заказа (orders)"]);
    const lastOrderDate = parseISO(sortedRecords[sortedRecords.length - 1]["Дата заказа (orders)"]);
    const totalDays = differenceInDays(lastOrderDate, firstOrderDate) || 1;
    const daysSinceLastOrder = differenceInDays(now, lastOrderDate);
    
    // Count unique SKUs and warehouses
    const uniqueSKU = new Set(partnerRecords.map(r => r["Артикул"])).size;
    const uniqueWarehouses = new Set(partnerRecords.map(r => r["Склад"])).size;
    
    // Calculate daily orders
    const ordersByDay = new Map<string, number>();
    partnerRecords.forEach(record => {
      const dateKey = record["Дата заказа (orders)"].split(' ')[0];
      ordersByDay.set(dateKey, (ordersByDay.get(dateKey) || 0) + 1);
    });
    
    const dailyOrderCounts = Array.from(ordersByDay.values());
    const avgOrdersPerDay = partnerRecords.length / totalDays;
    const medianOrdersPerDay = median(dailyOrderCounts);
    
    // Calculate order frequency (average days between orders)
    const orderDates = Array.from(ordersByDay.keys()).map(d => parseISO(d)).sort((a, b) => a.getTime() - b.getTime());
    const intervals: number[] = [];
    for (let i = 1; i < orderDates.length; i++) {
      intervals.push(differenceInDays(orderDates[i], orderDates[i - 1]));
    }
    const orderFrequency = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : totalDays;
    
    // Calculate volatility
    const volatility = coefficientOfVariation(dailyOrderCounts);
    
    // Determine if active (ordered in last 30 days)
    const isActive = daysSinceLastOrder <= 30;
    
    // Determine if churned (no orders in 60+ days)
    const isChurned = daysSinceLastOrder > 60;
    
    // Calculate alerts and churn risk
    const alerts: Alert[] = [];
    let churnRisk = 0;
    
    // Check for declining orders (last 30 days vs previous 30 days)
    const last30Days = filterByTimeRange(partnerRecords, 30);
    const previous30Days = partnerRecords.filter(r => {
      const date = parseISO(r["Дата заказа (orders)"]);
      const cutoffStart = subDays(now, 60);
      const cutoffEnd = subDays(now, 30);
      return date >= cutoffStart && date < cutoffEnd;
    });
    
    if (previous30Days.length > 0) {
      const decline = ((previous30Days.length - last30Days.length) / previous30Days.length) * 100;
      if (decline > 30) {
        alerts.push({
          type: 'partner',
          severity: 'high',
          message: `Падение заказов на ${decline.toFixed(0)}% за последние 30 дней`,
          metric: 'order_decline',
          value: decline
        });
        churnRisk += 30;
      }
    }
    
    // Check for increased interval
    if (daysSinceLastOrder > orderFrequency * 1.5) {
      alerts.push({
        type: 'partner',
        severity: 'medium',
        message: `Интервал с последнего заказа (${daysSinceLastOrder} дней) превышает медианный (${orderFrequency.toFixed(1)} дней)`,
        metric: 'order_interval',
        value: daysSinceLastOrder,
        threshold: orderFrequency * 1.5
      });
      churnRisk += 25;
    }
    
    // Check for low SKU count
    if (uniqueSKU < 3 && partnerRecords.length > 10) {
      alerts.push({
        type: 'partner',
        severity: 'low',
        message: `Низкое количество активных SKU (${uniqueSKU})`,
        metric: 'sku_count',
        value: uniqueSKU
      });
      churnRisk += 15;
    }
    
    // Check for high volatility
    if (volatility > 1.5) {
      alerts.push({
        type: 'partner',
        severity: 'low',
        message: `Высокая волатильность заказов (CV=${volatility.toFixed(2)})`,
        metric: 'volatility',
        value: volatility
      });
      churnRisk += 10;
    }
    
    // Check for inactivity
    if (daysSinceLastOrder > 60) {
      alerts.push({
        type: 'partner',
        severity: 'high',
        message: `Клиент отвалился (churned): нет заказов ${daysSinceLastOrder} дней`,
        metric: 'churned',
        value: daysSinceLastOrder
      });
      churnRisk = 100; // Maximum risk for churned clients
    } else if (daysSinceLastOrder > 30) {
      alerts.push({
        type: 'partner',
        severity: 'high',
        message: `Нет заказов ${daysSinceLastOrder} дней`,
        metric: 'inactivity',
        value: daysSinceLastOrder
      });
      churnRisk += 40;
    }
    
    stats.push({
      partner,
      direction,
      totalOrders: partnerRecords.length,
      uniqueSKU,
      uniqueWarehouses,
      avgOrdersPerDay,
      medianOrdersPerDay,
      orderFrequency,
      volatility,
      lastOrderDate,
      firstOrderDate,
      daysSinceLastOrder,
      isActive,
      isChurned,
      churnRisk: Math.min(100, churnRisk),
      alerts
    });
  });
  
  return stats.sort((a, b) => b.totalOrders - a.totalOrders);
}

export function calculateSKUStats(records: OrderRecord[]): SKUStats[] {
  const skuMap = new Map<string, OrderRecord[]>();
  
  records.forEach(record => {
    const actualDirection = getActualDirection(record);
    const key = `${record["Артикул"]}_${record["Партнер"]}_${actualDirection}`;
    if (!skuMap.has(key)) {
      skuMap.set(key, []);
    }
    skuMap.get(key)!.push(record);
  });
  
  const stats: SKUStats[] = [];
  const now = new Date();
  
  skuMap.forEach((skuRecords, key) => {
    const sku = skuRecords[0]["Артикул"];
    const partner = skuRecords[0]["Партнер"];
    const direction = getActualDirection(skuRecords[0]);
    
    const sortedRecords = skuRecords.sort((a, b) => 
      parseISO(a["Дата заказа (orders)"]).getTime() - parseISO(b["Дата заказа (orders)"]).getTime()
    );
    
    const firstOrderDate = parseISO(sortedRecords[0]["Дата заказа (orders)"]);
    const lastOrderDate = parseISO(sortedRecords[sortedRecords.length - 1]["Дата заказа (orders)"]);
    const totalDays = differenceInDays(lastOrderDate, firstOrderDate) || 1;
    const daysSinceLastOrder = differenceInDays(now, lastOrderDate);
    
    const ordersByDay = new Map<string, number>();
    skuRecords.forEach(record => {
      const dateKey = record["Дата заказа (orders)"].split(' ')[0];
      ordersByDay.set(dateKey, (ordersByDay.get(dateKey) || 0) + 1);
    });
    
    const dailyOrderCounts = Array.from(ordersByDay.values());
    const avgOrdersPerDay = skuRecords.length / totalDays;
    const medianOrdersPerDay = median(dailyOrderCounts);
    
    const orderDates = Array.from(ordersByDay.keys()).map(d => parseISO(d)).sort((a, b) => a.getTime() - b.getTime());
    const intervals: number[] = [];
    for (let i = 1; i < orderDates.length; i++) {
      intervals.push(differenceInDays(orderDates[i], orderDates[i - 1]));
    }
    const orderFrequency = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : totalDays;
    
    const alerts: Alert[] = [];
    
    // Check for low frequency
    if (avgOrdersPerDay < 0.5 && skuRecords.length > 5) {
      alerts.push({
        type: 'sku',
        severity: 'low',
        message: `Низкая частота заказов (${avgOrdersPerDay.toFixed(2)} заказов/день)`,
        metric: 'low_frequency',
        value: avgOrdersPerDay
      });
    }
    
    // Check for gaps in orders
    if (daysSinceLastOrder > 30) {
      alerts.push({
        type: 'sku',
        severity: 'medium',
        message: `Нет заказов ${daysSinceLastOrder} дней`,
        metric: 'order_gap',
        value: daysSinceLastOrder
      });
    }
    
    stats.push({
      sku,
      partner,
      direction,
      totalOrders: skuRecords.length,
      avgOrdersPerDay,
      medianOrdersPerDay,
      lastOrderDate,
      daysSinceLastOrder,
      orderFrequency,
      alerts
    });
  });
  
  return stats.sort((a, b) => b.totalOrders - a.totalOrders);
}

export function calculateDirectionStats(records: OrderRecord[]): DirectionStats[] {
  const directionMap = new Map<string, OrderRecord[]>();
  
  records.forEach(record => {
    const direction = record["Направление (расчёт)"];
    if (!directionMap.has(direction)) {
      directionMap.set(direction, []);
    }
    directionMap.get(direction)!.push(record);
  });
  
  const stats: DirectionStats[] = [];
  
  directionMap.forEach((directionRecords, direction) => {
    const partners = new Set(directionRecords.map(r => r["Партнер"]));
    const skus = new Set(directionRecords.map(r => r["Артикул"]));
    
    const ordersPerPartner: number[] = [];
    partners.forEach(partner => {
      const partnerOrders = directionRecords.filter(r => r["Партнер"] === partner);
      ordersPerPartner.push(partnerOrders.length);
    });
    
    const avgOrdersPerPartner = ordersPerPartner.reduce((a, b) => a + b, 0) / ordersPerPartner.length;
    const medianOrdersPerPartner = median(ordersPerPartner);
    
    stats.push({
      direction,
      totalOrders: directionRecords.length,
      totalPartners: partners.size,
      totalSKU: skus.size,
      avgOrdersPerPartner,
      medianOrdersPerPartner
    });
  });
  
  return stats.sort((a, b) => b.totalOrders - a.totalOrders);
}

export function analyzeSuccessPatterns(partnerStats: PartnerStats[]): {
  successful: ChurnPattern;
  unsuccessful: ChurnPattern;
} {
  // Only analyze active partners (exclude churned)
  const activePartners = partnerStats.filter(p => !p.isChurned);
  
  // Sort by churn risk
  const sorted = [...activePartners].sort((a, b) => a.churnRisk - b.churnRisk);
  
  // Take bottom 30% as successful, top 30% as unsuccessful
  const successfulCount = Math.max(1, Math.floor(sorted.length * 0.3));
  const unsuccessfulCount = Math.max(1, Math.floor(sorted.length * 0.3));
  
  const successful = sorted.slice(0, successfulCount);
  const unsuccessful = sorted.slice(-unsuccessfulCount);
  
  const calculatePattern = (partners: PartnerStats[]): ChurnPattern => {
    if (partners.length === 0) {
      return {
        avgOrderFrequency: 0,
        medianOrderFrequency: 0,
        avgSKUCount: 0,
        medianSKUCount: 0,
        avgWarehouseCount: 0,
        medianWarehouseCount: 0,
        avgVolatility: 0,
        medianVolatility: 0
      };
    }
    
    const frequencies = partners.map(p => p.orderFrequency);
    const skuCounts = partners.map(p => p.uniqueSKU);
    const warehouseCounts = partners.map(p => p.uniqueWarehouses);
    const volatilities = partners.map(p => p.volatility);
    
    return {
      avgOrderFrequency: frequencies.reduce((a, b) => a + b, 0) / frequencies.length,
      medianOrderFrequency: median(frequencies),
      avgSKUCount: skuCounts.reduce((a, b) => a + b, 0) / skuCounts.length,
      medianSKUCount: median(skuCounts),
      avgWarehouseCount: warehouseCounts.reduce((a, b) => a + b, 0) / warehouseCounts.length,
      medianWarehouseCount: median(warehouseCounts),
      avgVolatility: volatilities.reduce((a, b) => a + b, 0) / volatilities.length,
      medianVolatility: median(volatilities)
    };
  };
  
  return {
    successful: calculatePattern(successful),
    unsuccessful: calculatePattern(unsuccessful)
  };
}

