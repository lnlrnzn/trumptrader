import { useQuery } from '@tanstack/react-query'

export interface TickerData {
  symbol: string
  lastPrice: number
  priceChange: number
  priceChangePercent: number
  highPrice: number
  lowPrice: number
  volume: number
  quoteVolume: number
  openPrice: number
  closeTime: number
}

export function usePriceTicker() {
  return useQuery({
    queryKey: ['ticker'],
    queryFn: async () => {
      const response = await fetch('/api/ticker')
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data as TickerData
    },
    refetchInterval: 5000, // Update every 5 seconds
    staleTime: 3000
  })
}
