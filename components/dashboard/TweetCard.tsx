'use client'

import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'
import type { Tweet } from '@/hooks/useTweets'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ChevronDown, ChevronRight, Rocket, TrendingDown, Pause, CheckCircle2 } from 'lucide-react'

interface TweetCardProps {
  tweet: Tweet
}

export function TweetCard({ tweet }: TweetCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Get the first (most recent) LLM decision
  const decision = tweet.llm_decisions?.[0]

  if (!decision) return null

  const signalConfig = {
    LONG: {
      variant: 'success' as const,
      icon: Rocket,
      label: 'LONG 🚀'
    },
    SHORT: {
      variant: 'destructive' as const,
      icon: TrendingDown,
      label: 'SHORT 📉'
    },
    HOLD: {
      variant: 'warning' as const,
      icon: Pause,
      label: 'HOLD ⏸️'
    }
  }

  const config = signalConfig[decision.signal]
  const SignalIcon = config.icon

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        {/* Tweet Header */}
        <div className="flex items-start gap-3 mb-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {tweet.author_name.charAt(0).toUpperCase()}
          </div>

          {/* Author Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-foreground">{tweet.author_name}</p>
              <p className="text-muted-foreground text-sm">@{tweet.author_username}</p>
            </div>
            <p className="text-muted-foreground text-xs">
              {formatDistanceToNow(new Date(tweet.created_at), { addSuffix: true })}
            </p>
          </div>

          {/* Signal Badge */}
          <Badge variant={config.variant} className="flex items-center gap-1.5 text-sm px-3 py-1.5">
            <SignalIcon className="h-3.5 w-3.5" />
            {decision.signal}
          </Badge>
        </div>

        {/* Tweet Text */}
        <p className="text-foreground mb-4 leading-relaxed text-sm">{tweet.text}</p>

        <Separator className="mb-4" />

        {/* LLM Analysis */}
        <div className="space-y-3">
          {/* Confidence */}
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground font-medium">AI Confidence</span>
              <span className="text-foreground font-mono font-bold">{decision.adjusted_confidence.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  decision.signal === 'LONG' ? 'bg-green-600' :
                  decision.signal === 'SHORT' ? 'bg-red-600' :
                  'bg-yellow-500'
                }`}
                style={{ width: `${decision.adjusted_confidence}%` }}
              />
            </div>
          </div>

          {/* Reasoning (Expandable) */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 px-2 text-xs w-full justify-start"
            >
              {expanded ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
              Analysis Reasoning
            </Button>
            {expanded && (
              <div className="mt-2 p-3 border-l-2 border-primary" style={{ backgroundColor: '#191919' }}>
                <p className="text-foreground text-xs leading-relaxed">
                  {decision.reasoning}
                </p>
              </div>
            )}
          </div>

          {/* Trade Status */}
          {decision.executed && (
            <div className="flex items-center gap-2 p-2 border border-green-600/30" style={{ backgroundColor: '#191919' }}>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div className="flex-1">
                <span className="text-green-500 font-semibold text-xs">Trade Executed</span>
                {decision.expected_magnitude && (
                  <span className="text-muted-foreground text-xs ml-2">
                    ({decision.expected_magnitude} impact)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
