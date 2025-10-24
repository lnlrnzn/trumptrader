'use client'

import { useState } from 'react'
import { useTrades } from '@/hooks/useTrades'
import { TradeCard } from './TradeCard'

export function TradeHistory() {
  const [filters, setFilters] = useState({
    account: undefined as string | undefined,
    signal: undefined as 'LONG' | 'SHORT' | undefined,
    status: undefined as 'OPEN' | 'CLOSED' | undefined
  })

  const { data, isLoading, error } = useTrades(filters)

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Trade History</h2>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Signal Filter */}
          <select
            value={filters.signal || ''}
            onChange={(e) => setFilters({ ...filters, signal: e.target.value as any || undefined })}
            className="px-3 py-2 bg-card border border-border rounded text-sm text-foreground hover:border-primary/50 transition-colors"
          >
            <option value="">All Signals</option>
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as any || undefined })}
            className="px-3 py-2 bg-card border border-border rounded text-sm text-foreground hover:border-primary/50 transition-colors"
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Clear Filters */}
          {(filters.signal || filters.status || filters.account) && (
            <button
              onClick={() => setFilters({ account: undefined, signal: undefined, status: undefined })}
              className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded text-sm transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse shadow-sm">
              <div className="h-6 bg-muted rounded w-1/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-6">
          <p className="text-destructive">Failed to load trades</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && (!data?.trades || data.trades.length === 0) && (
        <div className="bg-card border border-border rounded-lg p-8 text-center shadow-sm">
          <p className="text-muted-foreground mb-2">No trades found</p>
          <p className="text-muted-foreground/70 text-sm">Trades will appear here once signals are executed</p>
        </div>
      )}

      {/* Trade List */}
      {data?.trades && data.trades.length > 0 && (
        <div className="space-y-3">
          {data.trades.map(trade => (
            <TradeCard key={trade.id} trade={trade} />
          ))}

          {/* Pagination Info */}
          {data.pagination && (
            <div className="text-center text-sm text-muted-foreground pt-4">
              Showing {data.trades.length} of {data.pagination.total} trades
            </div>
          )}
        </div>
      )}
    </div>
  )
}
