import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/webhook-stats
 * Get webhook status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get count of enabled accounts
    const { count: accountCount } = await supabase
      .from('twitter_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('enabled', true)

    // Get total tweets received
    const { count: tweetCount } = await supabase
      .from('tweets')
      .select('*', { count: 'exact', head: true })

    // Get last tweet received
    const { data: lastTweet } = await supabase
      .from('tweets')
      .select('received_at')
      .order('received_at', { ascending: false })
      .limit(1)
      .single()

    // Build webhook URL
    const webhookUrl = process.env.NEXT_PUBLIC_WS_URL
      ? `${process.env.NEXT_PUBLIC_WS_URL}/api/twitter-webhook`
      : 'http://localhost:3000/api/twitter-webhook'

    return NextResponse.json({
      success: true,
      data: {
        accounts: accountCount || 0,
        totalTweetsReceived: tweetCount || 0,
        lastTweetAt: lastTweet?.received_at || null,
        webhookUrl,
        publicUrl: process.env.NEXT_PUBLIC_WS_URL || null
      }
    })
  } catch (error) {
    console.error('Error getting webhook stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get webhook stats'
      },
      { status: 500 }
    )
  }
}
