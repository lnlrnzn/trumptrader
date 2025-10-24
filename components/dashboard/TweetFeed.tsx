'use client'

import { useTweets } from '@/hooks/useTweets'
import { TweetCard } from './TweetCard'
import { Card, CardContent } from '@/components/ui/card'

export function TweetFeed() {
  const { data, isLoading, error } = useTweets({ limit: 20 })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-muted animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load tweets</p>
        </CardContent>
      </Card>
    )
  }

  if (!data?.tweets || data.tweets.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 pb-8 text-center">
          <p className="text-muted-foreground mb-2">No tweets yet</p>
          <p className="text-muted-foreground/70 text-sm">Waiting for signals from monitored accounts...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {data.tweets.map(tweet => (
        <TweetCard key={tweet.id} tweet={tweet} />
      ))}
    </div>
  )
}
