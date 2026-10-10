// ===== Core Financial Types =====

export type InstrumentType = 'OPTION' | 'FUTURE';
export type OptionType = 'CALL' | 'PUT';
export type Side = 'LONG' | 'SHORT';
export type InstrumentCategory = 'Stock' | 'Index' | 'Custom Instrument';

export type StrategyKey =
  | 'long_call'
  | 'short_call'
  | 'long_put'
  | 'short_put'
  | 'long_futures'
  | 'short_futures'
  | 'bull_call_spread'
  | 'bear_call_spread'
  | 'bull_put_spread'
  | 'bear_put_spread'
  | 'long_straddle'
  | 'short_straddle'
  | 'long_strangle'
  | 'short_strangle'
  | 'iron_condor'
  | 'iron_butterfly'
  | 'long_butterfly'
  | 'call_ratio_backspread'
  | 'put_ratio_backspread'
  | 'custom';

// A single position/leg in a strategy
export interface StrategyLeg {
  id: string;
  instrumentType: InstrumentType;
  side: Side;
  optionType?: OptionType; // required when instrumentType === 'OPTION'
  strike?: number; // required for options
  premium?: number; // per-unit premium for options
  entryPrice?: number; // required for futures
  lotSize: number;
  lots: number;
  transactionCost?: number; // optional per-leg transaction cost
}

// Market assumptions
export interface MarketInputs {
  instrumentName: string;
  category: InstrumentCategory;
  spotPrice: number;
  futuresEntryPrice: number;
  strikePrice: number;
  callPremium: number;
  putPremium: number;
  lotSize: number;
  lots: number;
  expiryDate: string;
}

export type Bound = 'finite' | 'unlimited';
export type Sign = 'positive' | 'negative' | 'zero';

export interface Extremum {
  value: number | null; // null when unlimited
  bound: Bound;
  label: string;
  atPrice?: number; // price at which the extremum occurs (if finite)
}

export interface BreakevenPoint {
  price: number;
}

export interface PayoffSegment {
  start: number; // price at left edge (can be -Infinity)
  end: number; // price at right edge (can be +Infinity)
  slope: number; // P&L slope per unit price
  intercept: number; // P&L at start (or the y-intercept of this linear segment)
}

export interface RiskMetrics {
  maxProfit: Extremum;
  maxLoss: Extremum;
  breakevens: BreakevenPoint[];
  netPremium: number; // total premium paid (positive = debit, negative = credit)
  netDebitOrCredit: 'Net Debit' | 'Net Credit' | 'None';
  pnlAtSpot: number;
  pnlAtSelected: number;
  selectedPrice: number;
  totalQuantity: number;
  classification: string;
  profitRegion: [number, number][]; // price ranges where P&L > 0
  lossRegion: [number, number][]; // price ranges where P&L < 0
  riskRewardRatio: number | null;
  payoffAtExpiry: number; // payoff at current spot
}

export interface PayoffPoint {
  price: number;
  pnl: number;
  legPnls: number[];
}

export interface StrategyTemplate {
  key: StrategyKey;
  name: string;
  category: 'Directional' | 'Neutral' | 'Volatility' | 'Spread' | 'Futures';
  outlook: string;
  description: string;
  legs: Omit<StrategyLeg, 'id'>[];
  maxProfitDescription: string;
  maxLossDescription: string;
  breakevenDescription: string;
  netDebitCredit: string;
  bestCase: string;
  worstCase: string;
  formula: string;
  example: string;
  risks: string;
}

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: number;
  marketInputs: MarketInputs;
  legs: StrategyLeg[];
  strategyKey: StrategyKey;
}
