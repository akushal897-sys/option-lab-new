import { useMemo, useState } from 'react';
import type { StrategyLeg } from '@/types';
import { strategyPayoff } from '@/lib/calcEngine';
import { formatINR } from '@/lib/riskEngine';
import { Download, Table } from 'lucide-react';
import { exportScenarioCSV, downloadCSV } from '@/lib/export';

interface ScenarioTableProps {
  legs: StrategyLeg[];
  spotPrice: number;
  selectedPrice: number;
  onPriceSelect: (price: number) => void;
}

export function ScenarioTable({ legs, spotPrice, selectedPrice, onPriceSelect }: ScenarioTableProps) {
  const [interval, setInterval] = useState(50);
  const [numPoints, setNumPoints] = useState(10);
  const [mode, setMode] = useState<'absolute' | 'percent'>('absolute');
  const [percentRange, setPercentRange] = useState(20);

  const prices = useMemo(() => {
    if (legs.length === 0) return [];
    if (mode === 'absolute') {
      const center = spotPrice;
      const half = (interval * numPoints) / 2;
      const start = Math.max(0, center - half);
      const pts: number[] = [];
      for (let i = 0; i <= numPoints; i++) {
        pts.push(start + i * interval);
      }
      return pts;
    } else {
      const pts: number[] = [];
      const step = (percentRange * 2) / numPoints;
      for (let i = 0; i <= numPoints; i++) {
        const pct = -percentRange + i * step;
        pts.push(spotPrice * (1 + pct / 100));
      }
      return pts;
    }
  }, [legs, spotPrice, interval, numPoints, mode, percentRange]);

  const handleExport = () => {
    const csv = exportScenarioCSV(legs, prices);
    downloadCSV('optionlab_scenario_pnl.csv', csv);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Scenario Analysis</h3>
        </div>
        <button
          onClick={handleExport}
          disabled={legs.length === 0}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
      </div>

      {/* Controls */}
      <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap items-center gap-2 text-xs">
        <div className="flex gap-1">
          <button
            onClick={() => setMode('absolute')}
            className={`px-2 py-1 rounded font-medium ${mode === 'absolute' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Absolute
          </button>
          <button
            onClick={() => setMode('percent')}
            className={`px-2 py-1 rounded font-medium ${mode === 'percent' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            % Range
          </button>
        </div>
        {mode === 'absolute' ? (
          <>
            <label className="flex items-center gap-1 text-slate-500">
              Interval:
              <input
                type="number"
                value={interval}
                onChange={(e) => setInterval(parseFloat(e.target.value) || 1)}
                className="w-16 px-1 py-0.5 border border-slate-200 rounded text-xs"
              />
            </label>
            <label className="flex items-center gap-1 text-slate-500">
              Points:
              <input
                type="number"
                value={numPoints}
                onChange={(e) => setNumPoints(parseInt(e.target.value, 10) || 1)}
                className="w-14 px-1 py-0.5 border border-slate-200 rounded text-xs"
                min={1}
                max={30}
              />
            </label>
          </>
        ) : (
          <>
            <label className="flex items-center gap-1 text-slate-500">
              ±%:
              <input
                type="number"
                value={percentRange}
                onChange={(e) => setPercentRange(parseFloat(e.target.value) || 1)}
                className="w-14 px-1 py-0.5 border border-slate-200 rounded text-xs"
              />
            </label>
            <label className="flex items-center gap-1 text-slate-500">
              Points:
              <input
                type="number"
                value={numPoints}
                onChange={(e) => setNumPoints(parseInt(e.target.value, 10) || 1)}
                className="w-14 px-1 py-0.5 border border-slate-200 rounded text-xs"
                min={1}
                max={30}
              />
            </label>
          </>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-500">Underlying Price</th>
              <th className="px-4 py-2 text-right font-medium text-slate-500">Total P&L</th>
              <th className="px-4 py-2 text-center font-medium text-slate-500">Outcome</th>
              <th className="px-4 py-2 text-center font-medium text-slate-500">Select</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {prices.map((price, i) => {
              const { total } = strategyPayoff(legs, price);
              const isSelected = Math.abs(price - selectedPrice) < interval / 2;
              return (
                <tr
                  key={i}
                  className={`hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50' : ''}`}
                  onClick={() => onPriceSelect(price)}
                >
                  <td className="px-4 py-1.5 text-slate-700 font-medium">
                    ₹{price.toFixed(2)}
                  </td>
                  <td className={`px-4 py-1.5 text-right font-semibold ${total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatINR(total)}
                  </td>
                  <td className="px-4 py-1.5 text-center">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        total > 0
                          ? 'bg-green-100 text-green-700'
                          : total < 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {total > 0 ? 'Profit' : total < 0 ? 'Loss' : 'Breakeven'}
                    </span>
                  </td>
                  <td className="px-4 py-1.5 text-center">
                    {isSelected && <span className="text-emerald-600 text-[10px]">●</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
