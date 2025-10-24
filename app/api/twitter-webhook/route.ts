import { NextRequest, NextResponse } from 'next/server'
import type { TwitterWebhookPayload, Tweet } from '@/types/twitter'

/**
 * TwitterAPI.io Webhook Endpoint
 *
 * This endpoint receives real-time tweets from TwitterAPI.io
 * when they match our filter rule (from:realDonaldTrump)
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🐦 Incoming tweet webhook...')

    // Parse webhook payload
    const payload: TwitterWebhookPayload = await request.json()

    console.log('Webhook event:', payload.event)
    console.log('Rule tag:', payload.rule_tag)
    console.log('Tweets received:', payload.tweets?.length || 0)

    // Validate payload - allow test requests without tweets
    if (!payload.tweets || payload.tweets.length === 0) {
      console.log('⚠️  Empty payload - likely a test request from TwitterAPI.io')
      return NextResponse.json({
        success: true,
        message: 'Webhook endpoint is active and ready',
        processed: 0
      })
    }

    // Process each tweet
    for (const rawTweet of payload.tweets) {
      // Convert to our Tweet format
      const tweet: Tweet = {
        id: `tweet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tweet_id: rawTweet.id,
        text: rawTweet.text,
        author: rawTweet.author,
        created_at: rawTweet.created_at,
        received_at: new Date().toISOString(),
        metrics: rawTweet.metrics
      }

      console.log('Tweet:', tweet.text.substring(0, 100))
      console.log('Author:', tweet.author.username)

      // Trigger async processing (don't wait for it)
      processTweet(tweet).catch(error => {
        console.error('Error processing tweet:', error)
      })
    }

    // Return success immediately
    return NextResponse.json({
      success: true,
      processed: payload.tweets.length
    })

  } catch (error) {
    console.error('❌ Webhook error:', error)

    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Process tweet asynchronously with multi-account support
 * This is called after the webhook response is sent
 */
async function processTweet(tweet: Tweet) {
  try {
    console.log('Processing tweet:', tweet.id)
    console.log('Author:', tweet.author.username)

    // Import dependencies dynamically to avoid cold start issues
    const { createAccountService } = await import('@/lib/accounts/service')
    const { createOpenRouterClient } = await import('@/lib/openrouter/client')
    const { createAsterClient } = await import('@/lib/asterdex/client')
    const { createTradingEngine } = await import('@/services/trading-engine')
    const { createClient } = await import('@supabase/supabase-js')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Step 0: Check if this tweet is from a monitored account
    const accountService = createAccountService()
    const account = await accountService.getAccountByUsername(tweet.author.username)

    if (!account) {
      console.log(`⏭️  Skipping tweet from @${tweet.author.username} (not monitored)`)
      return
    }

    if (!account.enabled) {
      console.log(`⏭️  Skipping tweet from @${tweet.author.username} (account disabled)`)
      return
    }

    console.log(`✅ Tweet from monitored account: @${account.username} (${account.display_name})`)

    // Step 1: Save tweet to database
    const { data: savedTweet, error: tweetError } = await supabase
      .from('tweets')
      .insert({
        tweet_id: tweet.tweet_id,
        text: tweet.text,
        author_username: tweet.author.username,
        author_name: tweet.author.name || tweet.author.username,
        created_at: tweet.created_at,
        received_at: new Date().toISOString(),
        metrics: tweet.metrics,
        source_account_id: account.id
      })
      .select()
      .single()

    if (tweetError) {
      console.error('Error saving tweet:', tweetError)
      return
    }

    console.log('💾 Tweet saved to database')

    // Step 2: Analyze tweet with LLM (using account-specific prompt)
    console.log('1️⃣ Analyzing with LLM...')
    const llmClient = createOpenRouterClient()
    const analysis = await llmClient.analyzeTweetWithPrompt(
      tweet.text,
      account.custom_prompt || undefined,
      account.display_name
    )

    // Apply account's confidence multiplier
    const adjustedConfidence = Math.min(100, analysis.confidence * account.confidence_multiplier)

    console.log('LLM Decision:', {
      signal: analysis.signal,
      confidence: analysis.confidence,
      adjusted_confidence: adjustedConfidence,
      reasoning: analysis.reasoning
    })

    // Step 3: Save LLM decision to database
    const { data: savedDecision, error: decisionError } = await supabase
      .from('llm_decisions')
      .insert({
        tweet_id: savedTweet.id,
        source_account_id: account.id,
        signal: analysis.signal,
        confidence: analysis.confidence,
        adjusted_confidence: adjustedConfidence,
        reasoning: analysis.reasoning,
        expected_magnitude: analysis.expected_magnitude || null,
        executed: false
      })
      .select()
      .single()

    if (decisionError) {
      console.error('Error saving LLM decision:', decisionError)
      return
    }

    console.log('💾 LLM decision saved to database')

    // Step 4: Check if we should execute trade
    const minThreshold = account.min_confidence_threshold || 75
    const shouldTrade = analysis.signal !== 'HOLD' && adjustedConfidence >= minThreshold

    if (!shouldTrade) {
      console.log('⏸️  No trade executed')
      console.log('Reason:', analysis.signal === 'HOLD'
        ? 'Signal is HOLD'
        : `Adjusted confidence too low (${adjustedConfidence.toFixed(1)}% < ${minThreshold}%)`
      )
      return
    }

    // Step 5: Execute trade with account-specific settings
    console.log('2️⃣ Executing trade...')

    const asterClient = createAsterClient()
    const tradingEngine = createTradingEngine(asterClient)

    // Build decision object for trading engine
    const decision = {
      tweetId: tweet.id,
      signal: analysis.signal,
      confidence: adjustedConfidence,
      reasoning: analysis.reasoning,
      expected_magnitude: analysis.expected_magnitude,
      executed: false,
      createdAt: new Date()
    }

    // Execute trade with account-specific overrides
    const result = await tradingEngine.executeTrade(decision, tweet, {
      accountId: account.id,
      symbols: account.symbols,
      positionSizePercent: account.position_size_percent,
      leverage: account.leverage
    })

    if (result.success) {
      console.log('✅ Trade executed successfully!')
      console.log('Position:', result.position)

      // Mark decision as executed
      await supabase
        .from('llm_decisions')
        .update({ executed: true })
        .eq('id', savedDecision.id)

      // Save trade to database (done in trading engine)

    } else {
      console.log('❌ Trade not executed:', result.error)
    }

  } catch (error) {
    console.error('❌ Error processing tweet:', error)
  }
}

/**
 * GET endpoint for webhook verification (optional)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'active',
    service: 'Trump Tweet Trading Bot',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
}
