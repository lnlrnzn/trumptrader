'use client'

import { useState } from 'react'
import { useTrades, type Trade } from '@/hooks/useTrades'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { formatDistanceToNow } from 'date-fns'
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TradeTable() {
  const [signalFilter, setSignalFilter] = useState<'LONG' | 'SHORT' | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'CLOSED' | undefined>(undefined)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const { data, isLoading, error } = useTrades({
    signal: signalFilter,
    status: statusFilter,
    limit: 50
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load trades</p>
        </CardContent>
      </Card>
    )
  }

  const trades = data?.trades || []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Trade History</CardTitle>
            <CardDescription>{trades.length} trades total</CardDescription>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={signalFilter || 'all'} onValueChange={(value) => setSignalFilter(value === 'all' ? undefined : value as 'LONG' | 'SHORT')}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Signal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Signals</SelectItem>
                <SelectItem value="LONG">LONG</SelectItem>
                <SelectItem value="SHORT">SHORT</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? undefined : value as 'OPEN' | 'CLOSED')}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {trades.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No trades found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trades.map((trade) => (
              <TradeRow
                key={trade.id}
                trade={trade}
                expanded={expandedRow === trade.id}
                onToggle={() => setExpandedRow(expandedRow === trade.id ? null : trade.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface TradeRowProps {
  trade: Trade
  expanded: boolean
  onToggle: () => void
}

function TradeRow({ trade, expanded, onToggle }: TradeRowProps) {
  const pnl = trade.realized_pnl || 0
  const pnlPercent = trade.realized_pnl_percent || 0
  const isProfitable = pnl >= 0

  return (
    <div className="border border-border rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
      {/* Main Row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        <div className="flex-1 grid grid-cols-6 gap-4 items-center">
          {/* Symbol & Side */}
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{trade.symbol}</p>
            <Badge variant={trade.side === 'LONG' ? 'success' : 'destructive'} className="text-xs">
              {trade.side} {trade.leverage}x
            </Badge>
          </div>

          {/* Entry */}
          <div className="text-sm">
            <p className="text-muted-foreground text-xs">Entry</p>
            <p className="font-mono font-semibold">${trade.entry_price.toFixed(2)}</p>
          </div>

          {/* Exit */}
          <div className="text-sm">
            <p className="text-muted-foreground text-xs">Exit</p>
            <p className="font-mono font-semibold">
              {trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : '-'}
            </p>
          </div>

          {/* PnL */}
          <div className="text-sm">
            <p className="text-muted-foreground text-xs">PnL</p>
            <div className="flex items-center gap-1">
              <p className={`font-mono font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                ${pnl.toFixed(2)}
              </p>
              {trade.status === 'CLOSED' && (
                isProfitable ? <TrendingUp className="h-3 w-3 text-green-600" /> : <TrendingDown className="h-3 w-3 text-red-600" />
              )}
            </div>
            {trade.status === 'CLOSED' && (
              <p className={`text-xs ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%
              </p>
            )}
          </div>

          {/* Status */}
          <div className="text-sm">
            <Badge variant={trade.status === 'OPEN' ? 'outline' : trade.status === 'CLOSED' ? 'secondary' : 'destructive'}>
              {trade.status}
            </Badge>
          </div>

          {/* Time */}
          <div className="text-sm text-right">
            <p className="text-muted-foreground text-xs">
              {formatDistanceToNow(new Date(trade.opened_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <>
          <Separator />
          <div className="p-4 bg-muted/20 space-y-4">
            {/* Targets */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Take Profit Targets</p>
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-2 rounded border ${trade.tp1_hit ? 'bg-green-50 border-green-200' : 'bg-muted/50 border-border'}`}>
                  <p className="text-xs text-muted-foreground">TP1 {trade.tp1_hit && '✓'}</p>
                  <p className="text-sm font-mono">${trade.tp1_price.toFixed(2)}</p>
                </div>
                <div className={`p-2 rounded border ${trade.tp2_hit ? 'bg-green-50 border-green-200' : 'bg-muted/50 border-border'}`}>
                  <p className="text-xs text-muted-foreground">TP2 {trade.tp2_hit && '✓'}</p>
                  <p className="text-sm font-mono">${trade.tp2_price.toFixed(2)}</p>
                </div>
                <div className={`p-2 rounded border ${trade.tp3_hit ? 'bg-green-50 border-green-200' : 'bg-muted/50 border-border'}`}>
                  <p className="text-xs text-muted-foreground">TP3 {trade.tp3_hit && '✓'}</p>
                  <p className="text-sm font-mono">${trade.tp3_price.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Risk Levels */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-2 rounded border ${trade.sl_hit ? 'bg-red-50 border-red-200' : 'bg-muted/50 border-border'}`}>
                <p className="text-xs text-muted-foreground">Stop Loss {trade.sl_hit && '✓'}</p>
                <p className="text-sm font-mono">${trade.sl_price.toFixed(2)}</p>
              </div>
              <div className="p-2 rounded border bg-muted/50 border-border">
                <p className="text-xs text-muted-foreground">Liquidation</p>
                <p className="text-sm font-mono">${trade.liq_price.toFixed(2)}</p>
              </div>
            </div>

            {/* Tweet Context */}
            {trade.tweet && (
              <div className="p-3 bg-background border border-border rounded">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Triggered by tweet</p>
                <p className="text-sm italic">"{trade.tweet.text}"</p>
                <p className="text-xs text-muted-foreground mt-1">@{trade.tweet.author_username}</p>
              </div>
            )}

            {/* LLM Analysis */}
            {trade.llm_decision && (
              <div className="p-3 bg-background border border-border rounded">
                <p className="text-xs font-semibold text-muted-foreground mb-1">AI Analysis</p>
                <p className="text-sm">{trade.llm_decision.reasoning}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {trade.llm_decision.adjusted_confidence.toFixed(1)}% confidence
                  </Badge>
                  {trade.llm_decision.expected_magnitude && (
                    <Badge variant="outline" className="text-xs">
                      {trade.llm_decision.expected_magnitude} impact
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Exit Info */}
            {trade.status === 'CLOSED' && trade.exit_reason && (
              <div className="text-xs text-muted-foreground">
                Exit reason: {trade.exit_reason} • Closed {formatDistanceToNow(new Date(trade.closed_at!), { addSuffix: true })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
