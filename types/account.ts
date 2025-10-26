/**
 * TypeScript types for Twitter account management
 */

export interface TwitterAccount {
  id: string
  username: string // Twitter handle (without @)
  display_name: string // Display name
  enabled: boolean // Active/inactive toggle
  custom_prompt: string | null // Account-specific LLM prompt
  confidence_multiplier: number // Weight factor (0.0-1.0)
  symbols: string[] // Trading symbols (e.g., ["BTCUSDT"])
  position_size_percent: number | null // Override global setting
  min_confidence_threshold: number | null // Override global threshold
  leverage: number | null // Override global leverage
  created_at: Date
  updated_at: Date
}

export interface CreateAccountInput {
  username: string
  display_name: string
  enabled?: boolean
  custom_prompt?: string | null
  confidence_multiplier?: number
  symbols?: string[]
  position_size_percent?: number | null
  min_confidence_threshold?: number | null
  leverage?: number | null
}

export interface UpdateAccountInput {
  username?: string
  display_name?: string
  enabled?: boolean
  custom_prompt?: string | null
  confidence_multiplier?: number
  symbols?: string[]
  position_size_percent?: number | null
  min_confidence_threshold?: number | null
  leverage?: number | null
}

export interface AccountStats {
  account_id: string
  username: string
  display_name: string
  total_trades: number
  open_trades: number
  closed_trades: number
  total_pnl: number
  win_rate: number // Percentage of profitable trades
  avg_confidence: number
  last_trade_at: Date | null
}

export interface AccountWithStats extends TwitterAccount {
  stats: AccountStats | null
}

export interface Tweet {
  id: string
  tweet_id: string
  text: string
  author_username: string
  author_name: string
  created_at: Date
  received_at: Date
  metrics: {
    likes?: number
    retweets?: number
    replies?: number
  } | null
  source_account_id: string | null
}

export interface LLMDecision {
  id: string
  tweet_id: string
  source_account_id: string | null
  signal: 'LONG' | 'SHORT' | 'HOLD'
  confidence: number // Original confidence
  adjusted_confidence: number // After applying confidence_multiplier
  reasoning: string
  expected_magnitude: 'small' | 'medium' | 'large' | null
  executed: boolean
  created_at: Date
}

export interface AccountTestResult {
  success: boolean
  decision?: LLMDecision
  error?: string
}
