'use client'

import { formatDistanceToNow, format } from 'date-fns'
import { useState } from 'react'
import type { Trade } from '@/hooks/useTrades'

interface TradeCardProps {
  trade: Trade
}

export function TradeCard({ trade }: TradeCardProps) {
  const [expanded, setExpanded] = useState(false)

  const isProfitable = (trade.realized_pnl || 0) > 0
  const isOpen = trade.status === 'OPEN'

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors shadow-sm">
      {/* Collapsed View */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Trade Info */}
          <div className="flex items-center gap-4 flex-1">
            {/* Side Badge */}
            <div className={`px-3 py-1 rounded font-bold text-sm ${
              trade.side === 'LONG' ? 'bg-green-600/20 text-green-700' : 'bg-red-600/20 text-red-700'
            }`}>
              {trade.side}
            </div>

            {/* Symbol & Leverage */}
            <div>
              <p className="text-foreground font-bold">{trade.symbol}</p>
              <p className="text-muted-foreground text-sm">{trade.leverage}x leverage</p>
            </div>

            {/* Prices */}
            <div className="hidden md:block">
              <p className="text-muted-foreground text-sm">Entry</p>
              <p className="text-foreground font-mono">${trade.entry_price.toFixed(2)}</p>
            </div>

            {trade.exit_price && (
              <div className="hidden md:block">
                <p className="text-muted-foreground text-sm">Exit</p>
                <p className="text-foreground font-mono">${trade.exit_price.toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* PnL */}
          <div className="text-right">
            {trade.realized_pnl !== null ? (
              <>
                <p className={`text-xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                  {isProfitable ? '+' : ''}${trade.realized_pnl.toFixed(2)}
                </p>
                <p className={`text-sm ${isProfitable ? 'text-green-700' : 'text-red-700'}`}>
                  {isProfitable ? '+' : ''}{trade.realized_pnl_percent?.toFixed(2)}%
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Open</p>
            )}
          </div>

          {/* Expand Arrow */}
          <div className="text-muted-foreground">
            {expanded ? '▼' : '▶'}
          </div>
        </div>
      </button>

      {/* Expanded View */}
      {expanded && (
        <div className="p-4 pt-0 border-t border-border space-y-4">
          {/* Tweet Context */}
          {trade.tweet && (
            <div className="p-3 border border-border" style={{ backgroundColor: '#191919' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Triggered by</span>
                {trade.source_account && (
                  <span className="text-sm font-bold text-foreground">
                    @{trade.source_account.username}
                  </span>
                )}
              </div>
              <p className="text-foreground text-sm italic">"{trade.tweet.text}"</p>
            </div>
          )}

          {/* LLM Decision */}
          {trade.llm_decision && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">LLM Analysis:</span>
                <span className="text-foreground font-mono text-sm">
                  {trade.llm_decision.adjusted_confidence.toFixed(1)}% confidence
                </span>
                {trade.llm_decision.expected_magnitude && (
                  <span className="text-muted-foreground text-sm">
                    ({trade.llm_decision.expected_magnitude} impact)
                  </span>
                )}
              </div>
              <p className="text-foreground text-sm pl-4 border-l-2 border-border">
                {trade.llm_decision.reasoning}
              </p>
            </div>
          )}

          {/* Trade Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DetailItem label="Entry Price" value={`$${trade.entry_price.toFixed(2)}`} />
            <DetailItem label="Position Size" value={trade.position_size.toFixed(4)} />
            <DetailItem label="Margin" value={`$${trade.margin.toFixed(2)}`} />
            <DetailItem label="Leverage" value={`${trade.leverage}x`} />
          </div>

          {/* Targets */}
          <div>
            <p className="text-zinc-400 text-sm mb-2">Targets & Stops</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <TargetItem label="TP1" price={trade.tp1_price} hit={trade.tp1_hit} />
              <TargetItem label="TP2" price={trade.tp2_price} hit={trade.tp2_hit} />
              <TargetItem label="TP3" price={trade.tp3_price} hit={trade.tp3_hit} />
              <TargetItem label="SL" price={trade.sl_price} hit={trade.sl_hit} isStop />
              <TargetItem label="Liq" price={trade.liq_price} isLiq />
            </div>
          </div>

          {/* Timestamps */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Opened {formatDistanceToNow(new Date(trade.opened_at), { addSuffix: true })}</span>
            {trade.closed_at && (
              <span>Closed {formatDistanceToNow(new Date(trade.closed_at), { addSuffix: true })}</span>
            )}
            {trade.exit_reason && (
              <span className="text-foreground">Exit: {trade.exit_reason}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="text-foreground font-mono text-sm">{value}</p>
    </div>
  )
}

function TargetItem({
  label,
  price,
  hit = false,
  isStop = false,
  isLiq = false
}: {
  label: string
  price: number
  hit?: boolean
  isStop?: boolean
  isLiq?: boolean
}) {
  return (
    <div
      className={`p-2 border ${
        hit ? 'border-green-500' :
        isStop ? 'border-red-500' :
        isLiq ? 'border-yellow-500' :
        'border-border'
      }`}
      style={{ backgroundColor: '#191919' }}
    >
      <p className={`text-xs font-bold ${
        hit ? 'text-green-500' :
        isStop ? 'text-red-500' :
        isLiq ? 'text-yellow-500' :
        'text-muted-foreground'
      }`}>
        {label} {hit && '✓'}
      </p>
      <p className="text-foreground font-mono text-xs">${price.toFixed(2)}</p>
    </div>
  )
}
