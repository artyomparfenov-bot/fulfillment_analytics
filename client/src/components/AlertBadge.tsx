import { Badge } from '@/components/ui/badge';
import { Alert } from '@/lib/types';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface AlertBadgeProps {
  alert: Alert;
}

export default function AlertBadge({ alert }: AlertBadgeProps) {
  const severityConfig = {
    high: {
      variant: 'destructive' as const,
      icon: AlertTriangle,
      bgClass: 'bg-destructive/10 text-destructive border-destructive/20'
    },
    medium: {
      variant: 'default' as const,
      icon: AlertCircle,
      bgClass: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    },
    low: {
      variant: 'secondary' as const,
      icon: Info,
      bgClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    }
  };
  
  const config = severityConfig[alert.severity];
  const Icon = config.icon;
  
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border ${config.bgClass}`}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{alert.message}</p>
      </div>
    </div>
  );
}

