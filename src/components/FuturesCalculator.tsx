import { useState, useMemo } from 'react';
import { PayoffChart } from '@/components/PayoffChart';
import { formatINR, computeRiskMetrics } from '@/lib/riskEngine';
import { strategyPayoff, suggestPriceRange } from '@/lib/calcEngine';
import { createLeg } from '@/lib/strategyTemplates';
import type { Side } from '@/types';
import { Download, Calculator, Info } from 'lucide-react';
import { exportScenarioCSV, downloadCSV } from '@/lib/export';

interface FuturesCalculatorProps {
  defaultSpot: number;
  defaultLotSize: number;
  eduMode: boolean;
}

export function FuturesCalculator({ defaultSpot, defaultLotSize, eduMode }: FuturesCalculatorProps) {
  const [side, setSide] = useState<Side>('LONG');
  const [entryPrice, setEntryPrice] = useState(defaultSpot);
  const [currentPrice, setCurrentPrice] = useState(defaultSpot);
  const [lotSize, setLotSize] = useState(defaultLotSize);
  const [lots, setLots] = useState(1);
  const [txnCost, setTxnCost] = useState(0);
  const [instrumentName, setInstrumentName] = useState('');

  const quantity = lotSize * lots;
  const priceMovement = currentPrice - entryPrice;
  const percentMovement = entryPrice > 0 ? (priceMovement / entryPrice) * 100 : 0;
  const grossPnl = side === 'LONG' ? priceMovement * quantity : -priceMovement * quantity;
  const netPnl = grossPnl - txnCost;

  const leg = useMemo(
    () =>
      createLeg({
        instrumentType: 'FUTURE',
        side,
        entryPrice,
        lotSize,
        lots,
        transactionCost: txnCost,
      }),
    [side, entryPrice, lotSize, lots, txnCost]
  );

  const legs = [leg];
  const { min, max } = suggestPriceRange(entryPrice, []);
  const metrics = computeRiskMetrics(legs, currentPrice, currentPrice);

  const scenarioPrices = useMemo(() => {
    const pts: number[] = [];
    const range = (max - min) / 10;
    for (let i = 0; i <= 10; i++) {
      pts.push(min + i * range);
    }
    return pts;
  }, [min, max]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="w-6 h-6 text-slate-700" />
        <h1 className="text-2xl font-bold text-slate-900">Futures Calculator</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Inputs</h3>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Instrument Name</label>
            <input
              type="text"
              value={instrumentName}
              onChange={(e) => setInstrumentName(e.target.value)}
              className="input"
              placeholder="e.g. NIFTY Futures"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Direction</label>
            <div className="flex gap-1.5">
              <button
                onClick={() => setSide('LONG')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${side === 'LONG' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Long Futures
              </button>
              <button
                onClick={() => setSide('SHORT')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${side === 'SHORT' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Short Futures
              </button>
            </div>
          </div>

          <NumInput label="Entry Price" value={entryPrice} onChange={setEntryPrice} />
          <NumInput label="Current / Projected Price" value={currentPrice} onChange={setCurrentPrice} />
          <NumInput label="Lot Size" value={lotSize} onChange={setLotSize} integer />
          <NumInput label="Number of Lots" value={lots} onChange={setLots} />
          <NumInput label="Transaction Cost (optional)" value={txnCost} onChange={setTxnCost} />

          {eduMode && (
            <div className="bg-amber-50 rounded-lg p-3 text-[11px] text-amber-700 space-y-1">
              <div className="flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 mt-px shrink-0" />
                <p><b>Entry Price</b> is the futures price at which you opened the position.</p>
              </div>
              <div className="flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 mt-px shrink-0" />
                <p><b>Current Price</b> is the projected or actual futures price for P&L calculation.</p>
              </div>
              <div className="flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 mt-px shrink-0" />
                <p>Initial margin is not the maximum loss. Futures losses can exceed the margin.</p>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* P&L Summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">P&L Summary</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100">
              <div className="bg-white p-3">
                <div className="text-[10px] font-medium text-slate-500 uppercase">Gross P&L</div>
                <div className={`text-lg font-bold ${grossPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatINR(grossPnl)}
                </div>
              </div>
              <div className="bg-white p-3">
                <div className="text-[10px] font-medium text-slate-500 uppercase">Net P&L</div>
                <div className={`text-lg font-bold ${netPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatINR(netPnl)}
                </div>
              </div>
              <div className="bg-white p-3">
                <div className="text-[10px] font-medium text-slate-500 uppercase">Price Movement</div>
                <div className={`text-lg font-bold ${priceMovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {priceMovement >= 0 ? '+' : ''}{priceMovement.toFixed(2)}
                </div>
              </div>
              <div className="bg-white p-3">
                <div className="text-[10px] font-medium text-slate-500 uppercase">% Movement</div>
                <div className={`text-lg font-bold ${percentMovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {percentMovement >= 0 ? '+' : ''}{percentMovement.toFixed(2)}%
                </div>
              </div>
              <div className="bg-white p-3">
                <div className="text-[10px] font-medium text-slate-500 uppercase">Total Quantity</div>
                <div className="text-lg font-bold text-slate-700">{quantity.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-white p-3">
                <div className="text-[10px] font-medium text-slate-500 uppercase">Max Profit</div>
                <div className="text-sm font-bold text-green-600">
                  {metrics.maxProfit.bound === 'unlimited' ? 'Unlimited' : formatINR(metrics.maxProfit.value ?? 0)}
                </div>
              </div>
              <div className="bg-white p-3">
                <div className="text-[10px] font-medium text-slate-500 uppercase">Max Loss</div>
                <div className="text-sm font-bold text-red-600">
                  {metrics.maxLoss.bound === 'unlimited' ? 'Unlimited' : formatINR(metrics.maxLoss.value ?? 0)}
                </div>
              </div>
              <div className="bg-white p-3">
                <div className="text-[10px] font-medium text-slate-500 uppercase">Breakeven</div>
                <div className="text-sm font-bold text-amber-600">
                  {metrics.breakevens.length > 0 ? `₹${metrics.breakevens[0].price.toFixed(2)}` : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Payoff Chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">Futures Payoff</h3>
            <PayoffChart
              legs={legs}
              minPrice={min}
              maxPrice={max}
              spotPrice={currentPrice}
              selectedPrice={currentPrice}
              breakevens={metrics.breakevens.map((b) => b.price)}
              height={350}
            />
          </div>

          {/* Scenario Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Scenario Table</h3>
              <button
                onClick={() => downloadCSV('futures_scenario.csv', exportScenarioCSV(legs, scenarioPrices))}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Futures Price</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-500">P&L</th>
                  <th className="px-4 py-2 text-center font-medium text-slate-500">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {scenarioPrices.map((price, i) => {
                  const { total } = strategyPayoff(legs, price);
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-1.5 text-slate-700 font-medium">₹{price.toFixed(2)}</td>
                      <td className={`px-4 py-1.5 text-right font-semibold ${total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatINR(total)}
                      </td>
                      <td className="px-4 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          total > 0 ? 'bg-green-100 text-green-700' : total < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {total > 0 ? 'Profit' : total < 0 ? 'Loss' : 'BE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumInput({
  label,
  value,
  onChange,
  integer = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  integer?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
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
    </div>
  );
}
