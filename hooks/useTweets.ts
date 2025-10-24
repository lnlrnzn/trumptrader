import { useQuery } from '@tanstack/react-query'

export interface Tweet {
  id: string
  tweet_id: string
  text: string
  author_username: string
  author_name: string
  created_at: string
  received_at: string
  metrics: any
  llm_decisions: Array<{
    id: string
    signal: 'LONG' | 'SHORT' | 'HOLD'
    confidence: number
    adjusted_confidence: number
    reasoning: string
    expected_magnitude: 'small' | 'medium' | 'large' | null
    executed: boolean
    created_at: string
  }>
  source_account: {
    id: string
    username: string
    display_name: string
  } | null
}

interface TweetsFilters {
  limit?: number
  offset?: number
}

export function useTweets(filters: TweetsFilters = {}) {
  const queryParams = new URLSearchParams()
  if (filters.limit) queryParams.set('limit', filters.limit.toString())
  if (filters.offset) queryParams.set('offset', filters.offset.toString())

  return useQuery({
    queryKey: ['tweets', filters],
    queryFn: async () => {
      const response = await fetch(`/api/tweets?${queryParams.toString()}`)
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error)
      }
      return {
        tweets: result.data as Tweet[],
        pagination: result.pagination
      }
    }
  })
}
