'use client'

import { useStats } from '@/hooks/useStats'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function HeroStats() {
  const { data: stats, isLoading, error } = useStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted w-1/2 animate-pulse"></div>
              <div className="h-8 bg-muted w-3/4 animate-pulse"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load stats</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
      {/* Win Rate */}
      <StatCard
        title="Win Rate"
        value={`${stats?.winRate || 0}%`}
        description={`${stats?.winningTrades || 0} wins / ${stats?.losingTrades || 0} losses`}
        trend={stats && stats.winRate >= 50 ? 'up' : 'down'}
        positive={stats && stats.winRate >= 50}
      />

      {/* Total PnL */}
      <StatCard
        title="Total PnL"
        value={`$${(stats?.totalPnl || 0).toFixed(2)}`}
        description={`${stats?.totalTrades || 0} total trades`}
        trend={stats && stats.totalPnl >= 0 ? 'up' : 'down'}
        positive={stats && stats.totalPnl >= 0}
      />

      {/* Best Trade */}
      <StatCard
        title="Best Trade"
        value={stats?.bestTrade ? `$${stats.bestTrade.pnl.toFixed(2)}` : 'N/A'}
        description={stats?.bestTrade ? `${stats.bestTrade.symbol} ${stats.bestTrade.side} (${stats.bestTrade.pnlPercent.toFixed(1)}%)` : 'No trades yet'}
        positive={true}
      />

      {/* Worst Trade */}
      <StatCard
        title="Worst Trade"
        value={stats?.worstTrade ? `$${stats.worstTrade.pnl.toFixed(2)}` : 'N/A'}
        description={stats?.worstTrade ? `${stats.worstTrade.symbol} ${stats.worstTrade.side} (${stats.worstTrade.pnlPercent.toFixed(1)}%)` : 'No trades yet'}
        positive={false}
      />
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
  description: string
  trend?: 'up' | 'down'
  positive?: boolean
}

function StatCard({ title, value, description, trend, positive }: StatCardProps) {
  const valueColor = positive ? 'text-green-600' : 'text-red-600'

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="py-2 px-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-lg font-bold ${valueColor}`}>{value}</span>
              {trend && (
                trend === 'up' ? (
                  <TrendingUp className={`h-3.5 w-3.5 ${valueColor}`} />
                ) : (
                  <TrendingDown className={`h-3.5 w-3.5 ${valueColor}`} />
                )
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/70">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
