import type { TradeTargets, Position } from '@/types/trading'

/**
 * Calculate target prices for take profit and stop loss
 */
export function calculateTargets(
  entryPrice: number,
  side: 'LONG' | 'SHORT'
): TradeTargets {
  const multiplier = side === 'LONG' ? 1 : -1

  return {
    tp1: entryPrice * (1 + multiplier * 0.003),  // 0.3% = 30% profit at 100x
    tp2: entryPrice * (1 + multiplier * 0.005),  // 0.5% = 50% profit at 100x
    tp3: entryPrice * (1 + multiplier * 0.008),  // 0.8% = 80% profit at 100x
    sl: entryPrice * (1 - multiplier * 0.006),   // -0.6% = -60% loss at 100x
    liq: entryPrice * (1 - multiplier * 0.01)    // -1.0% = liquidation at 100x
  }
}

/**
 * Calculate unrealized PnL for a position
 */
export function calculatePnL(
  position: Position,
  currentPrice: number
): {
  pnl: number
  pnlPercent: number
} {
  const priceDiff = currentPrice - position.entryPrice
  const multiplier = position.side === 'LONG' ? 1 : -1
  const pnl = priceDiff * multiplier * position.positionSize * position.leverage

  // PnL percent based on margin
  const pnlPercent = (pnl / position.margin) * 100

  return { pnl, pnlPercent }
}

/**
 * Calculate distance to liquidation price
 */
export function distanceToLiquidation(
  currentPrice: number,
  liqPrice: number
): number {
  return Math.abs((currentPrice - liqPrice) / currentPrice) * 100
}

/**
 * Round price to appropriate decimals for BTC
 */
export function roundPrice(price: number, decimals: number = 2): number {
  return Math.round(price * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

/**
 * Calculate position size based on account balance and risk percent
 */
export function calculatePositionSize(
  balance: number,
  riskPercent: number,
  leverage: number = 100
): {
  positionSize: number
  margin: number
} {
  const riskAmount = balance * (riskPercent / 100)
  const margin = riskAmount / leverage

  return {
    positionSize: riskAmount,
    margin
  }
}

/**
 * Format USD currency
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format percent
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

/**
 * Check if target price is hit
 */
export function isTargetHit(
  currentPrice: number,
  targetPrice: number,
  side: 'LONG' | 'SHORT'
): boolean {
  if (side === 'LONG') {
    return currentPrice >= targetPrice
  } else {
    return currentPrice <= targetPrice
  }
}

/**
 * Validate trade parameters before execution
 */
export function validateTradeParams(params: {
  balance: number
  positionSize: number
  leverage: number
  confidence: number
}): { valid: boolean; error?: string } {
  if (params.balance <= 0) {
    return { valid: false, error: 'Insufficient balance' }
  }

  if (params.positionSize > params.balance) {
    return { valid: false, error: 'Position size exceeds available balance' }
  }

  if (params.leverage < 1 || params.leverage > 125) {
    return { valid: false, error: 'Invalid leverage (must be 1-125x)' }
  }

  if (params.confidence < 0 || params.confidence > 100) {
    return { valid: false, error: 'Invalid confidence score' }
  }

  return { valid: true }
}

/**
 * Calculate required margin for a position
 */
export function calculateRequiredMargin(
  positionSize: number,
  leverage: number
): number {
  return positionSize / leverage
}

/**
 * Format duration from seconds
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return `${hours}h ${remainingMinutes}m`
}
