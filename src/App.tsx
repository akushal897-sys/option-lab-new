import { useState, useMemo, useCallback, useEffect } from 'react';
import type { MarketInputs, StrategyLeg, StrategyKey, Side, OptionType } from '@/types';
import { NavBar, type TabKey } from '@/components/NavBar';
import { PayoffChart } from '@/components/PayoffChart';
import { StrategyLibrary, Glossary } from '@/components/StrategyLibrary';
import { FuturesCalculator } from '@/components/FuturesCalculator';
import { StrategyComparison } from '@/components/StrategyComparison';
import { PriceSlider } from '@/components/PriceSlider';
import { createLegsFromTemplate, createLeg } from '@/lib/strategyTemplates';
import { computeRiskMetrics, formatINR } from '@/lib/riskEngine';
import { suggestPriceRange, getStrikePrices } from '@/lib/calcEngine';
import { TrendingUp, TrendingDown, Target, Trash2 } from 'lucide-react';

const defaultMarketInputs: MarketInputs = {
  instrumentName: 'NIFTY',
  category: 'Index',
  spotPrice: 22000,
  futuresEntryPrice: 22050,
  strikePrice: 22000,
  callPremium: 120,
  putPremium: 115,
  lotSize: 50,
  lots: 1,
  expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
};

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('builder');
  const [eduMode, setEduMode] = useState(false);
  const [marketInputs, setMarketInputs] = useState<MarketInputs>(defaultMarketInputs);
  const [legs, setLegs] = useState<StrategyLeg[]>(() =>
    createLegsFromTemplate('long_call', defaultMarketInputs)
  );
  const [selectedPrice, setSelectedPrice] = useState(defaultMarketInputs.spotPrice);
  const [chartMin, setChartMin] = useState(0);
  const [chartMax, setChartMax] = useState(0);

  // Update chart range when legs or spot change
  const strikes = useMemo(() => getStrikePrices(legs), [legs]);
  const suggestedRange = useMemo(
    () => suggestPriceRange(marketInputs.spotPrice, strikes),
    [marketInputs.spotPrice, strikes]
  );

  useEffect(() => {
    setChartMin(suggestedRange.min);
    setChartMax(suggestedRange.max);
  }, [suggestedRange.min, suggestedRange.max]);

  // Recalculate selected price if it falls outside chart range
  useEffect(() => {
    if (selectedPrice < chartMin || selectedPrice > chartMax) {
      setSelectedPrice(marketInputs.spotPrice);
    }
  }, [chartMin, chartMax, selectedPrice, marketInputs.spotPrice]);

  const metrics = useMemo(
    () => computeRiskMetrics(legs, marketInputs.spotPrice, selectedPrice),
    [legs, marketInputs.spotPrice, selectedPrice]
  );

  // Strategy change handler
  const handleStrategyChange = useCallback(
    (key: StrategyKey) => {
      const newLegs = createLegsFromTemplate(key, marketInputs);
      setLegs(newLegs);
    },
    [marketInputs]
  );

  // Reset
  const handleReset = useCallback(() => {
    setMarketInputs(defaultMarketInputs);
    setLegs(createLegsFromTemplate('long_call', defaultMarketInputs));
    setSelectedPrice(defaultMarketInputs.spotPrice);
  }, []);

  // Leg operations
  const handleAddLeg = useCallback((leg: StrategyLeg) => {
    setLegs((prev) => [...prev, leg]);
  }, []);

  const handleRemoveLeg = useCallback((id: string) => {
    setLegs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onReset={handleReset}
        eduMode={eduMode}
        onToggleEdu={() => setEduMode((v) => !v)}
      />

      {activeTab === 'builder' && (
        <BuilderPage
          marketInputs={marketInputs}
          legs={legs}
          onAddLeg={handleAddLeg}
          onRemoveLeg={handleRemoveLeg}
          onLegsChange={setLegs}
          metrics={metrics}
          selectedPrice={selectedPrice}
          onPriceSelect={setSelectedPrice}
          chartMin={chartMin}
          chartMax={chartMax}
          onChartMinChange={setChartMin}
          onChartMaxChange={setChartMax}
        />
      )}

      {activeTab === 'futures' && (
        <FuturesCalculator
          defaultSpot={marketInputs.spotPrice}
          defaultLotSize={marketInputs.lotSize}
          eduMode={eduMode}
        />
      )}

      {activeTab === 'comparison' && (
        <StrategyComparison marketInputs={marketInputs} />
      )}

      {activeTab === 'learning' && (
        <LearningCenterPage
          marketInputs={marketInputs}
          onSelectStrategy={(key) => {
            handleStrategyChange(key);
            setActiveTab('builder');
          }}
        />
      )}

      <footer className="mt-auto py-4 px-6 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        OptionLab — Educational Options & Futures Strategy Analyzer. Not financial advice. All calculations are for educational purposes only.
        <br />
        Made by Kushal Agarwal
      </footer>
    </div>
  );
}

// ===== Builder Page (Simplified) =====
interface BuilderPageProps {
  marketInputs: MarketInputs;
  legs: StrategyLeg[];
  onAddLeg: (leg: StrategyLeg) => void;
  onRemoveLeg: (id: string) => void;
  onLegsChange: (legs: StrategyLeg[]) => void;
  metrics: ReturnType<typeof computeRiskMetrics>;
  selectedPrice: number;
  onPriceSelect: (price: number) => void;
  chartMin: number;
  chartMax: number;
  onChartMinChange: (v: number) => void;
  onChartMaxChange: (v: number) => void;
}

function BuilderPage(props: BuilderPageProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Strategy Builder</h1>
        <p className="text-sm text-slate-500 mt-1">
          Add positions to build your strategy. The chart and metrics update live.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Add position + positions list */}
        <div className="lg:col-span-4 space-y-4">
          <SimpleAddLeg
            onAdd={props.onAddLeg}
            defaultLotSize={props.marketInputs.lotSize}
            defaultLots={props.marketInputs.lots}
          />
          <SimplePositions
            legs={props.legs}
            onRemove={props.onRemoveLeg}
            onLegsChange={props.onLegsChange}
          />
        </div>

        {/* Right: Chart + key metrics */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">
              Payoff Chart
            </h3>
            <PayoffChart
              legs={props.legs}
              minPrice={props.chartMin}
              maxPrice={props.chartMax}
              spotPrice={props.marketInputs.spotPrice}
              selectedPrice={props.selectedPrice}
              breakevens={props.metrics.breakevens.map((b) => b.price)}
              onPriceSelect={props.onPriceSelect}
              height={400}
            />
          </div>

          <PriceSlider
            min={props.chartMin}
            max={props.chartMax}
            value={props.selectedPrice}
            onChange={props.onPriceSelect}
          />

          {/* Key metrics summary */}
          <SimpleMetricsSummary
            metrics={props.metrics}
            selectedPrice={props.selectedPrice}
          />
        </div>
      </div>
    </div>
  );
}

// ===== Simple Add Leg (for Builder) =====
function SimpleAddLeg({
  onAdd,
  defaultLotSize,
  defaultLots,
}: {
  onAdd: (leg: StrategyLeg) => void;
  defaultLotSize: number;
  defaultLots: number;
}) {
  const [side, setSide] = useState<Side>('LONG');
  const [optionType, setOptionType] = useState<OptionType>('CALL');
  const [strike, setStrike] = useState('');
  const [premium, setPremium] = useState('');
  const [lotSize, setLotSize] = useState(String(defaultLotSize));
  const [lots, setLots] = useState(String(defaultLots));

  const handleAdd = () => {
    const leg = createLeg({
      instrumentType: 'OPTION',
      side,
      optionType,
      strike: parseFloat(strike) || 0,
      premium: parseFloat(premium) || 0,
      lotSize: parseInt(lotSize, 10) || defaultLotSize,
      lots: parseFloat(lots) || defaultLots,
    });
    onAdd(leg);
    setStrike('');
    setPremium('');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
      <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Add Position</h3>

      {/* Buy / Sell toggle */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Action</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide('LONG')}
            className={`px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              side === 'LONG'
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => setSide('SHORT')}
            className={`px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              side === 'SHORT'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Sell
          </button>
        </div>
      </div>

      {/* Call / Put toggle */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Option Type</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setOptionType('CALL')}
            className={`px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              optionType === 'CALL'
                ? 'bg-navy text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Call
          </button>
          <button
            onClick={() => setOptionType('PUT')}
            className={`px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              optionType === 'PUT'
                ? 'bg-navy text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Put
          </button>
        </div>
      </div>

      {/* Strike + Premium */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Strike Price</label>
          <input
            type="number"
            value={strike}
            onChange={(e) => setStrike(e.target.value)}
            className="input"
            placeholder="e.g. 22000"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Premium/unit</label>
          <input
            type="number"
            value={premium}
            onChange={(e) => setPremium(e.target.value)}
            className="input"
            placeholder="e.g. 120"
          />
        </div>
      </div>

      {/* Lot size + Lots */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Lot Size</label>
          <input
            type="number"
            value={lotSize}
            onChange={(e) => setLotSize(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Lots</label>
          <input
            type="number"
            value={lots}
            onChange={(e) => setLots(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <button
        onClick={handleAdd}
        className="w-full px-4 py-2.5 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
      >
        Add Position
      </button>
    </div>
  );
}

// ===== Simple Positions List (for Builder) =====
function SimplePositions({
  legs,
  onRemove,
  onLegsChange,
}: {
  legs: StrategyLeg[];
  onRemove: (id: string) => void;
  onLegsChange: (legs: StrategyLeg[]) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
          Positions ({legs.length})
        </h3>
        {legs.length > 0 && (
          <button
            onClick={() => onLegsChange([])}
            className="text-xs text-slate-400 hover:text-red-600 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {legs.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-400">
          No positions yet. Add one above to begin.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {legs.map((leg) => (
            <div key={leg.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      leg.side === 'LONG'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {leg.side === 'LONG' ? 'BUY' : 'SELL'}
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {leg.instrumentType === 'OPTION'
                      ? leg.optionType === 'CALL' ? 'Call' : 'Put'
                      : 'Futures'}
                  </span>
                  {leg.instrumentType === 'OPTION' && leg.strike != null && (
                    <span className="text-sm text-slate-500">K={leg.strike}</span>
                  )}
                  {leg.instrumentType === 'OPTION' && leg.premium != null && (
                    <span className="text-sm text-slate-500">
                      @ ₹{leg.premium}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {leg.lotSize}×{leg.lots}
                  </span>
                </div>
                <button
                  onClick={() => onRemove(leg.id)}
                  className="p-1.5 rounded text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors shrink-0"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Simple Metrics Summary (for Builder) =====
function SimpleMetricsSummary({
  metrics,
  selectedPrice,
}: {
  metrics: ReturnType<typeof computeRiskMetrics>;
  selectedPrice: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
          Key Metrics
        </h3>
        <span className="text-[11px] text-slate-400">{metrics.classification}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricBox
          icon={<TrendingUp className="w-4 h-4" />}
          label="Max Profit"
          value={metrics.maxProfit.bound === 'unlimited' ? 'Unlimited' : formatINR(metrics.maxProfit.value ?? 0)}
          color="green"
        />
        <MetricBox
          icon={<TrendingDown className="w-4 h-4" />}
          label="Max Loss"
          value={metrics.maxLoss.bound === 'unlimited' ? 'Unlimited' : formatINR(metrics.maxLoss.value ?? 0)}
          color="red"
        />
        <MetricBox
          icon={<Target className="w-4 h-4" />}
          label="Breakeven"
          value={metrics.breakevens.length > 0 ? metrics.breakevens.map((b) => `₹${b.price.toFixed(0)}`).join(', ') : 'None'}
          color="amber"
        />
        <MetricBox
          icon={<TrendingUp className="w-4 h-4" />}
          label={`P&L @ ₹${selectedPrice.toFixed(0)}`}
          value={formatINR(metrics.pnlAtSelected)}
          color={metrics.pnlAtSelected >= 0 ? 'green' : 'red'}
        />
      </div>
    </div>
  );
}

function MetricBox({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'green' | 'red' | 'amber';
}) {
  const colorMap = {
    green: 'text-green-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
  };
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={colorMap[color]}>{icon}</span>
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-base font-bold ${colorMap[color]}`}>{value}</div>
    </div>
  );
}

// ===== Learning Center Page =====
function LearningCenterPage({
  marketInputs,
  onSelectStrategy,
}: {
  marketInputs: MarketInputs;
  onSelectStrategy: (key: StrategyKey) => void;
}) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Learning Center</h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore options and futures strategies with interactive payoff charts, formulas, and worked examples.
        </p>
      </div>

      <StrategyLibrary marketInputs={marketInputs} onSelectStrategy={onSelectStrategy} />
      <Glossary />

      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
        <h3 className="text-sm font-semibold text-amber-800 mb-2">Important Disclaimer</h3>
        <p className="text-sm text-amber-700">
          OptionLab is an educational tool. All calculations are for learning purposes only and do not
          constitute financial advice. Options and futures trading involves significant risk of loss.
          Never invest more than you can afford to lose. Consult a licensed financial advisor before making
          investment decisions.
        </p>
      </div>
    </div>
  );
}

export default App;
