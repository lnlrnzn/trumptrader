import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/position/active
 * Returns currently active/open position with full details
 */
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get most recent open position
    const { data: position, error } = await supabase
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
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    if (!position) {
      return NextResponse.json({
        success: true,
        data: null
      })
    }

    return NextResponse.json({
      success: true,
      data: position
    })
  } catch (error) {
    console.error('Error fetching active position:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch active position'
      },
      { status: 500 }
    )
  }
}
