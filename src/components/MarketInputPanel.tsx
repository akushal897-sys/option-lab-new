import type { MarketInputs, InstrumentCategory } from '@/types';
import { Info } from 'lucide-react';

interface MarketInputPanelProps {
  inputs: MarketInputs;
  onChange: (inputs: MarketInputs) => void;
  eduMode: boolean;
}

const categories: InstrumentCategory[] = ['Stock', 'Index', 'Custom Instrument'];

export function MarketInputPanel({ inputs, onChange, eduMode }: MarketInputPanelProps) {
  const update = (field: keyof MarketInputs, value: string | number) => {
    onChange({ ...inputs, [field]: value });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Market Inputs</h3>
        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Manual Input Mode</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Instrument Name" className="col-span-2">
          <input
            type="text"
            value={inputs.instrumentName}
            onChange={(e) => update('instrumentName', e.target.value)}
            className="input"
            placeholder="e.g. NIFTY, RELIANCE"
          />
        </Field>

        <Field label="Category" className="col-span-2">
          <div className="flex gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => update('category', cat)}
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  inputs.category === cat
                    ? 'bg-navy text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </Field>

        <NumberField
          label="Spot Price"
          value={inputs.spotPrice}
          onChange={(v) => update('spotPrice', v)}
          eduNote="Current market price of the underlying asset."
          eduMode={eduMode}
        />

        <NumberField
          label="Futures Entry"
          value={inputs.futuresEntryPrice}
          onChange={(v) => update('futuresEntryPrice', v)}
          eduNote="Price at which you enter a futures contract."
          eduMode={eduMode}
        />

        <NumberField
          label="Strike Price"
          value={inputs.strikePrice}
          onChange={(v) => update('strikePrice', v)}
          eduNote="Price at which an option can be exercised."
          eduMode={eduMode}
        />

        <NumberField
          label="Call Premium"
          value={inputs.callPremium}
          onChange={(v) => update('callPremium', v)}
          eduNote="Price per unit paid/received for a call option."
          eduMode={eduMode}
        />

        <NumberField
          label="Put Premium"
          value={inputs.putPremium}
          onChange={(v) => update('putPremium', v)}
          eduNote="Price per unit paid/received for a put option."
          eduMode={eduMode}
        />

        <NumberField
          label="Lot Size"
          value={inputs.lotSize}
          onChange={(v) => update('lotSize', v)}
          integer
          eduNote="Number of units per contract (e.g. 250 for NIFTY)."
          eduMode={eduMode}
        />

        <NumberField
          label="Number of Lots"
          value={inputs.lots}
          onChange={(v) => update('lots', v)}
          eduNote="How many contracts you trade."
          eduMode={eduMode}
        />

        <Field label="Expiry Date" className="col-span-2">
          <input
            type="date"
            value={inputs.expiryDate}
            onChange={(e) => update('expiryDate', e.target.value)}
            className="input"
          />
        </Field>
      </div>

      <div className="text-[11px] text-slate-400 italic border-t border-slate-100 pt-2">
        Manual input mode — no live market data connected.
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  integer = false,
  eduNote,
  eduMode,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  integer?: boolean;
  eduNote?: string;
  eduMode?: boolean;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value === 0 ? '' : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '') onChange(0);
          else onChange(integer ? parseInt(v, 10) || 0 : parseFloat(v) || 0);
        }}
        className="input"
        min={0}
        step={integer ? 1 : 'any'}
        placeholder="0"
      />
      {eduMode && eduNote && (
        <div className="flex items-start gap-1 mt-1 text-[10px] text-amber-600">
          <Info className="w-3 h-3 mt-px shrink-0" />
          <span>{eduNote}</span>
        </div>
      )}
    </Field>
  );
}
