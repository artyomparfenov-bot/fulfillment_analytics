import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import FilterBar from '@/components/FilterBar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';
import { loadCSVData, filterByTimeRange, filterByDirection, getDirections } from '@/lib/dataProcessor';
import { generateAllAlerts } from '@/lib/alertsEngine';
import type { OrderRecord, TimeRange } from '@/lib/types';
import type { AnomalyAlert } from '@/lib/alertsEngine';

export default function Alerts() {
  const [allData, setAllData] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>({ label: '30 дней', days: 30 });
  const [direction, setDirection] = useState('all');
  const [directions, setDirections] = useState<string[]>([]);
  const [selectedAlertType, setSelectedAlertType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

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

  const allAlerts = useMemo(() => {
    if (filteredData.length === 0) return [];
    return generateAllAlerts(filteredData);
  }, [filteredData]);

  const filteredAlerts = useMemo(() => {
    return allAlerts.filter(alert => {
      if (selectedAlertType !== 'all' && alert.alertType !== selectedAlertType) return false;
      if (selectedSeverity !== 'all' && alert.severity !== selectedSeverity) return false;
      return true;
    });
  }, [allAlerts, selectedAlertType, selectedSeverity]);

  const alertStats = useMemo(() => {
    return {
      total: filteredAlerts.length,
      critical: filteredAlerts.filter(a => a.severity === 'critical').length,
      high: filteredAlerts.filter(a => a.severity === 'high').length,
      medium: filteredAlerts.filter(a => a.severity === 'medium').length,
      low: filteredAlerts.filter(a => a.severity === 'low').length,
    };
  }, [filteredAlerts]);

  const alertTypeStats = useMemo(() => {
    const stats = new Map<string, number>();
    filteredAlerts.forEach(alert => {
      stats.set(alert.alertType, (stats.get(alert.alertType) || 0) + 1);
    });
    return Array.from(stats.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredAlerts]);

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

  const getSeverityColorClass = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'bg-red-900 text-red-100';
      case 'high': return 'bg-red-700 text-red-100';
      case 'medium': return 'bg-yellow-700 text-yellow-100';
      case 'low': return 'bg-blue-700 text-blue-100';
      default: return 'bg-gray-700 text-gray-100';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertCircle className="w-4 h-4" />;
      case 'medium': return <TrendingDown className="w-4 h-4" />;
      case 'low': return <TrendingUp className="w-4 h-4" />;
      default: return null;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'order_decline': 'Падение заказов',
      'churn_risk': 'Риск отвала',
      'volatility_spike': 'Скачок волатильности',
      'warehouse_anomaly': 'Аномалия складов',
      'sku_churn': 'Отвал SKU',
      'concentration_risk': 'Риск концентрации',
    };
    return labels[type] || type;
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Система Сигналов</h1>
          <p className="text-muted-foreground">Аномалии и риски в поведении партнёров и SKU</p>
        </div>

        <FilterBar
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          direction={direction}
          onDirectionChange={setDirection}
          directions={directions}
        />

        {/* Alert Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4 border-red-500/30 bg-red-900/10">
            <p className="text-sm text-muted-foreground mb-1">Critical</p>
            <p className="text-3xl font-bold text-red-400">{alertStats.critical}</p>
          </Card>
          <Card className="p-4 border-orange-500/30 bg-orange-900/10">
            <p className="text-sm text-muted-foreground mb-1">High</p>
            <p className="text-3xl font-bold text-orange-400">{alertStats.high}</p>
          </Card>
          <Card className="p-4 border-yellow-500/30 bg-yellow-900/10">
            <p className="text-sm text-muted-foreground mb-1">Medium</p>
            <p className="text-3xl font-bold text-yellow-400">{alertStats.medium}</p>
          </Card>
          <Card className="p-4 border-blue-500/30 bg-blue-900/10">
            <p className="text-sm text-muted-foreground mb-1">Low</p>
            <p className="text-3xl font-bold text-blue-400">{alertStats.low}</p>
          </Card>
          <Card className="p-4 border-primary/30 bg-primary/10">
            <p className="text-sm text-muted-foreground mb-1">Всего</p>
            <p className="text-3xl font-bold text-primary">{alertStats.total}</p>
          </Card>
        </div>

        {/* Alert Type Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Распределение типов сигналов</h3>
          <div className="space-y-3">
            {alertTypeStats.map((stat) => (
              <div key={stat.type} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{getAlertTypeLabel(stat.type)}</span>
                <div className="flex items-center gap-3">
                  <div className="w-48 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${(stat.count / alertStats.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-foreground w-12 text-right">{stat.count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Filters */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Фильтры</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedAlertType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedAlertType('all')}
            >
              Все типы
            </Button>
            {alertTypeStats.map((stat) => (
              <Button
                key={stat.type}
                variant={selectedAlertType === stat.type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedAlertType(stat.type)}
              >
                {getAlertTypeLabel(stat.type)} ({stat.count})
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant={selectedSeverity === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSeverity('all')}
            >
              Все уровни
            </Button>
            {['critical', 'high', 'medium', 'low'].map((severity) => (
              <Button
                key={severity}
                variant={selectedSeverity === severity ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSeverity(severity)}
              >
                {severity.toUpperCase()}
              </Button>
            ))}
          </div>
        </Card>

        {/* Alerts List */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Обнаруженные сигналы ({filteredAlerts.length})</h3>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">Аномалии не обнаружены</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredAlerts.map((alert: AnomalyAlert, index: number) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    alert.severity === 'critical'
                      ? 'border-red-500/50 bg-red-900/20'
                      : alert.severity === 'high'
                      ? 'border-orange-500/50 bg-orange-900/20'
                      : alert.severity === 'medium'
                      ? 'border-yellow-500/50 bg-yellow-900/20'
                      : 'border-blue-500/50 bg-blue-900/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground">{alert.partnerId}</span>
                          {alert.skuId && (
                            <span className="text-xs text-muted-foreground">SKU: {alert.skuId}</span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {alert.timeframe}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                        {(alert.benchmarkValue || alert.currentValue) && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            {alert.benchmarkValue && (
                              <div>Бенчмарк: <span className="text-foreground font-medium">{alert.benchmarkValue}</span></div>
                            )}
                            {alert.currentValue && (
                              <div>Текущее: <span className="text-foreground font-medium">{alert.currentValue}</span></div>
                            )}
                            {alert.percentageChange && (
                              <div>
                                Изменение: 
                                <span className={`font-medium ml-1 ${alert.direction === 'down' ? 'text-red-400' : 'text-green-400'}`}>
                                  {alert.direction === 'down' ? '↓' : '↑'} {Math.abs(parseFloat(alert.percentageChange)).toFixed(1)}%
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge className={getSeverityColorClass(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
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

