import { NextResponse } from 'next/server'
import { createAsterClient } from '@/lib/asterdex/client'

/**
 * GET /api/test-asterdex
 * Test AsterDEX connection and credentials
 */
export async function GET() {
  try {
    console.log('🧪 Testing AsterDEX connection...')

    // Check if env vars are set
    const checks = {
      ASTER_DEX_KEY: !!process.env.ASTER_DEX_KEY,
      API_WALLET_PRIVATE_KEY: !!process.env.API_WALLET_PRIVATE_KEY,
      ASTER_SECRET_KEY: !!process.env.ASTER_SECRET_KEY,
      ASTER_API_URL: process.env.ASTER_API_URL || 'https://fapi.asterdex.com (default)'
    }

    console.log('Environment checks:', checks)

    if (!checks.ASTER_DEX_KEY) {
      return NextResponse.json({
        success: false,
        error: 'ASTER_DEX_KEY not configured',
        checks
      }, { status: 500 })
    }

    if (!checks.API_WALLET_PRIVATE_KEY && !checks.ASTER_SECRET_KEY) {
      return NextResponse.json({
        success: false,
        error: 'No private key configured (need API_WALLET_PRIVATE_KEY or ASTER_SECRET_KEY)',
        checks
      }, { status: 500 })
    }

    // Create client
    console.log('Creating AsterDEX client...')
    const client = createAsterClient()
    console.log('✅ Client created')

    // Test 1: Get server time (unauthenticated)
    console.log('Test 1: Getting server time...')
    const startTime = Date.now()
    const serverTime = await client.getServerTime()
    const timeTaken = Date.now() - startTime
    console.log(`✅ Server time received in ${timeTaken}ms:`, serverTime)

    // Test 2: Get account balance (authenticated)
    console.log('Test 2: Getting account balance...')
    const balanceStartTime = Date.now()
    const balance = await client.getAccountBalance()
    const balanceTimeTaken = Date.now() - balanceStartTime
    console.log(`✅ Balance received in ${balanceTimeTaken}ms:`, balance)

    // Test 3: Get current BTC price
    console.log('Test 3: Getting BTC price...')
    const priceStartTime = Date.now()
    const btcPrice = await client.getCurrentPrice('BTCUSDT')
    const priceTimeTaken = Date.now() - priceStartTime
    console.log(`✅ BTC price received in ${priceTimeTaken}ms:`, btcPrice)

    return NextResponse.json({
      success: true,
      message: 'AsterDEX connection successful',
      checks,
      tests: {
        serverTime: {
          success: true,
          value: serverTime,
          timeTaken: `${timeTaken}ms`
        },
        balance: {
          success: true,
          totalBalance: balance.totalBalance,
          availableBalance: balance.availableBalance,
          timeTaken: `${balanceTimeTaken}ms`
        },
        btcPrice: {
          success: true,
          price: btcPrice,
          timeTaken: `${priceTimeTaken}ms`
        }
      }
    })

  } catch (error) {
    console.error('❌ AsterDEX test failed:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        message: error instanceof Error ? error.message : undefined,
        code: (error as any)?.code,
        status: (error as any)?.response?.status,
        statusText: (error as any)?.response?.statusText
      }
    }, { status: 500 })
  }
}
