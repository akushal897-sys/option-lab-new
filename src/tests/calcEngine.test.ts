import { describe, it, expect } from 'vitest';
import {
  legPayoff,
  strategyPayoff,
  legQuantity,
  netPremium,
  generatePayoffCurve,
  suggestPriceRange,
} from '@/lib/calcEngine';
import type { StrategyLeg } from '@/types';

function makeLeg(partial: Partial<StrategyLeg> & { instrumentType: StrategyLeg['instrumentType']; side: StrategyLeg['side'] }): StrategyLeg {
  return {
    id: 'test-leg',
    lotSize: 250,
    lots: 1,
    ...partial,
  };
}

describe('legQuantity', () => {
  it('computes lot size × lots', () => {
    expect(legQuantity(makeLeg({ instrumentType: 'OPTION', side: 'LONG', lotSize: 250, lots: 1 }))).toBe(250);
    expect(legQuantity(makeLeg({ instrumentType: 'OPTION', side: 'LONG', lotSize: 250, lots: 3 }))).toBe(750);
    expect(legQuantity(makeLeg({ instrumentType: 'OPTION', side: 'LONG', lotSize: 100, lots: 2 }))).toBe(200);
  });
});

// ===== Long Call =====
describe('Long Call', () => {
  const leg = makeLeg({
    instrumentType: 'OPTION',
    side: 'LONG',
    optionType: 'CALL',
    strike: 1400,
    premium: 40,
    lotSize: 250,
    lots: 1,
  });

  it('total premium = 40 × 250 = 10,000', () => {
    expect(legQuantity(leg) * (leg.premium ?? 0)).toBe(10000);
  });

  it('max loss = premium paid = -10,000 (P&L at strike)', () => {
    expect(legPayoff(leg, 1400)).toBe(-10000);
  });

  it('P&L at 1400 (at strike) = -10,000', () => {
    expect(legPayoff(leg, 1400)).toBe(-10000);
  });

  it('breakeven at 1440 → P&L = 0', () => {
    expect(legPayoff(leg, 1440)).toBe(0);
  });

  it('P&L at 1500 = (1500-1400-40) × 250 = 15,000', () => {
    expect(legPayoff(leg, 1500)).toBe(15000);
  });

  it('P&L below strike (at 1300) = -10,000 (total premium lost)', () => {
    expect(legPayoff(leg, 1300)).toBe(-10000);
  });

  it('P&L at 0 = -10,000', () => {
    expect(legPayoff(leg, 0)).toBe(-10000);
  });
});

// ===== Short Call =====
describe('Short Call', () => {
  const leg = makeLeg({
    instrumentType: 'OPTION',
    side: 'SHORT',
    optionType: 'CALL',
    strike: 1400,
    premium: 40,
    lotSize: 250,
    lots: 1,
  });

  it('max profit = premium received = 10,000 (P&L at or below strike)', () => {
    expect(legPayoff(leg, 1400)).toBe(10000);
    expect(legPayoff(leg, 1300)).toBe(10000);
  });

  it('breakeven at 1440 → P&L = 0', () => {
    expect(legPayoff(leg, 1440)).toBe(0);
  });

  it('P&L at 1500 = (40 - 100) × 250 = -15,000', () => {
    expect(legPayoff(leg, 1500)).toBe(-15000);
  });

  it('P&L at 0 = 10,000 (premium kept)', () => {
    expect(legPayoff(leg, 0)).toBe(10000);
  });
});

// ===== Long Put =====
describe('Long Put', () => {
  const leg = makeLeg({
    instrumentType: 'OPTION',
    side: 'LONG',
    optionType: 'PUT',
    strike: 1400,
    premium: 30,
    lotSize: 250,
    lots: 1,
  });

  it('max loss = premium paid = -7,500 (P&L at or above strike)', () => {
    expect(legPayoff(leg, 1400)).toBe(-7500);
    expect(legPayoff(leg, 1500)).toBe(-7500);
  });

  it('breakeven at 1370 → P&L = 0', () => {
    expect(legPayoff(leg, 1370)).toBe(0);
  });

  it('P&L at 1300 = (1400-1300-30) × 250 = 17,500', () => {
    expect(legPayoff(leg, 1300)).toBe(17500);
  });

  it('P&L at 0 = (1400-0-30) × 250 = 342,500', () => {
    expect(legPayoff(leg, 0)).toBe(342500);
  });
});

// ===== Short Put =====
describe('Short Put', () => {
  const leg = makeLeg({
    instrumentType: 'OPTION',
    side: 'SHORT',
    optionType: 'PUT',
    strike: 1400,
    premium: 30,
    lotSize: 250,
    lots: 1,
  });

  it('max profit = premium received = 7,500 (P&L at or above strike)', () => {
    expect(legPayoff(leg, 1400)).toBe(7500);
    expect(legPayoff(leg, 1500)).toBe(7500);
  });

  it('breakeven at 1370 → P&L = 0', () => {
    expect(legPayoff(leg, 1370)).toBe(0);
  });

  it('max loss at underlying = 0: (30 - 1400) × 250 = -342,500', () => {
    expect(legPayoff(leg, 0)).toBe(-342500);
  });

  it('P&L at 1300 = (30 - 100) × 250 = -17,500', () => {
    expect(legPayoff(leg, 1300)).toBe(-17500);
  });
});

// ===== Long Futures =====
describe('Long Futures', () => {
  const leg = makeLeg({
    instrumentType: 'FUTURE',
    side: 'LONG',
    entryPrice: 1400,
    lotSize: 250,
    lots: 1,
  });

  it('P&L at 1500 = (1500-1400) × 250 = 25,000', () => {
    expect(legPayoff(leg, 1500)).toBe(25000);
  });

  it('P&L at 1300 = (1300-1400) × 250 = -25,000', () => {
    expect(legPayoff(leg, 1300)).toBe(-25000);
  });

  it('breakeven at entry price → P&L = 0', () => {
    expect(legPayoff(leg, 1400)).toBe(0);
  });

  it('P&L at 0 = -350,000', () => {
    expect(legPayoff(leg, 0)).toBe(-350000);
  });
});

// ===== Short Futures =====
describe('Short Futures', () => {
  const leg = makeLeg({
    instrumentType: 'FUTURE',
    side: 'SHORT',
    entryPrice: 1400,
    lotSize: 250,
    lots: 1,
  });

  it('P&L at 1300 = (1400-1300) × 250 = 25,000', () => {
    expect(legPayoff(leg, 1300)).toBe(25000);
  });

  it('P&L at 1500 = (1400-1500) × 250 = -25,000', () => {
    expect(legPayoff(leg, 1500)).toBe(-25000);
  });

  it('breakeven at entry price → P&L = 0', () => {
    expect(legPayoff(leg, 1400)).toBe(0);
  });

  it('P&L at 0 = 350,000', () => {
    expect(legPayoff(leg, 0)).toBe(350000);
  });
});

// ===== Multi-leg: Bull Call Spread =====
describe('Bull Call Spread', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1470, premium: 20, lotSize: 250, lots: 1 }),
  ];

  it('net debit = (40 - 20) × 250 = 5,000', () => {
    const np = netPremium(legs);
    // netPremium returns negative for debit
    expect(np).toBe(-5000);
  });

  it('P&L below both strikes = -5,000 (net debit lost)', () => {
    expect(strategyPayoff(legs, 1300).total).toBe(-5000);
  });

  it('P&L at 1400 = -5,000 (long call worthless, short call premium kept)', () => {
    expect(strategyPayoff(legs, 1400).total).toBe(-5000);
  });

  it('P&L at 1470 = (70 - 40) × 250 = 7,500... wait let me compute', () => {
    // Long call: (1470-1400-40)*250 = 30*250 = 7500
    // Short call: (20 - max(1470-1470,0))*250 = 20*250 = 5000
    // Total = 7500 + 5000 = 12,500... no
    // Actually: Long call P&L = (max(1470-1400,0) - 40)*250 = (70-40)*250 = 7500
    // Short call P&L = (20 - max(1470-1470,0))*250 = (20-0)*250 = 5000
    // Total = 7500 + 5000 = 12,500
    // Wait, that's wrong. At 1470, short call has 0 intrinsic.
    // So short call P&L = (20 - 0)*250 = 5000
    // Long call P&L = (70 - 40)*250 = 7500
    // Total = 12500
    // Hmm, but max profit should be (1470-1400)*250 - 5000 = 70*250 - 5000 = 17500 - 5000 = 12500
    // Yes, 12500 is correct!
    expect(strategyPayoff(legs, 1470).total).toBe(12500);
  });

  it('P&L above both strikes = max profit = 12,500', () => {
    expect(strategyPayoff(legs, 1500).total).toBe(12500);
  });

  it('breakeven at 1420 → P&L = 0', () => {
    // Long call: (max(1420-1400,0) - 40)*250 = (20-40)*250 = -5000
    // Short call: (20 - max(1420-1470,0))*250 = (20-0)*250 = 5000
    // Total = 0
    expect(strategyPayoff(legs, 1420).total).toBe(0);
  });
});

// ===== Unequal leg quantities =====
describe('Unequal leg quantities', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1500, premium: 20, lotSize: 250, lots: 2 }),
  ];

  it('long leg qty = 250, short leg qty = 500', () => {
    expect(legQuantity(legs[0])).toBe(250);
    expect(legQuantity(legs[1])).toBe(500);
  });

  it('P&L at 1600: long=(1600-1400-40)*250=40000, short=(20-100)*500=-40000, total=0', () => {
    const longPnl = (1600 - 1400 - 40) * 250; // 160 * 250 = 40000
    const shortPnl = (20 - Math.max(1600 - 1500, 0)) * 500; // (20-100)*500 = -40000
    expect(longPnl).toBe(40000);
    expect(shortPnl).toBe(-40000);
    expect(strategyPayoff(legs, 1600).total).toBe(0);
  });
});

// ===== Zero premium =====
describe('Zero premium', () => {
  it('long call with zero premium: P&L at strike = 0', () => {
    const leg = makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 0, lotSize: 250, lots: 1 });
    expect(legPayoff(leg, 1400)).toBe(0);
    expect(legPayoff(leg, 1500)).toBe(25000);
  });

  it('short put with zero premium: P&L at strike = 0, P&L at 0 = -350,000', () => {
    const leg = makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'PUT', strike: 1400, premium: 0, lotSize: 250, lots: 1 });
    expect(legPayoff(leg, 1400)).toBe(0);
    expect(legPayoff(leg, 0)).toBe(-350000);
  });
});

// ===== Net premium (debit/credit) =====
describe('Net premium', () => {
  it('long call only = net debit (negative)', () => {
    const legs = [makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 })];
    expect(netPremium(legs)).toBe(-10000);
  });

  it('short call only = net credit (positive)', () => {
    const legs = [makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 })];
    expect(netPremium(legs)).toBe(10000);
  });

  it('bull call spread = net debit', () => {
    const legs = [
      makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
      makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1470, premium: 20, lotSize: 250, lots: 1 }),
    ];
    expect(netPremium(legs)).toBe(-5000);
  });

  it('futures have no premium', () => {
    const legs = [makeLeg({ instrumentType: 'FUTURE', side: 'LONG', entryPrice: 1400, lotSize: 250, lots: 1 })];
    expect(netPremium(legs)).toBe(0);
  });
});

// ===== Payoff curve generation =====
describe('generatePayoffCurve', () => {
  it('generates correct number of points', () => {
    const legs = [makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 })];
    const curve = generatePayoffCurve(legs, 1000, 1800, 50);
    expect(curve).toHaveLength(50);
    expect(curve[0].price).toBe(1000);
    expect(curve[49].price).toBeCloseTo(1800, 1);
  });

  it('each point has legPnls array', () => {
    const legs = [
      makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
      makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1470, premium: 20, lotSize: 250, lots: 1 }),
    ];
    const curve = generatePayoffCurve(legs, 1000, 1800, 10);
    expect(curve[0].legPnls).toHaveLength(2);
  });
});

// ===== Price range suggestion =====
describe('suggestPriceRange', () => {
  it('returns range around spot and strikes', () => {
    const range = suggestPriceRange(1400, [1400, 1470]);
    expect(range.min).toBeLessThan(1400);
    expect(range.max).toBeGreaterThan(1470);
  });

  it('handles empty strikes', () => {
    const range = suggestPriceRange(1400, []);
    expect(range.min).toBeLessThan(1400);
    expect(range.max).toBeGreaterThan(1400);
  });
});

// ===== Transaction costs =====
describe('Transaction costs', () => {
  it('subtracts transaction cost from P&L', () => {
    const leg = makeLeg({
      instrumentType: 'OPTION',
      side: 'LONG',
      optionType: 'CALL',
      strike: 1400,
      premium: 40,
      lotSize: 250,
      lots: 1,
      transactionCost: 100,
    });
    // Normal P&L at 1500 = 15000, with cost = 14900
    expect(legPayoff(leg, 1500)).toBe(14900);
    // Normal P&L at 1400 = -10000, with cost = -10100
    expect(legPayoff(leg, 1400)).toBe(-10100);
  });
});

// ===== Numerical precision near breakeven =====
describe('Numerical precision near breakeven', () => {
  it('long call breakeven at 1440 is very close to 0', () => {
    const leg = makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 });
    const pnl = legPayoff(leg, 1440);
    expect(Math.abs(pnl)).toBeLessThan(1e-9);
  });

  it('short put breakeven at 1370 is very close to 0', () => {
    const leg = makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'PUT', strike: 1400, premium: 30, lotSize: 250, lots: 1 });
    const pnl = legPayoff(leg, 1370);
    expect(Math.abs(pnl)).toBeLessThan(1e-9);
  });
});
