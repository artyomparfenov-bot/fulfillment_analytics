/**
 * Client-side Enrichment Metrics Calculator
 * Calculates additional metrics from order data for insights
 */

import type { OrderRecord, PartnerStats } from './types';

export interface PartnerEnrichment {
  orderCount: number;
  itemsTotal: number;
  avgItemsPerOrder: number;
  avgWeightPerOrder: number;
  uniqueSkus: number;
  skuPerOrder: number;
  directionPreference: string;
  marketplacePreference: string;
  warehousePreference: string;
  orderFrequency: number; // Orders per day
  concentrationRisk: number; // 0-100
  diversificationScore: number; // 0-100
  fulfillmentScore: number; // 0-100
}

export interface SKUEnrichment {
  orderCount: number;
  partnerCount: number;
  avgWeight: number;
  avgQty: number;
  directionPreference: string;
  marketplacePreference: string;
  warehousePreference: string;
}

export function calculatePartnerEnrichment(
  partnerOrders: OrderRecord[]
): PartnerEnrichment {
  if (partnerOrders.length === 0) {
    return {
      orderCount: 0,
      itemsTotal: 0,
      avgItemsPerOrder: 0,
      avgWeightPerOrder: 0,
      uniqueSkus: 0,
      skuPerOrder: 0,
      directionPreference: "",
      marketplacePreference: "",
      warehousePreference: "",
      orderFrequency: 0,
      concentrationRisk: 0,
      diversificationScore: 100,
      fulfillmentScore: 50,
    };
  }

  const orderCount = partnerOrders.length;
  const itemsTotal = partnerOrders.reduce((sum, o) => sum + (parseInt(o["Товаров"]) || 0), 0);
  const avgItemsPerOrder = orderCount > 0 ? itemsTotal / orderCount : 0;

  // Weight calculations
  const weightsTotal = partnerOrders.reduce((sum, o) => sum + (parseFloat(o["Общий вес"]) || 0), 0);
  const avgWeightPerOrder = orderCount > 0 ? weightsTotal / orderCount : 0;

  // SKU diversity
  const uniqueSkus = new Set(partnerOrders.map(o => o["Артикул"]).filter(Boolean)).size;
  const skuPerOrder = orderCount > 0 ? uniqueSkus / orderCount : 0;

  // Direction preference
  const directionCounts = countOccurrences(partnerOrders, "Направление (расчёт)");
  const directionPreference = getTopValue(directionCounts);

  // Marketplace preference
  const marketplaceCounts = countOccurrences(partnerOrders, "Маркетплейс (норм.)");
  const marketplacePreference = getTopValue(marketplaceCounts);

  // Warehouse preference
  const warehouseCounts = countOccurrences(partnerOrders, "Склад");
  const warehousePreference = getTopValue(warehouseCounts);

  // Order frequency (orders per day in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentOrders = partnerOrders.filter((o) => {
    const orderDate = parseOrderDate(o["Дата заказа (orders)"]);
    return orderDate && orderDate >= thirtyDaysAgo;
  });
  const orderFrequency = recentOrders.length / 30;

  // Concentration risk (0-100): how concentrated orders are in one direction/marketplace
  const directionConcentration = Math.max(...Object.values(directionCounts).map((c: any) => c / orderCount)) * 100;
  const marketplaceConcentration = Math.max(...Object.values(marketplaceCounts).map((c: any) => c / orderCount)) * 100;
  const concentrationRisk = (directionConcentration + marketplaceConcentration) / 2;

  // Diversification score (0-100): inverse of concentration
  const diversificationScore = Math.max(0, 100 - concentrationRisk);

  // Fulfillment score (0-100): based on weight consistency and order regularity
  const weightVariance = calculateVariance(
    partnerOrders.map((o) => parseFloat(o["Общий вес"]) || 0)
  );
  const weightConsistency = Math.max(0, 100 - (weightVariance * 10));
  const fulfillmentScore = (weightConsistency + (orderFrequency > 0 ? 50 : 0)) / 2;

  return {
    orderCount,
    itemsTotal,
    avgItemsPerOrder,
    avgWeightPerOrder,
    uniqueSkus,
    skuPerOrder,
    directionPreference,
    marketplacePreference,
    warehousePreference,
    orderFrequency,
    concentrationRisk: Math.round(concentrationRisk),
    diversificationScore: Math.round(diversificationScore),
    fulfillmentScore: Math.round(fulfillmentScore),
  };
}

export function calculateSkuEnrichment(
  skuOrders: OrderRecord[]
): SKUEnrichment {
  if (skuOrders.length === 0) {
    return {
      orderCount: 0,
      partnerCount: 0,
      avgWeight: 0,
      avgQty: 0,
      directionPreference: "",
      marketplacePreference: "",
      warehousePreference: "",
    };
  }

  const orderCount = skuOrders.length;
  const partnerSet = new Set(skuOrders.map(o => o["Партнер"]).filter(Boolean));
  const partnerCount = partnerSet.size;

  // Weight calculations
  const weights = skuOrders
    .map((o) => parseFloat(o["Вес (report)"]) || 0)
    .filter((w) => w > 0);
  const avgWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;

  // Quantity calculations
  const quantities = skuOrders
    .map((o) => parseInt(o["Кол-во"]) || 0)
    .filter((q) => q > 0);
  const avgQty = quantities.length > 0 ? quantities.reduce((a, b) => a + b, 0) / quantities.length : 0;

  // Direction preference
  const directionCounts = countOccurrences(skuOrders, "Направление (расчёт)");
  const directionPreference = getTopValue(directionCounts);

  // Marketplace preference
  const marketplaceCounts = countOccurrences(skuOrders, "Маркетплейс (норм.)");
  const marketplacePreference = getTopValue(marketplaceCounts);

  // Warehouse preference
  const warehouseCounts = countOccurrences(skuOrders, "Склад");
  const warehousePreference = getTopValue(warehouseCounts);

  return {
    orderCount,
    partnerCount,
    avgWeight: Math.round(avgWeight * 100) / 100,
    avgQty: Math.round(avgQty * 100) / 100,
    directionPreference,
    marketplacePreference,
    warehousePreference,
  };
}

// Helper functions

function countOccurrences(
  items: OrderRecord[],
  field: keyof OrderRecord
): Record<string, number> {
  const counts: Record<string, number> = {};
  items.forEach((item) => {
    const value = item[field];
    if (value) {
      counts[String(value)] = (counts[String(value)] || 0) + 1;
    }
  });
  return counts;
}

function getTopValue(counts: Record<string, number>): string {
  if (Object.keys(counts).length === 0) return "";
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0];
}

function parseOrderDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance); // Return standard deviation
}

/**
 * Calculate enrichment metrics for all partners in dataset
 */
export function calculateAllPartnerEnrichments(
  allOrders: OrderRecord[]
): Map<string, PartnerEnrichment> {
  const partnerMap = new Map<string, OrderRecord[]>();

  // Group orders by partner
  allOrders.forEach((order) => {
    const partner = order["Партнер"];
    if (partner) {
      if (!partnerMap.has(partner)) {
        partnerMap.set(partner, []);
      }
      partnerMap.get(partner)!.push(order);
    }
  });

  // Calculate enrichment for each partner
  const enrichments = new Map<string, PartnerEnrichment>();
  partnerMap.forEach((orders, partner) => {
    enrichments.set(partner, calculatePartnerEnrichment(orders));
  });

  return enrichments;
}

/**
 * Calculate enrichment metrics for all SKUs in dataset
 */
export function calculateAllSkuEnrichments(
  allOrders: OrderRecord[]
): Map<string, SKUEnrichment> {
  const skuMap = new Map<string, OrderRecord[]>();

  // Group orders by SKU
  allOrders.forEach((order) => {
    const sku = order["Артикул"];
    if (sku) {
      if (!skuMap.has(sku)) {
        skuMap.set(sku, []);
      }
      skuMap.get(sku)!.push(order);
    }
  });

  // Calculate enrichment for each SKU
  const enrichments = new Map<string, SKUEnrichment>();
  skuMap.forEach((orders, sku) => {
    enrichments.set(sku, calculateSkuEnrichment(orders));
  });

  return enrichments;
}

