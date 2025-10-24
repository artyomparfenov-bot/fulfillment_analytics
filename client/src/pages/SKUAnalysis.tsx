import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import FilterBar from '@/components/FilterBar';
import AlertBadge from '@/components/AlertBadge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { loadCSVData, filterByTimeRange, filterByDirection, getDirections, calculateSKUStats } from '@/lib/dataProcessor';
import type { OrderRecord, TimeRange, SKUStats } from '@/lib/types';

export default function SKUAnalysis() {
  const [allData, setAllData] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>({ label: '30 дней', days: 30 });
  const [direction, setDirection] = useState('all');
  const [directions, setDirections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
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
  
  const skuStats = useMemo(() => {
    const filteredData = filterByDirection(filterByTimeRange(allData, timeRange.days), direction);
    return calculateSKUStats(filteredData);
  }, [allData, timeRange, direction]);
  
  const filteredSKUs = useMemo(() => {
    return skuStats.filter(s => 
      s.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.partner.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [skuStats, searchQuery]);
  
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
  
  const topSKUs = filteredSKUs.slice(0, 10);
  const skusWithAlerts = filteredSKUs.filter(s => s.alerts.length > 0);
  
  return (
    <DashboardLayout>
      <div className="flex flex-col">
        <FilterBar
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          direction={direction}
          onDirectionChange={setDirection}
          directions={directions}
        />
        
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Анализ SKU</h2>
            <p className="text-muted-foreground mt-1">
              Производительность и сигналы по товарным позициям
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Всего SKU</p>
              <p className="text-3xl font-bold text-foreground mt-2">{filteredSKUs.length}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm font-medium text-muted-foreground">SKU с сигналами</p>
              <p className="text-3xl font-bold text-foreground mt-2">{skusWithAlerts.length}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {((skusWithAlerts.length / filteredSKUs.length) * 100).toFixed(0)}% от общего числа
              </p>
            </Card>
            <Card className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Средняя частота заказов</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {(filteredSKUs.reduce((sum, s) => sum + s.avgOrdersPerDay, 0) / filteredSKUs.length).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">заказов/день</p>
            </Card>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по SKU или партнёру..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Топ-10 SKU по количеству заказов</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">SKU</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Партнер</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Направление</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Заказы</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Ср. заказов/день</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Дней без заказов</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {topSKUs.map((sku, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium text-foreground">{sku.sku}</td>
                      <td className="py-3 px-4 text-foreground">{sku.partner}</td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">{sku.direction}</td>
                      <td className="py-3 px-4 text-right text-foreground">{sku.totalOrders}</td>
                      <td className="py-3 px-4 text-right text-foreground">{sku.avgOrdersPerDay.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-foreground">{sku.daysSinceLastOrder}</td>
                      <td className="py-3 px-4 text-center">
                        {sku.alerts.length > 0 ? (
                          <Badge variant="destructive">{sku.alerts.length} сигналов</Badge>
                        ) : (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">OK</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          
          {skusWithAlerts.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                SKU с сигналами ({skusWithAlerts.length})
              </h3>
              <div className="space-y-4">
                {skusWithAlerts.slice(0, 20).map((sku, index) => (
                  <div key={index} className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">{sku.sku}</h4>
                        <p className="text-sm text-muted-foreground">{sku.partner} • {sku.direction}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Заказы</p>
                        <p className="font-semibold text-foreground">{sku.totalOrders}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {sku.alerts.map((alert, alertIndex) => (
                        <AlertBadge key={alertIndex} alert={alert} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Все SKU</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">SKU</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Партнер</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Направление</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Заказы</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Медиана заказов/день</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Интервал заказов (дни)</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Последний заказ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSKUs.map((sku, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium text-foreground">{sku.sku}</td>
                      <td className="py-3 px-4 text-foreground">{sku.partner}</td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">{sku.direction}</td>
                      <td className="py-3 px-4 text-right text-foreground">{sku.totalOrders}</td>
                      <td className="py-3 px-4 text-right text-foreground">{sku.medianOrdersPerDay.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-foreground">{sku.orderFrequency.toFixed(1)}</td>
                      <td className="py-3 px-4 text-right text-foreground">
                        {sku.lastOrderDate.toLocaleDateString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

