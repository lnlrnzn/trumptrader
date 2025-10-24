import { AsterDEXClient } from '@/lib/asterdex/client'
import { calculateTargets, calculatePositionSize, validateTradeParams, roundPrice } from '@/utils/calculations'
import type { Position, TradeTargets } from '@/types/trading'
import type { LLMDecision, Tweet } from '@/types/twitter'

export interface TradingConfig {
  enabled: boolean
  maxPositionSizePercent: number
  leverage: number
  minConfidenceThreshold: number
  cooldownMinutes: number
  maxDailyTrades: number
}

export class TradingEngine {
  private asterClient: AsterDEXClient
  private config: TradingConfig
  private currentPosition: Position | null = null
  private lastTradeTime: Date | null = null
  private dailyTradeCount: number = 0
  private lastResetDate: string = new Date().toDateString()

  constructor(asterClient: AsterDEXClient, config: TradingConfig) {
    this.asterClient = asterClient
    this.config = config

    console.log('🚀 Trading Engine initialized')
    console.log('Config:', config)
  }

  /**
   * Check if we can trade (all safety checks)
   */
  private canTrade(confidence: number): { allowed: boolean; reason?: string } {
    // Check if trading is enabled
    if (!this.config.enabled) {
      return { allowed: false, reason: 'Trading is disabled' }
    }

    // Check confidence threshold
    if (confidence < this.config.minConfidenceThreshold) {
      return {
        allowed: false,
        reason: `Confidence ${confidence}% below threshold ${this.config.minConfidenceThreshold}%`
      }
    }

    // Check for existing position
    if (this.currentPosition && this.currentPosition.status === 'OPEN') {
      return { allowed: false, reason: 'Position already open' }
    }

    // Check cooldown period
    if (this.lastTradeTime) {
      const timeSinceLastTrade = Date.now() - this.lastTradeTime.getTime()
      const cooldownMs = this.config.cooldownMinutes * 60 * 1000

      if (timeSinceLastTrade < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastTrade) / 1000)
        return {
          allowed: false,
          reason: `Cooldown active: ${remainingSeconds}s remaining`
        }
      }
    }

    // Check daily trade limit
    const today = new Date().toDateString()
    if (today !== this.lastResetDate) {
      // Reset daily counter
      this.dailyTradeCount = 0
      this.lastResetDate = today
    }

    if (this.dailyTradeCount >= this.config.maxDailyTrades) {
      return {
        allowed: false,
        reason: `Daily trade limit reached (${this.config.maxDailyTrades})`
      }
    }

    return { allowed: true }
  }

  /**
   * Execute a trade based on LLM decision
   */
  async executeTrade(
    decision: LLMDecision,
    tweet: Tweet,
    overrides?: {
      accountId?: string
      symbols?: string[]
      positionSizePercent?: number | null
      leverage?: number | null
    }
  ): Promise<{ success: boolean; position?: Position; error?: string }> {
    try {
      console.log('📊 Executing trade...')
      console.log('Signal:', decision.signal)
      console.log('Confidence:', decision.confidence)

      // Safety check
      const tradeCheck = this.canTrade(decision.confidence)
      if (!tradeCheck.allowed) {
        console.log('❌ Trade blocked:', tradeCheck.reason)
        return { success: false, error: tradeCheck.reason }
      }

      // Ignore HOLD signals
      if (decision.signal === 'HOLD') {
        console.log('⏸️  Signal is HOLD, skipping trade')
        return { success: false, error: 'Signal is HOLD' }
      }

      // Apply account-specific overrides
      const symbols = overrides?.symbols || ['BTCUSDT']
      const symbol = symbols[0] // Trade the first symbol in the list
      const leverage = overrides?.leverage || this.config.leverage
      const positionSizePercent = overrides?.positionSizePercent || this.config.maxPositionSizePercent

      console.log('Account overrides:', {
        accountId: overrides?.accountId || 'default',
        symbols,
        leverage,
        positionSizePercent
      })

      // Step 1: Get account balance
      console.log('1️⃣ Getting account balance...')
      const balance = await this.asterClient.getAccountBalance()
      console.log('Balance:', balance.availableBalance, 'USDT')

      // Step 2: Calculate position size
      const { positionSize, margin } = calculatePositionSize(
        balance.availableBalance,
        positionSizePercent,
        leverage
      )

      console.log('2️⃣ Position size:', positionSize, 'USDT')
      console.log('Required margin:', margin, 'USDT')

      // Validate trade parameters
      const validation = validateTradeParams({
        balance: balance.availableBalance,
        positionSize,
        leverage,
        confidence: decision.confidence
      })

      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // Step 3: Get current price for symbol
      console.log(`3️⃣ Getting current ${symbol} price...`)
      const currentPrice = await this.asterClient.getCurrentPrice(symbol)
      console.log('Current price:', currentPrice, 'USDT')

      // Step 4: Calculate position quantity
      const quantity = positionSize / currentPrice
      const roundedQuantity = Math.floor(quantity * 1000) / 1000  // Round to 3 decimals

      console.log('4️⃣ Position quantity:', roundedQuantity, symbol.replace('USDT', ''))

      // Step 5: Calculate targets
      const targets = calculateTargets(currentPrice, decision.signal)
      console.log('5️⃣ Targets calculated:')
      console.log('TP1:', roundPrice(targets.tp1))
      console.log('TP2:', roundPrice(targets.tp2))
      console.log('TP3:', roundPrice(targets.tp3))
      console.log('SL:', roundPrice(targets.sl))
      console.log('Liq:', roundPrice(targets.liq))

      // Step 6: ENTRY ORDER
      console.log('6️⃣ Placing MARKET entry order...')
      const entrySide = decision.signal === 'LONG' ? 'BUY' : 'SELL'
      const entryOrder = await this.asterClient.placeMarketOrder({
        symbol,
        side: entrySide,
        quantity: roundedQuantity,
        leverage
      })

      console.log('✅ Entry order placed:', entryOrder.orderId)

      // Step 7: Wait for fill
      console.log('7️⃣ Waiting for entry order to fill...')
      const filled = await this.asterClient.waitForFill(symbol, entryOrder.orderId, 10000)

      if (!filled) {
        console.error('❌ Entry order not filled within timeout')
        return { success: false, error: 'Entry order not filled' }
      }

      // Step 8: Get actual fill price
      const filledOrder = await this.asterClient.getOrder(symbol, entryOrder.orderId)
      const actualEntryPrice = filledOrder?.avgPrice || currentPrice

      console.log('✅ Order filled at:', actualEntryPrice)

      // Recalculate targets with actual entry price
      const actualTargets = calculateTargets(actualEntryPrice, decision.signal)

      // Step 9: Place TP orders (parallel)
      console.log('8️⃣ Placing TAKE PROFIT orders...')
      const exitSide = decision.signal === 'LONG' ? 'SELL' : 'BUY'

      const tp1Quantity = Math.floor(roundedQuantity * 0.3 * 1000) / 1000
      const tp2Quantity = Math.floor(roundedQuantity * 0.5 * 1000) / 1000
      const tp3Quantity = Math.floor(roundedQuantity * 0.2 * 1000) / 1000

      await Promise.all([
        this.asterClient.placeTakeProfitOrder({
          symbol,
          side: exitSide,
          stopPrice: roundPrice(actualTargets.tp1),
          quantity: tp1Quantity
        }),
        this.asterClient.placeTakeProfitOrder({
          symbol,
          side: exitSide,
          stopPrice: roundPrice(actualTargets.tp2),
          quantity: tp2Quantity
        }),
        this.asterClient.placeTakeProfitOrder({
          symbol,
          side: exitSide,
          stopPrice: roundPrice(actualTargets.tp3),
          quantity: tp3Quantity
        })
      ])

      console.log('✅ TP orders placed')

      // Step 10: Place SL order
      console.log('9️⃣ Placing STOP LOSS order...')
      await this.asterClient.placeStopLossOrder({
        symbol,
        side: exitSide,
        stopPrice: roundPrice(actualTargets.sl),
        quantity: roundedQuantity
      })

      console.log('✅ SL order placed')

      // Step 11: Create position object
      const position: Position = {
        id: `${symbol}_${Date.now()}`,
        symbol,
        side: decision.signal,
        entryPrice: actualEntryPrice,
        currentPrice: actualEntryPrice,
        positionSize,
        leverage: this.config.leverage,
        margin,
        tp1Price: actualTargets.tp1,
        tp2Price: actualTargets.tp2,
        tp3Price: actualTargets.tp3,
        slPrice: actualTargets.sl,
        liqPrice: actualTargets.liq,
        tp1Hit: false,
        tp2Hit: false,
        tp3Hit: false,
        unrealizedPnL: 0,
        unrealizedPnL_percent: 0,
        status: 'OPEN',
        openedAt: new Date(),
        tweetId: tweet.id,
        llmDecisionId: decision.id
      }

      // Update state
      this.currentPosition = position
      this.lastTradeTime = new Date()
      this.dailyTradeCount++

      console.log('🎉 Trade executed successfully!')
      console.log('Position ID:', position.id)

      return { success: true, position }

    } catch (error) {
      console.error('❌ Error executing trade:', error)

      // Try to close any partial position
      try {
        await this.emergencyClose()
      } catch (closeError) {
        console.error('Error during emergency close:', closeError)
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Emergency close all positions
   */
  async emergencyClose(): Promise<void> {
    console.log('🚨 EMERGENCY CLOSE triggered')

    if (!this.currentPosition || this.currentPosition.status !== 'OPEN') {
      console.log('No open position to close')
      return
    }

    try {
      const symbol = this.currentPosition.symbol

      // Cancel all pending orders
      await this.asterClient.cancelAllOrders(symbol)
      console.log('✅ All pending orders canceled')

      // Close position at market
      await this.asterClient.closePosition(symbol, this.currentPosition.side)
      console.log('✅ Position closed at market')

      // Update position status
      this.currentPosition.status = 'CLOSED'
      this.currentPosition.closedAt = new Date()
      this.currentPosition.exitReason = 'MANUAL'

    } catch (error) {
      console.error('❌ Error during emergency close:', error)
      throw error
    }
  }

  /**
   * Get current position
   */
  getCurrentPosition(): Position | null {
    return this.currentPosition
  }

  /**
   * Update trading config
   */
  updateConfig(newConfig: Partial<TradingConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('Config updated:', this.config)
  }

  /**
   * Get trading stats
   */
  getStats(): {
    currentPosition: Position | null
    lastTradeTime: Date | null
    dailyTradeCount: number
    cooldownRemaining: number
  } {
    let cooldownRemaining = 0

    if (this.lastTradeTime) {
      const timeSinceLastTrade = Date.now() - this.lastTradeTime.getTime()
      const cooldownMs = this.config.cooldownMinutes * 60 * 1000
      cooldownRemaining = Math.max(0, cooldownMs - timeSinceLastTrade)
    }

    return {
      currentPosition: this.currentPosition,
      lastTradeTime: this.lastTradeTime,
      dailyTradeCount: this.dailyTradeCount,
      cooldownRemaining
    }
  }
}

/**
 * Create trading engine instance
 */
export function createTradingEngine(asterClient: AsterDEXClient): TradingEngine {
  const config: TradingConfig = {
    enabled: process.env.TRADING_ENABLED === 'true',
    maxPositionSizePercent: parseInt(process.env.MAX_POSITION_SIZE_PERCENT || '15'),
    leverage: parseInt(process.env.LEVERAGE || '100'),
    minConfidenceThreshold: parseInt(process.env.MIN_CONFIDENCE_THRESHOLD || '75'),
    cooldownMinutes: parseInt(process.env.COOLDOWN_MINUTES || '5'),
    maxDailyTrades: parseInt(process.env.MAX_DAILY_TRADES || '10')
  }

  return new TradingEngine(asterClient, config)
}
