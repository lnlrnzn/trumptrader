/**
 * Test script for AsterDEX API connection and signing
 *
 * Run with: npx tsx scripts/test-aster.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(__dirname, '../.env.local') })

import { createAsterClient } from '../lib/asterdex/client'

async function testAsterConnection() {
  console.log('🔍 Testing AsterDEX API connection...\n')

  try {
    const client = createAsterClient()

    // Test 1: Get server time
    console.log('Test 1: Getting server time...')
    const serverTime = await client.getServerTime()
    console.log('✅ Server time:', new Date(serverTime).toISOString())
    console.log()

    // Test 2: Get exchange info
    console.log('Test 2: Getting exchange info for BTCUSDT...')
    const exchangeInfo = await client.getExchangeInfo('BTCUSDT')
    const btcSymbol = exchangeInfo.symbols?.find((s: any) => s.symbol === 'BTCUSDT')
    if (btcSymbol) {
      console.log('✅ BTCUSDT found:')
      console.log('   - Status:', btcSymbol.status)
      console.log('   - Quote Asset:', btcSymbol.quoteAsset)
      console.log('   - Tick Size:', btcSymbol.filters?.find((f: any) => f.filterType === 'PRICE_FILTER')?.tickSize)
    }
    console.log()

    // Test 3: Get current BTC price
    console.log('Test 3: Getting current BTC price...')
    const btcPrice = await client.getCurrentPrice('BTCUSDT')
    console.log('✅ BTC Price:', `$${btcPrice.toLocaleString()}`)
    console.log()

    // Test 4: Get account balance
    console.log('Test 4: Getting account balance...')
    const balance = await client.getAccountBalance()
    console.log('✅ Account Balance:')
    console.log('   - Total:', `$${balance.totalBalance.toFixed(2)}`)
    console.log('   - Available:', `$${balance.availableBalance.toFixed(2)}`)
    console.log('   - Margin Used:', `$${balance.marginUsed.toFixed(2)}`)
    console.log('   - Unrealized PnL:', `$${balance.unrealizedPnL.toFixed(2)}`)
    console.log()

    // Test 5: Check current position
    console.log('Test 5: Checking for open BTC position...')
    const position = await client.getPosition('BTCUSDT')
    if (position) {
      console.log('✅ Open position found:')
      console.log('   - Side:', position.side)
      console.log('   - Size:', position.positionSize)
      console.log('   - Entry Price:', `$${position.entryPrice}`)
      console.log('   - Current Price:', `$${position.currentPrice}`)
      console.log('   - Unrealized PnL:', `$${position.unrealizedPnL?.toFixed(2)}`)
      console.log('   - Leverage:', `${position.leverage}x`)
      console.log('   - Liquidation Price:', `$${position.liqPrice}`)
    } else {
      console.log('✅ No open position')
    }
    console.log()

    console.log('🎉 All tests passed! AsterDEX API connection is working correctly.')
    console.log()
    console.log('⚠️  IMPORTANT: Before trading, make sure to:')
    console.log('   1. Set leverage to 100x using: await client.setLeverage("BTCUSDT", 100)')
    console.log('   2. Set position mode to ONE_WAY: await client.setPositionMode(false)')
    console.log('   3. Test with small amounts first!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Stack:', error.stack)
    }
  }
}

// Run tests
testAsterConnection()
