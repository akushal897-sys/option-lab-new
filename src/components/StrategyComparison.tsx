import { useState, useMemo } from 'react';
import type { MarketInputs, StrategyKey, StrategyLeg } from '@/types';
import { createLegsFromTemplate, strategyTemplates } from '@/lib/strategyTemplates';
import { computeRiskMetrics, formatINR } from '@/lib/riskEngine';
import { suggestPriceRange, strategyPayoff } from '@/lib/calcEngine';
import { PayoffChart } from '@/components/PayoffChart';
import { GitCompare, Info } from 'lucide-react';

interface StrategyComparisonProps {
  marketInputs: MarketInputs;
}

export function StrategyComparison({ marketInputs }: StrategyComparisonProps) {
  const [stratA, setStratA] = useState<StrategyKey>('long_call');
  const [stratB, setStratB] = useState<StrategyKey>('short_put');

  const legsA = useMemo(() => createLegsFromTemplate(stratA, marketInputs), [stratA, marketInputs]);
  const legsB = useMemo(() => createLegsFromTemplate(stratB, marketInputs), [stratB, marketInputs]);

  const allStrikes = useMemo(
    () =>
      [...legsA, ...legsB]
        .filter((l) => l.instrumentType === 'OPTION' && l.strike)
        .map((l) => l.strike as number),
    [legsA, legsB]
  );

  const { min, max } = useMemo(
    () => suggestPriceRange(marketInputs.spotPrice, allStrikes),
    [marketInputs.spotPrice, allStrikes]
  );

  const metricsA = useMemo(
    () => computeRiskMetrics(legsA, marketInputs.spotPrice, marketInputs.spotPrice),
    [legsA, marketInputs.spotPrice]
  );
  const metricsB = useMemo(
    () => computeRiskMetrics(legsB, marketInputs.spotPrice, marketInputs.spotPrice),
    [legsB, marketInputs.spotPrice]
  );

  const scenarioPrices = useMemo(() => {
    const pts: number[] = [];
    const range = (max - min) / 6;
    for (let i = 0; i <= 6; i++) pts.push(min + i * range);
    return pts;
  }, [min, max]);

  const templateA = strategyTemplates.find((t) => t.key === stratA);
  const templateB = strategyTemplates.find((t) => t.key === stratB);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <GitCompare className="w-6 h-6 text-slate-700" />
        <h1 className="text-2xl font-bold text-slate-900">Strategy Comparison</h1>
      </div>

      {/* Strategy selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Strategy A</label>
          <select value={stratA} onChange={(e) => setStratA(e.target.value as StrategyKey)} className="input">
            {strategyTemplates.map((t) => (
              <option key={t.key} value={t.key}>{t.name}</option>
            ))}
          </select>
          {templateA && <p className="text-xs text-slate-500 mt-2">{templateA.outlook}</p>}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Strategy B</label>
          <select value={stratB} onChange={(e) => setStratB(e.target.value as StrategyKey)} className="input">
            {strategyTemplates.map((t) => (
              <option key={t.key} value={t.key}>{t.name}</option>
            ))}
          </select>
          {templateB && <p className="text-xs text-slate-500 mt-2">{templateB.outlook}</p>}
        </div>
      </div>

      {/* Overlaid chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">Overlaid Payoff Curves</h3>
        <div className="relative">
          {/* Render both charts semi-transparently overlaid */}
          <OverlaidChart
            legsA={legsA}
            legsB={legsB}
            minPrice={min}
            maxPrice={max}
            spotPrice={marketInputs.spotPrice}
            breakevensA={metricsA.breakevens.map((b) => b.price)}
            breakevensB={metricsB.breakevens.map((b) => b.price)}
          />
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-blue-600 inline-block" />
            <span className="font-medium text-slate-600">{templateA?.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-orange-600 inline-block" />
            <span className="font-medium text-slate-600">{templateB?.name}</span>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Side-by-Side Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Metric</th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">{templateA?.name}</th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">{templateB?.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <ComparisonRow
                label="Max Profit"
                valueA={metricsA.maxProfit.bound === 'unlimited' ? 'Unlimited' : formatINR(metricsA.maxProfit.value ?? 0)}
                valueB={metricsB.maxProfit.bound === 'unlimited' ? 'Unlimited' : formatINR(metricsB.maxProfit.value ?? 0)}
              />
              <ComparisonRow
                label="Max Loss"
                valueA={metricsA.maxLoss.bound === 'unlimited' ? 'Unlimited' : formatINR(metricsA.maxLoss.value ?? 0)}
                valueB={metricsB.maxLoss.bound === 'unlimited' ? 'Unlimited' : formatINR(metricsB.maxLoss.value ?? 0)}
              />
              <ComparisonRow
                label="Breakeven(s)"
                valueA={metricsA.breakevens.map((b) => `₹${b.price.toFixed(1)}`).join(', ') || 'None'}
                valueB={metricsB.breakevens.map((b) => `₹${b.price.toFixed(1)}`).join(', ') || 'None'}
              />
              <ComparisonRow
                label="Net Premium"
                valueA={formatINR(metricsA.netPremium)}
                valueB={formatINR(metricsB.netPremium)}
              />
              <ComparisonRow
                label="Net Debit/Credit"
                valueA={metricsA.netDebitOrCredit}
                valueB={metricsB.netDebitOrCredit}
              />
              <ComparisonRow
                label="P&L at Spot"
                valueA={formatINR(metricsA.pnlAtSpot)}
                valueB={formatINR(metricsB.pnlAtSpot)}
              />
              <ComparisonRow
                label="Total Quantity"
                valueA={metricsA.totalQuantity.toLocaleString('en-IN')}
                valueB={metricsB.totalQuantity.toLocaleString('en-IN')}
              />
              <ComparisonRow
                label="Risk/Reward"
                valueA={metricsA.riskRewardRatio ? `1:${metricsA.riskRewardRatio.toFixed(2)}` : 'N/A'}
                valueB={metricsB.riskRewardRatio ? `1:${metricsB.riskRewardRatio.toFixed(2)}` : 'N/A'}
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* Scenario comparison */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">P&L at Key Prices</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-500">Price</th>
              <th className="px-4 py-2 text-right font-medium text-slate-700">{templateA?.name}</th>
              <th className="px-4 py-2 text-right font-medium text-slate-700">{templateB?.name}</th>
              <th className="px-4 py-2 text-center font-medium text-slate-500">Better</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {scenarioPrices.map((price, i) => {
              const pnlA = strategyPayoff(legsA, price).total;
              const pnlB = strategyPayoff(legsB, price).total;
              return (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700 font-medium">₹{price.toFixed(0)}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${pnlA >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatINR(pnlA)}
                  </td>
                  <td className={`px-4 py-2 text-right font-semibold ${pnlB >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatINR(pnlB)}
                  </td>
                  <td className="px-4 py-2 text-center text-xs">
                    {pnlA > pnlB ? <span className="text-blue-600 font-medium">A</span> : pnlB > pnlA ? <span className="text-orange-600 font-medium">B</span> : <span className="text-slate-400">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-start gap-2">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          Higher maximum profit does not mean a strategy is superior. Consider capital requirements, margin,
          probability of profit, risk tolerance, and market outlook. Strategies with unlimited loss require
          extreme caution. Always compare risk/reward ratios alongside absolute numbers.
        </p>
      </div>
    </div>
  );
}

function ComparisonRow({ label, valueA, valueB }: { label: string; valueA: string; valueB: string }) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-2 text-slate-500 font-medium">{label}</td>
      <td className="px-4 py-2 text-slate-700">{valueA}</td>
      <td className="px-4 py-2 text-slate-700">{valueB}</td>
    </tr>
  );
}

function OverlaidChart({
  legsA,
  legsB,
  minPrice,
  maxPrice,
  spotPrice,
  breakevensA,
  breakevensB,
}: {
  legsA: StrategyLeg[];
  legsB: StrategyLeg[];
  minPrice: number;
  maxPrice: number;
  spotPrice: number;
  breakevensA: number[];
  breakevensB: number[];
}) {
  // We'll use two PayoffCharts overlaid via opacity. Since PayoffChart renders
  // a full SVG, we'll render them in a relative container with absolute positioning.
  return (
    <div className="relative" style={{ height: 400 }}>
      <div className="absolute inset-0 opacity-70 pointer-events-none">
        <PayoffChart
          legs={legsA}
          minPrice={minPrice}
          maxPrice={maxPrice}
          spotPrice={spotPrice}
          selectedPrice={spotPrice}
          breakevens={breakevensA}
          height={400}
        />
      </div>
      <div className="absolute inset-0">
        <PayoffChart
          legs={legsB}
          minPrice={minPrice}
          maxPrice={maxPrice}
          spotPrice={spotPrice}
          selectedPrice={spotPrice}
          breakevens={breakevensB}
          height={400}
        />
      </div>
    </div>
  );
}
