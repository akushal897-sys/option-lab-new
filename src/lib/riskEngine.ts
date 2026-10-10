import type {
  StrategyLeg,
  RiskMetrics,
  Extremum,
  BreakevenPoint,
  PayoffSegment,
} from '@/types';
import {
  legQuantity,
  netPremium,
  totalQuantity,
  strategyPayoff,
} from '@/lib/calcEngine';

/**
 * The combined payoff is piecewise-linear. The breakpoints are the strike
 * prices (for option legs) and entry prices (for future legs don't create
 * breakpoints but we include 0 as a boundary). Between consecutive
 * breakpoints the slope is constant, so the payoff is linear in each segment.
 *
 * We build segments, compute the slope in each, find extrema at segment
 * boundaries and at +/- infinity, and find breakeven crossings.
 */

/**
 * Compute the slope (dP&L/dPrice) of a single leg.
 * For calls: long slope = +Q above strike, 0 below; short = -Q above, 0 below.
 * For puts:  long slope = -Q below strike, 0 above; short = +Q below, 0 above.
 * For futures: long slope = +Q everywhere; short = -Q everywhere.
 */
function legSlopeAtPrice(leg: StrategyLeg, price: number): number {
  const qty = legQuantity(leg);

  if (leg.instrumentType === 'FUTURE') {
    return leg.side === 'LONG' ? qty : -qty;
  }

  // OPTION
  const K = leg.strike ?? 0;
  if (leg.optionType === 'CALL') {
    if (price > K) {
      return leg.side === 'LONG' ? qty : -qty;
    }
    return 0;
  }
  // PUT
  if (price < K) {
    return leg.side === 'LONG' ? -qty : qty;
  }
  return 0;
}

/**
 * Get all price breakpoints (strike prices) from all legs.
 * Also include 0 as the minimum boundary.
 */
function getBreakpoints(legs: StrategyLeg[]): number[] {
  const points = new Set<number>();
  points.add(0);
  legs.forEach((leg) => {
    if (leg.instrumentType === 'OPTION' && leg.strike != null) {
      points.add(leg.strike);
    }
  });
  return Array.from(points).sort((a, b) => a - b);
}

/**
 * Build piecewise-linear segments of the combined payoff.
 * Each segment is [breakpoint[i], breakpoint[i+1]] with a constant slope.
 * We also add a segment from -infinity to the first breakpoint and from
 * the last breakpoint to +infinity.
 */
function buildSegments(legs: StrategyLeg[]): PayoffSegment[] {
  const breakpoints = getBreakpoints(legs);
  const segments: PayoffSegment[] = [];

  // Sample just below each breakpoint to get the slope in the region
  // between the previous and current breakpoint.
  // For the segment (-inf, bp[0]], use a very small price.
  // For [bp[i], bp[i+1]], use the midpoint.
  // For [bp[last], +inf), use a very large price.

  // Leftmost segment: (-inf, first breakpoint]
  const firstBp = breakpoints[0];
  const leftSlope = legs.reduce(
    (sum, leg) => sum + legSlopeAtPrice(leg, firstBp - 1),
    0
  );
  // P&L at firstBp
  const leftPnl = strategyPayoff(legs, firstBp).total;
  // P&L at -inf: if slope != 0, it's -/+ infinity; we compute intercept
  // intercept = pnl - slope * price
  const leftIntercept = leftPnl - leftSlope * firstBp;
  segments.push({
    start: -Infinity,
    end: firstBp,
    slope: leftSlope,
    intercept: leftIntercept,
  });

  // Middle segments
  for (let i = 0; i < breakpoints.length - 1; i++) {
    const start = breakpoints[i];
    const end = breakpoints[i + 1];
    const mid = (start + end) / 2;
    const slope = legs.reduce(
      (sum, leg) => sum + legSlopeAtPrice(leg, mid),
      0
    );
    const pnlAtStart = strategyPayoff(legs, start).total;
    const intercept = pnlAtStart - slope * start;
    segments.push({ start, end, slope, intercept });
  }

  // Rightmost segment: [last breakpoint, +inf)
  const lastBp = breakpoints[breakpoints.length - 1];
  const rightSlope = legs.reduce(
    (sum, leg) => sum + legSlopeAtPrice(leg, lastBp + 1),
    0
  );
  const rightPnl = strategyPayoff(legs, lastBp).total;
  const rightIntercept = rightPnl - rightSlope * lastBp;
  segments.push({
    start: lastBp,
    end: Infinity,
    slope: rightSlope,
    intercept: rightIntercept,
  });

  return segments;
}

/**
 * P&L at a given price using the segment model (for verification).
 */
function pnlFromSegments(segments: PayoffSegment[], price: number): number {
  for (const seg of segments) {
    if (price >= seg.start && price <= seg.end) {
      return seg.slope * price + seg.intercept;
    }
  }
  // Fallback: last segment
  const last = segments[segments.length - 1];
  return last.slope * price + last.intercept;
}

/**
 * Find breakeven points by checking zero crossings in each segment.
 * A segment with slope != 0 has a breakeven at price = -intercept/slope
 * if that price falls within [start, end].
 * A segment with slope == 0 and intercept == 0 means the entire segment
 * is at breakeven (rare); we skip that degenerate case.
 */
function findBreakevens(segments: PayoffSegment[]): BreakevenPoint[] {
  const breakevens: BreakevenPoint[] = [];
  for (const seg of segments) {
    if (seg.slope === 0) continue;
    const candidate = -seg.intercept / seg.slope;
    if (candidate >= seg.start && candidate <= seg.end && candidate >= 0) {
      // Avoid duplicates (at segment boundaries)
      if (
        breakevens.length === 0 ||
        Math.abs(breakevens[breakevens.length - 1].price - candidate) > 0.01
      ) {
        breakevens.push({ price: candidate });
      }
    }
  }
  return breakevens;
}

/**
 * Determine maximum profit from the segment model.
 * For each segment, check the P&L at its boundaries and whether it's
 * unbounded in the direction of the slope.
 */
function findMaxProfit(
  segments: PayoffSegment[]
): Extremum {
  let bestFinite: number | null = null;
  let bestPrice = 0;
  let isUnlimited = false;

  for (const seg of segments) {
    // Check P&L at segment boundaries (only finite boundaries)
    const checkPrice = (p: number) => {
      if (!isFinite(p) || p < 0) return;
      const pnl = seg.slope * p + seg.intercept;
      if (bestFinite === null || pnl > bestFinite) {
        bestFinite = pnl;
        bestPrice = p;
      }
    };
    checkPrice(seg.start);
    checkPrice(seg.end);

    // Check for unbounded profit
    // Right-unbounded segment (end = +inf): if slope > 0, profit -> +inf
    if (seg.end === Infinity && seg.slope > 0) {
      isUnlimited = true;
    }
    // Left-unbounded segment (start = -inf): if slope < 0, profit -> +inf (as price -> -inf)
    // But price can't go below 0, so we check if the leftmost segment at price=0
    // has slope < 0 which means profit increases as price decreases toward 0.
    // Actually for the leftmost segment with start=-inf, if slope < 0, as price increases
    // from -inf, P&L decreases. So P&L is highest at -inf. But since price >= 0,
    // the maximum is at price=0 which we already checked.
    // The real question is: can price go to 0? Yes. Can it go below 0? No.
    // So the leftmost segment's max is at price 0 (already checked via start=-inf check? No.)
  }

  // Also check price = 0 explicitly for the leftmost segment
  // (price=0 is the practical minimum)
  const leftmost = segments[0];
  const pnlAt0 = leftmost.slope * 0 + leftmost.intercept;
  // But leftmost.intercept is computed for the (-inf, firstBp] segment
  // which uses slope that might be 0 for options (OTM) or negative for puts
  // The intercept = pnlAtFirstBp - slope * firstBp
  // So pnlAt0 = slope * 0 + intercept = intercept = pnlAtFirstBp - slope * firstBp
  // This might not equal strategyPayoff(legs, 0) if the slope changes between 0 and firstBp
  // Actually firstBp is typically 0 (we added 0 to breakpoints), so the leftmost segment
  // is (-inf, 0] and the next segment starts at 0. So pnlAt0 should be correct.

  // Re-check: if 0 is in breakpoints, the leftmost segment is (-inf, 0]
  // and pnl at 0 = leftmost.slope * 0 + leftmost.intercept
  if (bestFinite === null || pnlAt0 > bestFinite) {
    // Only set if 0 is a valid boundary we haven't checked
    // Since we added 0 to breakpoints, seg.start=-inf seg.end=0
    // checkPrice(seg.end) = checkPrice(0) should have been called
    // So this is already covered.
  }

  if (isUnlimited) {
    return {
      value: null,
      bound: 'unlimited',
      label: 'Unlimited theoretical profit',
    };
  }

  if (bestFinite === null) {
    return {
      value: 0,
      bound: 'finite',
      label: '₹0',
      atPrice: 0,
    };
  }

  return {
    value: bestFinite,
    bound: 'finite',
    label: formatINR(bestFinite),
    atPrice: bestPrice,
  };
}

/**
 * Determine maximum loss from the segment model.
 * Mirrors findMaxProfit but looks for minimum P&L and unbounded loss.
 */
function findMaxLoss(segments: PayoffSegment[]): Extremum {
  let worstFinite: number | null = null;
  let worstPrice = 0;
  let isUnlimited = false;

  for (const seg of segments) {
    const checkPrice = (p: number) => {
      if (!isFinite(p) || p < 0) return;
      const pnl = seg.slope * p + seg.intercept;
      if (worstFinite === null || pnl < worstFinite) {
        worstFinite = pnl;
        worstPrice = p;
      }
    };
    checkPrice(seg.start);
    checkPrice(seg.end);

    // Unbounded loss: right segment with negative slope
    if (seg.end === Infinity && seg.slope < 0) {
      isUnlimited = true;
    }
  }

  if (isUnlimited) {
    return {
      value: null,
      bound: 'unlimited',
      label: 'Unlimited theoretical loss',
    };
  }

  if (worstFinite === null) {
    return {
      value: 0,
      bound: 'finite',
      label: '₹0',
      atPrice: 0,
    };
  }

  return {
    value: worstFinite,
    bound: 'finite',
    label: formatINR(worstFinite),
    atPrice: worstPrice,
  };
}

/**
 * Determine profit and loss regions (price ranges where P&L > 0 / < 0).
 */
function findRegions(
  segments: PayoffSegment[]
): { profit: [number, number][]; loss: [number, number][] } {
  const profit: [number, number][] = [];
  const loss: [number, number][] = [];
  const breakevens = findBreakevens(segments);
  const allPoints = [0, ...breakevens.map((b) => b.price), Infinity];

  for (let i = 0; i < allPoints.length - 1; i++) {
    const start = allPoints[i];
    const end = allPoints[i + 1];
    const mid = isFinite(end) ? (start + end) / 2 : start + 1;
    const pnl = pnlFromSegments(segments, mid);

    if (pnl > 0) {
      profit.push([start, end]);
    } else if (pnl < 0) {
      loss.push([start, end]);
    }
  }

  return { profit, loss };
}

/**
 * Classify the strategy based on leg structure.
 */
function classifyStrategy(legs: StrategyLeg[]): string {
  if (legs.length === 0) return 'No positions';
  const options = legs.filter((l) => l.instrumentType === 'OPTION');
  const futures = legs.filter((l) => l.instrumentType === 'FUTURE');

  if (futures.length > 0 && options.length === 0) {
    if (futures.length === 1) {
      return futures[0].side === 'LONG'
        ? 'Long Futures'
        : 'Short Futures';
    }
    return 'Futures Strategy';
  }

  if (options.length === 1) {
    const o = options[0];
    const side = o.side === 'LONG' ? 'Long' : 'Short';
    const type = o.optionType === 'CALL' ? 'Call' : 'Put';
    return `${side} ${type}`;
  }

  const calls = options.filter((o) => o.optionType === 'CALL');
  const puts = options.filter((o) => o.optionType === 'PUT');
  const longCalls = calls.filter((o) => o.side === 'LONG').length;
  const shortCalls = calls.filter((o) => o.side === 'SHORT').length;
  const longPuts = puts.filter((o) => o.side === 'LONG').length;
  const shortPuts = puts.filter((o) => o.side === 'SHORT').length;

  if (longCalls === 1 && shortCalls === 1) {
    const strikes = calls.map((o) => o.strike ?? 0).sort((a, b) => a - b);
    return strikes[0] === strikes[1] ? 'Call Spread' : 'Bull/Bear Call Spread';
  }
  if (longPuts === 1 && shortPuts === 1) {
    return 'Bull/Bear Put Spread';
  }
  if (longCalls === 1 && longPuts === 1) {
    const callStrike = calls.find((o) => o.side === 'LONG')?.strike ?? 0;
    const putStrike = puts.find((o) => o.side === 'LONG')?.strike ?? 0;
    if (callStrike !== putStrike) return 'Long Strangle';
    return 'Long Straddle';
  }
  if (shortCalls === 1 && shortPuts === 1) {
    const callStrike = calls.find((o) => o.side === 'SHORT')?.strike ?? 0;
    const putStrike = puts.find((o) => o.side === 'SHORT')?.strike ?? 0;
    if (callStrike !== putStrike) return 'Short Strangle';
    return 'Short Straddle';
  }
  if (options.length === 4) return 'Multi-Leg Spread';
  if (options.length === 3) return 'Butterfly / 3-Leg Strategy';

  return 'Multi-Leg Strategy';
}

/**
 * Format a number as INR currency string.
 */
export function formatINR(value: number): string {
  if (!isFinite(value)) return '—';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  return value < 0 ? `-₹${formatted}` : `₹${formatted}`;
}

/**
 * Format a number as a compact INR string (e.g., ₹1.2L, ₹3.5Cr).
 */
export function formatINRCompact(value: number): string {
  if (!isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 10000000) return `${value < 0 ? '-' : ''}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${value < 0 ? '-' : ''}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${value < 0 ? '-' : ''}₹${(abs / 1000).toFixed(1)}K`;
  return formatINR(value);
}

/**
 * Compute all risk metrics for a given strategy.
 */
export function computeRiskMetrics(
  legs: StrategyLeg[],
  spotPrice: number,
  selectedPrice: number
): RiskMetrics {
  if (legs.length === 0) {
    return {
      maxProfit: { value: 0, bound: 'finite', label: '₹0', atPrice: 0 },
      maxLoss: { value: 0, bound: 'finite', label: '₹0', atPrice: 0 },
      breakevens: [],
      netPremium: 0,
      netDebitOrCredit: 'None',
      pnlAtSpot: 0,
      pnlAtSelected: 0,
      selectedPrice,
      totalQuantity: 0,
      classification: 'No positions',
      profitRegion: [],
      lossRegion: [],
      riskRewardRatio: null,
      payoffAtExpiry: 0,
    };
  }

  const segments = buildSegments(legs);
  const breakevens = findBreakevens(segments);
  const maxProfit = findMaxProfit(segments);
  const maxLoss = findMaxLoss(segments);
  const regions = findRegions(segments);
  const np = netPremium(legs);
  const pnlSpot = strategyPayoff(legs, spotPrice).total;
  const pnlSelected = strategyPayoff(legs, selectedPrice).total;

  let netDebitOrCredit: 'Net Debit' | 'Net Credit' | 'None' = 'None';
  if (np > 0) netDebitOrCredit = 'Net Credit'; // positive netPremium means you received money
  else if (np < 0) netDebitOrCredit = 'Net Debit';

  // Wait - netPremium returns positive for credit, negative for debit
  // Let me recheck: netPremium in calcEngine returns sum of premiumFlows
  // Long: -premium*qty (you pay), Short: +premium*qty (you receive)
  // So positive = net credit, negative = net debit
  // The above is correct.

  let riskRewardRatio: number | null = null;
  if (
    maxProfit.bound === 'finite' &&
    maxLoss.bound === 'finite' &&
    maxProfit.value !== null &&
    maxLoss.value !== null &&
    maxLoss.value !== 0
  ) {
    riskRewardRatio = Math.abs(maxProfit.value / maxLoss.value);
  }

  return {
    maxProfit,
    maxLoss,
    breakevens,
    netPremium: np,
    netDebitOrCredit,
    pnlAtSpot: pnlSpot,
    pnlAtSelected: pnlSelected,
    selectedPrice,
    totalQuantity: totalQuantity(legs),
    classification: classifyStrategy(legs),
    profitRegion: regions.profit,
    lossRegion: regions.loss,
    riskRewardRatio,
    payoffAtExpiry: pnlSpot,
  };
}
