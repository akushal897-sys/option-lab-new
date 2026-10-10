import type { StrategyLeg, RiskMetrics, SavedScenario, MarketInputs, StrategyKey } from '@/types';
import { legQuantity, strategyPayoff, netPremium } from '@/lib/calcEngine';
import { formatINR } from '@/lib/riskEngine';

export function exportPositionsCSV(legs: StrategyLeg[]): string {
  const header = [
    'Side',
    'Instrument',
    'Type',
    'Strike',
    'Premium',
    'Entry Price',
    'Lot Size',
    'Lots',
    'Quantity',
    'Transaction Cost',
  ];
  const rows = legs.map((leg) => [
    leg.side,
    leg.instrumentType,
    leg.optionType ?? '',
    leg.strike ?? '',
    leg.premium ?? '',
    leg.entryPrice ?? '',
    leg.lotSize,
    leg.lots,
    legQuantity(leg),
    leg.transactionCost ?? 0,
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell)}"`).join(','))
    .join('\n');
}

export function exportScenarioCSV(
  legs: StrategyLeg[],
  prices: number[]
): string {
  const header = ['Underlying Price', 'Total P&L', 'Outcome', ...legs.map((_, i) => `Leg ${i + 1} P&L`)];
  const rows = prices.map((price) => {
    const { total, legPnls } = strategyPayoff(legs, price);
    const outcome = total > 0 ? 'Profit' : total < 0 ? 'Loss' : 'Breakeven';
    return [price.toFixed(2), total.toFixed(2), outcome, ...legPnls.map((p) => p.toFixed(2))];
  });
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell)}"`).join(','))
    .join('\n');
}

export function exportRiskMetricsCSV(metrics: RiskMetrics, legs: StrategyLeg[]): string {
  const np = netPremium(legs);
  const rows: [string, string][] = [
    ['Strategy Classification', metrics.classification],
    ['Maximum Profit', metrics.maxProfit.bound === 'unlimited' ? 'Unlimited theoretical profit' : formatINR(metrics.maxProfit.value ?? 0)],
    ['Maximum Loss', metrics.maxLoss.bound === 'unlimited' ? 'Unlimited theoretical loss' : formatINR(metrics.maxLoss.value ?? 0)],
    ['Breakeven Points', metrics.breakevens.map((b) => b.price.toFixed(2)).join('; ') || 'None'],
    ['Net Premium', formatINR(np)],
    ['Net Debit/Credit', metrics.netDebitOrCredit],
    ['P&L at Spot', formatINR(metrics.pnlAtSpot)],
    ['P&L at Selected Price', formatINR(metrics.pnlAtSelected)],
    ['Selected Price', metrics.selectedPrice.toFixed(2)],
    ['Total Quantity', String(metrics.totalQuantity)],
    ['Risk/Reward Ratio', metrics.riskRewardRatio ? metrics.riskRewardRatio.toFixed(2) : 'N/A'],
  ];
  return rows.map(([k, v]) => `"${k}","${v}"`).join('\n');
}

export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const STORAGE_KEY = 'optionlab_scenarios';

export function loadScenarios(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedScenario[];
  } catch {
    return [];
  }
}

export function saveScenario(scenario: SavedScenario): void {
  const scenarios = loadScenarios();
  const existing = scenarios.findIndex((s) => s.id === scenario.id);
  if (existing >= 0) {
    scenarios[existing] = scenario;
  } else {
    scenarios.push(scenario);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
}

export function deleteScenario(id: string): void {
  const scenarios = loadScenarios().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
}

export function createSavedScenario(
  name: string,
  marketInputs: MarketInputs,
  legs: StrategyLeg[],
  strategyKey: StrategyKey
): SavedScenario {
  return {
    id: `scenario-${Date.now()}`,
    name,
    createdAt: Date.now(),
    marketInputs,
    legs,
    strategyKey,
  };
}
