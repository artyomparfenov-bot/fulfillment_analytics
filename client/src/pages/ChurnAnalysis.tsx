import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import FilterBar from '@/components/FilterBar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { loadCSVData, filterByTimeRange, filterByDirection, getDirections, calculatePartnerStats, analyzeSuccessPatterns } from '@/lib/dataProcessor';
import type { OrderRecord, TimeRange } from '@/lib/types';

export default function ChurnAnalysis() {
  const [allData, setAllData] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>({ label: '30 дней', days: 30 });
  const [direction, setDirection] = useState('all');
  const [directions, setDirections] = useState<string[]>([]);
  
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
  
  const analysis = useMemo(() => {
    const filteredData = filterByDirection(filterByTimeRange(allData, timeRange.days), direction);
    const partnerStats = calculatePartnerStats(filteredData);
    const patterns = analyzeSuccessPatterns(partnerStats);
    
    const highRisk = partnerStats.filter(p => p.churnRisk >= 70);
    const mediumRisk = partnerStats.filter(p => p.churnRisk >= 40 && p.churnRisk < 70);
    const lowRisk = partnerStats.filter(p => p.churnRisk < 40);
    
    const riskDistribution = [
      { name: 'Высокий риск', value: highRisk.length, fill: '#ef4444' },
      { name: 'Средний риск', value: mediumRisk.length, fill: '#eab308' },
      { name: 'Низкий риск', value: lowRisk.length, fill: '#22c55e' }
    ];
    
    const scatterData = partnerStats.map(p => ({
      name: p.partner,
      orders: p.totalOrders,
      risk: p.churnRisk,
      sku: p.uniqueSKU
    }));
    
    return {
      partnerStats,
      patterns,
      highRisk,
      mediumRisk,
      lowRisk,
      riskDistribution,
      scatterData
    };
  }, [allData, timeRange, direction]);
  
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
            <h2 className="text-2xl font-bold text-foreground">Churn Analysis</h2>
            <p className="text-muted-foreground mt-1">
              Предиктивная аналитика и паттерны успешных клиентов
            </p>
          </div>
          
          {/* Risk overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-foreground">Высокий риск</h3>
              </div>
              <p className="text-3xl font-bold text-red-500">{analysis.highRisk.length}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {((analysis.highRisk.length / analysis.partnerStats.length) * 100).toFixed(0)}% партнёров
              </p>
            </Card>
            
            <Card className="p-6 border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold text-foreground">Средний риск</h3>
              </div>
              <p className="text-3xl font-bold text-yellow-500">{analysis.mediumRisk.length}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {((analysis.mediumRisk.length / analysis.partnerStats.length) * 100).toFixed(0)}% партнёров
              </p>
            </Card>
            
            <Card className="p-6 border-green-500/20 bg-green-500/5">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-foreground">Низкий риск</h3>
              </div>
              <p className="text-3xl font-bold text-green-500">{analysis.lowRisk.length}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {((analysis.lowRisk.length / analysis.partnerStats.length) * 100).toFixed(0)}% партнёров
              </p>
            </Card>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Распределение по уровню риска</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analysis.riskDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)' }}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(20, 20, 30, 0.95)', 
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Корреляция: Заказы vs Риск Churn</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="orders" 
                    name="Заказы"
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)' }}
                  />
                  <YAxis 
                    dataKey="risk" 
                    name="Риск %"
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)' }}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(20, 20, 30, 0.95)', 
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '8px'
                    }}
                  />
                  <Scatter data={analysis.scatterData} fill="#8b5cf6" />
                </ScatterChart>
              </ResponsiveContainer>
            </Card>
          </div>
          
          {/* Success patterns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 border-green-500/20 bg-green-500/5">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Портрет успешного клиента
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Средний интервал между заказами</p>
                  <p className="text-2xl font-bold text-foreground">
                    {analysis.patterns.successful.avgOrderFrequency.toFixed(1)} дней
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Медиана: {analysis.patterns.successful.medianOrderFrequency.toFixed(1)} дней
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Среднее количество SKU</p>
                  <p className="text-2xl font-bold text-foreground">
                    {analysis.patterns.successful.avgSKUCount.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Медиана: {analysis.patterns.successful.medianSKUCount.toFixed(0)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Среднее количество складов</p>
                  <p className="text-2xl font-bold text-foreground">
                    {analysis.patterns.successful.avgWarehouseCount.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Медиана: {analysis.patterns.successful.medianWarehouseCount.toFixed(0)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Волатильность (CV)</p>
                  <p className="text-2xl font-bold text-foreground">
                    {analysis.patterns.successful.avgVolatility.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Медиана: {analysis.patterns.successful.medianVolatility.toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6 border-red-500/20 bg-red-500/5">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Портрет неуспешного клиента (Churn)
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Средний интервал между заказами</p>
                  <p className="text-2xl font-bold text-foreground">
                    {analysis.patterns.unsuccessful.avgOrderFrequency.toFixed(1)} дней
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Медиана: {analysis.patterns.unsuccessful.medianOrderFrequency.toFixed(1)} дней
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Среднее количество SKU</p>
                  <p className="text-2xl font-bold text-foreground">
                    {analysis.patterns.unsuccessful.avgSKUCount.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Медиана: {analysis.patterns.unsuccessful.medianSKUCount.toFixed(0)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Среднее количество складов</p>
                  <p className="text-2xl font-bold text-foreground">
                    {analysis.patterns.unsuccessful.avgWarehouseCount.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Медиана: {analysis.patterns.unsuccessful.medianWarehouseCount.toFixed(0)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Волатильность (CV)</p>
                  <p className="text-2xl font-bold text-foreground">
                    {analysis.patterns.unsuccessful.avgVolatility.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Медиана: {analysis.patterns.unsuccessful.medianVolatility.toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* High risk partners */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Партнеры с высоким риском churn ({analysis.highRisk.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Партнер</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Направление</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Риск</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Заказы</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">SKU</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Дней без заказов</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Сигналы</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.highRisk.map((partner, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium text-foreground">{partner.partner}</td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">{partner.direction}</td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant="destructive">{partner.churnRisk}%</Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-foreground">{partner.totalOrders}</td>
                      <td className="py-3 px-4 text-right text-foreground">{partner.uniqueSKU}</td>
                      <td className="py-3 px-4 text-right text-foreground">{partner.daysSinceLastOrder}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="secondary">{partner.alerts.length}</Badge>
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

