import { NextResponse } from 'next/server'
import { createAsterClient } from '@/lib/asterdex/client'
import { RawOrderbookResponse, OrderbookLevel, OrderbookData } from '@/types/orderbook'

export async function GET() {
  try {
    const asterClient = createAsterClient()
    const response = await asterClient.client.get('/fapi/v1/depth', {
      params: {
        symbol: 'BTCUSDT',
        limit: 50
      }
    })

    const raw = response.data as RawOrderbookResponse

    // Process bids (already in descending order - highest first)
    let bidTotal = 0
    const bids: OrderbookLevel[] = raw.bids.map(([price, size]) => {
      const priceNum = parseFloat(price)
      const sizeNum = parseFloat(size)
      bidTotal += sizeNum
      return {
        price: priceNum,
        size: sizeNum,
        total: bidTotal
      }
    })

    // Process asks (in ascending order - lowest first, need to reverse for cumulative)
    const asksReversed = [...raw.asks].reverse()
    let askTotal = 0
    const asks: OrderbookLevel[] = asksReversed.map(([price, size]) => {
      const priceNum = parseFloat(price)
      const sizeNum = parseFloat(size)
      askTotal += sizeNum
      return {
        price: priceNum,
        size: sizeNum,
        total: askTotal
      }
    }).reverse() // Reverse back to show lowest ask first

    const bestBid = bids.length > 0 ? bids[0].price : 0
    const bestAsk = asks.length > 0 ? asks[0].price : 0
    const spread = bestAsk - bestBid
    const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0
    const midPrice = (bestBid + bestAsk) / 2

    const orderbookData: OrderbookData = {
      lastUpdateId: raw.lastUpdateId,
      timestamp: raw.E,
      bids,
      asks,
      bestBid,
      bestAsk,
      spread,
      spreadPercent,
      midPrice
    }

    return NextResponse.json({
      success: true,
      data: orderbookData
    })

  } catch (error: any) {
    console.error('Error fetching orderbook:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch orderbook data'
      },
      { status: 500 }
    )
  }
}
