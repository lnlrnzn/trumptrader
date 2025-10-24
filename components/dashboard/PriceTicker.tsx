'use client'

import { usePriceTicker } from '@/hooks/usePriceTicker'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function PriceTicker() {
  const { data: ticker, isLoading } = usePriceTicker()

  if (isLoading || !ticker) {
    return (
      <Card>
        <CardContent className="py-2 px-3">
          <div className="flex items-center gap-4 md:gap-6 text-sm">
            <div className="h-5 w-32 bg-muted animate-pulse rounded"></div>
            <div className="h-5 w-24 bg-muted animate-pulse rounded"></div>
            <div className="h-5 w-24 bg-muted animate-pulse rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isPositive = ticker.priceChangePercent >= 0

  return (
    <Card>
      <CardContent className="py-2 px-3">
        <div className="flex items-center gap-3 md:gap-6 text-xs md:text-sm overflow-x-auto scrollbar-none">
          {/* Current Price */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-muted-foreground font-medium">BTC/USDT</span>
            <span className="text-primary font-bold text-base md:text-lg font-mono">
              ${ticker.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
          </div>

          {/* 24h Change */}
          <div className={`flex items-center gap-1.5 whitespace-nowrap ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            <span className="font-semibold">
              {isPositive ? '+' : ''}{ticker.priceChangePercent.toFixed(2)}%
            </span>
            <span className="text-muted-foreground text-[10px] md:text-xs">24h</span>
          </div>

          {/* 24h High */}
          <div className="hidden md:flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-muted-foreground text-[10px]">24h High</span>
            <span className="font-mono">${ticker.highPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
          </div>

          {/* 24h Low */}
          <div className="hidden md:flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-muted-foreground text-[10px]">24h Low</span>
            <span className="font-mono">${ticker.lowPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
          </div>

          {/* 24h Volume */}
          <div className="hidden lg:flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-muted-foreground text-[10px]">24h Vol</span>
            <span className="font-mono">
              {(ticker.quoteVolume / 1000000).toFixed(2)}M USDT
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
