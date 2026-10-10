import { describe, it, expect } from 'vitest';
import { exportScenarioCSV, exportPositionsCSV, exportRiskMetricsCSV } from '@/lib/export';
import { strategyPayoff, legQuantity } from '@/lib/calcEngine';
import type { StrategyLeg } from '@/types';

function makeLeg(
  partial: Partial<StrategyLeg> & { instrumentType: StrategyLeg['instrumentType']; side: StrategyLeg['side'] }
): StrategyLeg {
  return { id: 'test-leg', lotSize: 250, lots: 1, ...partial };
}

// ===== CSV Export reflects current scenario data =====
describe('CSV export reflects scenario data', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1470, premium: 20, lotSize: 250, lots: 1 }),
  ];
  const prices = [1300, 1350, 1400, 1450, 1500];

  it('scenario CSV header is correct', () => {
    const csv = exportScenarioCSV(legs, prices);
    const lines = csv.split('\n');
    const header = lines[0].split(',');
    expect(header[0]).toBe('"Underlying Price"');
    expect(header[1]).toBe('"Total P&L"');
    expect(header[2]).toBe('"Outcome"');
    expect(header[3]).toBe('"Leg 1 P&L"');
    expect(header[4]).toBe('"Leg 2 P&L"');
  });

  it('scenario CSV values match engine output', () => {
    const csv = exportScenarioCSV(legs, prices);
    const lines = csv.split('\n');
    for (let i = 0; i < prices.length; i++) {
      const row = lines[i + 1].split(',');
      const csvPrice = parseFloat(row[0].replace(/"/g, ''));
      const csvPnl = parseFloat(row[1].replace(/"/g, ''));
      const { total } = strategyPayoff(legs, prices[i]);
      expect(csvPrice).toBeCloseTo(prices[i], 2);
      expect(csvPnl).toBeCloseTo(total, 2);
    }
  });

  it('scenario CSV outcome column is correct', () => {
    const csv = exportScenarioCSV(legs, prices);
    const lines = csv.split('\n');
    for (let i = 0; i < prices.length; i++) {
      const row = lines[i + 1].split(',');
      const outcome = row[2].replace(/"/g, '');
      const { total } = strategyPayoff(legs, prices[i]);
      const expected = total > 0 ? 'Profit' : total < 0 ? 'Loss' : 'Breakeven';
      expect(outcome).toBe(expected);
    }
  });
});

// ===== Positions CSV =====
describe('Positions CSV export', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
    makeLeg({ instrumentType: 'FUTURE', side: 'SHORT', entryPrice: 2200, lotSize: 50, lots: 2 }),
  ];

  it('header contains all expected columns', () => {
    const csv = exportPositionsCSV(legs);
    const header = csv.split('\n')[0];
    expect(header).toContain('Side');
    expect(header).toContain('Instrument');
    expect(header).toContain('Strike');
    expect(header).toContain('Premium');
    expect(header).toContain('Entry Price');
    expect(header).toContain('Quantity');
  });

  it('quantity column matches legQuantity', () => {
    const csv = exportPositionsCSV(legs);
    const lines = csv.split('\n');
    for (let i = 0; i < legs.length; i++) {
      const row = lines[i + 1].split(',');
      const qty = parseInt(row[8].replace(/"/g, ''), 10);
      expect(qty).toBe(legQuantity(legs[i]));
    }
  });
});

// ===== Risk metrics CSV =====
describe('Risk metrics CSV export', () => {
  const legs = [
    makeLeg({ instrumentType: 'OPTION', side: 'LONG', optionType: 'CALL', strike: 1400, premium: 40, lotSize: 250, lots: 1 }),
    makeLeg({ instrumentType: 'OPTION', side: 'SHORT', optionType: 'CALL', strike: 1470, premium: 20, lotSize: 250, lots: 1 }),
  ];

  it('contains key metric labels', () => {
    const csv = exportRiskMetricsCSV(
      {
        maxProfit: { value: 12500, bound: 'finite', label: '₹12,500', atPrice: 1470 },
        maxLoss: { value: -5000, bound: 'finite', label: '-₹5,000', atPrice: 1400 },
        breakevens: [{ price: 1420 }],
        netPremium: -5000,
        netDebitOrCredit: 'Net Debit',
        pnlAtSpot: -5000,
        pnlAtSelected: 12500,
        selectedPrice: 1470,
        totalQuantity: 500,
        classification: 'Bull/Bear Call Spread',
        profitRegion: [[1420, Infinity]],
        lossRegion: [[0, 1420]],
        riskRewardRatio: 2.5,
        payoffAtExpiry: -5000,
      },
      legs
    );
    expect(csv).toContain('Maximum Profit');
    expect(csv).toContain('Maximum Loss');
    expect(csv).toContain('Breakeven');
    expect(csv).toContain('Risk/Reward');
  });
});
