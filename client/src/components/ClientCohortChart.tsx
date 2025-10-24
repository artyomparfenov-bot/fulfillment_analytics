import { ClientCohortData } from '@/lib/overviewAnalytics';

interface ClientCohortChartProps {
  data: ClientCohortData[];
  title: string;
}

export default function ClientCohortChart({ data, title }: ClientCohortChartProps) {
  const maxValue = Math.max(...data.map(d => Math.max(d.newClients, d.churnedClients)));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>

      <div className="w-full bg-slate-900 rounded-lg p-4 overflow-x-auto">
        <svg width="100%" height="300" viewBox={`0 0 ${Math.max(1200, data.length * 60)} 300`}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(percent => (
            <g key={`grid-${percent}`}>
              <line
                x1="50"
                y1={300 - (percent / 100) * 250}
                x2={Math.max(1200, data.length * 60) - 20}
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
                {Math.round((percent / 100) * maxValue)}
              </text>
            </g>
          ))}

          {/* Grouped bars */}
          {data.map((item, index) => {
            const x = 50 + index * 60;
            const newHeight = (item.newClients / maxValue) * 250;
            const churnHeight = (item.churnedClients / maxValue) * 250;

            return (
              <g key={`bar-${index}`}>
                {/* New clients */}
                <rect
                  x={x}
                  y={300 - newHeight}
                  width="20"
                  height={newHeight}
                  fill="#10b981"
                  opacity="0.8"
                />
                {/* Churned clients */}
                <rect
                  x={x + 22}
                  y={300 - churnHeight}
                  width="20"
                  height={churnHeight}
                  fill="#ef4444"
                  opacity="0.8"
                />

                {/* Date label */}
                <text
                  x={x + 21}
                  y="290"
                  fontSize="11"
                  fill="#94a3b8"
                  textAnchor="middle"
                >
                  {item.month.slice(5)}
                </text>

                {/* Percentage labels */}
                {item.newClients > 0 && (
                  <text
                    x={x + 10}
                    y={300 - newHeight / 2}
                    fontSize="9"
                    fill="white"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {item.newPercentage.toFixed(0)}%
                  </text>
                )}
                {item.churnedClients > 0 && (
                  <text
                    x={x + 32}
                    y={300 - churnHeight / 2}
                    fontSize="9"
                    fill="white"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {item.churnPercentage.toFixed(0)}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
          <span className="text-sm text-slate-300">Новые клиенты</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-sm text-slate-300">Отвалившиеся клиенты</span>
        </div>
      </div>
    </div>
  );
}

