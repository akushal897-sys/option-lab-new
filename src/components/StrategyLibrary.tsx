import { useState } from 'react';
import { strategyTemplates } from '@/lib/strategyTemplates';
import type { StrategyKey, StrategyTemplate } from '@/types';
import { PayoffChart } from '@/components/PayoffChart';
import { createLegsFromTemplate } from '@/lib/strategyTemplates';
import type { MarketInputs } from '@/types';
import { computeRiskMetrics } from '@/lib/riskEngine';
import { suggestPriceRange } from '@/lib/calcEngine';
import { BookOpen, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface StrategyLibraryProps {
  marketInputs: MarketInputs;
  onSelectStrategy?: (key: StrategyKey) => void;
}

const categoryColors: Record<string, string> = {
  Directional: 'bg-blue-100 text-blue-700',
  Neutral: 'bg-slate-100 text-slate-700',
  Volatility: 'bg-amber-100 text-amber-700',
  Spread: 'bg-teal-100 text-teal-700',
  Futures: 'bg-purple-100 text-purple-700',
};

export function StrategyLibrary({ marketInputs, onSelectStrategy }: StrategyLibraryProps) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<StrategyKey | null>(null);
  const [filter, setFilter] = useState<string>('All');

  const categories = ['All', 'Directional', 'Spread', 'Neutral', 'Volatility', 'Futures'];

  const filtered = strategyTemplates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.outlook.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filter === 'All' || t.category === filter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Search & filter */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800">Strategy Library</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search strategies..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === cat ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Strategy cards */}
      <div className="space-y-3">
        {filtered.map((template) => {
          const isExpanded = expanded === template.key;
          return (
            <StrategyCard
              key={template.key}
              template={template}
              isExpanded={isExpanded}
              onToggle={() => setExpanded(isExpanded ? null : template.key)}
              marketInputs={marketInputs}
              onSelectStrategy={onSelectStrategy}
            />
          );
        })}
      </div>
    </div>
  );
}

function StrategyCard({
  template,
  isExpanded,
  onToggle,
  marketInputs,
  onSelectStrategy,
}: {
  template: StrategyTemplate;
  isExpanded: boolean;
  onToggle: () => void;
  marketInputs: MarketInputs;
  onSelectStrategy?: (key: StrategyKey) => void;
}) {
  const legs = createLegsFromTemplate(template.key, marketInputs);
  const { min, max } = suggestPriceRange(marketInputs.spotPrice, legs.map((l) => l.strike ?? 0).filter((s) => s > 0));
  const metrics = computeRiskMetrics(legs, marketInputs.spotPrice, marketInputs.spotPrice);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${categoryColors[template.category]}`}>
              {template.category}
            </span>
            <h3 className="font-semibold text-slate-800">{template.name}</h3>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
        <p className="text-sm text-slate-500 mt-1">{template.outlook}</p>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-slate-100 p-4 space-y-4">
          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Description</h4>
            <p className="text-sm text-slate-700">{template.description}</p>
          </div>

          {/* Chart */}
          <div className="bg-slate-50 rounded-lg p-3">
            <PayoffChart
              legs={legs}
              minPrice={min}
              maxPrice={max}
              spotPrice={marketInputs.spotPrice}
              selectedPrice={marketInputs.spotPrice}
              breakevens={metrics.breakevens.map((b) => b.price)}
              height={280}
            />
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-green-50 rounded-lg p-2">
              <div className="text-[10px] font-medium text-green-600 uppercase">Max Profit</div>
              <div className="font-semibold text-green-700 text-xs mt-0.5">{template.maxProfitDescription}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-2">
              <div className="text-[10px] font-medium text-red-600 uppercase">Max Loss</div>
              <div className="font-semibold text-red-700 text-xs mt-0.5">{template.maxLossDescription}</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-2">
              <div className="text-[10px] font-medium text-amber-600 uppercase">Breakeven</div>
              <div className="font-semibold text-amber-700 text-xs mt-0.5">{template.breakevenDescription}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2">
              <div className="text-[10px] font-medium text-slate-500 uppercase">Net Cost</div>
              <div className="font-semibold text-slate-700 text-xs mt-0.5">{template.netDebitCredit}</div>
            </div>
          </div>

          {/* Formula */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Payoff Formula</h4>
            <code className="block bg-navy text-brand-400 text-sm rounded-md px-3 py-2 font-mono">
              {template.formula}
            </code>
          </div>

          {/* Example */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Example</h4>
            <p className="text-sm text-slate-700">{template.example}</p>
          </div>

          {/* Best/Worst case */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <h4 className="text-xs font-semibold text-green-600 uppercase mb-1">Best Case</h4>
              <p className="text-sm text-slate-700">{template.bestCase}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-red-600 uppercase mb-1">Worst Case</h4>
              <p className="text-sm text-slate-700">{template.worstCase}</p>
            </div>
          </div>

          {/* Risks */}
          <div className="bg-red-50 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-red-600 uppercase mb-1">Risks & Limitations</h4>
            <p className="text-sm text-slate-700">{template.risks}</p>
          </div>

          {/* Action */}
          {onSelectStrategy && (
            <button
              onClick={() => {
                onSelectStrategy(template.key);
                onToggle();
              }}
              className="w-full px-3 py-2 bg-navy text-white rounded-md text-sm font-medium hover:bg-brand-700"
            >
              Use This Strategy in Analyzer
            </button>
          )}

          <p className="text-[11px] text-slate-400 italic text-center">
            This strategy is not guaranteed to make money. Options trading involves significant risk.
          </p>
        </div>
      )}
    </div>
  );
}


const glossaryTerms: { term: string; definition: string }[] = [
  { term: 'Strike Price', definition: 'The price at which an option holder can buy (call) or sell (put) the underlying asset.' },
  { term: 'Premium', definition: 'The price paid by the buyer and received by the seller of an option. Quoted per unit.' },
  { term: 'Expiry', definition: 'The date on which an option contract expires and can no longer be exercised.' },
  { term: 'Lot Size', definition: 'The number of units of the underlying asset per contract. Total quantity = lot size × number of lots.' },
  { term: 'Intrinsic Value', definition: 'For a call: max(Spot − Strike, 0). For a put: max(Strike − Spot, 0). The value if exercised immediately.' },
  { term: 'Time Value', definition: 'The portion of an option premium above intrinsic value, reflecting time to expiry and volatility.' },
  { term: 'Implied Volatility', definition: 'The volatility implied by the current market price of an option, backed out from a pricing model.' },
  { term: 'Delta', definition: 'Rate of change of option value with respect to the underlying price. Ranges from 0 to 1 for calls, -1 to 0 for puts.' },
  { term: 'Theta', definition: 'Rate of change of option value with respect to time. Typically negative for long options (time decay).' },
  { term: 'Gamma', definition: 'Rate of change of delta with respect to the underlying price. Highest for ATM options near expiry.' },
  { term: 'Vega', definition: 'Rate of change of option value with respect to volatility. Higher volatility increases option prices.' },
  { term: 'Rho', definition: 'Rate of change of option value with respect to the risk-free interest rate.' },
  { term: 'Margin', definition: 'Collateral required by the exchange/broker to cover potential losses on short positions or futures.' },
  { term: 'Breakeven', definition: 'The underlying price at which total P&L equals zero, accounting for premiums paid or received.' },
  { term: 'Payoff', definition: 'The profit or loss from a strategy at a given underlying price, typically at expiry.' },
  { term: 'Mark-to-Market', definition: 'Valuing a position at its current market price, reflecting unrealized gains or losses.' },
];

export function Glossary() {
  const [search, setSearch] = useState('');

  const filtered = glossaryTerms.filter(
    (g) =>
      g.term.toLowerCase().includes(search.toLowerCase()) ||
      g.definition.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
      <h2 className="text-lg font-bold text-slate-800">Glossary</h2>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search terms..."
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300"
      />
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filtered.map((g) => (
          <div key={g.term} className="border-b border-slate-100 pb-2">
            <dt className="text-sm font-semibold text-slate-800">{g.term}</dt>
            <dd className="text-sm text-slate-600 mt-0.5">{g.definition}</dd>
          </div>
        ))}
      </div>
    </div>
  );
}
