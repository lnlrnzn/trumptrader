import axios, { AxiosInstance } from 'axios'
import { prepareSignedRequest, validateAsterConfig, getSignerAddress } from './signer'
import type {
  OrderParams,
  Order,
  Position,
  AccountBalance,
  AsterDEXResponse,
  OrderSide,
  TradeTargets
} from '@/types/trading'

export interface AsterDEXConfig {
  userAddress: string
  privateKey: string
  apiUrl: string
  wsUrl?: string
}

export class AsterDEXClient {
  private config: AsterDEXConfig
  private client: AxiosInstance

  constructor(config: AsterDEXConfig) {
    // Validate config
    const validation = validateAsterConfig(config)
    if (!validation.valid) {
      throw new Error(`Invalid AsterDEX configuration: ${validation.error}`)
    }

    this.config = config
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log('AsterDEX Client initialized')
    console.log('User:', config.userAddress)
    console.log('Signer:', getSignerAddress(config.privateKey))
  }

  /**
   * Get server time (for testing connection)
   */
  async getServerTime(): Promise<number> {
    const response = await this.client.get('/fapi/v1/time')
    return response.data.serverTime
  }

  /**
   * Get exchange info (symbols, leverage brackets, etc.)
   */
  async getExchangeInfo(symbol?: string): Promise<any> {
    const params = symbol ? { symbol } : {}
    const response = await this.client.get('/fapi/v1/exchangeInfo', { params })
    return response.data
  }

  /**
   * Get account balance
   */
  async getAccountBalance(): Promise<AccountBalance> {
    const { headers, body, url } = prepareSignedRequest(
      '/fapi/v3/balance',
      {},
      {
        userAddress: this.config.userAddress,
        privateKey: this.config.privateKey
      }
    )

    const response = await this.client.get(url, {
      headers,
      params: body
    })

    const balances = response.data

    // Sum up total balance (assuming USDT)
    const usdtBalance = balances.find((b: any) => b.asset === 'USDT')

    return {
      totalBalance: parseFloat(usdtBalance?.balance || '0'),
      availableBalance: parseFloat(usdtBalance?.availableBalance || '0'),
      marginUsed: parseFloat(usdtBalance?.crossWalletBalance || '0') - parseFloat(usdtBalance?.availableBalance || '0'),
      unrealizedPnL: parseFloat(usdtBalance?.crossUnPnl || '0')
    }
  }

  /**
   * Get current position for a symbol
   */
  async getPosition(symbol: string): Promise<Position | null> {
    const { headers, body, url } = prepareSignedRequest(
      '/fapi/v3/positionRisk',
      { symbol },
      {
        userAddress: this.config.userAddress,
        privateKey: this.config.privateKey
      }
    )

    const response = await this.client.get(url, {
      headers,
      params: body
    })

    const positions = response.data
    const position = positions.find((p: any) => p.symbol === symbol && parseFloat(p.positionAmt) !== 0)

    if (!position || parseFloat(position.positionAmt) === 0) {
      return null
    }

    // Convert AsterDEX position to our format
    const positionAmt = parseFloat(position.positionAmt)
    const entryPrice = parseFloat(position.entryPrice)
    const leverage = parseInt(position.leverage)

    return {
      id: `${symbol}_${Date.now()}`,
      symbol,
      side: positionAmt > 0 ? 'LONG' : 'SHORT',
      entryPrice,
      currentPrice: parseFloat(position.markPrice),
      positionSize: Math.abs(positionAmt),
      leverage,
      margin: parseFloat(position.isolatedMargin || position.initialMargin),
      tp1Price: 0, // Will be set by trading engine
      tp2Price: 0,
      tp3Price: 0,
      slPrice: 0,
      liqPrice: parseFloat(position.liquidationPrice),
      tp1Hit: false,
      tp2Hit: false,
      tp3Hit: false,
      unrealizedPnL: parseFloat(position.unRealizedProfit),
      status: 'OPEN',
      openedAt: new Date()
    }
  }

  /**
   * Get current market price for a symbol
   */
  async getCurrentPrice(symbol: string): Promise<number> {
    const response = await this.client.get('/fapi/v1/ticker/price', {
      params: { symbol }
    })
    return parseFloat(response.data.price)
  }

  /**
   * Get candlestick/kline data for charting
   * @param symbol - Trading pair (e.g., "BTCUSDT")
   * @param interval - Timeframe (e.g., "1h", "4h", "1d")
   * @param limit - Number of candles to fetch (max 1000)
   */
  async getKlines(symbol: string, interval: string = '1h', limit: number = 100): Promise<any[]> {
    const response = await this.client.get('/fapi/v1/klines', {
      params: {
        symbol,
        interval,
        limit
      }
    })

    // Transform Binance-style klines to our format
    return response.data.map((kline: any[]) => ({
      time: Math.floor(kline[0] / 1000), // Convert ms to seconds
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5])
    }))
  }

  /**
   * Set leverage for a symbol
   */
  async setLeverage(symbol: string, leverage: number): Promise<void> {
    const { headers, body, url } = prepareSignedRequest(
      '/fapi/v1/leverage',
      {
        symbol,
        leverage
      },
      {
        userAddress: this.config.userAddress,
        privateKey: this.config.privateKey
      }
    )

    await this.client.post(url, body, { headers })
    console.log(`Leverage set to ${leverage}x for ${symbol}`)
  }

  /**
   * Set position mode (One-Way or Hedge)
   */
  async setPositionMode(dualSidePosition: boolean): Promise<void> {
    const { headers, body, url } = prepareSignedRequest(
      '/fapi/v1/positionSide/dual',
      {
        dualSidePosition
      },
      {
        userAddress: this.config.userAddress,
        privateKey: this.config.privateKey
      }
    )

    await this.client.post(url, body, { headers })
    console.log(`Position mode set to ${dualSidePosition ? 'HEDGE' : 'ONE_WAY'}`)
  }

  /**
   * Place a MARKET order (for entry)
   */
  async placeMarketOrder(params: {
    symbol: string
    side: OrderSide
    quantity: number
    leverage?: number
  }): Promise<Order> {
    // Set leverage first if specified
    if (params.leverage) {
      await this.setLeverage(params.symbol, params.leverage)
    }

    const orderParams: Record<string, any> = {
      symbol: params.symbol,
      side: params.side,
      type: 'MARKET',
      quantity: params.quantity.toString(),
      positionSide: 'BOTH'  // One-way mode
    }

    const { headers, body, url } = prepareSignedRequest(
      '/fapi/v1/order',
      orderParams,
      {
        userAddress: this.config.userAddress,
        privateKey: this.config.privateKey
      }
    )

    const response = await this.client.post(url, body, { headers })
    const data = response.data

    return {
      orderId: data.orderId.toString(),
      clientOrderId: data.clientOrderId,
      symbol: data.symbol,
      side: data.side,
      type: data.type,
      quantity: parseFloat(data.origQty),
      status: data.status,
      executedQty: parseFloat(data.executedQty),
      avgPrice: parseFloat(data.avgPrice || data.price || '0'),
      createdAt: new Date(data.updateTime || Date.now())
    }
  }

  /**
   * Place a TAKE_PROFIT_MARKET order
   */
  async placeTakeProfitOrder(params: {
    symbol: string
    side: OrderSide
    stopPrice: number
    quantity: number
  }): Promise<Order> {
    const orderParams: Record<string, any> = {
      symbol: params.symbol,
      side: params.side,
      type: 'TAKE_PROFIT_MARKET',
      stopPrice: params.stopPrice.toString(),
      quantity: params.quantity.toString(),
      reduceOnly: 'true',
      positionSide: 'BOTH',
      workingType: 'MARK_PRICE'
    }

    const { headers, body, url } = prepareSignedRequest(
      '/fapi/v1/order',
      orderParams,
      {
        userAddress: this.config.userAddress,
        privateKey: this.config.privateKey
      }
    )

    const response = await this.client.post(url, body, { headers })
    const data = response.data

    return {
      orderId: data.orderId.toString(),
      symbol: data.symbol,
      side: data.side,
      type: data.type,
      quantity: parseFloat(data.origQty),
      stopPrice: parseFloat(data.stopPrice),
      status: data.status,
      executedQty: 0,
      createdAt: new Date(data.updateTime || Date.now())
    }
  }

  /**
   * Place a STOP_MARKET order (for stop loss)
   */
  async placeStopLossOrder(params: {
    symbol: string
    side: OrderSide
    stopPrice: number
    quantity: number
  }): Promise<Order> {
    const orderParams: Record<string, any> = {
      symbol: params.symbol,
      side: params.side,
      type: 'STOP_MARKET',
      stopPrice: params.stopPrice.toString(),
      quantity: params.quantity.toString(),
      reduceOnly: 'true',
      positionSide: 'BOTH',
      workingType: 'MARK_PRICE'
    }

    const { headers, body, url } = prepareSignedRequest(
      '/fapi/v1/order',
      orderParams,
      {
        userAddress: this.config.userAddress,
        privateKey: this.config.privateKey
      }
    )

    const response = await this.client.post(url, body, { headers })
    const data = response.data

    return {
      orderId: data.orderId.toString(),
      symbol: data.symbol,
      side: data.side,
      type: data.type,
      quantity: parseFloat(data.origQty),
      stopPrice: parseFloat(data.stopPrice),
      status: data.status,
      executedQty: 0,
      createdAt: new Date(data.updateTime || Date.now())
    }
  }

  /**
   * Close entire position at market price
   */
  async closePosition(symbol: string, side: 'LONG' | 'SHORT'): Promise<Order> {
    const closeSide: OrderSide = side === 'LONG' ? 'SELL' : 'BUY'

    const orderParams: Record<string, any> = {
      symbol,
      side: closeSide,
      type: 'MARKET',
      closePosition: 'true',
      positionSide: 'BOTH'
    }

    const { headers, body, url } = prepareSignedRequest(
      '/fapi/v1/order',
      orderParams,
      {
        userAddress: this.config.userAddress,
        privateKey: this.config.privateKey
      }
    )

    const response = await this.client.post(url, body, { headers })
    const data = response.data

    return {
      orderId: data.orderId.toString(),
      symbol: data.symbol,
      side: data.side,
      type: data.type,
      quantity: parseFloat(data.origQty),
      status: data.status,
      executedQty: parseFloat(data.executedQty),
      avgPrice: parseFloat(data.avgPrice || '0'),
      createdAt: new Date(data.updateTime || Date.now())
    }
  }

  /**
   * Cancel all open orders for a symbol
   */
  async cancelAllOrders(symbol: string): Promise<void> {
    const { headers, body, url } = prepareSignedRequest(
      '/fapi/v1/allOpenOrders',
      { symbol },
      {
        userAddress: this.config.userAddress,
        privateKey: this.config.privateKey
      }
    )

    await this.client.delete(url, {
      headers,
      params: body
    })

    console.log(`All orders canceled for ${symbol}`)
  }

  /**
   * Get order by ID
   */
  async getOrder(symbol: string, orderId: string): Promise<Order | null> {
    const { headers, body, url } = prepareSignedRequest(
      '/fapi/v1/order',
      {
        symbol,
        orderId
      },
      {
        userAddress: this.config.userAddress,
        privateKey: this.config.privateKey
      }
    )

    try {
      const response = await this.client.get(url, {
        headers,
        params: body
      })

      const data = response.data

      return {
        orderId: data.orderId.toString(),
        clientOrderId: data.clientOrderId,
        symbol: data.symbol,
        side: data.side,
        type: data.type,
        quantity: parseFloat(data.origQty),
        price: parseFloat(data.price || '0'),
        stopPrice: parseFloat(data.stopPrice || '0'),
        status: data.status,
        executedQty: parseFloat(data.executedQty),
        avgPrice: parseFloat(data.avgPrice || '0'),
        createdAt: new Date(data.time)
      }
    } catch (error) {
      console.error('Error getting order:', error)
      return null
    }
  }

  /**
   * Wait for order to be filled (with timeout)
   */
  async waitForFill(symbol: string, orderId: string, maxWaitMs: number = 10000): Promise<boolean> {
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitMs) {
      const order = await this.getOrder(symbol, orderId)

      if (!order) {
        return false
      }

      if (order.status === 'FILLED') {
        return true
      }

      if (order.status === 'CANCELED' || order.status === 'REJECTED' || order.status === 'EXPIRED') {
        return false
      }

      // Wait 500ms before checking again
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    return false
  }
}

/**
 * Create AsterDEX client from environment variables
 */
export function createAsterClient(): AsterDEXClient {
  // Use API Wallet if provided, otherwise use main wallet
  const userAddress = process.env.ASTER_DEX_KEY!
  const apiWalletAddress = process.env.API_WALLET_ADDRESS
  const apiWalletPrivateKey = process.env.API_WALLET_PRIVATE_KEY

  const config: AsterDEXConfig = {
    userAddress: userAddress,
    privateKey: apiWalletPrivateKey || process.env.ASTER_SECRET_KEY!,
    apiUrl: process.env.ASTER_API_URL || 'https://fapi.asterdex.com',
    wsUrl: process.env.ASTER_WS_URL || 'wss://fstream.asterdex.com'
  }

  return new AsterDEXClient(config)
}
