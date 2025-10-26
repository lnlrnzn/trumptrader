import { NextResponse } from 'next/server'

/**
 * GET /api/debug-config
 * Debug endpoint to check trading configuration
 */
export async function GET() {
  return NextResponse.json({
    trading: {
      TRADING_ENABLED: process.env.TRADING_ENABLED,
      MAX_POSITION_SIZE_PERCENT: process.env.MAX_POSITION_SIZE_PERCENT,
      LEVERAGE: process.env.LEVERAGE,
      MIN_CONFIDENCE_THRESHOLD: process.env.MIN_CONFIDENCE_THRESHOLD,
      COOLDOWN_MINUTES: process.env.COOLDOWN_MINUTES,
      MAX_DAILY_TRADES: process.env.MAX_DAILY_TRADES
    },
    asterdex: {
      ASTER_DEX_KEY: !!process.env.ASTER_DEX_KEY,
      ASTER_SECRET_KEY: !!process.env.ASTER_SECRET_KEY,
      API_WALLET_PRIVATE_KEY: !!process.env.API_WALLET_PRIVATE_KEY,
      ASTER_API_URL: process.env.ASTER_API_URL
    }
  })
}
