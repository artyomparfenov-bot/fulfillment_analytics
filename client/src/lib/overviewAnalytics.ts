import { OrderRecord } from './types';

export interface TimeSeriesData {
  date: string;
  orders: number;
  direction: string;
}

export interface ClientCohortData {
  month: string;
  newClients: number;
  churnedClients: number;
  newPercentage: number;
  churnPercentage: number;
}

export interface TopBottomPerformer {
  partner: string;
  direction: string;
  previousOrders: number;
  currentOrders: number;
  change: number;
  changePercentage: number;
  isNew: boolean;
  isChurned: boolean;
}

export interface ClientSegmentData {
  date: string;
  newClients: number; // 0-30 days
  currentClients: number; // 31+ days
  newPercentage: number;
  currentPercentage: number;
}

/**
 * Generate time series data for orders by direction
 * Grouped by week or month
 */
export function generateTimeSeriesData(
  data: OrderRecord[],
  granularity: 'week' | 'month' = 'month'
): TimeSeriesData[] {
  const grouped = new Map<string, Map<string, number>>();

  data.forEach(row => {
    const date = new Date(row['Дата заказа (orders)']);
    let key: string;

    if (granularity === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = date.toISOString().split('T')[0].slice(0, 7); // YYYY-MM
    }

    const direction = getActualDirection(row['Партнер']);
    
    if (!grouped.has(key)) {
      grouped.set(key, new Map());
    }
    
    const directionMap = grouped.get(key)!;
    directionMap.set(direction, (directionMap.get(direction) || 0) + 1);
  });

  const result: TimeSeriesData[] = [];
  
  const sortedEntries = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  sortedEntries.forEach(([date, directions]) => {
      directions.forEach((orders, direction) => {
        result.push({ date, orders, direction });
      });
    });

  return result;
}

/**
 * Analyze new vs churned clients by month
 */
export function analyzeClientCohorts(
  data: OrderRecord[],
  allPartners: Set<string>
): ClientCohortData[] {
  const monthlyPartners = new Map<string, Set<string>>();
  
  // Group partners by month of first order
  data.forEach(row => {
    const date = new Date(row['Дата заказа (orders)']);
    const month = date.toISOString().split('T')[0].slice(0, 7);
    const partner = row['Партнер'];
    
    if (!monthlyPartners.has(month)) {
      monthlyPartners.set(month, new Set());
    }
    monthlyPartners.get(month)!.add(partner);
  });

  const result: ClientCohortData[] = [];
  const sortedMonths = Array.from(monthlyPartners.keys()).sort();

  sortedMonths.forEach((month, index) => {
    const currentMonthPartners = monthlyPartners.get(month) || new Set();
    
    // New clients: partners that appeared in this month but not before
    const newClients = Array.from(currentMonthPartners).filter(p => {
      for (let i = 0; i < index; i++) {
        if (monthlyPartners.get(sortedMonths[i])?.has(p)) {
          return false;
        }
      }
      return true;
    }).length;

    // Churned clients: partners that were active before but not in this month
    const previousActivePartners = new Set<string>();
    for (let i = 0; i < index; i++) {
      monthlyPartners.get(sortedMonths[i])?.forEach(p => previousActivePartners.add(p));
    }

    const churnedClients = Array.from(previousActivePartners).filter(p => !currentMonthPartners.has(p)).length;

    const totalActive = currentMonthPartners.size;
    const newPercentage = totalActive > 0 ? (newClients / totalActive) * 100 : 0;
    const churnPercentage = totalActive > 0 ? (churnedClients / totalActive) * 100 : 0;

    result.push({
      month,
      newClients,
      churnedClients,
      newPercentage,
      churnPercentage
    });
  });

  return result;
}

/**
 * Segment clients by age (new: 0-30 days, current: 31+ days)
 */
export function segmentClientsByAge(
  data: OrderRecord[],
  selectedDirection: string = 'all'
): ClientSegmentData[] {
  const today = new Date();
  const grouped = new Map<string, { newClients: Set<string>; currentClients: Set<string> }>();

  // First pass: determine first order date for each partner
  const partnerFirstDate = new Map<string, Date>();
  data.forEach(row => {
    const partner = row['Партнер'];
    const date = new Date(row['Дата заказа (orders)']);
    
    if (!partnerFirstDate.has(partner) || date < partnerFirstDate.get(partner)!) {
      partnerFirstDate.set(partner, date);
    }
  });

  // Second pass: group by date and segment clients
  data.forEach(row => {
    const date = new Date(row['Дата заказа (orders)']);
    const dateKey = date.toISOString().split('T')[0].slice(0, 7);
    const partner = row['Партнер'];
    const direction = getActualDirection(partner);

    if (selectedDirection !== 'all' && direction !== selectedDirection) {
      return;
    }

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, { newClients: new Set(), currentClients: new Set() });
    }

    const firstDate = partnerFirstDate.get(partner)!;
    const daysSinceFirst = Math.floor((date.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceFirst <= 30) {
      grouped.get(dateKey)!.newClients.add(partner);
    } else {
      grouped.get(dateKey)!.currentClients.add(partner);
    }
  });

  const result: ClientSegmentData[] = [];
  
  const sortedSegmentEntries = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  sortedSegmentEntries.forEach(([date, { newClients, currentClients }]) => {
      const total = newClients.size + currentClients.size;
      result.push({
        date,
        newClients: newClients.size,
        currentClients: currentClients.size,
        newPercentage: total > 0 ? (newClients.size / total) * 100 : 0,
        currentPercentage: total > 0 ? (currentClients.size / total) * 100 : 0
      });
    });

  return result;
}

/**
 * Find top and bottom performers with change metrics
 */
export function findTopBottomPerformers(
  data: OrderRecord[],
  selectedDirection: string = 'all',
  topCount: number = 10
): { top: TopBottomPerformer[]; bottom: TopBottomPerformer[] } {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Calculate orders in current period (last 30 days) and previous period (30-60 days)
  const currentPeriod = new Map<string, number>();
  const previousPeriod = new Map<string, number>();

  data.forEach(row => {
    const date = new Date(row['Дата заказа (orders)']);
    const partner = row['Партнер'];
    const direction = getActualDirection(partner);

    if (selectedDirection !== 'all' && direction !== selectedDirection) {
      return;
    }

    if (date >= thirtyDaysAgo) {
      currentPeriod.set(partner, (currentPeriod.get(partner) || 0) + 1);
    } else if (date >= sixtyDaysAgo) {
      previousPeriod.set(partner, (previousPeriod.get(partner) || 0) + 1);
    }
  });

  // Calculate changes
  const performersArray: TopBottomPerformer[] = [];
  const allPartners = new Set<string>();
  currentPeriod.forEach((_, partner) => allPartners.add(partner));
  previousPeriod.forEach((_, partner) => allPartners.add(partner));

  allPartners.forEach(partner => {
    const current = currentPeriod.get(partner) || 0;
    const previous = previousPeriod.get(partner) || 0;
    const change = current - previous;
    const changePercentage = previous > 0 ? (change / previous) * 100 : (current > 0 ? 100 : 0);
    const direction = getActualDirection(partner);

    // Determine if new or churned
    const isNew = !previousPeriod.has(partner) && current > 0;
    const isChurned = previousPeriod.has(partner) && current === 0;

    performersArray.push({
      partner,
      direction,
      previousOrders: previous,
      currentOrders: current,
      change,
      changePercentage,
      isNew,
      isChurned
    });
  });

  // Sort by change
  performersArray.sort((a: TopBottomPerformer, b: TopBottomPerformer) => b.change - a.change);

  const top = performersArray.slice(0, topCount);
  const bottom = performersArray.slice(-topCount).reverse();

  return { top, bottom };
}

function getActualDirection(partner: string): string {
  if (partner === 'VSROK') {
    return 'VSROK';
  }
  // Default to Express/FBS for all others
  return 'Express/FBS';
}

