import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/stats
 * Returns key metrics for the dashboard hero section
 */
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get all closed trades
    const { data: closedTrades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('status', 'CLOSED')

    if (tradesError) {
      throw tradesError
    }

    // Get active position
    const { data: activePosition } = await supabase
      .from('trades')
      .select('*')
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: false })
      .limit(1)
      .single()

    // Calculate stats
    const totalTrades = closedTrades?.length || 0
    const winningTrades = closedTrades?.filter(t => (t.realized_pnl || 0) > 0).length || 0
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

    const totalPnl = closedTrades?.reduce((sum, t) => sum + (t.realized_pnl || 0), 0) || 0

    const bestTrade = closedTrades?.reduce((best, t) =>
      (t.realized_pnl || 0) > (best?.realized_pnl || 0) ? t : best
    , closedTrades[0])

    const worstTrade = closedTrades?.reduce((worst, t) =>
      (t.realized_pnl || 0) < (worst?.realized_pnl || 0) ? t : worst
    , closedTrades[0])

    return NextResponse.json({
      success: true,
      data: {
        totalTrades,
        winningTrades,
        losingTrades: totalTrades - winningTrades,
        winRate: Number(winRate.toFixed(2)),
        totalPnl: Number(totalPnl.toFixed(2)),
        bestTrade: bestTrade ? {
          id: bestTrade.id,
          symbol: bestTrade.symbol,
          side: bestTrade.side,
          pnl: Number((bestTrade.realized_pnl || 0).toFixed(2)),
          pnlPercent: Number((bestTrade.realized_pnl_percent || 0).toFixed(2)),
          entryPrice: bestTrade.entry_price,
          exitPrice: bestTrade.exit_price
        } : null,
        worstTrade: worstTrade ? {
          id: worstTrade.id,
          symbol: worstTrade.symbol,
          side: worstTrade.side,
          pnl: Number((worstTrade.realized_pnl || 0).toFixed(2)),
          pnlPercent: Number((worstTrade.realized_pnl_percent || 0).toFixed(2)),
          entryPrice: worstTrade.entry_price,
          exitPrice: worstTrade.exit_price
        } : null,
        activePosition: activePosition ? {
          id: activePosition.id,
          symbol: activePosition.symbol,
          side: activePosition.side,
          entryPrice: activePosition.entry_price,
          positionSize: activePosition.position_size,
          leverage: activePosition.leverage,
          margin: activePosition.margin,
          tp1Price: activePosition.tp1_price,
          tp2Price: activePosition.tp2_price,
          tp3Price: activePosition.tp3_price,
          slPrice: activePosition.sl_price,
          liqPrice: activePosition.liq_price,
          openedAt: activePosition.opened_at
        } : null
      }
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats'
      },
      { status: 500 }
    )
  }
}
