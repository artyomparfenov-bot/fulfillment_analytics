import { parseISO, differenceInDays, subDays, format } from 'date-fns';
import type { OrderRecord } from '../client/src/lib/types';
import type { InsertAlert } from '../drizzle/schema';

export interface PartnerBenchmark {
  partnerId: string;
  avgOrdersPerDay7d: number;
  avgOrdersPerDay30d: number;
  orderInterval7d: number;
  orderInterval30d: number;
  volatility7d: number;
  volatility30d: number;
  warehouseCount: number;
  skuCount: number;
}

export interface AnomalyAlert {
  partnerId: string;
  skuId?: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeframe: '7d' | '30d';
  message: string;
  benchmarkValue?: string;
  currentValue?: string;
  percentageChange?: string;
  direction?: string;
}

/**
 * Calculate benchmarks for a partner across different timeframes
 */
export function calculatePartnerBenchmarks(
  allData: OrderRecord[],
  partnerId: string
): PartnerBenchmark {
  const now = new Date();
  
  // Get partner's orders
  const partnerOrders = allData.filter(r => r["Партнер"] === partnerId);
  
  if (partnerOrders.length === 0) {
    return {
      partnerId,
      avgOrdersPerDay7d: 0,
      avgOrdersPerDay30d: 0,
      orderInterval7d: 0,
      orderInterval30d: 0,
      volatility7d: 0,
      volatility30d: 0,
      warehouseCount: 0,
      skuCount: 0,
    };
  }
  
  // 7-day metrics
  const orders7d = partnerOrders.filter(r => {
    const date = parseISO(r["Дата заказа (orders)"]);
    return date >= subDays(now, 7);
  });
  
  // 30-day metrics
  const orders30d = partnerOrders.filter(r => {
    const date = parseISO(r["Дата заказа (orders)"]);
    return date >= subDays(now, 30);
  });
  
  // Calculate avg orders per day
  const avgOrdersPerDay7d = orders7d.length / 7;
  const avgOrdersPerDay30d = orders30d.length / 30;
  
  // Calculate order intervals (days between orders)
  const getOrderIntervals = (orders: OrderRecord[]) => {
    if (orders.length < 2) return [];
    
    const dates = orders
      .map(r => parseISO(r["Дата заказа (orders)"]))
      .sort((a, b) => a.getTime() - b.getTime());
    
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      intervals.push(differenceInDays(dates[i], dates[i - 1]));
    }
    return intervals;
  };
  
  const intervals7d = getOrderIntervals(orders7d);
  const intervals30d = getOrderIntervals(orders30d);
  
  const avgInterval7d = intervals7d.length > 0 
    ? intervals7d.reduce((a, b) => a + b, 0) / intervals7d.length 
    : 0;
  
  const avgInterval30d = intervals30d.length > 0 
    ? intervals30d.reduce((a, b) => a + b, 0) / intervals30d.length 
    : 0;
  
  // Calculate volatility (coefficient of variation)
  const calculateVolatility = (intervals: number[]) => {
    if (intervals.length === 0) return 0;
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (mean === 0) return 0;
    const variance = intervals.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / intervals.length;
    return Math.sqrt(variance) / mean;
  };
  
  const volatility7d = calculateVolatility(intervals7d);
  const volatility30d = calculateVolatility(intervals30d);
  
  // Warehouse and SKU counts
  const warehouseCount = new Set(partnerOrders.map(r => r["Склад"])).size;
  const skuCount = new Set(partnerOrders.map(r => r["Артикул"])).size;
  
  return {
    partnerId,
    avgOrdersPerDay7d,
    avgOrdersPerDay30d,
    orderInterval7d: avgInterval7d,
    orderInterval30d: avgInterval30d,
    volatility7d,
    volatility30d,
    warehouseCount,
    skuCount,
  };
}

/**
 * Detect anomalies for a partner by comparing 7d and 30d metrics
 */
export function detectPartnerAnomalies(
  allData: OrderRecord[],
  partnerId: string,
  historicalBenchmarks?: Map<string, PartnerBenchmark>
): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];
  const now = new Date();
  
  const benchmark = calculatePartnerBenchmarks(allData, partnerId);
  const historicalBenchmark = historicalBenchmarks?.get(partnerId);
  
  // 1. Order Decline Alert (7d vs 30d)
  if (benchmark.avgOrdersPerDay30d > 0) {
    const decline = ((benchmark.avgOrdersPerDay7d - benchmark.avgOrdersPerDay30d) / benchmark.avgOrdersPerDay30d) * 100;
    
    if (decline < -30) {
      alerts.push({
        partnerId,
        alertType: 'order_decline',
        severity: decline < -50 ? 'high' : 'medium',
        timeframe: '7d',
        message: `Заказы упали на ${Math.abs(decline).toFixed(1)}% за последние 7 дней`,
        benchmarkValue: benchmark.avgOrdersPerDay30d.toFixed(2),
        currentValue: benchmark.avgOrdersPerDay7d.toFixed(2),
        percentageChange: decline.toFixed(1),
        direction: 'down',
      });
    }
  }
  
  // 2. Churn Risk Alert (increasing order interval)
  if (benchmark.orderInterval30d > 0 && benchmark.orderInterval7d > benchmark.orderInterval30d) {
    const intervalIncrease = ((benchmark.orderInterval7d - benchmark.orderInterval30d) / benchmark.orderInterval30d) * 100;
    
    if (intervalIncrease > 25) {
      alerts.push({
        partnerId,
        alertType: 'churn_risk',
        severity: intervalIncrease > 50 ? 'high' : 'medium',
        timeframe: '7d',
        message: `Интервал между заказами вырос на ${intervalIncrease.toFixed(1)}%`,
        benchmarkValue: benchmark.orderInterval30d.toFixed(2),
        currentValue: benchmark.orderInterval7d.toFixed(2),
        percentageChange: intervalIncrease.toFixed(1),
        direction: 'up',
      });
    }
  }
  
  // 3. Volatility Spike Alert
  if (benchmark.volatility30d > 0) {
    const volatilityIncrease = ((benchmark.volatility7d - benchmark.volatility30d) / benchmark.volatility30d) * 100;
    
    if (volatilityIncrease > 40) {
      alerts.push({
        partnerId,
        alertType: 'volatility_spike',
        severity: volatilityIncrease > 80 ? 'high' : 'medium',
        timeframe: '7d',
        message: `Волатильность заказов выросла на ${volatilityIncrease.toFixed(1)}%`,
        benchmarkValue: benchmark.volatility30d.toFixed(2),
        currentValue: benchmark.volatility7d.toFixed(2),
        percentageChange: volatilityIncrease.toFixed(1),
        direction: 'up',
      });
    }
  }
  
  // 4. Warehouse Anomaly Alert
  const orders7d = allData.filter(r => {
    return r["Партнер"] === partnerId && 
           parseISO(r["Дата заказа (orders)"]) >= subDays(now, 7);
  });
  
  const orders30d = allData.filter(r => {
    return r["Партнер"] === partnerId && 
           parseISO(r["Дата заказа (orders)"]) >= subDays(now, 30);
  });
  
  const warehouseCount7d = new Set(orders7d.map(r => r["Склад"])).size;
  const warehouseCount30d = new Set(orders30d.map(r => r["Склад"])).size;
  
  if (warehouseCount30d > 0 && warehouseCount7d < warehouseCount30d * 0.5) {
    alerts.push({
      partnerId,
      alertType: 'warehouse_anomaly',
      severity: 'medium',
      timeframe: '7d',
      message: `Количество активных складов снизилось с ${warehouseCount30d} до ${warehouseCount7d}`,
      benchmarkValue: warehouseCount30d.toString(),
      currentValue: warehouseCount7d.toString(),
      direction: 'down',
    });
  }
  
  return alerts;
}

/**
 * Detect SKU-level anomalies
 */
export function detectSKUAnomalies(
  allData: OrderRecord[],
  partnerId: string
): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];
  const now = new Date();
  
  const partnerSKUs = new Set(
    allData
      .filter(r => r["Партнер"] === partnerId)
      .map(r => r["Артикул"])
  );
  
  partnerSKUs.forEach(sku => {
    const skuOrders = allData.filter(r => r["Партнер"] === partnerId && r["Артикул"] === sku);
    
    if (skuOrders.length === 0) return;
    
    // Check for SKU churn (no orders in 30+ days)
    const lastOrder = skuOrders
      .map(r => parseISO(r["Дата заказа (orders)"]))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    
    const daysSinceLastOrder = differenceInDays(now, lastOrder);
    
    if (daysSinceLastOrder > 30 && daysSinceLastOrder <= 60) {
      alerts.push({
        partnerId,
        skuId: sku,
        alertType: 'sku_churn',
        severity: 'medium',
        timeframe: '30d',
        message: `SKU не заказывался ${daysSinceLastOrder} дней`,
        currentValue: daysSinceLastOrder.toString(),
        direction: 'up',
      });
    } else if (daysSinceLastOrder > 60) {
      alerts.push({
        partnerId,
        skuId: sku,
        alertType: 'sku_churn',
        severity: 'high',
        timeframe: '30d',
        message: `SKU отвалился: ${daysSinceLastOrder} дней без заказов`,
        currentValue: daysSinceLastOrder.toString(),
        direction: 'up',
      });
    }
    
    // Check for SKU decline (7d vs 30d)
    const orders7d = skuOrders.filter(r => 
      parseISO(r["Дата заказа (orders)"]) >= subDays(now, 7)
    );
    
    const orders30d = skuOrders.filter(r => 
      parseISO(r["Дата заказа (orders)"]) >= subDays(now, 30)
    );
    
    if (orders30d.length > 0) {
      const decline = ((orders7d.length - orders30d.length) / orders30d.length) * 100;
      
      if (decline < -50) {
        alerts.push({
          partnerId,
          skuId: sku,
          alertType: 'order_decline',
          severity: 'medium',
          timeframe: '7d',
          message: `SKU заказов упали на ${Math.abs(decline).toFixed(1)}%`,
          benchmarkValue: orders30d.length.toString(),
          currentValue: orders7d.length.toString(),
          percentageChange: decline.toFixed(1),
          direction: 'down',
        });
      }
    }
  });
  
  return alerts;
}

/**
 * Generate all alerts for all partners
 */
export function generateAllAlerts(
  allData: OrderRecord[],
  historicalBenchmarks?: Map<string, PartnerBenchmark>
): AnomalyAlert[] {
  const allAlerts: AnomalyAlert[] = [];
  const partners = new Set(allData.map(r => r["Партнер"]).filter(Boolean));
  
  partners.forEach(partnerId => {
    const partnerAlerts = detectPartnerAnomalies(allData, partnerId, historicalBenchmarks);
    const skuAlerts = detectSKUAnomalies(allData, partnerId);
    
    allAlerts.push(...partnerAlerts, ...skuAlerts);
  });
  
  return allAlerts;
}

/**
 * Convert anomaly alerts to database insert format
 */
export function anomalyToDbAlert(anomaly: AnomalyAlert): InsertAlert {
  return {
    partnerId: anomaly.partnerId,
    skuId: anomaly.skuId,
    alertType: anomaly.alertType as any,
    severity: anomaly.severity,
    timeframe: anomaly.timeframe,
    message: anomaly.message,
    benchmarkValue: anomaly.benchmarkValue,
    currentValue: anomaly.currentValue,
    percentageChange: anomaly.percentageChange,
    direction: anomaly.direction,
    isResolved: 0,
  };
}

