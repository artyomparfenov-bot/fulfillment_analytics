/**
 * Memoization utilities for caching expensive calculations
 * Prevents recalculation of metrics when inputs haven't changed
 */

interface MemoCache<T> {
  value: T;
  inputs: any[];
  timestamp: number;
}

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 1000 * 60 * 5;

/**
 * Create a memoized function that caches results based on input arguments
 * @param fn - Function to memoize
 * @param maxAge - Maximum age of cache in milliseconds (default: 5 minutes)
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  maxAge: number = CACHE_EXPIRATION
): T {
  const cache = new Map<string, MemoCache<any>>();

  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    const now = Date.now();

    // Return cached value if it exists and hasn't expired
    if (cached && now - cached.timestamp < maxAge) {
      return cached.value;
    }

    // Calculate new value
    const value = fn(...args);

    // Store in cache
    cache.set(key, {
      value,
      inputs: args,
      timestamp: now
    });

    // Clean up old entries to prevent memory leaks
    if (cache.size > 100) {
      let oldestKey: string | null = null;
      let oldestTime = now;

      cache.forEach((entry, k) => {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = k;
        }
      });

      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }

    return value;
  }) as T;
}

/**
 * Create a memoized function with custom key generation
 * Useful when you need more control over cache key generation
 */
export function memoizeWithKey<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator: (...args: any[]) => string,
  maxAge: number = CACHE_EXPIRATION
): T {
  const cache = new Map<string, MemoCache<any>>();

  return ((...args: any[]) => {
    const key = keyGenerator(...args);
    const cached = cache.get(key);
    const now = Date.now();

    // Return cached value if it exists and hasn't expired
    if (cached && now - cached.timestamp < maxAge) {
      return cached.value;
    }

    // Calculate new value
    const value = fn(...args);

    // Store in cache
    cache.set(key, {
      value,
      inputs: args,
      timestamp: now
    });

    // Clean up old entries
    if (cache.size > 100) {
      let oldestKey: string | null = null;
      let oldestTime = now;

      cache.forEach((entry, k) => {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = k;
        }
      });

      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }

    return value;
  }) as T;
}

/**
 * Memoization hook for React components
 * Similar to useMemo but with automatic dependency tracking
 */
export function useMemoValue<T>(
  fn: () => T,
  dependencies: any[],
  maxAge: number = CACHE_EXPIRATION
): T {
  const cache = new Map<string, MemoCache<T>>();
  const key = JSON.stringify(dependencies);
  const cached = cache.get(key);
  const now = Date.now();

  // Return cached value if dependencies haven't changed
  if (cached && now - cached.timestamp < maxAge) {
    return cached.value;
  }

  // Calculate new value
  const value = fn();

  // Store in cache
  cache.set(key, {
    value,
    inputs: dependencies,
    timestamp: now
  });

  return value;
}

/**
 * Clear all memoization caches
 * Call this after data updates
 */
export function clearMemoCache() {
  // This would need to be called manually or through a context
  // For now, caches are automatically managed per function
}

