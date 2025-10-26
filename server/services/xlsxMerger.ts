/**
 * XLSX Merger Service
 * Handles merging of raw XLSX files (orders and reports) into unified CSV data
 * Based on the Python merge_to_csv.py logic
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

export interface MergeResult {
  success: boolean;
  csvData: string;
  stats: MergeStats;
  error?: string;
}

export interface MergeStats {
  totalFiles: number;
  ordersFiles: number;
  reportsFiles: number;
  errorFiles: number;
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
  minOrderDatetime?: string;
  maxOrderDatetime?: string;
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

/**
 * Merge XLSX files using Python script
 */
export async function mergeXlsxFiles(
  ordersFilePath: string,
  reportsFilePath: string
): Promise<MergeResult> {
  const tempDir = tmpdir();
  const sessionId = randomBytes(8).toString('hex');
  const outputCsvPath = join(tempDir, `merged_${sessionId}.csv`);
  const outputStatsPath = join(tempDir, `stats_${sessionId}.json`);
  const pythonScriptPath = join(tempDir, `merge_script_${sessionId}.py`);

  try {
    // Create Python merge script inline
    const pythonScript = generateMergePythonScript();
    writeFileSync(pythonScriptPath, pythonScript, 'utf-8');

    // Run Python merge script
    const command = `python3 "${pythonScriptPath}" --input "${ordersFilePath}" --input "${reportsFilePath}" --out-csv "${outputCsvPath}" --out-stats "${outputStatsPath}"`;
    
    console.log(`[XlsxMerger] Running merge command...`);
    execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

    // Read merged CSV
    const csvData = readFileSync(outputCsvPath, 'utf-8');

    // Read statistics
    let stats: MergeStats = {
      totalFiles: 2,
      ordersFiles: 0,
      reportsFiles: 0,
      errorFiles: 0,
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
      const statsJson = readFileSync(outputStatsPath, 'utf-8');
      const parsedStats = JSON.parse(statsJson);
      stats = { ...stats, ...parsedStats };
    } catch (e) {
      console.warn(`[XlsxMerger] Could not read statistics: ${e}`);
    }

    // Cleanup
    try {
      unlinkSync(outputCsvPath);
      unlinkSync(outputStatsPath);
      unlinkSync(pythonScriptPath);
    } catch (e) {
      console.warn(`[XlsxMerger] Cleanup error: ${e}`);
    }

    return {
      success: true,
      csvData,
      stats
    };
  } catch (error) {
    // Cleanup on error
    try {
      unlinkSync(outputCsvPath);
      unlinkSync(outputStatsPath);
      unlinkSync(pythonScriptPath);
    } catch (e) {
      // Ignore cleanup errors
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[XlsxMerger] Error: ${errorMessage}`);
    
    return {
      success: false,
      csvData: '',
      stats: {
        totalFiles: 2,
        ordersFiles: 0,
        reportsFiles: 0,
        errorFiles: 2,
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
      },
      error: errorMessage
    };
  }
}

/**
 * Generate the Python merge script as a string
 * This embeds the merge logic directly
 */
function generateMergePythonScript(): string {
  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
XLSX to CSV Merger with Statistics
Merges orders and reports XLSX files into a unified CSV with detailed statistics.
"""

import argparse
import json
import logging
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import pandas as pd

# ============================================================================
# Configuration and Constants
# ============================================================================

FINAL_COLUMNS = [
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
]

ORDERS_COLUMNS = {
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
}

REPORTS_COLUMNS = {
    "площадка": "Площадка",
    "артикул": "Артикул",
    "вес": "Вес (report)",
    "кол-во": "Кол-во",
    "склад": "Склад (report)",
    "статус": "Статус (report)",
    "дата заказа": "Дата заказа (report)",
    "id заказа": "ID заказа",
    "честные знаки": "Честные знаки"
}

# ============================================================================
# Utility Functions
# ============================================================================

def normalize_column_name(col: str) -> str:
    if pd.isna(col):
        return ""
    col = str(col).strip().lower()
    col = re.sub(r'\\s+', ' ', col)
    return col

def is_unnamed_column(col: str) -> bool:
    return str(col).startswith('Unnamed:')

def safe_int(value) -> Optional[int]:
    if pd.isna(value):
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None

def safe_float(value) -> Optional[float]:
    if pd.isna(value):
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

def safe_str(value) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()

def parse_date(value) -> Optional[datetime]:
    if pd.isna(value):
        return None
    if isinstance(value, datetime):
        return value
    try:
        return pd.to_datetime(value)
    except:
        return None

def format_datetime(dt: Optional[datetime]) -> str:
    if dt is None or pd.isna(dt):
        return ""
    try:
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except:
        return ""

def calculate_direction(warehouse: str) -> str:
    if pd.isna(warehouse):
        return ""
    warehouse_str = str(warehouse)
    if "Почта (Ярославка)" in warehouse_str:
        return "Почта"
    return "Express/FBS"

def normalize_marketplace(platform: str, order_type: str) -> str:
    if not pd.isna(platform) and str(platform).strip():
        return str(platform).strip()
    if pd.isna(order_type):
        return ""
    order_type_str = str(order_type).upper()
    if "OZON" in order_type_str:
        return "OZON"
    elif "WILDBERRIES" in order_type_str:
        return "Wildberries"
    elif "YANDEXMARKET" in order_type_str or "YANDEX" in order_type_str:
        return "YandexMarket"
    return ""

def detect_file_type(df: pd.DataFrame) -> str:
    cols_normalized = {normalize_column_name(col) for col in df.columns}
    has_partner = "партнер" in cols_normalized
    has_items = "товаров" in cols_normalized
    has_platform = "площадка" in cols_normalized
    has_article = "артикул" in cols_normalized
    has_quantity = "кол-во" in cols_normalized
    
    if has_platform and has_article and has_quantity:
        return "reports"
    elif has_partner and has_items:
        return "orders"
    else:
        return "unknown"

# ============================================================================
# File Processing
# ============================================================================

def read_xlsx_file(filepath: Path, logger: logging.Logger) -> Tuple[Optional[pd.DataFrame], str]:
    try:
        df = pd.read_excel(filepath, sheet_name=0)
        df = df.dropna(axis=1, how='all')
        df = df.loc[:, ~df.columns.map(is_unnamed_column)]
        file_type = detect_file_type(df)
        
        if file_type == "unknown":
            logger.warning(f"Could not detect file type for {filepath.name}")
            return None, "unknown"
        
        logger.debug(f"Detected {file_type} file: {filepath.name}")
        return df, file_type
    except Exception as e:
        logger.error(f"Error reading {filepath.name}: {e}")
        return None, "error"

def normalize_dataframe_columns(df: pd.DataFrame, column_mapping: Dict[str, str]) -> pd.DataFrame:
    col_map = {}
    for col in df.columns:
        norm_col = normalize_column_name(col)
        if norm_col in column_mapping:
            col_map[col] = column_mapping[norm_col]
    df = df.rename(columns=col_map)
    return df

def process_orders_file(df: pd.DataFrame, filepath: Path, logger: logging.Logger) -> pd.DataFrame:
    df = normalize_dataframe_columns(df, ORDERS_COLUMNS)
    available_cols = [col for col in ORDERS_COLUMNS.values() if col in df.columns]
    df = df[available_cols].copy()
    df['Файл-источник'] = filepath.name
    df['_mtime'] = filepath.stat().st_mtime
    return df

def process_reports_file(df: pd.DataFrame, filepath: Path, logger: logging.Logger) -> pd.DataFrame:
    df = normalize_dataframe_columns(df, REPORTS_COLUMNS)
    available_cols = [col for col in REPORTS_COLUMNS.values() if col in df.columns]
    df = df[available_cols].copy()
    df['_mtime'] = filepath.stat().st_mtime
    return df

# ============================================================================
# Main Processing Logic
# ============================================================================

def collect_files(input_paths: List[str], logger: logging.Logger) -> List[Path]:
    xlsx_files = []
    for input_path in input_paths:
        path = Path(input_path)
        if not path.exists():
            logger.warning(f"Path does not exist: {input_path}")
            continue
        if path.is_file() and path.suffix.lower() == '.xlsx':
            xlsx_files.append(path)
        elif path.is_dir():
            xlsx_files.extend(path.rglob("*.xlsx"))
    logger.info(f"Found {len(xlsx_files)} XLSX files")
    return sorted(xlsx_files)

def load_and_classify_files(files: List[Path], logger: logging.Logger) -> Tuple[List[pd.DataFrame], List[pd.DataFrame], Dict]:
    orders_dfs = []
    reports_dfs = []
    stats = {
        'total_files': len(files),
        'orders_files': 0,
        'reports_files': 0,
        'error_files': 0,
        'unknown_files': 0,
        'orders_rows_read': 0,
        'reports_rows_read': 0
    }
    
    for filepath in files:
        df, file_type = read_xlsx_file(filepath, logger)
        if df is None:
            stats['error_files'] += 1
            continue
        if file_type == "orders":
            processed_df = process_orders_file(df, filepath, logger)
            orders_dfs.append(processed_df)
            stats['orders_files'] += 1
            stats['orders_rows_read'] += len(processed_df)
        elif file_type == "reports":
            processed_df = process_reports_file(df, filepath, logger)
            reports_dfs.append(processed_df)
            stats['reports_files'] += 1
            stats['reports_rows_read'] += len(processed_df)
        else:
            stats['unknown_files'] += 1
    
    logger.info(f"Loaded {stats['orders_files']} orders files ({stats['orders_rows_read']} rows)")
    logger.info(f"Loaded {stats['reports_files']} reports files ({stats['reports_rows_read']} rows)")
    return orders_dfs, reports_dfs, stats

def build_orders_layer(orders_dfs: List[pd.DataFrame], logger: logging.Logger) -> Tuple[pd.DataFrame, Dict]:
    if not orders_dfs:
        logger.error("No orders files found")
        return pd.DataFrame(), {}
    
    orders = pd.concat(orders_dfs, ignore_index=True)
    stats = {
        'orders_rows_missing_id': 0,
        'orders_unique_ids': 0,
        'orders_duplicate_ids_dropped': 0
    }
    
    orders['ID заказа'] = orders['ID заказа'].apply(safe_str)
    stats['orders_rows_missing_id'] = (orders['ID заказа'] == '').sum()
    orders = orders[orders['ID заказа'] != ''].copy()
    
    orders = orders.sort_values('_mtime')
    total_before = len(orders)
    orders = orders.drop_duplicates(subset=['ID заказа'], keep='last')
    total_after = len(orders)
    
    stats['orders_duplicate_ids_dropped'] = total_before - total_after
    stats['orders_unique_ids'] = total_after
    orders = orders.drop(columns=['_mtime'])
    
    logger.info(f"Orders layer: {stats['orders_unique_ids']} unique orders (dropped {stats['orders_duplicate_ids_dropped']} duplicates)")
    return orders, stats

def build_reports_index(reports_dfs: List[pd.DataFrame], logger: logging.Logger) -> Tuple[pd.DataFrame, Dict]:
    if not reports_dfs:
        logger.warning("No reports files found")
        return pd.DataFrame(), {}
    
    reports = pd.concat(reports_dfs, ignore_index=True)
    stats = {
        'reports_rows_missing_id': 0,
        'report_rows_used_lastwins': 0
    }
    
    reports['ID заказа'] = reports['ID заказа'].apply(safe_str)
    stats['reports_rows_missing_id'] = (reports['ID заказа'] == '').sum()
    reports = reports[reports['ID заказа'] != ''].copy()
    
    reports = reports.sort_values('_mtime')
    reports = reports.drop_duplicates(subset=['ID заказа'], keep='last')
    stats['report_rows_used_lastwins'] = len(reports)
    reports = reports.drop(columns=['_mtime'])
    
    logger.info(f"Reports index: {len(reports)} unique order IDs")
    return reports, stats

def enrich_orders_with_reports(orders: pd.DataFrame, reports: pd.DataFrame, logger: logging.Logger) -> Tuple[pd.DataFrame, Dict]:
    stats = {
        'orders_with_report_match': 0,
        'orders_without_report_match': 0,
        'coverage_percent': 0.0
    }
    
    if reports.empty:
        logger.warning("No reports data available for enrichment")
        stats['orders_without_report_match'] = len(orders)
        return orders, stats
    
    enriched = orders.merge(reports, on='ID заказа', how='left', suffixes=('', '_report'))
    
    if 'Честные знаки_report' in enriched.columns:
        enriched['Честные знаки'] = enriched['Честные знаки'].fillna(enriched['Честные знаки_report'])
        enriched = enriched.drop(columns=['Честные знаки_report'])
    
    stats['orders_with_report_match'] = enriched['Площадка'].notna().sum()
    stats['orders_without_report_match'] = enriched['Площадка'].isna().sum()
    stats['coverage_percent'] = (stats['orders_with_report_match'] / len(enriched) * 100) if len(enriched) > 0 else 0.0
    
    logger.info(f"Enrichment: {stats['orders_with_report_match']} orders matched ({stats['coverage_percent']:.1f}%)")
    return enriched, stats

def apply_transformations(df: pd.DataFrame, logger: logging.Logger) -> pd.DataFrame:
    df['ID заказа'] = df['ID заказа'].apply(safe_str)
    df['Товаров'] = df['Товаров'].apply(safe_int)
    df['Общий вес'] = df['Общий вес'].apply(safe_float)
    df['Кол-во'] = df['Кол-во'].apply(safe_int)
    df['Вес (report)'] = df['Вес (report)'].apply(safe_float)
    
    df['Дата заказа (orders)'] = df['Дата заказа (orders)'].apply(parse_date).apply(format_datetime)
    df['Дата заказа (report)'] = df['Дата заказа (report)'].apply(parse_date).apply(format_datetime)
    
    df['Направление (расчёт)'] = df['Склад'].apply(calculate_direction)
    df['Маркетплейс (норм.)'] = df.apply(
        lambda row: normalize_marketplace(row.get('Площадка'), row.get('Тип заказа')),
        axis=1
    )
    
    df['Последнее обновление'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logger.info("Applied transformations and calculated fields")
    return df

def prepare_final_output(df: pd.DataFrame, logger: logging.Logger) -> pd.DataFrame:
    for col in FINAL_COLUMNS:
        if col not in df.columns:
            df[col] = ""
    df = df[FINAL_COLUMNS].copy()
    logger.info(f"Final output: {len(df)} rows, {len(df.columns)} columns")
    return df

def calculate_statistics(orders: pd.DataFrame, final_df: pd.DataFrame, base_stats: Dict, logger: logging.Logger) -> Dict:
    stats = base_stats.copy()
    
    try:
        dates = pd.to_datetime(final_df['Дата заказа (orders)'], errors='coerce')
        valid_dates = dates.dropna()
        if not valid_dates.empty:
            stats['min_order_datetime'] = valid_dates.min().strftime("%Y-%m-%d %H:%M:%S")
            stats['max_order_datetime'] = valid_dates.max().strftime("%Y-%m-%d %H:%M:%S")
    except:
        pass
    
    stats['warehouse_top10'] = final_df['Склад'].value_counts().head(10).to_dict()
    stats['marketplace_top10'] = final_df['Маркетплейс (норм.)'].value_counts().head(10).to_dict()
    stats['direction_breakdown'] = final_df['Направление (расчёт)'].value_counts().to_dict()
    
    stats['nulls_per_critical_field'] = {
        'ID заказа': (final_df['ID заказа'] == '').sum(),
        'Склад': final_df['Склад'].isna().sum(),
        'Дата заказа (orders)': (final_df['Дата заказа (orders)'] == '').sum()
    }
    
    stats['bad_date_rows'] = (final_df['Дата заказа (orders)'] == '').sum()
    
    try:
        quantity = pd.to_numeric(final_df['Кол-во'], errors='coerce')
        stats['negative_or_zero_units'] = ((quantity <= 0) & quantity.notna()).sum()
    except:
        stats['negative_or_zero_units'] = 0
    
    try:
        weight = pd.to_numeric(final_df['Вес (report)'], errors='coerce')
        stats['weight_anomalies'] = ((weight < 0) & weight.notna()).sum()
    except:
        stats['weight_anomalies'] = 0
    
    stats['output_rows'] = len(final_df)
    stats['output_columns'] = len(final_df.columns)
    stats['build_timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    logger.info("Statistics calculated")
    return stats

# ============================================================================
# Main Function
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='Merge XLSX files (orders and reports) into unified CSV')
    parser.add_argument('--input', action='append', required=True, help='Input file or folder')
    parser.add_argument('--out-csv', required=True, help='Output CSV file path')
    parser.add_argument('--out-stats', help='Output statistics JSON file path')
    parser.add_argument('--delimiter', default=';', help='CSV delimiter')
    parser.add_argument('--encoding', default='utf-8-sig', help='CSV encoding')
    parser.add_argument('--log-level', default='INFO', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'], help='Logging level')
    
    args = parser.parse_args()
    
    log_format = '%(asctime)s - %(levelname)s - %(message)s'
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format=log_format,
        handlers=[logging.StreamHandler(sys.stdout)]
    )
    logger = logging.getLogger(__name__)
    
    logger.info("=" * 80)
    logger.info("XLSX to CSV Merger - Starting")
    logger.info("=" * 80)
    
    try:
        logger.info("Step 1: Collecting XLSX files...")
        files = collect_files(args.input, logger)
        
        if not files:
            logger.error("No XLSX files found")
            return 1
        
        logger.info("Step 2: Loading and classifying files...")
        orders_dfs, reports_dfs, file_stats = load_and_classify_files(files, logger)
        
        if not orders_dfs:
            logger.error("No orders files found")
            return 1
        
        logger.info("Step 3: Building orders layer...")
        orders, orders_stats = build_orders_layer(orders_dfs, logger)
        file_stats.update(orders_stats)
        
        logger.info("Step 4: Building reports index...")
        reports, reports_stats = build_reports_index(reports_dfs, logger)
        file_stats.update(reports_stats)
        
        logger.info("Step 5: Enriching orders with reports...")
        enriched, enrich_stats = enrich_orders_with_reports(orders, reports, logger)
        file_stats.update(enrich_stats)
        
        logger.info("Step 6: Applying transformations...")
        transformed = apply_transformations(enriched, logger)
        
        logger.info("Step 7: Preparing final output...")
        final_df = prepare_final_output(transformed, logger)
        
        logger.info("Step 8: Writing CSV...")
        output_path = Path(args.out_csv)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        final_df.to_csv(output_path, sep=args.delimiter, encoding=args.encoding, index=False)
        logger.info(f"CSV written to {output_path}")
        
        logger.info("Step 9: Calculating statistics...")
        stats = calculate_statistics(orders, final_df, file_stats, logger)
        
        if args.out_stats:
            with open(args.out_stats, 'w', encoding='utf-8') as f:
                json.dump(stats, f, ensure_ascii=False, indent=2, default=str)
            logger.info(f"Statistics written to {args.out_stats}")
        
        logger.info("=" * 80)
        logger.info("XLSX to CSV Merger - Completed Successfully")
        logger.info("=" * 80)
        
        return 0
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(main())
`;
}

