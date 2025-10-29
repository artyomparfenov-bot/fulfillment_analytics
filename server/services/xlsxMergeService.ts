/**
 * XLSX Merger Service
 * Handles merging of XLSX files (orders and reports) into unified data
 * Based on the Python merge_to_csv.py logic
 */

import XLSX from "xlsx";
import { readFileSync } from "fs";

export interface MergeResult {
  success: boolean;
  mergedData: any[];
  stats: MergeStats;
  error?: string;
}

export interface MergeStats {
  ordersRowsRead: number;
  reportsRowsRead: number;
  ordersRowsMissingId: number;
  reportsRowsMissingId: number;
  ordersUniqueIds: number;
  ordersDuplicateIdsDropped: number;
  ordersWithReportMatch: number;
  ordersWithoutReportMatch: number;
  reportRowsUsedLastWins: number;
  coveragePercent: number;
  outputRows: number;
  outputColumns: number;
  warehouseTop10: Record<string, number>;
  marketplaceTop10: Record<string, number>;
  directionBreakdown: Record<string, number>;
  qualityChecks: {
    badDateRows: number;
    negativeOrZeroUnits: number;
    weightAnomalies: number;
    nullsPerCriticalField: Record<string, number>;
  };
}

const FINAL_COLUMNS = [
  "Партнер",
  "№ заказа ДС",
  "ID заказа",
  "Тип заказа",
  "Товаров",
  "Общий вес",
  "Склад",
  "Статус",
  "Дата заказа (orders)",
  "Честные знаки",
  "Площадка",
  "Артикул",
  "Вес (report)",
  "Кол-во",
  "Склад (report)",
  "Статус (report)",
  "Дата заказа (report)",
  "Направление (расчёт)",
  "Маркетплейс (норм.)",
  "Файл-источник",
  "Последнее обновление"
];

function normalizeColumnName(col: string): string {
  if (!col) return "";
  return String(col).trim().toLowerCase().replace(/\s+/g, " ");
}

function detectFileType(headers: string[]): "orders" | "reports" | "unknown" {
  const normalizedHeaders = headers.map(normalizeColumnName);
  const hasPartner = normalizedHeaders.some(h => h.includes("партнер"));
  const hasItems = normalizedHeaders.some(h => h.includes("товаров"));
  const hasPlatform = normalizedHeaders.some(h => h.includes("площадка"));
  const hasArticle = normalizedHeaders.some(h => h.includes("артикул"));

  if (hasPlatform && hasArticle) {
    return "reports";
  } else if (hasPartner && hasItems) {
    return "orders";
  }
  return "unknown";
}

function mapOrdersColumns(row: any, headers: string[]): any {
  const result: any = {};

  const columnMapping: Record<string, string> = {
    "партнер": "Партнер",
    "№ заказа дс": "№ заказа ДС",
    "id заказа": "ID заказа",
    "тип заказа": "Тип заказа",
    "товаров": "Товаров",
    "общий вес": "Общий вес",
    "склад": "Склад",
    "статус": "Статус",
    "дата заказа": "Дата заказа (orders)",
    "честные знаки": "Честные знаки"
  };

  headers.forEach((header) => {
    const normalized = normalizeColumnName(header);
    const mappedName = columnMapping[normalized];
    if (mappedName && row.hasOwnProperty(header)) {
      result[mappedName] = row[header] || "";
    }
  });

  return result;
}

function mapReportsColumns(row: any, headers: string[]): any {
  const result: any = {};

  const columnMapping: Record<string, string> = {
    "id заказа": "ID заказа",
    "площадка": "Площадка",
    "артикул": "Артикул",
    "вес": "Вес (report)",
    "кол-во": "Кол-во",
    "склад": "Склад (report)",
    "статус": "Статус (report)",
    "дата заказа": "Дата заказа (report)",
    "честные знаки": "Честные знаки"
  };

  headers.forEach((header) => {
    const normalized = normalizeColumnName(header);
    const mappedName = columnMapping[normalized];
    if (mappedName && row.hasOwnProperty(header)) {
      result[mappedName] = row[header] || "";
    }
  });

  return result;
}

function safeStr(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function safeInt(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  try {
    const num = parseInt(String(value), 10);
    return isNaN(num) ? null : num;
  } catch {
    return null;
  }
}

function safeFloat(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  try {
    const num = parseFloat(String(value));
    return isNaN(num) ? null : num;
  } catch {
    return null;
  }
}

function parseDate(value: any): string {
  if (!value) return "";
  try {
    let date: Date;
    
    if (typeof value === "number") {
      // Excel date serial number
      date = new Date((value - 25569) * 86400 * 1000);
    } else {
      date = new Date(String(value));
    }
    
    if (isNaN(date.getTime())) return "";
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch {
    return "";
  }
}

function calculateDirection(warehouse: string): string {
  if (!warehouse) return "";
  const warehouseStr = String(warehouse).toLowerCase();
  
  // Check for specific warehouses
  if (warehouseStr.includes("ярославка") || warehouseStr.includes("yaroslavka")) {
    return "Ярославка";
  }
  if (warehouseStr.includes("vsrok") || warehouseStr.includes("в-срок")) {
    return "VSROK";
  }
  if (warehouseStr.includes("express") || warehouseStr.includes("fbs") || warehouseStr.includes("экспресс")) {
    return "Express/FBS";
  }
  
  // Default to Express/FBS for unknown warehouses
  return "Express/FBS";
}

function normalizeMarketplace(platform: string, orderType: string): string {
  if (platform && String(platform).trim()) {
    return String(platform).trim();
  }
  if (!orderType) return "";
  const upper = String(orderType).toUpperCase();
  if (upper.includes("OZON")) return "OZON";
  if (upper.includes("WILDBERRIES")) return "Wildberries";
  if (upper.includes("YANDEX")) return "YandexMarket";
  return "";
}

export function mergeXlsxFiles(
  ordersFilePath: string,
  reportsFilePath: string
): MergeResult {
  const stats: MergeStats = {
    ordersRowsRead: 0,
    reportsRowsRead: 0,
    ordersRowsMissingId: 0,
    reportsRowsMissingId: 0,
    ordersUniqueIds: 0,
    ordersDuplicateIdsDropped: 0,
    ordersWithReportMatch: 0,
    ordersWithoutReportMatch: 0,
    reportRowsUsedLastWins: 0,
    coveragePercent: 0,
    outputRows: 0,
    outputColumns: 0,
    warehouseTop10: {},
    marketplaceTop10: {},
    directionBreakdown: {},
    qualityChecks: {
      badDateRows: 0,
      negativeOrZeroUnits: 0,
      weightAnomalies: 0,
      nullsPerCriticalField: {}
    }
  };

  try {
    // Read Orders XLSX
    console.log(`[XLSX Merge] Reading Orders from: ${ordersFilePath}`);
    const ordersBuffer = readFileSync(ordersFilePath);
    console.log(`[XLSX Merge] Orders buffer size: ${ordersBuffer.length} bytes`);
    
    let ordersWorkbook;
    try {
      ordersWorkbook = XLSX.read(ordersBuffer, { type: "buffer" });
    } catch (xlsxError) {
      console.error(`[XLSX Merge] Failed to parse Orders XLSX:`, xlsxError);
      return {
        success: false,
        mergedData: [],
        stats,
        error: `Failed to parse Orders file: ${xlsxError instanceof Error ? xlsxError.message : "Invalid XLSX format"}`
      };
    }
    
    const ordersSheet = ordersWorkbook.Sheets[ordersWorkbook.SheetNames[0]];
    if (!ordersSheet) {
      return {
        success: false,
        mergedData: [],
        stats,
        error: "Orders XLSX has no sheets"
      };
    }
    
    const ordersData = XLSX.utils.sheet_to_json(ordersSheet);

    if (!ordersData || ordersData.length === 0) {
      return {
        success: false,
        mergedData: [],
        stats,
        error: "Orders XLSX is empty"
      };
    }

    const ordersHeaders = Object.keys(ordersData[0] as any);
    const ordersType = detectFileType(ordersHeaders);

    if (ordersType !== "orders") {
      return {
        success: false,
        mergedData: [],
        stats,
        error: "First file does not appear to be Orders data"
      };
    }

    // Read Reports XLSX
    console.log(`[XLSX Merge] Reading Reports from: ${reportsFilePath}`);
    const reportsBuffer = readFileSync(reportsFilePath);
    console.log(`[XLSX Merge] Reports buffer size: ${reportsBuffer.length} bytes`);
    
    let reportsWorkbook;
    try {
      reportsWorkbook = XLSX.read(reportsBuffer, { type: "buffer" });
    } catch (xlsxError) {
      console.error(`[XLSX Merge] Failed to parse Reports XLSX:`, xlsxError);
      return {
        success: false,
        mergedData: [],
        stats,
        error: `Failed to parse Reports file: ${xlsxError instanceof Error ? xlsxError.message : "Invalid XLSX format"}`
      };
    }
    
    const reportsSheet = reportsWorkbook.Sheets[reportsWorkbook.SheetNames[0]];
    if (!reportsSheet) {
      return {
        success: false,
        mergedData: [],
        stats,
        error: "Reports XLSX has no sheets"
      };
    }
    
    const reportsData = XLSX.utils.sheet_to_json(reportsSheet);

    const reportsHeaders = reportsData && reportsData.length > 0
      ? Object.keys(reportsData[0] as any)
      : [];

    const reportsType = reportsData && reportsData.length > 0
      ? detectFileType(reportsHeaders)
      : "unknown";

    if (reportsType !== "reports") {
      return {
        success: false,
        mergedData: [],
        stats,
        error: "Second file does not appear to be Reports data"
      };
    }

    // Process Orders
    const orders: any[] = [];
    const orderIds = new Set<string>();
    let duplicatesCount = 0;

    (ordersData as any[]).forEach((row) => {
      const mapped = mapOrdersColumns(row, ordersHeaders);
      const id = safeStr(mapped["ID заказа"]);

      if (!id) {
        stats.ordersRowsMissingId++;
        return;
      }

      if (orderIds.has(id)) {
        duplicatesCount++;
        return;
      }

      orderIds.add(id);
      orders.push(mapped);
    });

    stats.ordersRowsRead = (ordersData as any[]).length;
    stats.ordersUniqueIds = orders.length;
    stats.ordersDuplicateIdsDropped = duplicatesCount;

    // Process Reports
    const reports: Map<string, any> = new Map();

    ((reportsData || []) as any[]).forEach((row) => {
      const mapped = mapReportsColumns(row, reportsHeaders);
      const id = safeStr(mapped["ID заказа"]);

      if (!id) {
        stats.reportsRowsMissingId++;
        return;
      }

      reports.set(id, mapped);
    });

    stats.reportsRowsRead = (reportsData || []).length;
    stats.reportRowsUsedLastWins = reports.size;

    // Merge Orders + Reports
    const merged: any[] = [];
    const warehouseCount: Record<string, number> = {};
    const marketplaceCount: Record<string, number> = {};
    const directionCount: Record<string, number> = {};

    orders.forEach((order) => {
      const id = order["ID заказа"];
      const report = reports.get(id);

      const row: any = { ...order };

      if (report) {
        row["Площадка"] = report["Площадка"] || "";
        row["Артикул"] = report["Артикул"] || "";
        row["Вес (report)"] = report["Вес (report)"] || "";
        row["Кол-во"] = report["Кол-во"] || "";
        row["Склад (report)"] = report["Склад (report)"] || "";
        row["Статус (report)"] = report["Статус (report)"] || "";
        row["Дата заказа (report)"] = report["Дата заказа (report)"] || "";
        stats.ordersWithReportMatch++;
      } else {
        stats.ordersWithoutReportMatch++;
      }

      // Transform data
      row["Товаров"] = safeInt(row["Товаров"]);
      row["Общий вес"] = safeFloat(row["Общий вес"]);
      row["Кол-во"] = safeInt(row["Кол-во"]);
      row["Вес (report)"] = safeFloat(row["Вес (report)"]);

      row["Дата заказа (orders)"] = parseDate(row["Дата заказа (orders)"]);
      row["Дата заказа (report)"] = parseDate(row["Дата заказа (report)"]);

      row["Направление (расчёт)"] = calculateDirection(row["Склад"]);
      row["Маркетплейс (норм.)"] = normalizeMarketplace(
        row["Площадка"],
        row["Тип заказа"]
      );

      row["Файл-источник"] = "merged";
      row["Последнее обновление"] = new Date().toISOString().split('T')[0] + " " + new Date().toTimeString().split(' ')[0];

      // Count distributions
      const warehouse = row["Склад"];
      if (warehouse) {
        warehouseCount[warehouse] = (warehouseCount[warehouse] || 0) + 1;
      }

      const marketplace = row["Маркетплейс (норм.)"];
      if (marketplace) {
        marketplaceCount[marketplace] = (marketplaceCount[marketplace] || 0) + 1;
      }

      const direction = row["Направление (расчёт)"];
      if (direction) {
        directionCount[direction] = (directionCount[direction] || 0) + 1;
      }

      // Quality checks
      if (!row["Дата заказа (orders)"]) {
        stats.qualityChecks.badDateRows++;
      }

      const qty = row["Кол-во"];
      if (qty !== null && qty <= 0) {
        stats.qualityChecks.negativeOrZeroUnits++;
      }

      const weight = row["Вес (report)"];
      if (weight !== null && weight < 0) {
        stats.qualityChecks.weightAnomalies++;
      }

      merged.push(row);
    });

    // Prepare final output
    const final: any[] = merged.map((row) => {
      const result: any = {};
      FINAL_COLUMNS.forEach((col) => {
        result[col] = row[col] ?? "";
      });
      return result;
    });

    stats.outputRows = final.length;
    stats.outputColumns = FINAL_COLUMNS.length;
    stats.warehouseTop10 = Object.fromEntries(
      Object.entries(warehouseCount)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
    );
    stats.marketplaceTop10 = Object.fromEntries(
      Object.entries(marketplaceCount)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
    );
    stats.directionBreakdown = directionCount;
    stats.qualityChecks.nullsPerCriticalField = {
      "ID заказа": stats.ordersRowsMissingId,
      "Склад": Object.values(final).filter((r: any) => !r["Склад"]).length,
      "Дата заказа (orders)": stats.qualityChecks.badDateRows
    };

    return {
      success: true,
      mergedData: final,
      stats
    };
  } catch (error) {
    console.error(`[XLSX Merge] Unexpected error:`, error);
    return {
      success: false,
      mergedData: [],
      stats,
      error: error instanceof Error ? error.message : "Unknown error during merge"
    };
  }
}

