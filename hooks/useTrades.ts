import { useQuery } from '@tanstack/react-query'

export interface Trade {
  id: string
  symbol: string
  side: 'LONG' | 'SHORT'
  status: 'OPEN' | 'CLOSED' | 'LIQUIDATED'
  entry_price: number
  exit_price: number | null
  exit_reason: string | null
  position_size: number
  leverage: number
  margin: number
  tp1_price: number
  tp2_price: number
  tp3_price: number
  sl_price: number
  liq_price: number
  tp1_hit: boolean
  tp2_hit: boolean
  tp3_hit: boolean
  sl_hit: boolean
  realized_pnl: number | null
  realized_pnl_percent: number | null
  opened_at: string
  closed_at: string | null
  tweet: {
    id: string
    tweet_id: string
    text: string
    author_username: string
    author_name: string
    created_at: string
  } | null
  llm_decision: {
    signal: 'LONG' | 'SHORT' | 'HOLD'
    confidence: number
    adjusted_confidence: number
    reasoning: string
    expected_magnitude: 'small' | 'medium' | 'large' | null
  } | null
  source_account: {
    id: string
    username: string
    display_name: string
  } | null
}

interface TradesFilters {
  account?: string
  signal?: 'LONG' | 'SHORT'
  status?: 'OPEN' | 'CLOSED'
  limit?: number
  offset?: number
}

export function useTrades(filters: TradesFilters = {}) {
  const queryParams = new URLSearchParams()
  if (filters.account) queryParams.set('account', filters.account)
  if (filters.signal) queryParams.set('signal', filters.signal)
  if (filters.status) queryParams.set('status', filters.status)
  if (filters.limit) queryParams.set('limit', filters.limit.toString())
  if (filters.offset) queryParams.set('offset', filters.offset.toString())

  return useQuery({
    queryKey: ['trades', filters],
    queryFn: async () => {
      const response = await fetch(`/api/trades?${queryParams.toString()}`)
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error)
      }
      return {
        trades: result.data as Trade[],
        pagination: result.pagination
      }
    }
  })
}
