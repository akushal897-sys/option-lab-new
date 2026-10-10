import type { StrategyLeg, StrategyTemplate, StrategyKey, MarketInputs } from '@/types';

let legIdCounter = 0;
export function generateLegId(): string {
  legIdCounter += 1;
  return `leg-${Date.now()}-${legIdCounter}`;
}

export function createLeg(
  partial: Partial<StrategyLeg> & {
    instrumentType: StrategyLeg['instrumentType'];
    side: StrategyLeg['side'];
  }
): StrategyLeg {
  return {
    id: generateLegId(),
    lotSize: partial.lotSize ?? 250,
    lots: partial.lots ?? 1,
    instrumentType: partial.instrumentType,
    side: partial.side,
    optionType: partial.optionType,
    strike: partial.strike,
    premium: partial.premium,
    entryPrice: partial.entryPrice,
    transactionCost: partial.transactionCost,
  };
}

/**
 * Create legs from a market inputs template and a strategy key.
 */
export function createLegsFromTemplate(
  key: StrategyKey,
  inputs: MarketInputs
): StrategyLeg[] {
  const {
    strikePrice,
    callPremium,
    putPremium,
    lotSize,
    lots,
    futuresEntryPrice,
  } = inputs;

  const mk = (
    instrumentType: StrategyLeg['instrumentType'],
    side: StrategyLeg['side'],
    extra: Partial<StrategyLeg> = {}
  ): StrategyLeg =>
    createLeg({
      instrumentType,
      side,
      lotSize,
      lots,
      ...extra,
    });

  const strikeLow = strikePrice;
  const strikeHigh = Math.round(strikePrice * 1.05);
  const strikeLower = Math.round(strikePrice * 0.95);

  switch (key) {
    case 'long_call':
      return [mk('OPTION', 'LONG', { optionType: 'CALL', strike: strikePrice, premium: callPremium })];

    case 'short_call':
      return [mk('OPTION', 'SHORT', { optionType: 'CALL', strike: strikePrice, premium: callPremium })];

    case 'long_put':
      return [mk('OPTION', 'LONG', { optionType: 'PUT', strike: strikePrice, premium: putPremium })];

    case 'short_put':
      return [mk('OPTION', 'SHORT', { optionType: 'PUT', strike: strikePrice, premium: putPremium })];

    case 'long_futures':
      return [mk('FUTURE', 'LONG', { entryPrice: futuresEntryPrice })];

    case 'short_futures':
      return [mk('FUTURE', 'SHORT', { entryPrice: futuresEntryPrice })];

    case 'bull_call_spread':
      return [
        mk('OPTION', 'LONG', { optionType: 'CALL', strike: strikeLow, premium: callPremium }),
        mk('OPTION', 'SHORT', { optionType: 'CALL', strike: strikeHigh, premium: Math.round(callPremium * 0.5) }),
      ];

    case 'bear_call_spread':
      return [
        mk('OPTION', 'SHORT', { optionType: 'CALL', strike: strikeLow, premium: callPremium }),
        mk('OPTION', 'LONG', { optionType: 'CALL', strike: strikeHigh, premium: Math.round(callPremium * 0.5) }),
      ];

    case 'bull_put_spread':
      return [
        mk('OPTION', 'LONG', { optionType: 'PUT', strike: strikeLower, premium: Math.round(putPremium * 0.5) }),
        mk('OPTION', 'SHORT', { optionType: 'PUT', strike: strikePrice, premium: putPremium }),
      ];

    case 'bear_put_spread':
      return [
        mk('OPTION', 'LONG', { optionType: 'PUT', strike: strikePrice, premium: putPremium }),
        mk('OPTION', 'SHORT', { optionType: 'PUT', strike: strikeLower, premium: Math.round(putPremium * 0.5) }),
      ];

    case 'long_straddle':
      return [
        mk('OPTION', 'LONG', { optionType: 'CALL', strike: strikePrice, premium: callPremium }),
        mk('OPTION', 'LONG', { optionType: 'PUT', strike: strikePrice, premium: putPremium }),
      ];

    case 'short_straddle':
      return [
        mk('OPTION', 'SHORT', { optionType: 'CALL', strike: strikePrice, premium: callPremium }),
        mk('OPTION', 'SHORT', { optionType: 'PUT', strike: strikePrice, premium: putPremium }),
      ];

    case 'long_strangle':
      return [
        mk('OPTION', 'LONG', { optionType: 'CALL', strike: strikeHigh, premium: Math.round(callPremium * 0.6) }),
        mk('OPTION', 'LONG', { optionType: 'PUT', strike: strikeLower, premium: Math.round(putPremium * 0.6) }),
      ];

    case 'short_strangle':
      return [
        mk('OPTION', 'SHORT', { optionType: 'CALL', strike: strikeHigh, premium: Math.round(callPremium * 0.6) }),
        mk('OPTION', 'SHORT', { optionType: 'PUT', strike: strikeLower, premium: Math.round(putPremium * 0.6) }),
      ];

    case 'iron_condor':
      return [
        mk('OPTION', 'LONG', { optionType: 'PUT', strike: Math.round(strikePrice * 0.9), premium: Math.round(putPremium * 0.3) }),
        mk('OPTION', 'SHORT', { optionType: 'PUT', strike: strikeLower, premium: Math.round(putPremium * 0.6) }),
        mk('OPTION', 'SHORT', { optionType: 'CALL', strike: strikeHigh, premium: Math.round(callPremium * 0.6) }),
        mk('OPTION', 'LONG', { optionType: 'CALL', strike: Math.round(strikePrice * 1.1), premium: Math.round(callPremium * 0.3) }),
      ];

    case 'iron_butterfly':
      return [
        mk('OPTION', 'LONG', { optionType: 'PUT', strike: strikeLower, premium: Math.round(putPremium * 0.5) }),
        mk('OPTION', 'SHORT', { optionType: 'PUT', strike: strikePrice, premium: putPremium }),
        mk('OPTION', 'SHORT', { optionType: 'CALL', strike: strikePrice, premium: callPremium }),
        mk('OPTION', 'LONG', { optionType: 'CALL', strike: strikeHigh, premium: Math.round(callPremium * 0.5) }),
      ];

    case 'long_butterfly':
      return [
        mk('OPTION', 'LONG', { optionType: 'CALL', strike: strikeLow, premium: callPremium }),
        mk('OPTION', 'SHORT', { optionType: 'CALL', strike: strikePrice, premium: Math.round(callPremium * 0.7), lots: lots * 2 }),
        mk('OPTION', 'LONG', { optionType: 'CALL', strike: strikeHigh, premium: Math.round(callPremium * 0.4) }),
      ];

    case 'call_ratio_backspread':
      return [
        mk('OPTION', 'SHORT', { optionType: 'CALL', strike: strikeLow, premium: callPremium, lots: lots }),
        mk('OPTION', 'LONG', { optionType: 'CALL', strike: strikeHigh, premium: Math.round(callPremium * 0.5), lots: lots * 2 }),
      ];

    case 'put_ratio_backspread':
      return [
        mk('OPTION', 'SHORT', { optionType: 'PUT', strike: strikeHigh, premium: putPremium, lots: lots }),
        mk('OPTION', 'LONG', { optionType: 'PUT', strike: strikeLower, premium: Math.round(putPremium * 0.5), lots: lots * 2 }),
      ];

    case 'custom':
      return [mk('OPTION', 'LONG', { optionType: 'CALL', strike: strikePrice, premium: callPremium })];

    default:
      return [];
  }
}

export const strategyTemplates: StrategyTemplate[] = [
  {
    key: 'long_call',
    name: 'Long Call',
    category: 'Directional',
    outlook: 'Bullish — expect the underlying to rise significantly.',
    description: 'Buy a call option. Profit if the underlying rises above the strike plus premium paid.',
    legs: [],
    maxProfitDescription: 'Unlimited theoretical profit (underlying can rise without bound).',
    maxLossDescription: 'Limited to the total premium paid.',
    breakevenDescription: 'Strike + Premium per unit.',
    netDebitCredit: 'Net Debit',
    bestCase: 'Underlying rises well above the breakeven; profit grows linearly.',
    worstCase: 'Underlying stays below strike; lose entire premium.',
    formula: 'P&L = [max(ST − K, 0) − C] × Q',
    example: 'Buy 1 call at ₹1,400, premium ₹40, lot 250. Breakeven = ₹1,440. Max loss = ₹10,000.',
    risks: 'Time decay works against you. Lose 100% of premium if ITM but below breakeven.',
  },
  {
    key: 'short_call',
    name: 'Short Call',
    category: 'Directional',
    outlook: 'Bearish to neutral — expect the underlying to stay below the strike.',
    description: 'Sell a call option. Keep the premium if the underlying stays below strike.',
    legs: [],
    maxProfitDescription: 'Limited to the total premium received.',
    maxLossDescription: 'Unlimited theoretical loss (underlying can rise without bound).',
    breakevenDescription: 'Strike + Premium per unit.',
    netDebitCredit: 'Net Credit',
    bestCase: 'Underlying stays below strike; keep full premium.',
    worstCase: 'Underlying rises sharply; losses are theoretically unlimited.',
    formula: 'P&L = [C − max(ST − K, 0)] × Q',
    example: 'Sell 1 call at ₹1,400, premium ₹40, lot 250. Breakeven = ₹1,440. Max profit = ₹10,000.',
    risks: 'Unlimited loss potential. Requires margin. Early assignment risk.',
  },
  {
    key: 'long_put',
    name: 'Long Put',
    category: 'Directional',
    outlook: 'Bearish — expect the underlying to fall significantly.',
    description: 'Buy a put option. Profit if the underlying falls below the strike minus premium.',
    legs: [],
    maxProfitDescription: 'Large but finite — maximum if underlying goes to zero.',
    maxLossDescription: 'Limited to the total premium paid.',
    breakevenDescription: 'Strike − Premium per unit.',
    netDebitCredit: 'Net Debit',
    bestCase: 'Underlying falls well below breakeven.',
    worstCase: 'Underlying stays above strike; lose entire premium.',
    formula: 'P&L = [max(K − ST, 0) − P] × Q',
    example: 'Buy 1 put at ₹1,400, premium ₹30, lot 250. Breakeven = ₹1,370. Max loss = ₹7,500.',
    risks: 'Time decay works against you. Maximum profit is bounded by underlying reaching zero.',
  },
  {
    key: 'short_put',
    name: 'Short Put',
    category: 'Directional',
    outlook: 'Bullish to neutral — expect the underlying to stay above the strike.',
    description: 'Sell a put option. Keep the premium if the underlying stays above strike.',
    legs: [],
    maxProfitDescription: 'Limited to the total premium received.',
    maxLossDescription: 'Large but finite — maximum if underlying goes to zero.',
    breakevenDescription: 'Strike − Premium per unit.',
    netDebitCredit: 'Net Credit',
    bestCase: 'Underlying stays above strike; keep full premium.',
    worstCase: 'Underlying falls to zero; loss = (Strike × Q) − Premium received.',
    formula: 'P&L = [P − max(K − ST, 0)] × Q',
    example: 'Sell 1 put at ₹1,400, premium ₹30, lot 250. Breakeven = ₹1,370. Max profit = ₹7,500. Max loss at zero = ₹3,42,500.',
    risks: 'Large loss potential. Requires margin. Assignment risk if ITM.',
  },
  {
    key: 'long_futures',
    name: 'Long Futures',
    category: 'Futures',
    outlook: 'Bullish — expect the underlying to rise.',
    description: 'Buy a futures contract. Profit increases linearly as the underlying rises.',
    legs: [],
    maxProfitDescription: 'Unlimited theoretical profit.',
    maxLossDescription: 'Large but finite — maximum if underlying goes to zero.',
    breakevenDescription: 'Futures entry price.',
    netDebitCredit: 'None',
    bestCase: 'Underlying rises significantly above entry.',
    worstCase: 'Underlying falls to zero.',
    formula: 'P&L = (ST − Entry) × Q',
    example: 'Long futures at ₹1,400, lot 250. Price rises to ₹1,500 → P&L = ₹25,000.',
    risks: 'Margin calls. Leverage amplifies both gains and losses.',
  },
  {
    key: 'short_futures',
    name: 'Short Futures',
    category: 'Futures',
    outlook: 'Bearish — expect the underlying to fall.',
    description: 'Sell a futures contract. Profit increases linearly as the underlying falls.',
    legs: [],
    maxProfitDescription: 'Large but finite — maximum if underlying goes to zero.',
    maxLossDescription: 'Unlimited theoretical loss.',
    breakevenDescription: 'Futures entry price.',
    netDebitCredit: 'None',
    bestCase: 'Underlying falls significantly below entry.',
    worstCase: 'Underlying rises without bound.',
    formula: 'P&L = (Entry − ST) × Q',
    example: 'Short futures at ₹1,400, lot 250. Price falls to ₹1,300 → P&L = ₹25,000.',
    risks: 'Unlimited loss. Margin calls. Leverage amplifies both gains and losses.',
  },
  {
    key: 'bull_call_spread',
    name: 'Bull Call Spread',
    category: 'Spread',
    outlook: 'Moderately bullish — expect a rise but want to cap cost.',
    description: 'Buy a call at a lower strike and sell a call at a higher strike.',
    legs: [],
    maxProfitDescription: 'Finite — (Higher Strike − Lower Strike) × Q − Net Premium.',
    maxLossDescription: 'Limited to the net premium paid.',
    breakevenDescription: 'Lower Strike + Net Premium per unit.',
    netDebitCredit: 'Net Debit',
    bestCase: 'Underlying closes at or above the higher strike.',
    worstCase: 'Underlying stays below both strikes; lose net premium.',
    formula: 'P&L = [max(ST − K1, 0) − C1] × Q1 + [C2 − max(ST − K2, 0)] × Q2',
    example: 'Buy call @ ₹1,400 (₹40), sell call @ ₹1,470 (₹20), lot 250. Max profit = ₹2,500. Max loss = ₹5,000.',
    risks: 'Capped upside. If underlying rockets past the higher strike, you don\'t benefit further.',
  },
  {
    key: 'bear_call_spread',
    name: 'Bear Call Spread',
    category: 'Spread',
    outlook: 'Moderately bearish — expect a decline or stability.',
    description: 'Sell a call at a lower strike and buy a call at a higher strike.',
    legs: [],
    maxProfitDescription: 'Limited to the net premium received.',
    maxLossDescription: 'Finite — (Higher Strike − Lower Strike) × Q − Net Premium.',
    breakevenDescription: 'Lower Strike + Net Premium per unit.',
    netDebitCredit: 'Net Credit',
    bestCase: 'Underlying stays below the lower strike.',
    worstCase: 'Underlying rises above the higher strike.',
    formula: 'P&L = [C1 − max(ST − K1, 0)] × Q1 + [max(ST − K2, 0) − C2] × Q2',
    example: 'Sell call @ ₹1,400 (₹40), buy call @ ₹1,470 (₹20), lot 250. Max profit = ₹5,000. Max loss = ₹2,500.',
    risks: 'Capped profit. Losses if underlying rises significantly.',
  },
  {
    key: 'bull_put_spread',
    name: 'Bull Put Spread',
    category: 'Spread',
    outlook: 'Moderately bullish — expect the underlying to hold above a level.',
    description: 'Buy a put at a lower strike and sell a put at a higher strike.',
    legs: [],
    maxProfitDescription: 'Limited to the net premium received.',
    maxLossDescription: 'Finite — (Higher Strike − Lower Strike) × Q − Net Premium.',
    breakevenDescription: 'Higher Strike − Net Premium per unit.',
    netDebitCredit: 'Net Credit',
    bestCase: 'Underlying stays above the higher strike.',
    worstCase: 'Underlying falls below the lower strike.',
    formula: 'P&L = [P1 − max(K1 − ST, 0)] × Q1 + [max(K2 − ST, 0) − P2] × Q2',
    example: 'Sell put @ ₹1,400 (₹30), buy put @ ₹1,330 (₹12), lot 250. Max profit = ₹4,500. Max loss = ₹3,000.',
    risks: 'Capped profit. Losses if underlying falls significantly.',
  },
  {
    key: 'bear_put_spread',
    name: 'Bear Put Spread',
    category: 'Spread',
    outlook: 'Moderately bearish — expect a decline but want to cap cost.',
    description: 'Buy a put at a higher strike and sell a put at a lower strike.',
    legs: [],
    maxProfitDescription: 'Finite — (Higher Strike − Lower Strike) × Q − Net Premium.',
    maxLossDescription: 'Limited to the net premium paid.',
    breakevenDescription: 'Higher Strike − Net Premium per unit.',
    netDebitCredit: 'Net Debit',
    bestCase: 'Underlying falls to or below the lower strike.',
    worstCase: 'Underlying stays above both strikes.',
    formula: 'P&L = [max(K1 − ST, 0) − P1] × Q1 + [P2 − max(K2 − ST, 0)] × Q2',
    example: 'Buy put @ ₹1,400 (₹30), sell put @ ₹1,330 (₹12), lot 250. Max profit = ₹3,000. Max loss = ₹4,500.',
    risks: 'Capped downside profit. Premium paid is at risk.',
  },
  {
    key: 'long_straddle',
    name: 'Long Straddle',
    category: 'Volatility',
    outlook: 'Neutral on direction, bullish on volatility — expect a large move.',
    description: 'Buy a call and a put at the same strike.',
    legs: [],
    maxProfitDescription: 'Unlimited theoretical profit on the upside; large on the downside.',
    maxLossDescription: 'Limited to the total premium paid.',
    breakevenDescription: 'Two breakevens: Strike ± Total Premium per unit.',
    netDebitCredit: 'Net Debit',
    bestCase: 'Underlying moves sharply in either direction.',
    worstCase: 'Underlying stays at the strike; lose all premium.',
    formula: 'P&L = [max(ST − K, 0) − C] × Q + [max(K − ST, 0) − P] × Q',
    example: 'Buy call and put @ ₹1,400, premiums ₹40 + ₹30, lot 250. Breakevens ≈ ₹1,330 and ₹1,470.',
    risks: 'Requires a large move to profit. Time decay is doubly harmful.',
  },
  {
    key: 'short_straddle',
    name: 'Short Straddle',
    category: 'Volatility',
    outlook: 'Neutral — expect low volatility and the underlying to stay near the strike.',
    description: 'Sell a call and a put at the same strike.',
    legs: [],
    maxProfitDescription: 'Limited to the total premium received.',
    maxLossDescription: 'Unlimited theoretical loss on the upside; large on the downside.',
    breakevenDescription: 'Two breakevens: Strike ± Total Premium per unit.',
    netDebitCredit: 'Net Credit',
    bestCase: 'Underlying stays exactly at the strike.',
    worstCase: 'Underlying moves sharply in either direction.',
    formula: 'P&L = [C − max(ST − K, 0)] × Q + [P − max(K − ST, 0)] × Q',
    example: 'Sell call and put @ ₹1,400, premiums ₹40 + ₹30, lot 250. Max profit = ₹17,500.',
    risks: 'Unlimited loss potential. High margin requirement. Very risky.',
  },
  {
    key: 'long_strangle',
    name: 'Long Strangle',
    category: 'Volatility',
    outlook: 'Neutral on direction, bullish on volatility — expect a very large move.',
    description: 'Buy an OTM call and an OTM put at different strikes.',
    legs: [],
    maxProfitDescription: 'Unlimited on the upside; large on the downside.',
    maxLossDescription: 'Limited to the total premium paid.',
    breakevenDescription: 'Two breakevens: Call Strike + Total Premium, Put Strike − Total Premium.',
    netDebitCredit: 'Net Debit',
    bestCase: 'Underlying moves beyond either breakeven.',
    worstCase: 'Underlying stays between the two strikes.',
    formula: 'P&L = [max(ST − Kc, 0) − C] × Q + [max(Kp − ST, 0) − P] × Q',
    example: 'Buy call @ ₹1,470 (₹20), put @ ₹1,330 (₹12), lot 250. Cheaper than straddle but needs larger move.',
    risks: 'Needs an even larger move than a straddle. Higher probability of total loss.',
  },
  {
    key: 'short_strangle',
    name: 'Short Strangle',
    category: 'Volatility',
    outlook: 'Neutral — expect low volatility and the underlying to stay in a range.',
    description: 'Sell an OTM call and an OTM put at different strikes.',
    legs: [],
    maxProfitDescription: 'Limited to the total premium received.',
    maxLossDescription: 'Unlimited on the upside; large on the downside.',
    breakevenDescription: 'Two breakevens: Call Strike + Total Premium, Put Strike − Total Premium.',
    netDebitCredit: 'Net Credit',
    bestCase: 'Underlying stays between the two strikes.',
    worstCase: 'Underlying moves sharply beyond either strike.',
    formula: 'P&L = [C − max(ST − Kc, 0)] × Q + [P − max(Kp − ST, 0)] × Q',
    example: 'Sell call @ ₹1,470 (₹20), put @ ₹1,330 (₹12), lot 250. Max profit = ₹8,000.',
    risks: 'Unlimited loss. Very high margin. One of the riskiest strategies.',
  },
  {
    key: 'iron_condor',
    name: 'Iron Condor',
    category: 'Neutral',
    outlook: 'Neutral — expect the underlying to stay within a range.',
    description: 'Sell an OTM put and OTM call, buy further OTM put and call for protection.',
    legs: [],
    maxProfitDescription: 'Limited to the net premium received.',
    maxLossDescription: 'Finite — (Width of one spread × Q) − Net Premium.',
    breakevenDescription: 'Two breakevens around the inner strikes.',
    netDebitCredit: 'Net Credit',
    bestCase: 'Underlying stays between the two short strikes.',
    worstCase: 'Underlying moves beyond one of the long strikes.',
    formula: 'Combined payoff of a bear call spread + bull put spread.',
    example: '4-leg structure with strikes at ₹1,260 / ₹1,330 / ₹1,470 / ₹1,540. Defined-risk income strategy.',
    risks: 'Capped profit and capped loss. Assignment risk on short legs.',
  },
  {
    key: 'iron_butterfly',
    name: 'Iron Butterfly',
    category: 'Neutral',
    outlook: 'Neutral — expect the underlying to stay near the central strike.',
    description: 'Sell ATM call and put, buy OTM call and put for protection.',
    legs: [],
    maxProfitDescription: 'Limited to the net premium received.',
    maxLossDescription: 'Finite — (Width of one spread × Q) − Net Premium.',
    breakevenDescription: 'Two breakevens near the central strike.',
    netDebitCredit: 'Net Credit',
    bestCase: 'Underlying expires exactly at the central strike.',
    worstCase: 'Underlying moves beyond either protective strike.',
    formula: 'Combined payoff of a short straddle + long strangle for protection.',
    example: 'Sell call & put @ ₹1,400, buy call @ ₹1,470, buy put @ ₹1,330. Higher credit than iron condor but narrower profit zone.',
    risks: 'Narrow profit zone. Assignment risk. Requires precise timing.',
  },
  {
    key: 'long_butterfly',
    name: 'Long Butterfly',
    category: 'Neutral',
    outlook: 'Neutral — expect the underlying to stay near the middle strike.',
    description: 'Buy 1 call, sell 2 calls at a higher strike, buy 1 call at an even higher strike.',
    legs: [],
    maxProfitDescription: 'Finite — (Middle Strike − Lower Strike) × Q − Net Premium.',
    maxLossDescription: 'Limited to the net premium paid.',
    breakevenDescription: 'Two breakevens flanking the middle strike.',
    netDebitCredit: 'Net Debit',
    bestCase: 'Underlying expires exactly at the middle strike.',
    worstCase: 'Underlying moves far from the middle strike.',
    formula: 'P&L = payoff of 3 call legs with 1:2:1 ratio.',
    example: 'Buy call @ ₹1,400, sell 2 calls @ ₹1,435, buy call @ ₹1,470. Low cost, very specific target.',
    risks: 'Very narrow profit zone. Rarely yields large returns.',
  },
  {
    key: 'call_ratio_backspread',
    name: 'Call Ratio Backspread',
    category: 'Directional',
    outlook: 'Bullish on volatility, bullish — expect a large upward move.',
    description: 'Sell 1 call at a lower strike, buy 2 calls at a higher strike.',
    legs: [],
    maxProfitDescription: 'Unlimited above the upper breakeven.',
    maxLossDescription: 'Limited — worst near the upper strike if underlying doesn\'t move enough.',
    breakevenDescription: 'Typically two breakevens.',
    netDebitCredit: 'Net Debit or Credit (depends on premiums)',
    bestCase: 'Underlying rises well above the higher strike.',
    worstCase: 'Underlying stays near the higher strike.',
    formula: 'P&L = [C1 − max(ST−K1,0)]×Q1 + [max(ST−K2,0) − C2]×2×Q1',
    example: 'Sell 1 call @ ₹1,400 (₹40), buy 2 calls @ ₹1,470 (₹20 each), lot 250. Profit if underlying rises sharply.',
    risks: 'Loss zone between strikes. Needs a very large move to profit.',
  },
  {
    key: 'put_ratio_backspread',
    name: 'Put Ratio Backspread',
    category: 'Directional',
    outlook: 'Bearish on volatility, bearish — expect a large downward move.',
    description: 'Sell 1 put at a higher strike, buy 2 puts at a lower strike.',
    legs: [],
    maxProfitDescription: 'Large but finite — profit grows as underlying falls.',
    maxLossDescription: 'Limited — worst near the lower strike.',
    breakevenDescription: 'Typically two breakevens.',
    netDebitCredit: 'Net Debit or Credit',
    bestCase: 'Underlying falls well below the lower strike.',
    worstCase: 'Underlying stays near the lower strike.',
    formula: 'P&L = [P1 − max(K1−ST,0)]×Q1 + [max(K2−ST,0) − P2]×2×Q1',
    example: 'Sell 1 put @ ₹1,470 (₹40), buy 2 puts @ ₹1,400 (₹20 each), lot 250. Profit if underlying falls sharply.',
    risks: 'Loss zone between strikes. Needs a very large move to profit.',
  },
];

export function getTemplate(key: StrategyKey): StrategyTemplate | undefined {
  return strategyTemplates.find((t) => t.key === key);
}
