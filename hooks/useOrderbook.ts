import { useQuery } from '@tanstack/react-query'
import { OrderbookData } from '@/types/orderbook'

export function useOrderbook() {
  return useQuery({
    queryKey: ['orderbook'],
    queryFn: async () => {
      const response = await fetch('/api/orderbook')
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      return result.data as OrderbookData
    },
    refetchInterval: 1500, // 1.5 seconds for fast updates
    staleTime: 1000 // Consider data stale after 1 second
  })
}
