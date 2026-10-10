import { describe, it, expect } from 'vitest';
import { computeRiskMetrics } from '@/lib/riskEngine';
import type { StrategyLeg } from '@/types';

function makeLeg(partial: Partial<StrategyLeg> & { instrumentType: StrategyLeg['instrumentType']; side: StrategyLeg['side'] }): StrategyLeg {
  return {
    id: 'test-leg',
    lotSize: 250,
    lots: 1,
    ...partial,
  };
}

// ===== Long Call: Risk Metrics =====
describe('Long Call risk metrics', () => {
  const legs = [makeLeg({
    instrumentType: 'OPTION',
    side: 'LONG',
    optionType: 'CALL',
    strike: 1400,
    premium: 40,
    lotSize: 250,
    lots: 1,
  })];

  const metrics = computeRiskMetrics(legs, 1400, 1500);

  it('max loss = -10,000 (finite, at strike)', () => {
    expect(metrics.maxLoss.bound).toBe('finite');
    expect(metrics.maxLoss.value).toBe(-10000);
  });

  it('max profit = unlimited', () => {
    expect(metrics.maxProfit.bound).toBe('unlimited');
    expect(metrics.maxProfit.label).toContain('Unlimited');
  });

  it('breakeven = 1440', () => {
    expect(metrics.breakevens).toHaveLength(1);
    expect(metrics.breakevens[0].price).toBeCloseTo(1440, 1);
  });

  it('net debit', () => {
    expect(metrics.netDebitOrCredit).toBe('Net Debit');
  });

  it('P&L at selected price 1500 = 15,000', () => {
    expect(metrics.pnlAtSelected).toBe(15000);
  });
});

// ===== Short Call: Risk Metrics =====
describe('Short Call risk metrics', () => {
  const legs = [makeLeg({
    instrumentType: 'OPTION',
    side: 'SHORT',
    optionType: 'CALL',
    strike: 1400,
    premium: 40,
    lotSize: 250,
    lots: 1,
  })];

  const metrics = computeRiskMetrics(legs, 1400, 1500);

  it('max profit = 10,000 (finite)', () => {
    expect(metrics.maxProfit.bound).toBe('finite');
    expect(metrics.maxProfit.value).toBe(10000);
  });

  it('max loss = unlimited', () => {
    expect(metrics.maxLoss.bound).toBe('unlimited');
    expect(metrics.maxLoss.label).toContain('Unlimited');
  });

  it('breakeven = 1440', () => {
    expect(metrics.breakevens).toHaveLength(1);
    expect(metrics.breakevens[0].price).toBeCloseTo(1440, 1);
  });

  it('net credit', () => {
    expect(metrics.netDebitOrCredit).toBe('Net Credit');
  });
});

// ===== Long Put: Risk Metrics =====
describe('Long Put risk metrics', () => {
  const legs = [makeLeg({
    instrumentType: 'OPTION',
    side: 'LONG',
    optionType: 'PUT',
    strike: 1400,
    premium: 30,
    lotSize: 250,
    lots: 1,
  })];

  const metrics = computeRiskMetrics(legs, 1400, 1300);

  it('max loss = -7,500 (finite, at strike and above)', () => {
    expect(metrics.maxLoss.bound).toBe('finite');
    expect(metrics.maxLoss.value).toBe(-7500);
  });

  it('max profit = finite (at price 0)', () => {
    expect(metrics.maxProfit.bound).toBe('finite');
    expect(metrics.maxProfit.value).toBe(342500);
  });

  it('breakeven = 1370', () => {
    expect(metrics.breakevens).toHaveLength(1);
    expect(metrics.breakevens[0].price).toBeCloseTo(1370, 1);
  });
});

// ===== Short Put: Risk Metrics =====
describe('Short Put risk metrics', () => {
  const legs = [makeLeg({
    instrumentType: 'OPTION',
    side: 'SHORT',
    optionType: 'PUT',
    strike: 1400,
    premium: 30,
    lotSize: 250,
    lots: 1,
  })];

  const metrics = computeRiskMetrics(legs, 1400, 1300);

  it('max profit = 7,500 (finite)', () => {
    expect(metrics.maxProfit.bound).toBe('finite');
    expect(metrics.maxProfit.value).toBe(7500);
  });

  it('max loss = -342,500 (finite, at price 0)', () => {
    expect(metrics.maxLoss.bound).toBe('finite');
    expect(metrics.maxLoss.value).toBe(-342500);
  });

  it('breakeven = 1370', () => {
    expect(metrics.breakevens).toHaveLength(1);
    expect(metrics.breakevens[0].price).toBeCloseTo(1370, 1);
  });

  it('net credit', () => {
    expect(metrics.netDebitOrCredit).toBe('Net Credit');
  });
});

// ===== Long Futures: Risk Metrics =====
describe('Long Futures risk metrics', () => {
  const legs = [makeLeg({
    instrumentType: 'FUTURE',
    side: 'LONG',
    entryPrice: 1400,
    lotSize: 250,
    lots: 1,
  })];

  const metrics = computeRiskMetrics(legs, 1400, 1500);

  it('max profit = unlimited', () => {
    expect(metrics.maxProfit.bound).toBe('unlimited');
  });

  it('max loss = finite (at price 0)', () => {
    expect(metrics.maxLoss.bound).toBe('finite');
    expect(metrics.maxLoss.value).toBe(-350000);
  });

  it('breakeven = 1400 (entry price)', () => {
    expect(metrics.breakevens).toHaveLength(1);
    expect(metrics.breakevens[0].price).toBeCloseTo(1400, 1);
  });
});

// ===== Short Futures: Risk Metrics =====
describe('Short Futures risk metrics', () => {
  const legs = [makeLeg({
    instrumentType: 'FUTURE',
    side: 'SHORT',
    entryPrice: 1400,
    lotSize: 250,
    lots: 1,
  })];

  const metrics = computeRiskMetrics(legs, 1400, 1300);

  it('max profit = finite (at price 0)', () => {
    expect(metrics.maxProfit.bound).toBe('finite');
    expect(metrics.maxProfit.value).toBe(350000);
  });

  it('max loss = unlimited', () => {
    expect(metrics.maxLoss.bound).toBe('unlimited');
  });

  it('breakeven = 1400 (entry price)', () => {
    expect(metrics.breakevens).toHaveLength(1);
    expect(metrics.breakevens[0].price).toBeCloseTo(1400, 1);
  });
});

// ===== Bull Call Spread: Risk Metrics =====
describe('Bull Call Spread risk metrics', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1470, premium: 20, lotSize: 250, lots: 1 }),
  ];

  const metrics = computeRiskMetrics(legs, 1400, 1450);

  it('max profit = finite = 12,500', () => {
    expect(metrics.maxProfit.bound).toBe('finite');
    expect(metrics.maxProfit.value).toBe(12500);
  });

  it('max loss = finite = -5,000', () => {
    expect(metrics.maxLoss.bound).toBe('finite');
    expect(metrics.maxLoss.value).toBe(-5000);
  });

  it('breakeven = 1420', () => {
    expect(metrics.breakevens).toHaveLength(1);
    expect(metrics.breakevens[0].price).toBeCloseTo(1420, 1);
  });

  it('net debit', () => {
    expect(metrics.netDebitOrCredit).toBe('Net Debit');
  });

  it('risk/reward ratio = 5000/12500 = 0.4 (reward:risk = 2.5)', () => {
    expect(metrics.riskRewardRatio).not.toBeNull();
    if (metrics.riskRewardRatio) {
      expect(metrics.riskRewardRatio).toBeCloseTo(2.5, 1);
    }
  });
});

// ===== Long Straddle: Risk Metrics =====
describe('Long Straddle risk metrics', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'PUT', strike: 1400, premium: 30, lotSize: 250, lots: 1 }),
  ];

  const metrics = computeRiskMetrics(legs, 1400, 1500);

  it('max profit = unlimited (call side unbounded)', () => {
    expect(metrics.maxProfit.bound).toBe('unlimited');
  });

  it('max loss = finite = -(40+30)*250 = -17,500', () => {
    expect(metrics.maxLoss.bound).toBe('finite');
    expect(metrics.maxLoss.value).toBe(-17500);
  });

  it('two breakevens: 1330 and 1470', () => {
    expect(metrics.breakevens).toHaveLength(2);
    expect(metrics.breakevens[0].price).toBeCloseTo(1330, 0);
    expect(metrics.breakevens[1].price).toBeCloseTo(1470, 0);
  });
});

// ===== Short Straddle: Risk Metrics =====
describe('Short Straddle risk metrics', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'PUT', strike: 1400, premium: 30, lotSize: 250, lots: 1 }),
  ];

  const metrics = computeRiskMetrics(legs, 1400, 1500);

  it('max profit = finite = 17,500 (at strike)', () => {
    expect(metrics.maxProfit.bound).toBe('finite');
    expect(metrics.maxProfit.value).toBe(17500);
  });

  it('max loss = unlimited (short call side)', () => {
    expect(metrics.maxLoss.bound).toBe('unlimited');
  });

  it('two breakevens: 1330 and 1470', () => {
    expect(metrics.breakevens).toHaveLength(2);
    expect(metrics.breakevens[0].price).toBeCloseTo(1330, 0);
    expect(metrics.breakevens[1].price).toBeCloseTo(1470, 0);
  });
});

// ===== Iron Condor: Risk Metrics =====
describe('Iron Condor risk metrics', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'PUT', strike: 1260, premium: 5, lotSize: 50, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'PUT', strike: 1330, premium: 15, lotSize: 50, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1470, premium: 15, lotSize: 50, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1540, premium: 5, lotSize: 50, lots: 1 }),
  ];

  const metrics = computeRiskMetrics(legs, 1400, 1400);

  it('max profit = finite (net credit)', () => {
    expect(metrics.maxProfit.bound).toBe('finite');
    // Net credit = (15+15-5-5)*50 = 20*50 = 1000
    expect(metrics.maxProfit.value).toBe(1000);
  });

  it('max loss = finite (width - credit)', () => {
    expect(metrics.maxLoss.bound).toBe('finite');
    // Width = 70, per unit loss = 70 - 20 = 50, total = 50*50 = 2500
    expect(metrics.maxLoss.value).toBe(-2500);
  });

  it('both max profit and max loss are finite', () => {
    expect(metrics.maxProfit.bound).toBe('finite');
    expect(metrics.maxLoss.bound).toBe('finite');
  });
});

// ===== Empty strategy =====
describe('Empty strategy', () => {
  const metrics = computeRiskMetrics([], 1400, 1400);

  it('all metrics are zero/empty', () => {
    expect(metrics.maxProfit.value).toBe(0);
    expect(metrics.maxLoss.value).toBe(0);
    expect(metrics.breakevens).toHaveLength(0);
    expect(metrics.classification).toBe('No positions');
  });
});

// ===== Chart range independence =====
describe('Chart range independence', () => {
  const legs = [makeLeg({
    instrumentType: 'OPTION',
    side: 'LONG',
    optionType: 'CALL',
    strike: 1400,
    premium: 40,
    lotSize: 250,
    lots: 1,
  })];

  it('max profit is unlimited regardless of selected price', () => {
    const m1 = computeRiskMetrics(legs, 1400, 1300);
    const m2 = computeRiskMetrics(legs, 1400, 2000);
    expect(m1.maxProfit.bound).toBe('unlimited');
    expect(m2.maxProfit.bound).toBe('unlimited');
  });

  it('max loss is -10,000 regardless of selected price', () => {
    const m1 = computeRiskMetrics(legs, 1400, 1300);
    const m2 = computeRiskMetrics(legs, 1400, 2000);
    expect(m1.maxLoss.value).toBe(-10000);
    expect(m2.maxLoss.value).toBe(-10000);
  });

  it('breakeven is 1440 regardless of selected price', () => {
    const m1 = computeRiskMetrics(legs, 1400, 1300);
    const m2 = computeRiskMetrics(legs, 1400, 2000);
    expect(m1.breakevens[0].price).toBeCloseTo(1440, 1);
    expect(m2.breakevens[0].price).toBeCloseTo(1440, 1);
  });
});

// ===== Classification =====
describe('Strategy classification', () => {
  it('classifies single long call', () => {
    const legs = [makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 })];
    expect(computeRiskMetrics(legs, 1400, 1400).classification).toBe('Long Call');
  });

  it('classifies short put', () => {
    const legs = [makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'PUT', strike: 1400, premium: 30, lotSize: 250, lots: 1 })];
    expect(computeRiskMetrics(legs, 1400, 1400).classification).toBe('Short Put');
  });

  it('classifies long futures', () => {
    const legs = [makeLeg({ instrumentType: 'FUTURE', side: 'LONG', entryPrice: 1400, lotSize: 250, lots: 1 })];
    expect(computeRiskMetrics(legs, 1400, 1400).classification).toBe('Long Futures');
  });

  it('classifies short futures', () => {
    const legs = [makeLeg({ instrumentType: 'FUTURE', side: 'SHORT', entryPrice: 1400, lotSize: 250, lots: 1 })];
    expect(computeRiskMetrics(legs, 1400, 1400).classification).toBe('Short Futures');
  });
});
