'use client'

import { useOrderbook } from '@/hooks/useOrderbook'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { OrderbookLevel } from '@/types/orderbook'

export function OrderbookPanel() {
  const { data, isLoading, error } = useOrderbook()

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="py-2 px-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-muted animate-pulse"></div>
            <div className="h-4 w-16 bg-muted animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-4 bg-muted animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full border-destructive">
        <CardContent className="p-3">
          <p className="text-destructive text-sm">Failed to load orderbook</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  // Calculate max total for scaling visual bars
  const maxTotal = Math.max(
    ...data.bids.map(b => b.total),
    ...data.asks.map(a => a.total)
  )

  const renderOrderbookRow = (level: OrderbookLevel, type: 'bid' | 'ask') => {
    const percentage = (level.total / maxTotal) * 100
    const bgColor = type === 'bid' ? '#304141' : '#422c26'
    const textColor = type === 'bid' ? '#4ade80' : '#ef4444'

    return (
      <div
        key={`${type}-${level.price}`}
        className="relative h-5 md:h-5 lg:h-6 flex items-center text-[9px] md:text-[10px] lg:text-xs font-mono border-b border-border/20"
      >
        {/* Visual depth bar */}
        <div
          className={`absolute inset-y-0 ${type === 'bid' ? 'right-0' : 'left-0'}`}
          style={{ width: `${percentage}%`, backgroundColor: bgColor }}
        />

        {/* Data columns - Grid for consistent alignment */}
        <div className="relative z-10 grid grid-cols-3 gap-2 lg:gap-2 w-full px-3 lg:px-3">
          <span className="font-semibold text-left" style={{ color: textColor }}>
            {level.price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>
          <span className="text-muted-foreground text-right">
            {level.size.toFixed(4)}
          </span>
          <span className="text-muted-foreground/70 text-right">
            {level.total.toFixed(2)}
          </span>
        </div>
      </div>
    )
  }

  // Mobile: 7 levels, Tablet: 10 levels, Desktop: 14 levels (to fill fixed height)
  const levelsMobile = 7
  const levelsTablet = 10
  const levelsDesktop = 14

  return (
    <Card className="flex flex-col h-[calc(100vh-60px)]">
      {/* Header with Symbol, Spread, Mid Price */}
      <CardHeader className="py-2 lg:py-2 px-3 lg:px-3 border-b border-border flex-shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] lg:text-xs font-semibold">Orderbook</span>
            <span className="text-[10px] lg:text-xs text-muted-foreground">BTC/USDT</span>
          </div>
          <div className="flex items-center justify-between text-[9px] lg:text-[10px]">
            <div>
              <span className="text-muted-foreground">Mid: </span>
              <span className="text-primary font-mono font-semibold">
                ${data.midPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Spread: </span>
              <span className="text-primary font-mono">
                ${data.spread.toFixed(1)} ({data.spreadPercent.toFixed(3)}%)
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Column Headers */}
      <div className="px-3 lg:px-3 py-1 lg:py-1.5 border-b border-border flex-shrink-0" style={{ backgroundColor: '#191919' }}>
        <div className="grid grid-cols-3 gap-2 lg:gap-2 text-[9px] lg:text-[10px] text-muted-foreground font-semibold">
          <span className="text-left">Price (USDT)</span>
          <span className="text-right">Size (BTC)</span>
          <span className="text-right">Total</span>
        </div>
      </div>

      {/* Orderbook Content */}
      <CardContent className="p-0 flex-1 overflow-y-auto flex flex-col">
        {/* Asks - Reversed display (lowest ask at bottom) */}
        <div className="flex flex-col-reverse">
          {/* Mobile: 7 levels */}
          <div className="md:hidden">
            {data.asks.slice(0, levelsMobile).reverse().map(ask => renderOrderbookRow(ask, 'ask'))}
          </div>
          {/* Tablet: 10 levels */}
          <div className="hidden md:flex lg:hidden flex-col-reverse">
            {data.asks.slice(0, levelsTablet).reverse().map(ask => renderOrderbookRow(ask, 'ask'))}
          </div>
          {/* Desktop: 14 levels */}
          <div className="hidden lg:flex flex-col-reverse">
            {data.asks.slice(0, levelsDesktop).reverse().map(ask => renderOrderbookRow(ask, 'ask'))}
          </div>
        </div>

        {/* Spread Row - Visual Separator */}
        <div className="py-1.5 lg:py-2 px-3 lg:px-3 border-y border-border flex-shrink-0" style={{ backgroundColor: '#191919' }}>
          <div className="flex items-center justify-center gap-2 lg:gap-2 text-[10px] lg:text-xs">
            <span className="font-mono font-bold" style={{ color: '#4ade80' }}>
              {data.bestBid.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-primary font-semibold">↔</span>
            <span className="font-mono font-bold" style={{ color: '#ef4444' }}>
              {data.bestAsk.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
          </div>
        </div>

        {/* Bids - Normal display (highest bid at top) */}
        <div className="flex flex-col">
          {/* Mobile: 7 levels */}
          <div className="md:hidden">
            {data.bids.slice(0, levelsMobile).map(bid => renderOrderbookRow(bid, 'bid'))}
          </div>
          {/* Tablet: 10 levels */}
          <div className="hidden md:flex lg:hidden flex-col">
            {data.bids.slice(0, levelsTablet).map(bid => renderOrderbookRow(bid, 'bid'))}
          </div>
          {/* Desktop: 14 levels */}
          <div className="hidden lg:flex flex-col">
            {data.bids.slice(0, levelsDesktop).map(bid => renderOrderbookRow(bid, 'bid'))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
