'use client'

import { useEffect, useRef, useState } from 'react'
import { useTrades } from '@/hooks/useTrades'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h'

export function TradingChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candleSeriesRef = useRef<any>(null)
  const [timeframe, setTimeframe] = useState<Timeframe>('1m')

  const { data: tradesData } = useTrades({ limit: 100 })

  // Fetch candlestick data from AsterDEX
  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['chart', timeframe],
    queryFn: async () => {
      const response = await fetch(`/api/chart/btc?interval=${timeframe}`)
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    refetchInterval: timeframe === '1m' ? 10000 : timeframe === '5m' ? 30000 : 60000 // Faster refresh for shorter timeframes
  })

  useEffect(() => {
    if (!chartContainerRef.current || !chartData) return

    // Dynamic import to avoid SSR issues
    import('lightweight-charts').then(({ createChart, ColorType }) => {
      if (!chartContainerRef.current) return

      // Remove existing chart
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }

      // Create chart with DEX-style dark background
      // Calculate height from container (responsive: 300px mobile, 400px tablet, flexible desktop)
      const containerHeight = chartContainerRef.current.clientHeight || 400
      const chartHeight = containerHeight > 0 ? containerHeight : 400

      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#191919' },
          textColor: '#a1a1aa'
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { color: '#18181b' }
        },
        width: chartContainerRef.current.clientWidth,
        height: chartHeight,
        timeScale: {
          timeVisible: true,
          secondsVisible: timeframe === '1m' // Show seconds for 1m charts
        },
        rightPriceScale: {
          borderColor: '#27272a'
        },
        crosshair: {
          vertLine: {
            color: '#efbe84',
            width: 1,
            style: 1,
            labelBackgroundColor: '#efbe84'
          },
          horzLine: {
            color: '#efbe84',
            width: 1,
            style: 1,
            labelBackgroundColor: '#efbe84'
          }
        }
      })

      chartRef.current = chart

      // Create candlestick series
      const candleSeries = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444'
      })

      candleSeriesRef.current = candleSeries

      // Load chart data
      if (chartData && chartData.length > 0) {
        candleSeries.setData(chartData)
        // Fit content to show all data
        chart.timeScale().fitContent()
      }

      // Add trade markers
      if (tradesData?.trades) {
        const markers = tradesData.trades
          .filter(trade => trade.opened_at)
          .map(trade => {
            const timestamp = Math.floor(new Date(trade.opened_at).getTime() / 1000)

            return {
              time: timestamp as any,
              position: (trade.side === 'LONG' ? 'belowBar' : 'aboveBar') as any,
              color: trade.side === 'LONG' ? '#22c55e' : '#ef4444',
              shape: (trade.side === 'LONG' ? 'arrowUp' : 'arrowDown') as any,
              text: `${trade.side} ${trade.leverage}x`
            }
          })

        candleSeries.setMarkers(markers)
      }

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth
          })
        }
      }

      window.addEventListener('resize', handleResize)

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize)
        if (chartRef.current) {
          chartRef.current.remove()
          chartRef.current = null
        }
      }
    })
  }, [timeframe, chartData, tradesData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [])

  if (chartLoading) {
    return (
      <div className="xl:flex-1 xl:min-h-[300px] xl:max-h-[500px] xl:flex xl:flex-col">
        <Card className="xl:flex-1 xl:flex xl:flex-col">
          <CardHeader className="py-2 px-3 xl:flex-shrink-0">
            <div className="flex items-center justify-end">
              <Select value={timeframe} onValueChange={(value) => setTimeframe(value as Timeframe)}>
                <SelectTrigger className="w-[90px] md:w-[110px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1m</SelectItem>
                  <SelectItem value="5m">5m</SelectItem>
                  <SelectItem value="15m">15m</SelectItem>
                  <SelectItem value="1h">1h</SelectItem>
                  <SelectItem value="4h">4h</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0 xl:flex-1">
            <div className="h-[300px] md:h-[400px] xl:h-full flex items-center justify-center" style={{ backgroundColor: '#191919' }}>
              <p className="text-muted-foreground">Loading chart data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const timeframeLabels: Record<Timeframe, string> = {
    '1m': '1 Minute',
    '5m': '5 Minutes',
    '15m': '15 Minutes',
    '1h': '1 Hour',
    '4h': '4 Hours'
  }

  const refreshIntervals: Record<Timeframe, number> = {
    '1m': 10,
    '5m': 30,
    '15m': 60,
    '1h': 60,
    '4h': 60
  }

  return (
    <div className="xl:flex-1 xl:min-h-[300px] xl:max-h-[500px] xl:flex xl:flex-col">
      <Card className="xl:flex-1 xl:flex xl:flex-col">
        <CardHeader className="py-2 px-3 xl:flex-shrink-0">
          <div className="flex items-center justify-end">
            {/* Timeframe Selector */}
            <Select value={timeframe} onValueChange={(value) => setTimeframe(value as Timeframe)}>
              <SelectTrigger className="w-[90px] md:w-[110px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1m</SelectItem>
                <SelectItem value="5m">5m</SelectItem>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="4h">4h</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0 xl:flex-1 xl:flex xl:flex-col">
          {/* Chart Container with responsive height */}
          <div className="h-[300px] md:h-[400px] xl:h-full relative xl:flex-1">
            <div ref={chartContainerRef} className="absolute inset-0" style={{ backgroundColor: '#191919' }} />
          </div>

        {/* Legend & Info - More compact on mobile */}
        <div className="px-3 md:px-6 py-2 md:py-4 space-y-2 md:space-y-3 border-t border-border">
          <div className="flex items-center justify-center gap-3 md:gap-6 text-xs md:text-sm">
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-green-600 rounded"></div>
              <span className="text-muted-foreground">LONG Entry</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-red-600 rounded"></div>
              <span className="text-muted-foreground">SHORT Entry</span>
            </div>
          </div>
          <p className="text-[10px] md:text-xs text-center text-muted-foreground">
            {timeframeLabels[timeframe]} • Auto-refresh every {refreshIntervals[timeframe]}s
          </p>
        </div>
      </CardContent>
      </Card>
    </div>
  )
}
