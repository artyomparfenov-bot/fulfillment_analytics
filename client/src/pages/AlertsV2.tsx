import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import FilterBar from '@/components/FilterBar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp, AlertCircle, Zap, Target, Users } from 'lucide-react';
import { loadCSVData, filterByTimeRange, filterByDirection, getDirections, calculatePartnerStats } from '@/lib/dataProcessor';
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
  const [minPriorityScore, setMinPriorityScore] = useState(40);
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');

  useEffect(() => {
    loadCSVData().then(data => {
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
      minPriorityScore: minPriorityScore,
      isNew: showOnlyNew ? true : undefined
    });
  }, [prioritizedAlerts, selectedSeverities, selectedCustomerSizes, selectedCategories, minPriorityScore, showOnlyNew]);

  const groupedAlerts = useMemo(() => {
    return groupAndPrioritizeAlerts(filteredAndPrioritizedAlerts);
  }, [filteredAndPrioritizedAlerts]);

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
    switch (severity) {
      case 'CRITICAL': return 'bg-red-900 text-red-100 border-red-500/50';
      case 'HIGH': return 'bg-orange-900 text-orange-100 border-orange-500/50';
      case 'MEDIUM': return 'bg-yellow-900 text-yellow-100 border-yellow-500/50';
      case 'LOW': return 'bg-blue-900 text-blue-100 border-blue-500/50';
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Приоритизированные Сигналы</h1>
          <p className="text-muted-foreground">Аномалии и риски, отсортированные по влиянию на бизнес</p>
        </div>

        <FilterBar
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          direction={direction}
          onDirectionChange={setDirection}
          directions={directions}
        />

        {/* Top Critical Alerts */}
        {topCritical.length > 0 && (
          <Card className="p-6 border-red-500/50 bg-red-900/10">
            <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Критичные сигналы ({topCritical.length})
            </h3>
            <div className="space-y-3">
              {topCritical.map((alert) => (
                <div key={alert.id} className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{alert.partnerName}</span>
                        <Badge variant="outline" className="text-xs">{getCategoryLabel(alert.alertType)}</Badge>
                        <Badge className={`text-xs ${alert.customerSize === 'LARGE' ? 'bg-red-600' : alert.customerSize === 'MEDIUM' ? 'bg-orange-600' : 'bg-blue-600'}`}>
                          {alert.customerSize}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-400">{alert.priorityScore}</div>
                      <p className="text-xs text-muted-foreground">Priority Score</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Alert Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="p-4 border-red-500/30 bg-red-900/10">
            <p className="text-xs text-muted-foreground mb-1">CRITICAL</p>
            <p className="text-2xl font-bold text-red-400">{alertStats.bySeverity.CRITICAL}</p>
          </Card>
          <Card className="p-4 border-orange-500/30 bg-orange-900/10">
            <p className="text-xs text-muted-foreground mb-1">HIGH</p>
            <p className="text-2xl font-bold text-orange-400">{alertStats.bySeverity.HIGH}</p>
          </Card>
          <Card className="p-4 border-yellow-500/30 bg-yellow-900/10">
            <p className="text-xs text-muted-foreground mb-1">MEDIUM</p>
            <p className="text-2xl font-bold text-yellow-400">{alertStats.bySeverity.MEDIUM}</p>
          </Card>
          <Card className="p-4 border-blue-500/30 bg-blue-900/10">
            <p className="text-xs text-muted-foreground mb-1">LOW</p>
            <p className="text-2xl font-bold text-blue-400">{alertStats.bySeverity.LOW}</p>
          </Card>
          <Card className="p-4 border-primary/30 bg-primary/10">
            <p className="text-xs text-muted-foreground mb-1">Всего</p>
            <p className="text-2xl font-bold text-primary">{alertStats.total}</p>
          </Card>

        </div>

        {/* Filters */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Фильтры и Приоритизация</h3>
          
          <div className="space-y-4">
            {/* Severity Filter */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Уровень серьёзности</label>
              <div className="flex flex-wrap gap-2">
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as AlertSeverity[]).map((severity) => (
                  <Button
                    key={severity}
                    variant={selectedSeverities.includes(severity) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedSeverities(prev =>
                        prev.includes(severity)
                          ? prev.filter(s => s !== severity)
                          : [...prev, severity]
                      );
                    }}
                  >
                    {severity}
                  </Button>
                ))}
              </div>
            </div>

            {/* Customer Size Filter */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Размер клиента</label>
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
            </div>

            {/* Priority Score Slider */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Минимальный приоритет: {minPriorityScore}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={minPriorityScore}
                onChange={(e) => setMinPriorityScore(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* View Mode */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Режим отображения</label>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grouped' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grouped')}
                >
                  Сгруппированные
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  Список
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Alerts Display */}
        {viewMode === 'grouped' ? (
          // Grouped View
          <div className="space-y-4">
            {groupedAlerts.length === 0 ? (
              <Card className="p-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">Нет сигналов, соответствующих критериям</p>
              </Card>
            ) : (
              groupedAlerts.map((group) => (
                <Card key={`${group.category}_${group.severity}`} className={`p-6 border ${getSeverityColor(group.severity)}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getSeverityIcon(group.severity)}
                      <div>
                        <h3 className="font-semibold text-foreground">{getCategoryLabel(group.category)}</h3>
                        <p className="text-xs text-muted-foreground">{group.severity} • {group.count} сигналов</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">Средний приоритет</p>
                      <p className="text-lg font-bold">{Math.round(group.totalPriorityScore / group.count)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {group.alerts.slice(0, 5).map((alert) => (
                      <div key={alert.id} className="p-3 bg-black/20 rounded border border-white/10">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{alert.partnerName}</p>
                            <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <p className="font-bold text-sm">{alert.priorityScore}</p>
                            <div className="flex items-center gap-1 justify-end mt-1">
                              {getCustomerSizeIcon(alert.customerSize)}
                              <span className="text-xs">{alert.customerSize}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {group.count > 5 && (
                      <p className="text-xs text-muted-foreground text-center py-2">+{group.count - 5} ещё...</p>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          // List View
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Все сигналы ({filteredAndPrioritizedAlerts.length})</h3>
            {filteredAndPrioritizedAlerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">Нет сигналов, соответствующих критериям</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredAndPrioritizedAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">{getSeverityIcon(alert.severity)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-foreground">{alert.partnerName}</span>
                            <Badge variant="outline" className="text-xs">{getCategoryLabel(alert.alertType)}</Badge>
                            <Badge className={`text-xs ${alert.customerSize === 'LARGE' ? 'bg-red-600' : alert.customerSize === 'MEDIUM' ? 'bg-orange-600' : 'bg-blue-600'}`}>
                              {alert.customerSize}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="text-2xl font-bold">{alert.priorityScore}</p>
                        <p className="text-xs text-muted-foreground">Priority</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

