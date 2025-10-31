import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import FilterBar from '@/components/FilterBar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter } from 'recharts';
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { loadCSVData, filterByTimeRange, filterByDirection, getDirections, calculatePartnerStats, analyzeSuccessPatterns, calculateSnapshotDate, setSnapshotDate } from '@/lib/dataProcessor';
import { buildCohortAnalysis, generateSegmentPortraits, calculateChurnScore, getPartnerSegment, calculateRiskTrajectory } from '@/lib/churnAnalytics';
import type { OrderRecord, TimeRange } from '@/lib/types';

export default function ChurnAnalysisEnhanced() {
  const [allData, setAllData] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>({ label: '30 дней', days: 30 });
  const [direction, setDirection] = useState('all');
  const [directions, setDirections] = useState<string[]>([]);
  
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
  
  const analysis = useMemo(() => {
    const filteredData = filterByDirection(filterByTimeRange(allData, timeRange.days), direction);
    const partnerStats = calculatePartnerStats(filteredData);
    const patterns = analyzeSuccessPatterns(partnerStats);
    
    // Calculate benchmarks
    const activePartners = partnerStats.filter(p => !p.isChurned);
    const benchmark = {
      avgInterval: activePartners.length > 0 
        ? activePartners.reduce((sum, p) => sum + p.orderFrequency, 0) / activePartners.length 
        : 1,
      avgVolatility: activePartners.length > 0
        ? activePartners.reduce((sum, p) => sum + p.volatility, 0) / activePartners.length 
        : 0.5,
      avgSKU: partnerStats.reduce((sum, p) => sum + p.uniqueSKU, 0) / (partnerStats.length || 1),
      avgWarehouses: partnerStats.reduce((sum, p) => sum + p.uniqueWarehouses, 0) / (partnerStats.length || 1)
    };
    
    // Calculate churn scores and risk trajectories
    const partnersWithScores = partnerStats.map(p => {
      const churnScore = calculateChurnScore(p, benchmark);
      const trajectory = calculateRiskTrajectory(
        filteredData.filter(r => r["Партнер"] === p.partner),
        p.partner,
        allData
      );
      
      return {
        ...p,
        churnScore,
        riskTrend: trajectory.trend,
        riskChange: trajectory.change,
        segment: getPartnerSegment(p)
      };
    });
    
    // Build cohort analysis
    const cohorts = buildCohortAnalysis(allData, direction === 'all' ? 'all' : direction);
    
    // Generate segment portraits
    const segments = generateSegmentPortraits(partnerStats, ['Express/FBS', 'Ярославка']);
    
    const churned = partnersWithScores.filter(p => p.isChurned);
    const activePartnersList = partnersWithScores.filter(p => !p.isChurned);
    const highRisk = activePartnersList.filter(p => p.churnScore >= 70);
    const mediumRisk = activePartnersList.filter(p => p.churnScore >= 40 && p.churnScore < 70);
    const lowRisk = activePartnersList.filter(p => p.churnScore < 40);
    
    return {
      partnerStats: partnersWithScores,
      patterns,
      benchmark,
      churned,
      activePartners: activePartnersList,
      highRisk,
      mediumRisk,
      lowRisk,
      cohorts,
      segments
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
              Углубленная аналитика: когорты, сегменты и риск-скоринг
            </p>
          </div>
          
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Обзор</TabsTrigger>
              <TabsTrigger value="cohorts">Когорты</TabsTrigger>
              <TabsTrigger value="segments">Сегменты</TabsTrigger>
              <TabsTrigger value="scoring">Риск-скоринг</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 border-red-800/30 bg-red-900/10">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <h3 className="font-semibold text-foreground">Churned</h3>
                  </div>
                  <p className="text-3xl font-bold text-red-400">{analysis.churned.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {((analysis.churned.length / analysis.partnerStats.length) * 100).toFixed(0)}% партнёров
                  </p>
                </Card>
                
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
              
              {/* Success Patterns */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Портреты успешных и неуспешных клиентов</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-green-400">✓ Успешные (Low Risk)</h4>
                    <div className="text-sm space-y-2">
                      <div>Интервал: <span className="font-mono">{analysis.patterns.successful.avgOrderFrequency.toFixed(1)}</span> дней</div>
                      <div>SKU: <span className="font-mono">{analysis.patterns.successful.avgSKUCount.toFixed(1)}</span> (медиана: {analysis.patterns.successful.medianSKUCount})</div>
                      <div>Склады: <span className="font-mono">{analysis.patterns.successful.avgWarehouseCount.toFixed(1)}</span> (медиана: {analysis.patterns.successful.medianWarehouseCount})</div>
                      <div>Волатильность: <span className="font-mono">{analysis.patterns.successful.avgVolatility.toFixed(2)}</span></div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-red-400">✗ Неуспешные (High Risk)</h4>
                    <div className="text-sm space-y-2">
                      <div>Интервал: <span className="font-mono">{analysis.patterns.unsuccessful.avgOrderFrequency.toFixed(1)}</span> дней</div>
                      <div>SKU: <span className="font-mono">{analysis.patterns.unsuccessful.avgSKUCount.toFixed(1)}</span> (медиана: {analysis.patterns.unsuccessful.medianSKUCount})</div>
                      <div>Склады: <span className="font-mono">{analysis.patterns.unsuccessful.avgWarehouseCount.toFixed(1)}</span> (медиана: {analysis.patterns.unsuccessful.medianWarehouseCount})</div>
                      <div>Волатильность: <span className="font-mono">{analysis.patterns.unsuccessful.avgVolatility.toFixed(2)}</span></div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            {/* Cohorts Tab */}
            <TabsContent value="cohorts" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Retention Curves по когортам</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Процент партнёров, оставшихся активными через 30, 60, 90, 120 дней после первого заказа
                </p>
                
                {analysis.cohorts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={analysis.cohorts.map(c => ({
                      name: c.cohortMonth,
                      'M0': c.retention.month0,
                      'M1': c.retention.month1,
                      'M2': c.retention.month2,
                      'M3': c.retention.month3
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="M0" stroke="#22c55e" name="0 дней (100%)" />
                      <Line type="monotone" dataKey="M1" stroke="#3b82f6" name="30 дней" />
                      <Line type="monotone" dataKey="M2" stroke="#f59e0b" name="60 дней" />
                      <Line type="monotone" dataKey="M3" stroke="#ef4444" name="90 дней" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground">Недостаточно данных для анализа когорт</p>
                )}
              </Card>
              
              {/* Cohort Table */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Таблица когорт</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3">Когорта</th>
                        <th className="text-right py-2 px-3">Партнёров</th>
                        <th className="text-right py-2 px-3">M0 (0d)</th>
                        <th className="text-right py-2 px-3">M1 (30d)</th>
                        <th className="text-right py-2 px-3">M2 (60d)</th>
                        <th className="text-right py-2 px-3">M3 (90d)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.cohorts.map((cohort, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-background/50">
                          <td className="py-2 px-3">{cohort.cohortMonth}</td>
                          <td className="text-right py-2 px-3">{cohort.partnersCount}</td>
                          <td className="text-right py-2 px-3 text-green-400">100%</td>
                          <td className="text-right py-2 px-3 text-blue-400">{cohort.retention.month1.toFixed(0)}%</td>
                          <td className="text-right py-2 px-3 text-yellow-400">{cohort.retention.month2.toFixed(0)}%</td>
                          <td className="text-right py-2 px-3 text-red-400">{cohort.retention.month3.toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>
            
            {/* Segments Tab */}
            <TabsContent value="segments" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Портреты сегментов</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Характеристики партнёров по размерам (маленькие/средние/крупные) и направлениям
                </p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3">Сегмент</th>
                        <th className="text-right py-2 px-3">Партнёров</th>
                        <th className="text-right py-2 px-3">Churn Rate</th>
                        <th className="text-right py-2 px-3">Avg Orders</th>
                        <th className="text-right py-2 px-3">Avg SKU</th>
                        <th className="text-right py-2 px-3">Avg Warehouses</th>
                        <th className="text-right py-2 px-3">Avg Interval</th>
                        <th className="text-right py-2 px-3">Churn Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.segments.map((segment, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-background/50">
                          <td className="py-2 px-3">
                            <div className="font-medium">{segment.segment}</div>
                            <div className="text-xs text-muted-foreground">{segment.direction}</div>
                          </td>
                          <td className="text-right py-2 px-3">{segment.partnersCount}</td>
                          <td className="text-right py-2 px-3">
                            <Badge variant={segment.churnRate > 50 ? 'destructive' : 'secondary'}>
                              {segment.churnRate.toFixed(0)}%
                            </Badge>
                          </td>
                          <td className="text-right py-2 px-3">{segment.avgOrders.toFixed(0)}</td>
                          <td className="text-right py-2 px-3">{segment.avgSKU.toFixed(1)}</td>
                          <td className="text-right py-2 px-3">{segment.avgWarehouses.toFixed(1)}</td>
                          <td className="text-right py-2 px-3">{segment.avgInterval.toFixed(1)}</td>
                          <td className="text-right py-2 px-3">
                            <Badge variant={segment.avgChurnScore > 70 ? 'destructive' : segment.avgChurnScore > 40 ? 'secondary' : 'outline'}>
                              {segment.avgChurnScore.toFixed(0)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>
            
            {/* Risk Scoring Tab */}
            <TabsContent value="scoring" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Риск-скоринг партнёров</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Топ-20 партнёров по риску отвала с траекторией изменения риска
                </p>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {analysis.activePartners
                    .sort((a, b) => b.churnScore - a.churnScore)
                    .slice(0, 20)
                    .map((partner, idx) => (
                      <div key={idx} className="p-4 border border-border/50 rounded-lg hover:bg-background/50">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{partner.partner}</h4>
                            <p className="text-xs text-muted-foreground">{partner.direction} • {partner.segment.label}</p>
                          </div>
                          <Badge variant={
                            partner.churnScore >= 70 ? 'destructive' : 
                            partner.churnScore >= 40 ? 'secondary' : 
                            'outline'
                          }>
                            {partner.churnScore.toFixed(0)}/100
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                          <div>
                            <span className="text-muted-foreground">Заказы:</span>
                            <div className="font-mono">{partner.totalOrders}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">SKU:</span>
                            <div className="font-mono">{partner.uniqueSKU}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Интервал:</span>
                            <div className="font-mono">{partner.orderFrequency.toFixed(1)}d</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Волатильность:</span>
                            <div className="font-mono">{partner.volatility.toFixed(2)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Тренд:</span>
                          {partner.riskTrend === 'improving' && (
                            <>
                              <ArrowDown className="w-4 h-4 text-green-500" />
                              <span className="text-green-500 font-semibold">Улучшается (-{Math.abs(partner.riskChange).toFixed(0)}%)</span>
                            </>
                          )}
                          {partner.riskTrend === 'degrading' && (
                            <>
                              <ArrowUp className="w-4 h-4 text-red-500" />
                              <span className="text-red-500 font-semibold">Ухудшается (+{partner.riskChange.toFixed(0)}%)</span>
                            </>
                          )}
                          {partner.riskTrend === 'stable' && (
                            <>
                              <div className="w-4 h-4 text-yellow-400">—</div>
                              <span className="text-yellow-400">Стабилен</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}

