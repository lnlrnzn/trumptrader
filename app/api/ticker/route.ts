import { NextResponse } from 'next/server'
import { createAsterClient } from '@/lib/asterdex/client'

/**
 * GET /api/ticker
 * Returns 24hr ticker data for Bitcoin
 */
export async function GET() {
  try {
    // Fetch 24hr ticker from AsterDEX
    const asterClient = createAsterClient()
    const response = await asterClient.client.get('/fapi/v1/ticker/24hr', {
      params: {
        symbol: 'BTCUSDT'
      }
    })

    const ticker = response.data

    return NextResponse.json({
      success: true,
      data: {
        symbol: ticker.symbol,
        lastPrice: parseFloat(ticker.lastPrice),
        priceChange: parseFloat(ticker.priceChange),
        priceChangePercent: parseFloat(ticker.priceChangePercent),
        highPrice: parseFloat(ticker.highPrice),
        lowPrice: parseFloat(ticker.lowPrice),
        volume: parseFloat(ticker.volume),
        quoteVolume: parseFloat(ticker.quoteVolume),
        openPrice: parseFloat(ticker.openPrice),
        closeTime: ticker.closeTime
      }
    })
  } catch (error) {
    console.error('Error fetching ticker data:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch ticker data'
      },
      { status: 500 }
    )
  }
}
