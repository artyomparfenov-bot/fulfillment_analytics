import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import FilterBar from '@/components/FilterBar';
import StatCard from '@/components/StatCard';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Package, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { loadCSVData, filterByTimeRange, filterByDirection, getDirections, calculatePartnerStats, calculateDirectionStats } from '@/lib/dataProcessor';
import { calculateBusinessMetrics, calculateDetailedDirectionStats, calculateSKUMetrics } from '@/lib/advancedMetrics';
import { generateTimeSeriesData, analyzeClientCohorts, segmentClientsByAge, findTopBottomPerformers } from '@/lib/overviewAnalytics';
import TimeSeriesChart from '@/components/TimeSeriesChart';
import ClientSegmentChart from '@/components/ClientSegmentChart';
import ClientCohortChart from '@/components/ClientCohortChart';
import TopBottomPerformersChart from '@/components/TopBottomPerformersChart';
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
  
  // Calculate advanced metrics (must be before conditional return)
  const businessMetrics = useMemo(() => {
    if (allData.length === 0) return {
      retentionRate: 0,
      churnRate: 0,
      momGrowth: 0,
      concentrationRisk: 0,
      healthScore: 0,
      avgOrdersPerActivePartner: 0
    };
    return calculateBusinessMetrics(filterByDirection(allData, direction), timeRange.days || 30);
  }, [allData, direction, timeRange]);
  
  const detailedDirections = useMemo(() => {
    if (allData.length === 0) return [];
    return calculateDetailedDirectionStats(filterByDirection(allData, direction), timeRange.days || 30);
  }, [allData, direction, timeRange]);
  
  const skuMetrics = useMemo(() => {
    if (allData.length === 0) return [];
    return calculateSKUMetrics(filterByDirection(allData, direction));
  }, [allData, direction]);
  
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
  
  // Calculate stats from ALL data for total partners
  const allPartnerStats = calculatePartnerStats(filterByDirection(allData, direction));
  const totalPartners = allPartnerStats.length;
  const activePartners = allPartnerStats.filter(p => p.isActive).length;
  const churnedPartners = allPartnerStats.filter(p => p.isChurned).length;
  const partnersAtRisk = allPartnerStats.filter(p => p.churnRisk > 50 && !p.isChurned).length;
  
  // Calculate stats from filtered data
  const totalOrders = filteredData.length;
  const totalSKU = new Set(filteredData.map(r => r["Артикул"])).size;
  
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard
              title="Всего заказов"
              value={totalOrders.toLocaleString()}
              icon={Package}
              subtitle={`${(totalOrders / (timeRange.days || 1)).toFixed(0)} заказов/день`}
            />
            <StatCard
              title="Активных партнёров"
              value={activePartners}
              icon={Users}
              subtitle={`${totalPartners} всего партнёров`}
            />
            <StatCard
              title="Уникальных SKU"
              value={totalSKU}
              icon={TrendingUp}
              subtitle={`${totalPartners > 0 ? (totalSKU / totalPartners).toFixed(1) : '0'} SKU/партнёр`}
            />
            <StatCard
              title="Партнеры в зоне риска"
              value={partnersAtRisk}
              icon={AlertTriangle}
              subtitle={`${totalPartners > 0 ? ((partnersAtRisk / totalPartners) * 100).toFixed(0) : '0'}% от общего числа`}
            />
            <StatCard
              title="Отвалившиеся (Churned)"
              value={churnedPartners}
              icon={AlertTriangle}
              subtitle={`${totalPartners > 0 ? ((churnedPartners / totalPartners) * 100).toFixed(0) : '0'}% от общего числа`}
            />
          </div>
          
          {/* Business Health Metrics */}
          <Card className="p-6 border-primary/20 bg-primary/5">
            <h3 className="text-lg font-semibold text-foreground mb-4">Business Health Score</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Health Score</p>
                <p className="text-3xl font-bold" style={{ color: businessMetrics.healthScore >= 70 ? '#22c55e' : businessMetrics.healthScore >= 50 ? '#eab308' : '#ef4444' }}>
                  {businessMetrics.healthScore.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">из 100</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Retention Rate</p>
                <p className="text-2xl font-bold text-foreground">{businessMetrics.retentionRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">удержание клиентов</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Churn Rate</p>
                <p className="text-2xl font-bold text-foreground">{businessMetrics.churnRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">отток клиентов</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">MoM Growth</p>
                <p className="text-2xl font-bold" style={{ color: businessMetrics.momGrowth >= 0 ? '#22c55e' : '#ef4444' }}>
                  {businessMetrics.momGrowth >= 0 ? '+' : ''}{businessMetrics.momGrowth.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">рост заказов</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Concentration Risk</p>
                <p className="text-2xl font-bold text-foreground">{businessMetrics.concentrationRisk.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground mt-1">заказы от топ-20%</p>
              </div>
            </div>
          </Card>
          
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
          
          {/* Detailed Direction Stats */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Детальная статистика по направлениям</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Направление</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Заказы</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Партнеры</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Активные</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Churned</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Retention</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Churn Rate</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Ср. заказов/партнёр</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedDirections.map((stat, index) => (
                    <tr key={index} className={`border-b border-border/50 hover:bg-muted/30 ${stat.subType ? 'bg-muted/10' : ''}`}>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {stat.subType ? (
                          <span className="ml-4 text-sm">└─ {stat.subType}</span>
                        ) : (
                          stat.direction
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-foreground">{stat.totalOrders.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-foreground">{stat.totalPartners}</td>
                      <td className="py-3 px-4 text-right text-green-500">{stat.activePartners}</td>
                      <td className="py-3 px-4 text-right text-red-400">{stat.churnedPartners}</td>
                      <td className="py-3 px-4 text-right text-foreground">{stat.retentionRate.toFixed(1)}%</td>
                      <td className="py-3 px-4 text-right text-foreground">{stat.churnRate.toFixed(1)}%</td>
                      <td className="py-3 px-4 text-right text-foreground">{stat.avgOrdersPerPartner.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          
          {/* SKU Metrics Over Time */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Динамика SKU по месяцам</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Месяц</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Активные SKU</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Новые SKU</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Churned SKU</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Всего SKU</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Ср. заказов/SKU</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Концентрация топ-20%</th>
                  </tr>
                </thead>
                <tbody>
                  {skuMetrics.slice(-12).map((metric, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium text-foreground">{metric.month}</td>
                      <td className="py-3 px-4 text-right text-foreground">{metric.activeSKU}</td>
                      <td className="py-3 px-4 text-right text-green-500">+{metric.newSKU}</td>
                      <td className="py-3 px-4 text-right text-red-400">{metric.churnedSKU}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{metric.totalSKU}</td>
                      <td className="py-3 px-4 text-right text-foreground">{metric.avgOrdersPerSKU.toFixed(1)}</td>
                      <td className="py-3 px-4 text-right text-foreground">{metric.topSKUConcentration.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          
          {/* Time Series Charts */}
          <Card className="p-6">
            <TimeSeriesChart 
              data={generateTimeSeriesData(filterByDirection(allData, direction), 'month')}
              title="Заказы по направлениям (по месяцам)"
            />
          </Card>
          
          {/* Client Segment Chart */}
          <Card className="p-6">
            <ClientSegmentChart
              data={segmentClientsByAge(filterByDirection(allData, direction), direction === 'all' ? 'all' : direction)}
              title="Заказы от новых (0-30 дней) и текущих (31+ дней) клиентов"
            />
          </Card>
          
          {/* Client Cohort Chart */}
          <Card className="p-6">
            <ClientCohortChart
              data={analyzeClientCohorts(filterByDirection(allData, direction), new Set())}
              title="Динамика новых и отвалившихся клиентов по месяцам"
            />
          </Card>
          
          {/* Top/Bottom Performers */}
          <Card className="p-6">
            {(() => {
              const { top, bottom } = findTopBottomPerformers(filterByDirection(allData, direction), direction === 'all' ? 'all' : direction, 10);
              return <TopBottomPerformersChart topPerformers={top} bottomPerformers={bottom} />;
            })()}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

