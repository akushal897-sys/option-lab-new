import type { RiskMetrics } from '@/types';
import { formatINR } from '@/lib/riskEngine';
import { TrendingUp, TrendingDown, AlertCircle, Target, Scale, DollarSign, Activity, Percent } from 'lucide-react';

interface RiskMetricsPanelProps {
  metrics: RiskMetrics;
  eduMode: boolean;
}

export function RiskMetricsPanel({ metrics, eduMode }: RiskMetricsPanelProps) {
  const np = metrics.netPremium;
  const isCredit = np > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Risk Metrics</h3>
        <p className="text-[11px] text-slate-400 mt-0.5">{metrics.classification}</p>
      </div>

      <div className="grid grid-cols-2 gap-px bg-slate-100">
        {/* Max Profit */}
        <MetricCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Max Profit"
          value={metrics.maxProfit.bound === 'unlimited' ? 'Unlimited' : formatINR(metrics.maxProfit.value ?? 0)}
          color="green"
          sub={metrics.maxProfit.bound === 'unlimited' ? 'Theoretical' : metrics.maxProfit.atPrice != null ? `at ₹${metrics.maxProfit.atPrice.toFixed(0)}` : ''}
          eduNote="Highest possible profit. For short calls, profit is capped at premium received. For long calls, profit is theoretically unlimited."
          eduMode={eduMode}
        />

        {/* Max Loss */}
        <MetricCard
          icon={<TrendingDown className="w-4 h-4" />}
          label="Max Loss"
          value={metrics.maxLoss.bound === 'unlimited' ? 'Unlimited' : formatINR(metrics.maxLoss.value ?? 0)}
          color="red"
          sub={metrics.maxLoss.bound === 'unlimited' ? 'Theoretical' : metrics.maxLoss.atPrice != null ? `at ₹${metrics.maxLoss.atPrice.toFixed(0)}` : ''}
          eduNote="Worst possible loss. For long options, limited to premium paid. For short calls, loss is theoretically unlimited."
          eduMode={eduMode}
        />

        {/* Breakevens */}
        <MetricCard
          icon={<Target className="w-4 h-4" />}
          label="Breakeven(s)"
          value={metrics.breakevens.length > 0 ? metrics.breakevens.map((b) => `₹${b.price.toFixed(1)}`).join(', ') : 'None'}
          color="amber"
          sub={metrics.breakevens.length > 0 ? `${metrics.breakevens.length} point(s)` : ''}
          eduNote="Price(s) at which total P&L = 0. Above/below these, the strategy is profitable or losing."
          eduMode={eduMode}
        />

        {/* Net Premium */}
        <MetricCard
          icon={<DollarSign className="w-4 h-4" />}
          label="Net Premium"
          value={formatINR(np)}
          color={isCredit ? 'green' : np < 0 ? 'red' : 'slate'}
          sub={metrics.netDebitOrCredit}
          eduNote="Net cash flow from premiums. Positive = you received money (credit). Negative = you paid (debit)."
          eduMode={eduMode}
        />

        {/* P&L at Spot */}
        <MetricCard
          icon={<Activity className="w-4 h-4" />}
          label="P&L at Spot"
          value={formatINR(metrics.pnlAtSpot)}
          color={metrics.pnlAtSpot >= 0 ? 'green' : 'red'}
          sub={`at ₹${metrics.selectedPrice ? '' : ''}`}
          eduNote="P&L if the underlying expires at the current spot price."
          eduMode={eduMode}
        />

        {/* P&L at Selected */}
        <MetricCard
          icon={<Activity className="w-4 h-4" />}
          label="P&L at Selected"
          value={formatINR(metrics.pnlAtSelected)}
          color={metrics.pnlAtSelected >= 0 ? 'green' : 'red'}
          sub={`at ₹${metrics.selectedPrice.toFixed(0)}`}
          eduNote="P&L at the underlying price you've selected using the slider or chart click."
          eduMode={eduMode}
        />

        {/* Risk/Reward */}
        <MetricCard
          icon={<Scale className="w-4 h-4" />}
          label="Risk/Reward"
          value={metrics.riskRewardRatio ? `1 : ${metrics.riskRewardRatio.toFixed(2)}` : 'N/A'}
          color="slate"
          sub={metrics.riskRewardRatio ? 'Max loss : Max profit' : 'Unbounded'}
          eduNote="Ratio of max profit to max loss. A higher number means more reward per unit of risk."
          eduMode={eduMode}
        />

        {/* Total Quantity */}
        <MetricCard
          icon={<Percent className="w-4 h-4" />}
          label="Total Quantity"
          value={metrics.totalQuantity.toLocaleString('en-IN')}
          color="slate"
          sub="units"
          eduNote="Sum of (lot size × number of lots) across all legs."
          eduMode={eduMode}
        />
      </div>

      {eduMode && (
        <div className="px-4 py-3 bg-amber-50 border-t border-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-700">
              These metrics are computed analytically from the payoff structure — not estimated from the visible chart range.
              Unlimited profit/loss is detected from the slope of the payoff at extreme prices.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
  sub,
  eduNote,
  eduMode,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'green' | 'red' | 'amber' | 'slate';
  sub?: string;
  eduNote?: string;
  eduMode?: boolean;
}) {
  const colorMap = {
    green: 'text-green-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    slate: 'text-slate-700',
  };

  return (
    <div className="bg-white p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={colorMap[color]}>{icon}</span>
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-base font-bold ${colorMap[color]}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
      {eduMode && eduNote && (
        <div className="text-[10px] text-amber-600 mt-1 leading-snug">{eduNote}</div>
      )}
    </div>
  );
}
