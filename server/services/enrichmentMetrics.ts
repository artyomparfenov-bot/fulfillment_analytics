/**
 * Enrichment Metrics Service
 * Calculates additional metrics from existing data for better insights
 */

export interface EnrichedMetrics {
  // Partner-level metrics
  partnerAOV: number; // Average Order Value
  partnerOrderCount: number;
  partnerItemsTotal: number;
  partnerAvgItemsPerOrder: number;
  partnerAvgWeightPerOrder: number;
  partnerUniqueSkus: number;
  partnerSkuPerOrder: number;
  partnerDirectionPreference: string; // Most common direction
  partnerMarketplacePreference: string; // Most common marketplace
  partnerWarehousePreference: string; // Most common warehouse
  partnerOrderFrequency: number; // Orders per day (last 30 days)
  
  // SKU-level metrics
  skuOrderCount: number;
  skuPartnerCount: number; // How many partners sell this SKU
  skuAvgWeight: number;
  skuAvgQty: number;
  skuDirectionPreference: string;
  skuMarketplacePreference: string;
  skuWarehousePreference: string;
  
  // Calculated risk metrics
  concentrationRisk: number; // 0-100, how concentrated orders are
  diversificationScore: number; // 0-100, diversity of channels
  fulfillmentScore: number; // 0-100, efficiency score
}

export function calculatePartnerMetrics(
  partnerOrders: any[],
  allOrders: any[]
): Partial<EnrichedMetrics> {
  if (partnerOrders.length === 0) {
    return {};
  }

  // Basic counts
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
    partnerAOV: itemsTotal / orderCount, // Using items as proxy for AOV
    partnerOrderCount: orderCount,
    partnerItemsTotal: itemsTotal,
    partnerAvgItemsPerOrder: avgItemsPerOrder,
    partnerAvgWeightPerOrder: avgWeightPerOrder,
    partnerUniqueSkus: uniqueSkus,
    partnerSkuPerOrder: skuPerOrder,
    partnerDirectionPreference: directionPreference,
    partnerMarketplacePreference: marketplacePreference,
    partnerWarehousePreference: warehousePreference,
    partnerOrderFrequency: orderFrequency,
    concentrationRisk: Math.round(concentrationRisk),
    diversificationScore: Math.round(diversificationScore),
    fulfillmentScore: Math.round(fulfillmentScore),
  };
}

export function calculateSkuMetrics(
  skuOrders: any[],
  allOrders: any[]
): Partial<EnrichedMetrics> {
  if (skuOrders.length === 0) {
    return {};
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
    skuOrderCount: orderCount,
    skuPartnerCount: partnerCount,
    skuAvgWeight: Math.round(avgWeight * 100) / 100,
    skuAvgQty: Math.round(avgQty * 100) / 100,
    skuDirectionPreference: directionPreference,
    skuMarketplacePreference: marketplacePreference,
    skuWarehousePreference: warehousePreference,
  };
}

// Helper functions

function countOccurrences(
  items: any[],
  field: string
): Record<string, number> {
  const counts: Record<string, number> = {};
  items.forEach((item) => {
    const value = item[field];
    if (value) {
      counts[value] = (counts[value] || 0) + 1;
    }
  });
  return counts;
}

function getTopValue(counts: Record<string, number>): string {
  if (Object.keys(counts).length === 0) return "";
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0];
}

function parseOrderDate(dateStr: string): Date | null {
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

export function enrichOrderData(order: any, partnerMetrics: any, skuMetrics: any): any {
  return {
    ...order,
    // Partner enrichment
    "Partner_AOV": partnerMetrics.partnerAOV || 0,
    "Partner_Order_Count": partnerMetrics.partnerOrderCount || 0,
    "Partner_Avg_Items_Per_Order": Math.round(partnerMetrics.partnerAvgItemsPerOrder * 100) / 100,
    "Partner_Avg_Weight_Per_Order": Math.round(partnerMetrics.partnerAvgWeightPerOrder * 100) / 100,
    "Partner_Unique_SKUs": partnerMetrics.partnerUniqueSkus || 0,
    "Partner_Direction_Preference": partnerMetrics.partnerDirectionPreference || "",
    "Partner_Marketplace_Preference": partnerMetrics.partnerMarketplacePreference || "",
    "Partner_Order_Frequency": Math.round(partnerMetrics.partnerOrderFrequency * 100) / 100,
    "Partner_Concentration_Risk": partnerMetrics.concentrationRisk || 0,
    "Partner_Diversification_Score": partnerMetrics.diversificationScore || 0,
    "Partner_Fulfillment_Score": partnerMetrics.fulfillmentScore || 0,
    
    // SKU enrichment
    "SKU_Order_Count": skuMetrics.skuOrderCount || 0,
    "SKU_Partner_Count": skuMetrics.skuPartnerCount || 0,
    "SKU_Avg_Weight": skuMetrics.skuAvgWeight || 0,
    "SKU_Avg_Qty": skuMetrics.skuAvgQty || 0,
    "SKU_Direction_Preference": skuMetrics.skuDirectionPreference || "",
    "SKU_Marketplace_Preference": skuMetrics.skuMarketplacePreference || "",
  };
}

