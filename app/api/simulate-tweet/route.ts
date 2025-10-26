import { NextRequest, NextResponse } from 'next/server'
import type { TwitterWebhookPayload } from '@/types/twitter'

/**
 * POST /api/simulate-tweet
 *
 * Simulate a tweet from a monitored account to test the trading bot.
 * This endpoint triggers the same flow as the real webhook.
 *
 * Body:
 * {
 *   "username": "POTUS",  // Twitter username (without @)
 *   "tweet_text": "Bitcoin is the future of money!"
 * }
 *
 * This will:
 * 1. Create a fake tweet from the specified account
 * 2. Analyze it with LLM
 * 3. Execute a real trade if confidence is high enough
 * 4. Set stop-loss and take-profit orders
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    if (!body.username || !body.tweet_text) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: username, tweet_text'
        },
        { status: 400 }
      )
    }

    console.log('🧪 Simulating tweet from @' + body.username)
    console.log('📝 Tweet:', body.tweet_text)

    // Create fake tweet in webhook format
    const fakeTimestamp = new Date().toISOString()
    const fakeTweetId = `sim_${Date.now()}`

    const webhookPayload: TwitterWebhookPayload = {
      event: 'tweet_matched',
      rule_id: 'simulation',
      rule_tag: 'simulate_test',
      tweets: [{
        id: fakeTweetId,
        text: body.tweet_text,
        author: {
          id: 'simulated_user',
          username: body.username,
          name: body.username
        },
        created_at: fakeTimestamp,
        metrics: {
          likes: 0,
          retweets: 0,
          replies: 0
        }
      }],
      timestamp: fakeTimestamp
    }

    // Get the internal webhook URL
    const webhookUrl = process.env.NEXT_PUBLIC_WS_URL
      ? `${process.env.NEXT_PUBLIC_WS_URL}/api/twitter-webhook`
      : 'http://localhost:3000/api/twitter-webhook'

    console.log('📡 Calling webhook processor...')

    // Call the webhook endpoint (same as real tweets)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Call': 'true',
        'X-Simulation': 'true'  // Mark as simulation
      },
      body: JSON.stringify(webhookPayload)
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('❌ Webhook processing failed:', result)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to process simulated tweet',
          details: result
        },
        { status: 500 }
      )
    }

    console.log('✅ Simulated tweet processed successfully')

    return NextResponse.json({
      success: true,
      message: 'Simulated tweet processed',
      tweet_id: fakeTweetId,
      webhook_result: result
    })

  } catch (error) {
    console.error('❌ Simulation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/simulate-tweet
 * Get information about the simulation endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/simulate-tweet',
    method: 'POST',
    description: 'Simulate a tweet to test the trading bot with real trades',
    body: {
      username: 'string (required) - Twitter username without @',
      tweet_text: 'string (required) - Tweet content to analyze'
    },
    example: {
      username: 'POTUS',
      tweet_text: 'Bitcoin is the future of money!'
    },
    warning: '⚠️ This will execute REAL TRADES on AsterDEX if confidence is high enough!'
  })
}
