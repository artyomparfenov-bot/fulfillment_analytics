import { ClientSegmentData } from '@/lib/overviewAnalytics';

interface ClientSegmentChartProps {
  data: ClientSegmentData[];
  title: string;
}

export default function ClientSegmentChart({ data, title }: ClientSegmentChartProps) {
  const maxClients = Math.max(...data.map(d => d.newClients + d.currentClients));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>

      <div className="w-full bg-slate-900 rounded-lg p-4 overflow-x-auto">
        <svg width="100%" height="300" viewBox={`0 0 ${Math.max(1200, data.length * 50)} 300`}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(percent => (
            <g key={`grid-${percent}`}>
              <line
                x1="50"
                y1={300 - (percent / 100) * 250}
                x2={Math.max(1200, data.length * 50) - 20}
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
                {Math.round((percent / 100) * maxClients)}
              </text>
            </g>
          ))}

          {/* Stacked bars */}
          {data.map((item, index) => {
            const x = 50 + index * 50;
            const total = item.newClients + item.currentClients;
            const newHeight = (item.newClients / maxClients) * 250;
            const currentHeight = (item.currentClients / maxClients) * 250;

            return (
              <g key={`bar-${index}`}>
                {/* New clients (bottom) */}
                <rect
                  x={x}
                  y={300 - newHeight}
                  width="35"
                  height={newHeight}
                  fill="#f97316"
                  opacity="0.8"
                />
                {/* Current clients (top) */}
                <rect
                  x={x}
                  y={300 - newHeight - currentHeight}
                  width="35"
                  height={currentHeight}
                  fill="#06b6d4"
                  opacity="0.8"
                />

                {/* Date label */}
                <text
                  x={x + 17.5}
                  y="290"
                  fontSize="11"
                  fill="#94a3b8"
                  textAnchor="middle"
                >
                  {item.date.slice(5)}
                </text>

                {/* Percentage labels */}
                {total > 0 && (
                  <>
                    <text
                      x={x + 17.5}
                      y={300 - newHeight / 2}
                      fontSize="10"
                      fill="white"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {item.newPercentage.toFixed(0)}%
                    </text>
                    <text
                      x={x + 17.5}
                      y={300 - newHeight - currentHeight / 2}
                      fontSize="10"
                      fill="white"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {item.currentPercentage.toFixed(0)}%
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }} />
          <span className="text-sm text-slate-300">Новые клиенты (0-30 дней)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#06b6d4' }} />
          <span className="text-sm text-slate-300">Текущие клиенты (31+ дней)</span>
        </div>
      </div>
    </div>
  );
}

