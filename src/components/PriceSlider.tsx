interface PriceSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}

export function PriceSlider({ min, max, value, onChange }: PriceSliderProps) {
  const clamped = Math.max(min, Math.min(max, value));
  const percent = ((clamped - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>₹{min.toFixed(0)}</span>
        <span className="font-semibold text-slate-700">Selected: ₹{clamped.toFixed(2)}</span>
        <span>₹{max.toFixed(0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={(max - min) / 200}
        value={clamped}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-brand-600"
        style={{
          background: `linear-gradient(to right, #2563EB 0%, #2563EB ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)`,
        }}
      />
    </div>
  );
}
