import { NextRequest, NextResponse } from 'next/server'
import { createAsterClient } from '@/lib/asterdex/client'

/**
 * GET /api/chart/btc
 * Returns candlestick data for Bitcoin chart
 * Query params: interval (1m, 5m, 15m, 1h, 4h, 1d), limit (default: varies by interval)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const interval = searchParams.get('interval') || '1m'

    // Default limits based on interval to show reasonable timeframes
    const defaultLimits: Record<string, number> = {
      '1m': 500,  // 500 minutes = ~8.3 hours
      '5m': 288,  // 288 * 5m = 24 hours
      '15m': 96,  // 96 * 15m = 24 hours
      '1h': 168,  // 168 hours = 7 days
      '4h': 180,  // 180 * 4h = 30 days
      '1d': 90    // 90 days
    }

    const limit = parseInt(searchParams.get('limit') || String(defaultLimits[interval] || 500))

    // Map frontend intervals to AsterDEX intervals
    const intervalMap: Record<string, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d'
    }

    const asterInterval = intervalMap[interval] || '1m'

    // Fetch klines from AsterDEX
    const asterClient = createAsterClient()
    const klines = await asterClient.getKlines('BTCUSDT', asterInterval, limit)

    return NextResponse.json({
      success: true,
      data: klines
    })
  } catch (error) {
    console.error('Error fetching chart data:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch chart data'
      },
      { status: 500 }
    )
  }
}
