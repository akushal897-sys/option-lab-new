import { useState } from 'react';
import type { StrategyLeg, OptionType, Side, InstrumentType } from '@/types';
import { createLeg } from '@/lib/strategyTemplates';
import { Plus } from 'lucide-react';

interface AddLegPanelProps {
  onAdd: (leg: StrategyLeg) => void;
  defaultLotSize: number;
  defaultLots: number;
}

export function AddLegPanel({ onAdd, defaultLotSize, defaultLots }: AddLegPanelProps) {
  const [instrumentType, setInstrumentType] = useState<InstrumentType>('OPTION');
  const [side, setSide] = useState<Side>('LONG');
  const [optionType, setOptionType] = useState<OptionType>('CALL');
  const [strike, setStrike] = useState('');
  const [premium, setPremium] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [lotSize, setLotSize] = useState(String(defaultLotSize));
  const [lots, setLots] = useState(String(defaultLots));

  const handleAdd = () => {
    const leg = createLeg({
      instrumentType,
      side,
      optionType: instrumentType === 'OPTION' ? optionType : undefined,
      strike: instrumentType === 'OPTION' ? parseFloat(strike) || 0 : undefined,
      premium: instrumentType === 'OPTION' ? parseFloat(premium) || 0 : undefined,
      entryPrice: instrumentType === 'FUTURE' ? parseFloat(entryPrice) || 0 : undefined,
      lotSize: parseInt(lotSize, 10) || defaultLotSize,
      lots: parseFloat(lots) || defaultLots,
    });
    onAdd(leg);
    // Reset some fields
    setStrike('');
    setPremium('');
    setEntryPrice('');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Add Position</h3>

      <div className="grid grid-cols-2 gap-2">
        {/* Instrument Type */}
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-1">Instrument</label>
          <div className="flex gap-1">
            <button
              onClick={() => setInstrumentType('OPTION')}
              className={`flex-1 px-2 py-1 rounded text-xs font-medium ${instrumentType === 'OPTION' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Option
            </button>
            <button
              onClick={() => setInstrumentType('FUTURE')}
              className={`flex-1 px-2 py-1 rounded text-xs font-medium ${instrumentType === 'FUTURE' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Future
            </button>
          </div>
        </div>

        {/* Side */}
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-1">Side</label>
          <div className="flex gap-1">
            <button
              onClick={() => setSide('LONG')}
              className={`flex-1 px-2 py-1 rounded text-xs font-medium ${side === 'LONG' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Buy
            </button>
            <button
              onClick={() => setSide('SHORT')}
              className={`flex-1 px-2 py-1 rounded text-xs font-medium ${side === 'SHORT' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Sell
            </button>
          </div>
        </div>

        {/* Option type */}
        {instrumentType === 'OPTION' && (
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Option Type</label>
            <div className="flex gap-1">
              <button
                onClick={() => setOptionType('CALL')}
                className={`flex-1 px-2 py-1 rounded text-xs font-medium ${optionType === 'CALL' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Call
              </button>
              <button
                onClick={() => setOptionType('PUT')}
                className={`flex-1 px-2 py-1 rounded text-xs font-medium ${optionType === 'PUT' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Put
              </button>
            </div>
          </div>
        )}

        {/* Strike */}
        {instrumentType === 'OPTION' && (
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Strike Price</label>
            <input
              type="number"
              value={strike}
              onChange={(e) => setStrike(e.target.value)}
              className="input-sm"
              placeholder="e.g. 1400"
            />
          </div>
        )}

        {/* Premium */}
        {instrumentType === 'OPTION' && (
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Premium/unit</label>
            <input
              type="number"
              value={premium}
              onChange={(e) => setPremium(e.target.value)}
              className="input-sm"
              placeholder="e.g. 40"
            />
          </div>
        )}

        {/* Entry price for futures */}
        {instrumentType === 'FUTURE' && (
          <div className="col-span-2">
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Entry Price</label>
            <input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className="input-sm"
              placeholder="e.g. 1400"
            />
          </div>
        )}

        {/* Lot size & lots */}
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-1">Lot Size</label>
          <input
            type="number"
            value={lotSize}
            onChange={(e) => setLotSize(e.target.value)}
            className="input-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-1">Lots</label>
          <input
            type="number"
            value={lots}
            onChange={(e) => setLots(e.target.value)}
            className="input-sm"
          />
        </div>
      </div>

      <button
        onClick={handleAdd}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-navy text-white rounded-md text-sm font-medium hover:bg-brand-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Position
      </button>
    </div>
  );
}
