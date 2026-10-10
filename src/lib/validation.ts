import type { StrategyLeg, MarketInputs } from '@/types';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateLeg(leg: Partial<StrategyLeg>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (leg.lotSize !== undefined && (leg.lotSize <= 0 || !Number.isInteger(leg.lotSize))) {
    errors.push({ field: 'lotSize', message: 'Lot size must be a positive integer.' });
  }
  if (leg.lots !== undefined && leg.lots <= 0) {
    errors.push({ field: 'lots', message: 'Number of lots must be a positive number.' });
  }
  if (leg.instrumentType === 'OPTION') {
    if (leg.strike !== undefined && leg.strike <= 0) {
      errors.push({ field: 'strike', message: 'Strike price must be positive.' });
    }
    if (leg.premium !== undefined && leg.premium < 0) {
      errors.push({ field: 'premium', message: 'Premium must not be negative.' });
    }
    if (!leg.optionType) {
      errors.push({ field: 'optionType', message: 'Option type (Call/Put) is required.' });
    }
  }
  if (leg.instrumentType === 'FUTURE') {
    if (leg.entryPrice !== undefined && leg.entryPrice <= 0) {
      errors.push({ field: 'entryPrice', message: 'Futures entry price must be positive.' });
    }
  }
  return errors;
}

export function validateMarketInputs(inputs: Partial<MarketInputs>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (inputs.spotPrice !== undefined && inputs.spotPrice < 0) {
    errors.push({ field: 'spotPrice', message: 'Spot price must not be negative.' });
  }
  if (inputs.futuresEntryPrice !== undefined && inputs.futuresEntryPrice < 0) {
    errors.push({ field: 'futuresEntryPrice', message: 'Futures entry price must not be negative.' });
  }
  if (inputs.strikePrice !== undefined && inputs.strikePrice <= 0) {
    errors.push({ field: 'strikePrice', message: 'Strike price must be positive.' });
  }
  if (inputs.callPremium !== undefined && inputs.callPremium < 0) {
    errors.push({ field: 'callPremium', message: 'Call premium must not be negative.' });
  }
  if (inputs.putPremium !== undefined && inputs.putPremium < 0) {
    errors.push({ field: 'putPremium', message: 'Put premium must not be negative.' });
  }
  if (inputs.lotSize !== undefined && (inputs.lotSize <= 0 || !Number.isInteger(inputs.lotSize))) {
    errors.push({ field: 'lotSize', message: 'Lot size must be a positive integer.' });
  }
  if (inputs.lots !== undefined && inputs.lots <= 0) {
    errors.push({ field: 'lots', message: 'Number of lots must be a positive number.' });
  }
  if (inputs.expiryDate !== undefined && inputs.expiryDate) {
    const expiry = new Date(inputs.expiryDate);
    if (isNaN(expiry.getTime())) {
      errors.push({ field: 'expiryDate', message: 'Expiry date is not valid.' });
    }
  }
  return errors;
}

export function isStrategyValid(legs: StrategyLeg[]): boolean {
  if (legs.length === 0) return false;
  return legs.every((leg) => validateLeg(leg).length === 0);
}
