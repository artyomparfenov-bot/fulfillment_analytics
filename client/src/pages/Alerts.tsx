import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import FilterBar from '@/components/FilterBar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp, AlertCircle, Zap, Target, Users, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { loadCSVData, filterByTimeRange, filterByDirection, getDirections, calculatePartnerStats, calculateSnapshotDate, setSnapshotDate } from '@/lib/dataProcessor';
import { generateAllAlerts } from '@/lib/alertsEngine';
import {
  calculateCustomerSize,
  estimateMonthlyRevenue,
  calculatePriorityScore,
  scoreTtoSeverity,
  groupAndPrioritizeAlerts,
  filterAlerts,
  getTopCriticalAlerts,
  calculateAlertStats,
  type PrioritizedAlert,
  type AlertSeverity,
  type CustomerSize,
  type AlertCategory
} from '@/lib/alertPrioritization';
import type { OrderRecord, TimeRange } from '@/lib/types';
import type { AnomalyAlert } from '@/lib/alertsEngine';

function diagnosticPhase2(allAlerts: PrioritizedAlert[], filteredAlerts: PrioritizedAlert[], snapshotDate: Date) {
  const severityCount = new Map<string, number>();
  const sizeCount = new Map<string, number>();
  const directionCount = new Map<string, number>();
  
  allAlerts.forEach(a => {
    severityCount.set(a.severity, (severityCount.get(a.severity) || 0) + 1);
    sizeCount.set(String(a.size || 'unknown'), (sizeCount.get(String(a.size || 'unknown')) || 0) + 1);
    directionCount.set(a.direction || 'unknown', (directionCount.get(a.direction || 'unknown') || 0) + 1);
  });

  const phase2Report = {
    totalRawAlerts: allAlerts.length,
    afterUiFilters: filteredAlerts.length,
    filteringLoss: allAlerts.length - filteredAlerts.length,
    bySeverity: Object.fromEntries(severityCount),
    bySize: Object.fromEntries(sizeCount),
    byDirection: Object.fromEntries(directionCount),
    snapshotDate: snapshotDate.toISOString().split('T')[0]
  };

  console.log('=== PHASE 2: Alerts Logic & Filters ===');
  console.table(phase2Report);
  return phase2Report;
}

function logAlertComparison(allAlerts: PrioritizedAlert[], filteredAlerts: PrioritizedAlert[]) {
  console.log(`Alerts: totalRaw=${allAlerts.length}, afterUiFilters=${filteredAlerts.length}`);
  if (filteredAlerts.length < allAlerts.length * 0.5) {
    const severityCount = new Map<string, number>();
    allAlerts.forEach(a => {
      severityCount.set(a.severity, (severityCount.get(a.severity) || 0) + 1);
    });
    console.log('Severity distribution in raw alerts:', Object.fromEntries(severityCount));
  }
}

function calculateActiveSKUDelta(partner: string, filteredData: OrderRecord[]): number {
  const skus = new Set<string>();
  filteredData.filter(r => r['Партнер'] === partner).forEach(r => {
    const sku = r['Артикул'];
    if (sku) skus.add(String(sku));
  });
  return skus.size;
}

export default function AlertsV2() {
  const [allData, setAllData] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>({ label: '30 дней', days: 30 });
  const [direction, setDirection] = useState('all');
  const [directions, setDirections] = useState<string[]>([]);
  
  // Prioritization filters
  const [selectedSeverities, setSelectedSeverities] = useState<AlertSeverity[]>(['CRITICAL', 'HIGH']);
  const [selectedCustomerSizes, setSelectedCustomerSizes] = useState<CustomerSize[]>(['LARGE', 'MEDIUM']);
  const [selectedCategories, setSelectedCategories] = useState<AlertCategory[]>([]);

  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCSVData().then(data => {
      const snapshotDate = calculateSnapshotDate(data);
      setSnapshotDate(snapshotDate);
      setAllData(data);
      setDirections(getDirections(data));
      setLoading(false);
    }).catch(error => {
      console.error('Error loading data:', error);
      setLoading(false);
    });
  }, []);

  const filteredData = useMemo(() => {
    return filterByDirection(filterByTimeRange(allData, timeRange.days), direction);
  }, [allData, timeRange, direction]);

  // Convert old alerts to prioritized alerts
  const prioritizedAlerts = useMemo(() => {
    if (filteredData.length === 0) return [];
    
    const oldAlerts = generateAllAlerts(filteredData);
    const partnerMap = new Map<string, OrderRecord[]>();
    
    filteredData.forEach(record => {
      const partner = record['Партнер'];
      if (!partnerMap.has(partner)) {
        partnerMap.set(partner, []);
      }
      partnerMap.get(partner)!.push(record);
    });
    
    const partnerStats = calculatePartnerStats(filteredData);
    const statsMap = new Map(partnerStats.map(s => [s.partner, s]));
    
    return oldAlerts.map((alert: AnomalyAlert, index: number): PrioritizedAlert => {
      const partnerOrders = partnerMap.get(alert.partnerId) || [];
      const customerSize = calculateCustomerSize(partnerOrders, partnerMap);
      const monthlyRevenue = estimateMonthlyRevenue(partnerOrders);
      const stats = statsMap.get(alert.partnerId);
      const churnRisk = stats?.churnRisk || 0;
      
      // Calculate anomaly severity (0-100)
      const anomalySeverity = alert.severity === 'critical' ? 95 : 
                             alert.severity === 'high' ? 75 : 
                             alert.severity === 'medium' ? 50 : 25;
      
      // Estimate revenue at risk (simplified)
      const revenueAtRisk = alert.severity === 'critical' ? monthlyRevenue * 0.5 : 
                           alert.severity === 'high' ? monthlyRevenue * 0.3 : 
                           monthlyRevenue * 0.1;
      
      const priorityScore = calculatePriorityScore(
        customerSize,
        churnRisk,
        anomalySeverity,
        revenueAtRisk,
        false // isNew - would need timestamp tracking
      );
      
      return {
        id: `${alert.partnerId}_${alert.alertType}_${index}`,
        partnerId: alert.partnerId,
        partnerName: alert.partnerId,
        sku: alert.skuId,
        alertType: (alert.alertType.toUpperCase().replace(/_/g, '_')) as AlertCategory,
        severity: scoreTtoSeverity(priorityScore) as AlertSeverity,
        priorityScore,
        message: alert.message,
        customerSize,
        churnRisk,
        currentValue: alert.currentValue,
        benchmarkValue: alert.benchmarkValue,
        percentageChange: alert.percentageChange ? parseFloat(alert.percentageChange) : undefined,
        direction: alert.direction,
        detectedAt: new Date(),
        lastUpdated: new Date(),
        isNew: false
      };
    });
  }, [filteredData]);

  const filteredAndPrioritizedAlerts = useMemo(() => {
    return filterAlerts(prioritizedAlerts, {
      severity: selectedSeverities.length > 0 ? selectedSeverities : undefined,
      customerSize: selectedCustomerSizes.length > 0 ? selectedCustomerSizes : undefined,
      category: selectedCategories.length > 0 ? selectedCategories : undefined,

      isNew: showOnlyNew ? true : undefined
    });
  }, [prioritizedAlerts, selectedSeverities, selectedCustomerSizes, selectedCategories, showOnlyNew]);

  const groupedAlerts = useMemo(() => {
    return groupAndPrioritizeAlerts(filteredAndPrioritizedAlerts);
  }, [filteredAndPrioritizedAlerts]);

  const toggleGroupExpand = (category: string, severity: string) => {
    const key = `${category}||${severity}`;
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const topCritical = useMemo(() => {
    return getTopCriticalAlerts(filteredAndPrioritizedAlerts, 5);
  }, [filteredAndPrioritizedAlerts]);

  const alertStats = useMemo(() => {
    return calculateAlertStats(filteredAndPrioritizedAlerts);
  }, [filteredAndPrioritizedAlerts]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Загрузка данных...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const getSeverityColor = (severity: AlertSeverity): string => {
    // Unified softer color scheme
    switch (severity) {
      case 'CRITICAL': return 'bg-slate-900/50 text-slate-100 border-slate-700/50';
      case 'HIGH': return 'bg-slate-900/50 text-slate-100 border-slate-700/50';
      case 'MEDIUM': return 'bg-slate-900/50 text-slate-100 border-slate-700/50';
      case 'LOW': return 'bg-slate-900/50 text-slate-100 border-slate-700/50';
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL': return <AlertTriangle className="w-4 h-4" />;
      case 'HIGH': return <AlertCircle className="w-4 h-4" />;
      case 'MEDIUM': return <TrendingDown className="w-4 h-4" />;
      case 'LOW': return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getCustomerSizeIcon = (size: CustomerSize) => {
    switch (size) {
      case 'LARGE': return <Zap className="w-3 h-3" />;
      case 'MEDIUM': return <Target className="w-3 h-3" />;
      case 'SMALL': return <Users className="w-3 h-3" />;
    }
  };

  const getCategoryLabel = (category: AlertCategory): string => {
    const labels: Record<AlertCategory, string> = {
      CHURN_RISK: 'Риск отвала',
      REVENUE_DROP: 'Падение выручки',
      VOLATILITY: 'Волатильность',
      WAREHOUSE_ANOMALY: 'Аномалия склада',
      SKU_ANOMALY: 'Аномалия SKU',
      CONCENTRATION: 'Концентрация'
    };
    return labels[category];
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Сигналы</h1>
          <p className="text-muted-foreground">Аномалии и риски, отсортированные по влиянию на бизнес</p>
        </div>

        <FilterBar
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          direction={direction}
          onDirectionChange={setDirection}
          directions={directions}
        />

        {/* Alert Statistics Dashboard - MOVED TO TOP */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4 border-slate-700/50 bg-slate-900/30">
            <p className="text-xs text-muted-foreground mb-1">CRITICAL</p>
            <p className="text-3xl font-bold text-slate-100">{alertStats.bySeverity.CRITICAL}</p>
          </Card>
          <Card className="p-4 border-slate-700/50 bg-slate-900/30">
            <p className="text-xs text-muted-foreground mb-1">HIGH</p>
            <p className="text-3xl font-bold text-slate-100">{alertStats.bySeverity.HIGH}</p>
          </Card>
          <Card className="p-4 border-slate-700/50 bg-slate-900/30">
            <p className="text-xs text-muted-foreground mb-1">MEDIUM</p>
            <p className="text-3xl font-bold text-slate-100">{alertStats.bySeverity.MEDIUM}</p>
          </Card>
          <Card className="p-4 border-slate-700/50 bg-slate-900/30">
            <p className="text-xs text-muted-foreground mb-1">LOW</p>
            <p className="text-3xl font-bold text-slate-100">{alertStats.bySeverity.LOW}</p>
          </Card>
          <Card className="p-4 border-primary/30 bg-primary/10">
            <p className="text-xs text-muted-foreground mb-1">Всего</p>
            <p className="text-3xl font-bold text-primary">{alertStats.total}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Размер клиента</h3>
          
          <div className="flex flex-wrap gap-2">
            {(['LARGE', 'MEDIUM', 'SMALL'] as CustomerSize[]).map((size) => (
              <Button
                key={size}
                variant={selectedCustomerSizes.includes(size) ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedCustomerSizes(prev =>
                    prev.includes(size)
                      ? prev.filter(s => s !== size)
                      : [...prev, size]
                  );
                }}
              >
                {size}
              </Button>
            ))}
          </div>
        </Card>

        {/* All Alerts in Unified Section */}
        <Card className="p-6 border-slate-700/50">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Все сигналы ({filteredAndPrioritizedAlerts.length})
          </h3>
          
          {filteredAndPrioritizedAlerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">Нет сигналов, соответствующих критериям</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredAndPrioritizedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-lg border border-slate-700/50 bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1 text-slate-400">
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-foreground">{alert.partnerName}</span>
                          <Badge variant="outline" className="text-xs">{getCategoryLabel(alert.alertType)}</Badge>
                          <Badge className="text-xs bg-slate-700/50 text-slate-200">
                            {alert.customerSize}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className="text-2xl font-bold text-slate-100">{alert.priorityScore}</p>
                      <p className="text-xs text-muted-foreground">Priority</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

