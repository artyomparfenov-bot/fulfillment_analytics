import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPartnerFullAlerts, flattenAlertGroups } from '@/lib/partnerFullAlerts';
import type { OrderRecord } from '@/lib/types';
import type { PrioritizedAlert } from '@/lib/alertPrioritization';

interface PartnerSignalsPanelProps {
  partnerId: string;
  allData: OrderRecord[];
}

export function PartnerSignalsPanel({ partnerId, allData }: PartnerSignalsPanelProps) {
  const [signals, setSignals] = useState<PrioritizedAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!partnerId || !allData.length) {
      setSignals([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get full alerts for this partner
      const alertGroups = getPartnerFullAlerts(partnerId, allData);
      
      // Flatten to individual alerts
      const flatAlerts = flattenAlertGroups(alertGroups);
      
      setSignals(flatAlerts);
      setLoading(false);
    } catch (err) {
      console.error('Error loading signals:', err);
      setError('Ошибка при загрузке сигналов');
      setSignals([]);
      setLoading(false);
    }
  }, [partnerId, allData.length]); // Only depend on length, not the whole array

  if (!signals.length && !loading && !error) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'bg-red-900/20 text-red-400 border-red-600/30';
      case 'medium':
        return 'bg-yellow-900/20 text-yellow-400 border-yellow-600/30';
      case 'low':
        return 'bg-blue-900/20 text-blue-400 border-blue-600/30';
      default:
        return 'bg-gray-900/20 text-gray-400 border-gray-600/30';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'Критичный';
      case 'high':
        return 'Высокий';
      case 'medium':
        return 'Средний';
      case 'low':
        return 'Низкий';
      default:
        return 'Неизвестно';
    }
  };

  const getAlertTypeLabel = (alertType: string) => {
    const labels: Record<string, string> = {
      'CHURN_RISK': 'Риск оттока',
      'REVENUE_DROP': 'Падение выручки',
      'SKU_ANOMALY': 'Аномалия SKU',
      'VOLATILITY': 'Волатильность',
      'ORDER_DECLINE': 'Падение заказов',
      'INACTIVE': 'Неактивный',
      'INTERVAL_INCREASE': 'Увеличение интервала',
      'UNKNOWN': 'Неизвестно'
    };
    return labels[alertType] || alertType;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Сигналы и предупреждения ({signals.length})
        </h3>
        {loading && (
          <span className="text-xs text-muted-foreground animate-pulse">
            Загрузка...
          </span>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 border border-red-600/30 rounded p-3 mb-4">
          {error}
        </div>
      )}

      {loading && !signals.length && (
        <div className="text-sm text-muted-foreground text-center py-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
          Загрузка сигналов...
        </div>
      )}

      {signals.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {signals.map((signal) => (
            <div
              key={signal.id}
              className={`text-sm p-3 rounded border ${getSeverityColor(signal.severity)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium">{signal.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {getAlertTypeLabel(signal.alertType)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs whitespace-nowrap ${getSeverityColor(signal.severity)}`}
                >
                  {getSeverityLabel(signal.severity)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && signals.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Нет сигналов для этого партнера
        </p>
      )}
    </Card>
  );
}
