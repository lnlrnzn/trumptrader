export interface Tweet {
  id: string
  tweet_id: string
  text: string
  author: {
    username: string
    name?: string
    id?: string
  }
  created_at: string
  received_at?: string
  metrics?: {
    likes: number
    retweets: number
    replies: number
    views?: number
  }
  analysis?: LLMDecision
}

export interface TwitterWebhookPayload {
  event: 'tweet_matched'
  rule_id: string
  rule_tag: string
  tweets: Array<{
    id: string
    text: string
    author: {
      username: string
      name?: string
      id?: string
    }
    created_at: string
    metrics?: {
      likes: number
      retweets: number
      replies: number
    }
  }>
  timestamp: string
}

export interface LLMDecision {
  id?: string
  tweetId: string
  signal: 'LONG' | 'SHORT' | 'HOLD'
  confidence: number  // 0-100
  reasoning: string
  expected_magnitude?: 'small' | 'medium' | 'large'
  executed: boolean
  createdAt?: Date
}

export interface TwitterFilterRule {
  rule_id?: string
  tag: string
  value: string  // e.g., "from:realDonaldTrump"
  interval_seconds: number
  active?: boolean
}
