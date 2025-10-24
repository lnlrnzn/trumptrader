import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/trades
 * Returns trade history with optional filters
 * Query params: account, signal (LONG/SHORT), status (OPEN/CLOSED), limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('account')
    const signal = searchParams.get('signal')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Build query
    let query = supabase
      .from('trades')
      .select(`
        *,
        tweet:tweets(
          id,
          tweet_id,
          text,
          author_username,
          author_name,
          created_at
        ),
        llm_decision:llm_decisions(
          signal,
          confidence,
          adjusted_confidence,
          reasoning,
          expected_magnitude
        ),
        source_account:twitter_accounts(
          id,
          username,
          display_name
        )
      `)
      .order('opened_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (accountId) {
      query = query.eq('source_account_id', accountId)
    }

    if (signal) {
      query = query.eq('side', signal)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: trades, error, count } = await query

    if (error) {
      throw error
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      data: trades || [],
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    })
  } catch (error) {
    console.error('Error fetching trades:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trades'
      },
      { status: 500 }
    )
  }
}
