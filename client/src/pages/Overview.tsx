import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import FilterBar from '@/components/FilterBar';
import StatCard from '@/components/StatCard';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Package, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { loadCSVData, filterByTimeRange, filterByDirection, getDirections, calculatePartnerStats, calculateDirectionStats } from '@/lib/dataProcessor';
import type { OrderRecord, TimeRange } from '@/lib/types';

export default function Overview() {
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
  
  const filteredData = filterByDirection(filterByTimeRange(allData, timeRange.days), direction);
  const partnerStats = calculatePartnerStats(filteredData);
  const directionStats = calculateDirectionStats(filteredData);
  
  const totalOrders = filteredData.length;
  const totalPartners = new Set(filteredData.map(r => r["Партнёр"])).size;
  const totalSKU = new Set(filteredData.map(r => r["Артикул"])).size;
  const partnersAtRisk = partnerStats.filter(p => p.churnRisk > 50).length;
  
  const COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981'];
  
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
            <h2 className="text-2xl font-bold text-foreground">Обзор системы</h2>
            <p className="text-muted-foreground mt-1">
              Общая статистика и ключевые метрики за выбранный период
            </p>
          </div>
          
          {/* Key metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Всего заказов"
              value={totalOrders.toLocaleString()}
              icon={Package}
              subtitle={`${(totalOrders / (timeRange.days || 1)).toFixed(0)} заказов/день`}
            />
            <StatCard
              title="Активных партнёров"
              value={totalPartners}
              icon={Users}
              subtitle={`${partnerStats.filter(p => p.isActive).length} активных`}
            />
            <StatCard
              title="Уникальных SKU"
              value={totalSKU}
              icon={TrendingUp}
              subtitle={`${(totalSKU / totalPartners).toFixed(1)} SKU/партнёр`}
            />
            <StatCard
              title="Партнёры в зоне риска"
              value={partnersAtRisk}
              icon={AlertTriangle}
              subtitle={`${((partnersAtRisk / totalPartners) * 100).toFixed(0)}% от общего числа`}
            />
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Заказы по направлениям</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={directionStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="direction" 
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
                  <Bar dataKey="totalOrders" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Распределение партнёров</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={directionStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ direction, totalPartners }) => `${direction}: ${totalPartners}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="totalPartners"
                  >
                    {directionStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(20, 20, 30, 0.95)', 
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
          
          {/* Direction details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Детальная статистика по направлениям</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Направление</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Заказы</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Партнёры</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">SKU</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Ср. заказов/партнёр</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Медиана заказов</th>
                  </tr>
                </thead>
                <tbody>
                  {directionStats.map((stat, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium text-foreground">{stat.direction}</td>
                      <td className="py-3 px-4 text-right text-foreground">{stat.totalOrders.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-foreground">{stat.totalPartners}</td>
                      <td className="py-3 px-4 text-right text-foreground">{stat.totalSKU}</td>
                      <td className="py-3 px-4 text-right text-foreground">{stat.avgOrdersPerPartner.toFixed(1)}</td>
                      <td className="py-3 px-4 text-right text-foreground">{stat.medianOrdersPerPartner.toFixed(1)}</td>
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

