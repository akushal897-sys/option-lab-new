import type { StrategyLeg, PayoffPoint } from '@/types';

/**
 * Compute total quantity for a leg: lotSize * lots
 */
export function legQuantity(leg: StrategyLeg): number {
  return leg.lotSize * leg.lots;
}

/**
 * Payoff for a single leg at a given underlying price at expiry.
 *
 * Options:
 *   Long Call:  [max(ST - K, 0) - C] * Q
 *   Short Call: [C - max(ST - K, 0)] * Q
 *   Long Put:   [max(K - ST, 0) - P] * Q
 *   Short Put:  [P - max(K - ST, 0)] * Q
 *
 * Futures:
 *   Long:  (ST - Entry) * Q
 *   Short: (Entry - ST) * Q
 *
 * Transaction costs are always subtracted from P&L.
 */
export function legPayoff(leg: StrategyLeg, underlyingPrice: number): number {
  const qty = legQuantity(leg);
  const cost = leg.transactionCost ?? 0;

  if (leg.instrumentType === 'OPTION') {
    const K = leg.strike ?? 0;
    const premium = leg.premium ?? 0;
    const intrinsic =
      leg.optionType === 'CALL'
        ? Math.max(underlyingPrice - K, 0)
        : Math.max(K - underlyingPrice, 0);

    const basePnl =
      leg.side === 'LONG'
        ? (intrinsic - premium) * qty
        : (premium - intrinsic) * qty;

    return basePnl - cost;
  }

  // FUTURE
  const entry = leg.entryPrice ?? 0;
  const basePnl =
    leg.side === 'LONG'
      ? (underlyingPrice - entry) * qty
      : (entry - underlyingPrice) * qty;

  return basePnl - cost;
}

/**
 * Combined strategy P&L at a given underlying price.
 * Returns total P&L and per-leg P&L array.
 */
export function strategyPayoff(
  legs: StrategyLeg[],
  underlyingPrice: number
): { total: number; legPnls: number[] } {
  const legPnls = legs.map((leg) => legPayoff(leg, underlyingPrice));
  const total = legPnls.reduce((sum, p) => sum + p, 0);
  return { total, legPnls };
}

/**
 * Generate payoff curve data points across a price range.
 */
export function generatePayoffCurve(
  legs: StrategyLeg[],
  minPrice: number,
  maxPrice: number,
  numPoints = 200
): PayoffPoint[] {
  const points: PayoffPoint[] = [];
  const step = (maxPrice - minPrice) / (numPoints - 1);
  for (let i = 0; i < numPoints; i++) {
    const price = minPrice + i * step;
    const { total, legPnls } = strategyPayoff(legs, price);
    points.push({ price, pnl: total, legPnls });
  }
  return points;
}

/**
 * Net premium = sum of premium flows.
 * For long options, you pay premium (negative cash flow).
 * For short options, you receive premium (positive cash flow).
 * For futures, there's no upfront premium.
 *
 * Returns positive for net debit, negative for net credit.
 */
export function netPremium(legs: StrategyLeg[]): number {
  return legs.reduce((sum, leg) => {
    if (leg.instrumentType !== 'OPTION') return sum;
    const qty = legQuantity(leg);
    const premium = leg.premium ?? 0;
    const cost = leg.transactionCost ?? 0;
    const premiumFlow =
      leg.side === 'LONG' ? -premium * qty : premium * qty;
    return sum + premiumFlow - cost;
  }, 0);
}

/**
 * Total quantity across all legs (sum of lotSize * lots).
 */
export function totalQuantity(legs: StrategyLeg[]): number {
  return legs.reduce((sum, leg) => sum + legQuantity(leg), 0);
}

/**
 * Collect all unique strike prices from option legs.
 */
export function getStrikePrices(legs: StrategyLeg[]): number[] {
  const strikes = new Set<number>();
  legs.forEach((leg) => {
    if (leg.instrumentType === 'OPTION' && leg.strike != null) {
      strikes.add(leg.strike);
    }
  });
  return Array.from(strikes).sort((a, b) => a - b);
}

/**
 * Suggested price range for the chart based on spot and strikes.
 */
export function suggestPriceRange(
  spotPrice: number,
  strikes: number[],
  padding = 0.3
): { min: number; max: number } {
  const allPrices = [spotPrice, ...strikes].filter(
    (p) => p > 0 && isFinite(p)
  );
  if (allPrices.length === 0) {
    return { min: 0, max: 100 };
  }
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP;
  const pad = range > 0 ? range * padding : maxP * padding;
  return {
    min: Math.max(0, minP - pad),
    max: maxP + pad,
  };
}
