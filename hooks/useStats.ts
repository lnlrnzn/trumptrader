import { useQuery } from '@tanstack/react-query'

export interface Stats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalPnl: number
  bestTrade: {
    id: string
    symbol: string
    side: string
    pnl: number
    pnlPercent: number
    entryPrice: number
    exitPrice: number
  } | null
  worstTrade: {
    id: string
    symbol: string
    side: string
    pnl: number
    pnlPercent: number
    entryPrice: number
    exitPrice: number
  } | null
  activePosition: {
    id: string
    symbol: string
    side: string
    entryPrice: number
    positionSize: number
    leverage: number
    margin: number
    tp1Price: number
    tp2Price: number
    tp3Price: number
    slPrice: number
    liqPrice: number
    openedAt: string
  } | null
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async (): Promise<Stats> => {
      const response = await fetch('/api/stats')
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    }
  })
}
