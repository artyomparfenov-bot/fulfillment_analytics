import { useQuery, useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import type { OrderRecord, PartnerStats, SKUStats } from './types';

// Cache keys
export const CACHE_KEYS = {
  CSV_DATA: ['csvData'],
  PARTNER_STATS: (timeRange: number | null, direction: string) => ['partnerStats', timeRange, direction],
  SKU_STATS: (timeRange: number | null, direction: string) => ['skuStats', timeRange, direction],
  DIRECTION_STATS: (timeRange: number | null) => ['directionStats', timeRange],
  CHURN_METRICS: (timeRange: number | null) => ['churnMetrics', timeRange],
};

// Cache durations (in milliseconds)
export const CACHE_DURATION = {
  CSV_DATA: 1000 * 60 * 60, // 1 hour - CSV data rarely changes
  METRICS: 1000 * 60 * 5, // 5 minutes - metrics calculated from CSV
  ALERTS: 1000 * 60 * 2, // 2 minutes - alerts need fresher data
};

/**
 * Hook to load CSV data with caching
 * Data is cached for 1 hour to avoid repeated downloads
 */
export function useCSVData() {
  return useQuery({
    queryKey: CACHE_KEYS.CSV_DATA,
    queryFn: async () => {
      const response = await fetch('/data_merged.csv');
      if (!response.ok) throw new Error('Failed to load CSV data');
      
      const csvText = await response.text();
      
      return new Promise<OrderRecord[]>((resolve, reject) => {
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
    },
    staleTime: CACHE_DURATION.CSV_DATA,
    gcTime: CACHE_DURATION.CSV_DATA * 2, // Keep in cache for 2x the stale time
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to invalidate all cached data
 * Call this after uploading new data
 */
export function useInvalidateDataCache() {
  const queryClient = useQueryClient();
  
  return () => {
    // Invalidate all cache keys that depend on CSV data
    queryClient.invalidateQueries({ queryKey: CACHE_KEYS.CSV_DATA });
    queryClient.invalidateQueries({ queryKey: ['partnerStats'] });
    queryClient.invalidateQueries({ queryKey: ['skuStats'] });
    queryClient.invalidateQueries({ queryKey: ['directionStats'] });
    queryClient.invalidateQueries({ queryKey: ['churnMetrics'] });
  };
}

/**
 * Hook to prefetch CSV data
 * Call this on app initialization to load data in background
 */
export function usePrefetchCSVData() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: CACHE_KEYS.CSV_DATA,
      queryFn: async () => {
        const response = await fetch('/data_merged.csv');
        if (!response.ok) throw new Error('Failed to load CSV data');
        
        const csvText = await response.text();
        
        return new Promise<OrderRecord[]>((resolve, reject) => {
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
      },
      staleTime: CACHE_DURATION.CSV_DATA,
    });
  };
}

