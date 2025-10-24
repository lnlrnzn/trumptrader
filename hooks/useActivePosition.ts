import { useQuery } from '@tanstack/react-query'
import type { Trade } from './useTrades'

export function useActivePosition() {
  return useQuery({
    queryKey: ['position', 'active'],
    queryFn: async (): Promise<Trade | null> => {
      const response = await fetch('/api/position/active')
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    refetchInterval: 5000 // Refetch every 5 seconds for real-time PnL
  })
}
