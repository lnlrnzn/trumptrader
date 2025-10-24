import { Tweet, LLMDecision } from './twitter'
import { Position, PositionUpdate } from './trading'

export interface ServerToClientEvents {
  // Initial state
  initial_state: (data: InitialState) => void

  // Tweet events
  new_tweet: (tweet: Tweet) => void
  llm_decision: (decision: LLMDecision) => void

  // Trading events
  trade_executed: (position: Position) => void
  position_update: (update: PositionUpdate & { position: Position }) => void
  position_closed: (data: { position: Position; reason: string }) => void

  // Price updates
  price_update: (data: { symbol: string; price: number; timestamp: number }) => void

  // Alerts
  alert: (data: { type: 'warning' | 'error' | 'info'; message: string }) => void
  liquidation_warning: (data: { position: Position; distanceToLiq: number }) => void

  // System
  trading_status: (data: { enabled: boolean; reason?: string }) => void
}

export interface ClientToServerEvents {
  // Request current state
  get_state: () => void

  // Manual controls
  emergency_close: () => void
  toggle_trading: (enabled: boolean) => void
  manual_trade: (data: { signal: 'LONG' | 'SHORT'; size?: number }) => void

  // Subscribe to feeds
  subscribe_price: (symbol: string) => void
  unsubscribe_price: (symbol: string) => void
}

export interface InitialState {
  position: Position | null
  balance: {
    total: number
    available: number
    marginUsed: number
  }
  recentTweets: Tweet[]
  recentTrades: Position[]
  tradingEnabled: boolean
  systemStatus: {
    asterDEXConnected: boolean
    twitterConnected: boolean
    llmConnected: boolean
  }
}

export interface InterServerEvents {
  ping: () => void
}

export interface SocketData {
  userId?: string
  sessionId?: string
}
