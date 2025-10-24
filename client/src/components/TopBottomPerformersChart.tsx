import { TopBottomPerformer } from '@/lib/overviewAnalytics';
import { TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react';

interface TopBottomPerformersChartProps {
  topPerformers: TopBottomPerformer[];
  bottomPerformers: TopBottomPerformer[];
}

export default function TopBottomPerformersChart({
  topPerformers,
  bottomPerformers
}: TopBottomPerformersChartProps) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Top Performers */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Растущие партнёры
        </h3>
        <div className="space-y-3">
          {topPerformers.map((performer, index) => (
            <div
              key={`top-${index}`}
              className="bg-slate-800 rounded-lg p-3 border border-slate-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-white">{performer.partner}</p>
                  <p className="text-xs text-slate-400">{performer.direction}</p>
                </div>
                <div className="text-right">
                  {performer.isNew ? (
                    <div className="flex items-center gap-1 text-green-400">
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-semibold">Новый</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-green-400">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        +{performer.changePercentage.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-2 flex gap-4 text-xs text-slate-300">
                <span>Было: {performer.previousOrders}</span>
                <span>Стало: {performer.currentOrders}</span>
                <span className="font-semibold text-green-400">
                  +{performer.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Performers */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-red-500" />
          Падающие партнёры
        </h3>
        <div className="space-y-3">
          {bottomPerformers.map((performer, index) => (
            <div
              key={`bottom-${index}`}
              className="bg-slate-800 rounded-lg p-3 border border-slate-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-white">{performer.partner}</p>
                  <p className="text-xs text-slate-400">{performer.direction}</p>
                </div>
                <div className="text-right">
                  {performer.isChurned ? (
                    <div className="flex items-center gap-1 text-red-400">
                      <Minus className="w-4 h-4" />
                      <span className="text-sm font-semibold">Отвалился</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-400">
                      <TrendingDown className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        {performer.changePercentage.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-2 flex gap-4 text-xs text-slate-300">
                <span>Было: {performer.previousOrders}</span>
                <span>Стало: {performer.currentOrders}</span>
                <span className="font-semibold text-red-400">
                  {performer.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

