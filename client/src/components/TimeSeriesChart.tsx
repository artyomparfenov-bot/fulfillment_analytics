import { useMemo, useState } from 'react';
import { TimeSeriesData } from '@/lib/overviewAnalytics';
import { Button } from '@/components/ui/button';

interface TimeSeriesChartProps {
  data: TimeSeriesData[];
  title: string;
}

export default function TimeSeriesChart({ data, title }: TimeSeriesChartProps) {
  const [granularity, setGranularity] = useState<'week' | 'month'>('month');

  const directions = useMemo(() => {
    return Array.from(new Set(data.map(d => d.direction)));
  }, [data]);

  const colors: Record<string, string> = {
    'Express/FBS': '#a78bfa',
    'VSROK': '#f97316',
    'Ярославка': '#06b6d4'
  };

  // Group data by date
  const groupedData = useMemo(() => {
    const groups = new Map<string, Record<string, number>>();
    
    data.forEach(item => {
      if (!groups.has(item.date)) {
        groups.set(item.date, {});
      }
      const dateGroup = groups.get(item.date)!;
      dateGroup[item.direction] = (dateGroup[item.direction] || 0) + item.orders;
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values }));
  }, [data]);

  const maxOrders = useMemo(() => {
    return Math.max(...groupedData.map(d => 
      directions.reduce((sum, dir) => sum + ((d as any)[dir] || 0), 0)
    ));
  }, [groupedData, directions]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex gap-2">
          <Button
            variant={granularity === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGranularity('month')}
          >
            По месяцам
          </Button>
          <Button
            variant={granularity === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGranularity('week')}
          >
            По неделям
          </Button>
        </div>
      </div>

      <div className="w-full h-96 bg-slate-900 rounded-lg p-4 overflow-x-auto">
        <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(1200, groupedData.length * 40)} 300`}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(percent => (
            <g key={`grid-${percent}`}>
              <line
                x1="50"
                y1={300 - (percent / 100) * 250}
                x2={Math.max(1200, groupedData.length * 40) - 20}
                y2={300 - (percent / 100) * 250}
                stroke="#334155"
                strokeDasharray="4"
                strokeWidth="1"
              />
              <text
                x="20"
                y={300 - (percent / 100) * 250 + 4}
                fontSize="12"
                fill="#94a3b8"
                textAnchor="end"
              >
                {Math.round((percent / 100) * maxOrders)}
              </text>
            </g>
          ))}

          {/* Bars */}
          {groupedData.map((item, index) => {
            const x = 50 + index * 40;
            let y = 300;
            
            return (
              <g key={`bar-${index}`}>
                {directions.map(dir => {
                  const value = (item as any)[dir] || 0;
                  const barHeight = (value / maxOrders) * 250;
                  const currentY = y - barHeight;
                  
                  const bar = (
                    <rect
                      key={`${index}-${dir}`}
                      x={x}
                      y={currentY}
                      width="30"
                      height={barHeight}
                      fill={colors[dir] || '#8b5cf6'}
                      opacity="0.8"
                    />
                  );
                  
                  y = currentY;
                  return bar;
                })}
                
                {/* Date label */}
                <text
                  x={x + 15}
                  y="290"
                  fontSize="11"
                  fill="#94a3b8"
                  textAnchor="middle"
                >
                  {item.date.slice(5)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-6 flex-wrap">
        {directions.map(dir => (
          <div key={dir} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: colors[dir] || '#8b5cf6' }}
            />
            <span className="text-sm text-slate-300">{dir}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

