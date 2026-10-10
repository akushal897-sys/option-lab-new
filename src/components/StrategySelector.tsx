import type { StrategyKey } from '@/types';
import { strategyTemplates } from '@/lib/strategyTemplates';

interface StrategySelectorProps {
  value: StrategyKey;
  onChange: (key: StrategyKey) => void;
}

const categoryLabels: Record<string, string> = {
  Directional: 'Directional',
  Neutral: 'Neutral',
  Volatility: 'Volatility',
  Spread: 'Spreads',
  Futures: 'Futures',
};

const categoryOrder = ['Directional', 'Spread', 'Neutral', 'Volatility', 'Futures'];

export function StrategySelector({ value, onChange }: StrategySelectorProps) {
  const grouped = categoryOrder.map((cat) => ({
    category: cat,
    items: strategyTemplates.filter((t) => t.category === cat),
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Strategy</h3>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as StrategyKey)}
        className="input"
      >
        {grouped.map((group) => (
          <optgroup key={group.category} label={categoryLabels[group.category]}>
            {group.items.map((item) => (
              <option key={item.key} value={item.key}>
                {item.name}
              </option>
            ))}
          </optgroup>
        ))}
        <optgroup label="Advanced">
          <option value="custom">Custom Multi-Leg Strategy</option>
        </optgroup>
      </select>
    </div>
  );
}
