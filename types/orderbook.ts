export interface OrderbookLevel {
  price: number
  size: number
  total: number
}

export interface OrderbookData {
  lastUpdateId: number
  timestamp: number
  bids: OrderbookLevel[]
  asks: OrderbookLevel[]
  bestBid: number
  bestAsk: number
  spread: number
  spreadPercent: number
  midPrice: number
}

export interface RawOrderbookResponse {
  lastUpdateId: number
  E: number // Event time
  T: number // Transaction time
  bids: [string, string][] // [price, quantity]
  asks: [string, string][] // [price, quantity]
}
