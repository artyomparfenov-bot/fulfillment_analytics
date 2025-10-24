import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import FilterBar from '@/components/FilterBar';
import AlertBadge from '@/components/AlertBadge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { loadCSVData, filterByTimeRange, filterByDirection, getDirections, calculatePartnerStats } from '@/lib/dataProcessor';
import type { OrderRecord, TimeRange, PartnerStats } from '@/lib/types';

export default function Partners() {
  const [allData, setAllData] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>({ label: '30 дней', days: 30 });
  const [direction, setDirection] = useState('all');
  const [directions, setDirections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<PartnerStats | null>(null);
  
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
  
  const partnerStats = useMemo(() => {
    const filteredData = filterByDirection(filterByTimeRange(allData, timeRange.days), direction);
    return calculatePartnerStats(filteredData);
  }, [allData, timeRange, direction]);
  
  const filteredPartners = useMemo(() => {
    return partnerStats.filter(p => 
      p.partner && p.partner.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [partnerStats, searchQuery]);
  
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
  
  const getRiskColor = (risk: number) => {
    if (risk >= 70) return 'text-red-500';
    if (risk >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };
  
  const getRiskBadge = (partner: PartnerStats) => {
    if (partner.isChurned) return <Badge variant="destructive" className="bg-red-600/20 text-red-400 border-red-600/30">Churned</Badge>;
    if (partner.churnRisk >= 70) return <Badge variant="destructive">Высокий риск</Badge>;
    if (partner.churnRisk >= 40) return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Средний риск</Badge>;
    return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Низкий риск</Badge>;
  };
  
  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen">
        <FilterBar
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          direction={direction}
          onDirectionChange={setDirection}
          directions={directions}
        />
        
        <div className="flex-1 overflow-hidden flex">
          {/* Partners list */}
          <div className="w-1/2 border-r border-border overflow-auto">
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Партнеры</h2>
                <p className="text-muted-foreground mt-1">
                  Анализ активности и риски churn
                </p>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск партнёра..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="space-y-3">
                {filteredPartners.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Партнеры не найдены</p>
                  </div>
                ) : filteredPartners.map((partner, index) => (
                  <Card
                    key={index}
                    className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedPartner?.partner === partner.partner && selectedPartner?.direction === partner.direction
                        ? 'ring-2 ring-primary'
                        : ''
                    }`}
                    onClick={() => setSelectedPartner(partner)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{partner.partner}</h3>
                        <p className="text-sm text-muted-foreground">{partner.direction}</p>
                      </div>
                      {getRiskBadge(partner)}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm mt-3">
                      <div>
                        <p className="text-muted-foreground">Заказы</p>
                        <p className="font-medium text-foreground">{partner.totalOrders}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">SKU</p>
                        <p className="font-medium text-foreground">{partner.uniqueSKU}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Риск</p>
                        <p className={`font-medium ${getRiskColor(partner.churnRisk)}`}>
                          {partner.churnRisk}%
                        </p>
                      </div>
                    </div>
                    
                    {partner.alerts.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          {partner.alerts.length} {partner.alerts.length === 1 ? 'сигнал' : 'сигналов'}
                        </p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </div>
          
          {/* Partner details */}
          <div className="w-1/2 overflow-auto bg-muted/20">
            {selectedPartner ? (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{selectedPartner.partner}</h2>
                  <p className="text-muted-foreground mt-1">{selectedPartner.direction}</p>
                  <div className="mt-3">
                    {getRiskBadge(selectedPartner)}
                  </div>
                </div>
                
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Основные метрики</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Всего заказов</p>
                      <p className="text-2xl font-bold text-foreground">{selectedPartner.totalOrders}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Уникальных SKU</p>
                      <p className="text-2xl font-bold text-foreground">{selectedPartner.uniqueSKU}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Складов</p>
                      <p className="text-2xl font-bold text-foreground">{selectedPartner.uniqueWarehouses}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Дней с последнего заказа</p>
                      <p className="text-2xl font-bold text-foreground">{selectedPartner.daysSinceLastOrder}</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Статистический анализ</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Средняя частота заказов</span>
                      <span className="font-medium text-foreground">{selectedPartner.avgOrdersPerDay.toFixed(2)} заказов/день</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Медианная частота заказов</span>
                      <span className="font-medium text-foreground">{selectedPartner.medianOrdersPerDay.toFixed(2)} заказов/день</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Интервал между заказами</span>
                      <span className="font-medium text-foreground">{selectedPartner.orderFrequency.toFixed(1)} дней</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Коэффициент вариации</span>
                      <span className="font-medium text-foreground">{selectedPartner.volatility.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Статус</span>
                      <Badge variant={selectedPartner.isActive ? 'default' : 'secondary'}>
                        {selectedPartner.isActive ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </div>
                  </div>
                </Card>
                
                {selectedPartner.alerts.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      Сигналы и предупреждения ({selectedPartner.alerts.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedPartner.alerts.map((alert, index) => (
                        <AlertBadge key={index} alert={alert} />
                      ))}
                    </div>
                  </Card>
                )}
                
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Временные рамки</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Первый заказ</p>
                      <p className="font-medium text-foreground">
                        {selectedPartner.firstOrderDate.toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Последний заказ</p>
                      <p className="font-medium text-foreground">
                        {selectedPartner.lastOrderDate.toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Период работы</p>
                      <p className="font-medium text-foreground">
                        {Math.ceil((selectedPartner.lastOrderDate.getTime() - selectedPartner.firstOrderDate.getTime()) / (1000 * 60 * 60 * 24))} дней
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <p>Выберите партнёра для просмотра деталей</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

