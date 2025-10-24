export type OrderSide = 'BUY' | 'SELL'
export type OrderType = 'LIMIT' | 'MARKET' | 'STOP' | 'STOP_MARKET' | 'TAKE_PROFIT' | 'TAKE_PROFIT_MARKET' | 'TRAILING_STOP_MARKET'
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'GTX'
export type PositionSide = 'BOTH' | 'LONG' | 'SHORT'
export type PositionMode = 'ONE_WAY' | 'HEDGE'
export type OrderStatus = 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED'
export type TradeStatus = 'OPEN' | 'CLOSED' | 'LIQUIDATED'
export type SignalType = 'LONG' | 'SHORT' | 'HOLD'
export type ExitReason = 'TP1' | 'TP2' | 'TP3' | 'SL' | 'LIQUIDATED' | 'MANUAL' | 'TIME_EXIT'

export interface OrderParams {
  symbol: string
  side: OrderSide
  type: OrderType
  quantity?: number
  price?: number
  stopPrice?: number
  timeInForce?: TimeInForce
  reduceOnly?: boolean
  closePosition?: boolean
  positionSide?: PositionSide
  workingType?: 'MARK_PRICE' | 'CONTRACT_PRICE'
}

export interface Order {
  orderId: string
  clientOrderId?: string
  symbol: string
  side: OrderSide
  type: OrderType
  quantity: number
  price?: number
  stopPrice?: number
  status: OrderStatus
  executedQty: number
  avgPrice?: number
  createdAt: Date
}

export interface Position {
  id: string
  symbol: string
  side: 'LONG' | 'SHORT'
  entryPrice: number
  currentPrice?: number
  positionSize: number
  leverage: number
  margin: number

  // Targets
  tp1Price: number
  tp2Price: number
  tp3Price: number
  slPrice: number
  liqPrice: number

  // Hit status
  tp1Hit: boolean
  tp2Hit: boolean
  tp3Hit: boolean

  // PnL
  unrealizedPnL?: number
  unrealizedPnL_percent?: number
  realizedPnL?: number

  // Metadata
  status: TradeStatus
  openedAt: Date
  closedAt?: Date
  exitPrice?: number
  exitReason?: ExitReason

  // Related
  tweetId?: string
  llmDecisionId?: string
}

export interface PositionUpdate {
  currentPrice: number
  unrealizedPnL: number
  unrealizedPnL_percent: number
  distanceToLiq: number
  timeInPosition: number
}

export interface TradeTargets {
  tp1: number
  tp2: number
  tp3: number
  sl: number
  liq: number
}

export interface AccountBalance {
  totalBalance: number
  availableBalance: number
  marginUsed: number
  unrealizedPnL: number
}

export interface AsterDEXResponse<T = any> {
  code?: number
  msg?: string
  data?: T
}
