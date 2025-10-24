'use client'

import { useActivePosition } from '@/hooks/useActivePosition'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, AlertTriangle, Skull } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export function ActivePosition() {
  const { data: position, isLoading } = useActivePosition()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3 animate-pulse mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse"></div>
            <div className="h-4 bg-muted rounded animate-pulse"></div>
            <div className="h-4 bg-muted rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!position) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Position</CardTitle>
          <CardDescription>No open position</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Waiting for next signal...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const targetHits = [position.tp1_hit, position.tp2_hit, position.tp3_hit].filter(Boolean).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl">{position.symbol}</CardTitle>
            <CardDescription>
              Opened {formatDistanceToNow(new Date(position.opened_at), { addSuffix: true })}
            </CardDescription>
          </div>
          <Badge variant={position.side === 'LONG' ? 'success' : 'destructive'} className="text-sm px-3 py-1">
            {position.side} {position.leverage}x
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Entry Info Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Entry Price</p>
            <p className="text-sm font-mono font-bold">${position.entry_price.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Position Size</p>
            <p className="text-sm font-mono font-bold">{position.position_size.toFixed(4)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Margin</p>
            <p className="text-sm font-mono font-bold">${position.margin.toFixed(2)}</p>
          </div>
        </div>

        <Separator />

        {/* Targets Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Targets Hit</span>
            <Badge variant="outline">{targetHits}/3</Badge>
          </div>

          {/* TP Levels */}
          <div className="space-y-2">
            <TargetLevel
              label="TP1"
              price={position.tp1_price}
              hit={position.tp1_hit}
            />
            <TargetLevel
              label="TP2"
              price={position.tp2_price}
              hit={position.tp2_hit}
            />
            <TargetLevel
              label="TP3"
              price={position.tp3_price}
              hit={position.tp3_hit}
            />
          </div>
        </div>

        <Separator />

        {/* Stop Loss & Liquidation */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2 p-3 border border-red-600/30" style={{ backgroundColor: '#191919' }}>
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-red-500">Stop Loss</p>
              <p className="text-sm font-mono font-bold">${position.sl_price.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 border border-yellow-600/30" style={{ backgroundColor: '#191919' }}>
            <Skull className="h-4 w-4 text-yellow-500 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-yellow-500">Liquidation</p>
              <p className="text-sm font-mono font-bold">${position.liq_price.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Tweet Context */}
        {position.tweet && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Triggered by</p>
              <p className="text-sm italic text-foreground/90 line-clamp-2">
                "{position.tweet.text}"
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function TargetLevel({ label, price, hit }: { label: string; price: number; hit: boolean }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-md transition-colors hover:bg-muted/50">
      <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
        hit ? 'bg-green-600' : 'bg-muted'
      }`}>
        {hit && <Check className="h-4 w-4 text-white" />}
      </div>
      <div className="flex-1 flex justify-between items-center">
        <span className={`text-sm font-medium ${hit ? 'text-green-700' : 'text-muted-foreground'}`}>
          {label}
        </span>
        <span className={`text-sm font-mono ${hit ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
          ${price.toFixed(2)}
        </span>
      </div>
    </div>
  )
}
