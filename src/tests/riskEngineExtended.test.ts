import { describe, it, expect } from 'vitest';
import { computeRiskMetrics } from '@/lib/riskEngine';
import { strategyPayoff, generatePayoffCurve, legPayoff, netPremium } from '@/lib/calcEngine';
import type { StrategyLeg } from '@/types';

function makeLeg(
  partial: Partial<StrategyLeg> & { instrumentType: StrategyLeg['instrumentType']; side: StrategyLeg['side'] }
): StrategyLeg {
  return { id: 'test-leg', lotSize: 250, lots: 1, ...partial };
}

// ===== Bear Call Spread =====
describe('Bear Call Spread risk metrics', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1470, premium: 20, lotSize: 250, lots: 1 }),
  ];
  const metrics = computeRiskMetrics(legs, 1400, 1450);

  it('max profit = net credit = (40-20)*250 = 5,000', () => {
    expect(metrics.maxProfit.bound).toBe('finite');
    expect(metrics.maxProfit.value).toBe(5000);
  });

  it('max loss = (70-20)*250 = -12,500... wait: (1470-1400)*250 - 5000 = 12500', () => {
    // Max loss = spread width - net credit = 70*250 - 5000 = 17500 - 5000 = 12500
    expect(metrics.maxLoss.bound).toBe('finite');
    expect(metrics.maxLoss.value).toBe(-12500);
  });

  it('net credit', () => {
    expect(metrics.netDebitOrCredit).toBe('Net Credit');
  });

  it('breakeven = 1400 + 20 = 1420', () => {
    expect(metrics.breakevens).toHaveLength(1);
    expect(metrics.breakevens[0].price).toBeCloseTo(1420, 1);
  });
});

// ===== Bull Put Spread =====
describe('Bull Put Spread risk metrics', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'PUT', strike: 1330, premium: 12, lotSize: 250, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'PUT', strike: 1400, premium: 30, lotSize: 250, lots: 1 }),
  ];
  const metrics = computeRiskMetrics(legs, 1400, 1380);

  it('max profit = net credit = (30-12)*250 = 4,500', () => {
    expect(metrics.maxProfit.bound).toBe('finite');
    expect(metrics.maxProfit.value).toBe(4500);
  });

  it('max loss = (1400-1330)*250 - 4500 = 17500 - 4500 = -13,000', () => {
    expect(metrics.maxLoss.bound).toBe('finite');
    expect(metrics.maxLoss.value).toBe(-13000);
  });

  it('breakeven = 1400 - 18 = 1382', () => {
    expect(metrics.breakevens).toHaveLength(1);
    expect(metrics.breakevens[0].price).toBeCloseTo(1382, 0);
  });
});

// ===== Bear Put Spread =====
describe('Bear Put Spread risk metrics', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'PUT', strike: 1400, premium: 30, lotSize: 250, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'PUT', strike: 1330, premium: 12, lotSize: 250, lots: 1 }),
  ];
  const metrics = computeRiskMetrics(legs, 1400, 1370);

  it('max loss = net debit = (30-12)*250 = -4,500', () => {
    expect(metrics.maxLoss.bound).toBe('finite');
    expect(metrics.maxLoss.value).toBe(-4500);
  });

  it('max profit = (1400-1330)*250 - 4500 = 17500 - 4500 = 13,000', () => {
    expect(metrics.maxProfit.bound).toBe('finite');
    expect(metrics.maxProfit.value).toBe(13000);
  });

  it('net debit', () => {
    expect(metrics.netDebitOrCredit).toBe('Net Debit');
  });
});

// ===== Long Strangle =====
describe('Long Strangle risk metrics', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1470, premium: 20, lotSize: 250, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'PUT', strike: 1330, premium: 12, lotSize: 250, lots: 1 }),
  ];
  const metrics = computeRiskMetrics(legs, 1400, 1500);

  it('max profit = unlimited (call side)', () => {
    expect(metrics.maxProfit.bound).toBe('unlimited');
  });

  it('max loss = finite = -(20+12)*250 = -8,000', () => {
    expect(metrics.maxLoss.bound).toBe('finite');
    expect(metrics.maxLoss.value).toBe(-8000);
  });

  it('two breakevens: 1330-32=1298 and 1470+32=1502', () => {
    expect(metrics.breakevens).toHaveLength(2);
    expect(metrics.breakevens[0].price).toBeCloseTo(1298, 0);
    expect(metrics.breakevens[1].price).toBeCloseTo(1502, 0);
  });

  it('classifies as Long Strangle', () => {
    expect(metrics.classification).toBe('Long Strangle');
  });
});

// ===== Short Strangle =====
describe('Short Strangle risk metrics', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1470, premium: 20, lotSize: 250, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'PUT', strike: 1330, premium: 12, lotSize: 250, lots: 1 }),
  ];
  const metrics = computeRiskMetrics(legs, 1400, 1400);

  it('max profit = net credit = (20+12)*250 = 8,000', () => {
    expect(metrics.maxProfit.bound).toBe('finite');
    expect(metrics.maxProfit.value).toBe(8000);
  });

  it('max loss = unlimited (short call)', () => {
    expect(metrics.maxLoss.bound).toBe('unlimited');
  });

  it('classifies as Short Strangle', () => {
    expect(metrics.classification).toBe('Short Strangle');
  });
});

// ===== Iron Butterfly =====
describe('Iron Butterfly risk metrics', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'PUT', strike: 1330, premium: 15, lotSize: 50, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'PUT', strike: 1400, premium: 30, lotSize: 50, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1400, premium: 30, lotSize: 50, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1470, premium: 15, lotSize: 50, lots: 1 }),
  ];
  const metrics = computeRiskMetrics(legs, 1400, 1400);

  it('max profit = net credit = (30+30-15-15)*50 = 30*50 = 1,500', () => {
    expect(metrics.maxProfit.bound).toBe('finite');
    expect(metrics.maxProfit.value).toBe(1500);
  });

  it('max loss = finite', () => {
    expect(metrics.maxLoss.bound).toBe('finite');
    // Width = 70, loss = (70-30)*50 = 2000
    expect(metrics.maxLoss.value).toBe(-2000);
  });

  it('both bounds finite', () => {
    expect(metrics.maxProfit.bound).toBe('finite');
    expect(metrics.maxLoss.bound).toBe('finite');
  });
});

// ===== Butterfly Spread (Long Butterfly with calls) =====
describe('Long Butterfly risk metrics', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1435, premium: 28, lotSize: 250, lots: 2 }),
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1470, premium: 16, lotSize: 250, lots: 1 }),
  ];
  const metrics = computeRiskMetrics(legs, 1400, 1435);

  it('max loss = net debit (finite)', () => {
    expect(metrics.maxLoss.bound).toBe('finite');
    // Net debit = (40 + 16 - 56)*250 = 0*250 = 0... actually 40+16=56, 28*2=56, so net=0
    // With zero net debit, max loss = 0
    const np = netPremium(legs);
    expect(metrics.maxLoss.value).toBe(np);
  });

  it('max profit = finite (at middle strike)', () => {
    expect(metrics.maxProfit.bound).toBe('finite');
    // At 1435: long 1400 call = (35-40)*250 = -1250, short 1435 calls = (28-35)*2*250 = -3500, long 1470 = -16*250 = -4000
    // Total = -1250 - 3500 - 4000 = -8750... that seems wrong
    // Actually: long 1400 call payoff = max(1435-1400,0)-40 = 35-40 = -5 per unit, *250 = -1250
    // Short 1435 calls: (28 - max(1435-1435,0))*2*250 = 28*500 = 14000
    // Long 1470 call: (max(1435-1470,0) - 16)*250 = (0-16)*250 = -4000
    // Total = -1250 + 14000 - 4000 = 8750
    expect(metrics.maxProfit.value).toBe(8750);
  });
});

// ===== Call Ratio Backspread =====
describe('Call Ratio Backspread risk metrics', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1470, premium: 20, lotSize: 250, lots: 2 }),
  ];
  const metrics = computeRiskMetrics(legs, 1400, 1500);

  it('max profit = unlimited (2 long calls dominate above 1470)', () => {
    expect(metrics.maxProfit.bound).toBe('unlimited');
  });

  it('net credit = (40 - 40)*250 = 0', () => {
    const np = netPremium(legs);
    expect(np).toBe(0);
  });
});

// ===== Put Ratio Backspread =====
describe('Put Ratio Backspread risk metrics', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'PUT', strike: 1470, premium: 40, lotSize: 250, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'PUT', strike: 1400, premium: 20, lotSize: 250, lots: 2 }),
  ];
  const metrics = computeRiskMetrics(legs, 1400, 1300);

  it('max profit = finite (bounded by price 0)', () => {
    expect(metrics.maxProfit.bound).toBe('finite');
  });

  it('max loss = finite', () => {
    expect(metrics.maxLoss.bound).toBe('finite');
  });
});

// ===== Custom multi-leg combination =====
describe('Custom 3-leg combination', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 100, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1500, premium: 15, lotSize: 100, lots: 2 }),
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'PUT', strike: 1300, premium: 10, lotSize: 100, lots: 1 }),
  ];
  const metrics = computeRiskMetrics(legs, 1400, 1450);

  it('combined P&L equals sum of individual leg P&Ls at any price', () => {
    for (const price of [0, 500, 1000, 1300, 1400, 1500, 2000, 5000]) {
      const { total, legPnls } = strategyPayoff(legs, price);
      const sum = legPnls.reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(sum, 5);
    }
  });

  it('max profit = unlimited (net long call side dominates at high prices)', () => {
    // At high price: long call slope = +100, short call slope = -200, put slope = 0. Net = -100. So actually unlimited loss.
    // Let me check: long 1 call @ 1400 qty 100, short 2 calls @ 1500 qty 200, long 1 put @ 1300 qty 100
    // Above 1500: slope = +100 (long) - 200 (short) + 0 = -100. So loss is unlimited above.
    // Below 1300: slope = 0 + 0 - 100 (long put) = -100. Loss unlimited below.
    // Max profit is finite (at some intermediate price)
    expect(metrics.maxProfit.bound).toBe('finite');
  });

  it('max loss = unlimited (net short calls above 1500)', () => {
    expect(metrics.maxLoss.bound).toBe('unlimited');
  });
});

// ===== Edge case: Equal strike prices =====
describe('Equal strike prices', () => {
  it('long call and short call at same strike (like short straddle but both calls)', () => {
    const legs = [
      makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
      makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
    ];
    // P&L should be 0 everywhere (perfectly offsetting)
    expect(strategyPayoff(legs, 1000).total).toBe(0);
    expect(strategyPayoff(legs, 1400).total).toBe(0);
    expect(strategyPayoff(legs, 2000).total).toBe(0);
  });
});

// ===== Edge case: Zero quantity =====
describe('Zero quantity', () => {
  it('zero lots → P&L = 0 everywhere', () => {
    const leg = makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 0 });
    expect(Math.abs(legPayoff(leg, 1500))).toBe(0);
    expect(Math.abs(legPayoff(leg, 1400))).toBe(0);
  });

  it('zero lot size → P&L = 0 everywhere', () => {
    const leg = makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 0, lots: 1 });
    expect(Math.abs(legPayoff(leg, 1500))).toBe(0);
  });
});

// ===== Edge case: Large valid inputs =====
describe('Large valid inputs', () => {
  it('large strike and premium', () => {
    const leg = makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 100000, premium: 5000, lotSize: 1000, lots: 100 });
    // At 100000: P&L = (0 - 5000) * 1000000 = -5,000,000,000
    expect(legPayoff(leg, 100000)).toBe(-5000 * 1000 * 100);
    // At 200000: P&L = (100000 - 5000) * 1000000 = 95,000,000,000
    expect(legPayoff(leg, 200000)).toBe((200000 - 100000 - 5000) * 1000 * 100);
  });
});

// ===== Edge case: Underlying price = 0 =====
describe('Underlying price at zero', () => {
  it('long call at price 0 = -premium*qty', () => {
    const leg = makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 });
    expect(legPayoff(leg, 0)).toBe(-10000);
  });

  it('long put at price 0 = (strike - 0 - premium)*qty', () => {
    const leg = makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'PUT', strike: 1400, premium: 30, lotSize: 250, lots: 1 });
    expect(legPayoff(leg, 0)).toBe((1400 - 30) * 250);
  });

  it('long futures at price 0 = -entry*qty', () => {
    const leg = makeLeg({ instrumentType: 'FUTURE', side: 'LONG', entryPrice: 1400, lotSize: 250, lots: 1 });
    expect(legPayoff(leg, 0)).toBe(-1400 * 250);
  });
});

// ===== Edge case: No breakeven =====
describe('No breakeven', () => {
  it('long call with zero premium has breakeven at strike', () => {
    const legs = [makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 0, lotSize: 250, lots: 1 })];
    const metrics = computeRiskMetrics(legs, 1400, 1500);
    // With zero premium, P&L = max(ST-K, 0)*Q, breakeven = K = 1400
    expect(metrics.breakevens).toHaveLength(1);
    expect(metrics.breakevens[0].price).toBeCloseTo(1400, 1);
  });
});

// ===== Edge case: Multiple breakevens =====
describe('Multiple breakevens', () => {
  it('iron condor has two breakevens', () => {
    const legs = [
      makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'PUT', strike: 1260, premium: 5, lotSize: 50, lots: 1 }),
      makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'PUT', strike: 1330, premium: 15, lotSize: 50, lots: 1 }),
      makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1470, premium: 15, lotSize: 50, lots: 1 }),
      makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1540, premium: 5, lotSize: 50, lots: 1 }),
    ];
    const metrics = computeRiskMetrics(legs, 1400, 1400);
    expect(metrics.breakevens.length).toBeGreaterThanOrEqual(2);
  });
});

// ===== Consistency: Chart P&L matches engine P&L =====
describe('Chart P&L matches calculation engine', () => {
  it('generatePayoffCurve uses same formula as strategyPayoff', () => {
    const legs = [
      makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
      makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1470, premium: 20, lotSize: 250, lots: 1 }),
    ];
    const curve = generatePayoffCurve(legs, 1000, 1800, 50);
    for (const point of curve) {
      const direct = strategyPayoff(legs, point.price).total;
      expect(point.pnl).toBeCloseTo(direct, 5);
    }
  });
});

// ===== Consistency: Changing chart range does not alter risk metrics =====
describe('Chart range independence for multi-leg', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1470, premium: 20, lotSize: 250, lots: 1 }),
  ];

  it('max profit same regardless of selected price', () => {
    const m1 = computeRiskMetrics(legs, 1400, 1000);
    const m2 = computeRiskMetrics(legs, 1400, 2000);
    expect(m1.maxProfit.value).toBe(m2.maxProfit.value);
    expect(m1.maxProfit.bound).toBe(m2.maxProfit.bound);
  });

  it('max loss same regardless of selected price', () => {
    const m1 = computeRiskMetrics(legs, 1400, 1000);
    const m2 = computeRiskMetrics(legs, 1400, 2000);
    expect(m1.maxLoss.value).toBe(m2.maxLoss.value);
    expect(m1.maxLoss.bound).toBe(m2.maxLoss.bound);
  });

  it('breakevens same regardless of selected price', () => {
    const m1 = computeRiskMetrics(legs, 1400, 1000);
    const m2 = computeRiskMetrics(legs, 1400, 2000);
    expect(m1.breakevens).toEqual(m2.breakevens);
  });
});

// ===== Consistency: Premium signs =====
describe('Premium sign consistency', () => {
  it('long option always has negative net premium (debit)', () => {
    const legs = [makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 50, lotSize: 100, lots: 3 })];
    expect(netPremium(legs)).toBeLessThan(0);
  });

  it('short option always has positive net premium (credit)', () => {
    const legs = [makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'PUT', strike: 1400, premium: 25, lotSize: 100, lots: 2 })];
    expect(netPremium(legs)).toBeGreaterThan(0);
  });
});

// ===== Consistency: Quantity not applied twice =====
describe('Quantity not applied twice', () => {
  it('legPayoff uses qty = lotSize * lots, not lotSize * lots * lots', () => {
    const leg = makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 3 });
    // At 1500: P&L = (100 - 40) * 750 = 60000, not (100-40)*750*3
    expect(legPayoff(leg, 1500)).toBe((1500 - 1400 - 40) * 250 * 3);
  });

  it('futures P&L uses qty once', () => {
    const leg = makeLeg({ instrumentType: 'FUTURE', side: 'LONG', entryPrice: 1400, lotSize: 250, lots: 2 });
    expect(legPayoff(leg, 1500)).toBe((1500 - 1400) * 250 * 2);
  });
});

// ===== Classification tests =====
describe('Classification for multi-leg', () => {
  it('classifies long straddle', () => {
    const legs = [
      makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
      makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'PUT', strike: 1400, premium: 30, lotSize: 250, lots: 1 }),
    ];
    expect(computeRiskMetrics(legs, 1400, 1400).classification).toBe('Long Straddle');
  });

  it('classifies short straddle', () => {
    const legs = [
      makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
      makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'PUT', strike: 1400, premium: 30, lotSize: 250, lots: 1 }),
    ];
    expect(computeRiskMetrics(legs, 1400, 1400).classification).toBe('Short Straddle');
  });

  it('classifies long strangle', () => {
    const legs = [
      makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1470, premium: 20, lotSize: 250, lots: 1 }),
      makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'PUT', strike: 1330, premium: 12, lotSize: 250, lots: 1 }),
    ];
    expect(computeRiskMetrics(legs, 1400, 1400).classification).toBe('Long Strangle');
  });

  it('classifies short strangle', () => {
    const legs = [
      makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1470, premium: 20, lotSize: 250, lots: 1 }),
      makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'PUT', strike: 1330, premium: 12, lotSize: 250, lots: 1 }),
    ];
    expect(computeRiskMetrics(legs, 1400, 1400).classification).toBe('Short Strangle');
  });

  it('classifies bull/bear call spread', () => {
    const legs = [
      makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
      makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1470, premium: 20, lotSize: 250, lots: 1 }),
    ];
    expect(computeRiskMetrics(legs, 1400, 1400).classification).toBe('Bull/Bear Call Spread');
  });
});

// ===== Risk/Reward ratio =====
describe('Risk/Reward ratio', () => {
  it('bull call spread has ratio = maxProfit/maxLoss = 12500/5000 = 2.5', () => {
    const legs = [
      makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
      makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1470, premium: 20, lotSize: 250, lots: 1 }),
    ];
    const metrics = computeRiskMetrics(legs, 1400, 1450);
    expect(metrics.riskRewardRatio).not.toBeNull();
    expect(metrics.riskRewardRatio).toBeCloseTo(2.5, 1);
  });

  it('long call has null ratio (unlimited profit)', () => {
    const legs = [makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 })];
    const metrics = computeRiskMetrics(legs, 1400, 1500);
    expect(metrics.riskRewardRatio).toBeNull();
  });

  it('short call has null ratio (unlimited loss)', () => {
    const legs = [makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 })];
    const metrics = computeRiskMetrics(legs, 1400, 1300);
    expect(metrics.riskRewardRatio).toBeNull();
  });
});

// ===== Futures with transaction costs =====
describe('Futures with transaction costs', () => {
  it('transaction cost reduces P&L', () => {
    const leg = makeLeg({ instrumentType: 'FUTURE', side: 'LONG', entryPrice: 1400, lotSize: 250, lots: 1, transactionCost: 500 });
    expect(legPayoff(leg, 1500)).toBe(25000 - 500);
    expect(legPayoff(leg, 1300)).toBe(-25000 - 500);
  });
});
