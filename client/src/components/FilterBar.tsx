import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimeRange } from '@/lib/types';

interface FilterBarProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  direction: string;
  onDirectionChange: (direction: string) => void;
  directions: string[];
}

const timeRanges: TimeRange[] = [
  { label: '7 дней', days: 7 },
  { label: '30 дней', days: 30 },
  { label: '90 дней', days: 90 },
  { label: 'Всё время', days: null },
];

export default function FilterBar({
  timeRange,
  onTimeRangeChange,
  direction,
  onDirectionChange,
  directions
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-4 items-center p-6 bg-card border-b border-border">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-foreground">Период:</label>
        <Select
          value={timeRange.label}
          onValueChange={(value) => {
            const range = timeRanges.find(r => r.label === value);
            if (range) onTimeRangeChange(range);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timeRanges.map((range) => (
              <SelectItem key={range.label} value={range.label}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-foreground">Направление:</label>
        <Select value={direction} onValueChange={onDirectionChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все направления</SelectItem>
            {directions.map((dir) => (
              <SelectItem key={dir} value={dir}>
                {dir}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

