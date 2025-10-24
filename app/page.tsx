'use client'

import { HeroStats } from '@/components/dashboard/HeroStats'
import { TradingChart } from '@/components/dashboard/TradingChart'
import { PriceTicker } from '@/components/dashboard/PriceTicker'
import { OrderbookPanel } from '@/components/dashboard/OrderbookPanel'
import { RightPanel } from '@/components/dashboard/RightPanel'
import { BottomTabs } from '@/components/dashboard/BottomTabs'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Settings, Activity } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Compact DEX Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-[2000px] mx-auto px-3 md:px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <h1 className="text-sm md:text-base font-bold">
                Trump Trading Bot
              </h1>
              <Badge variant="outline" className="hidden md:flex text-[10px] px-1.5 py-0.5">
                <span className="w-1 h-1 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                LIVE
              </Badge>
            </div>

            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-2 py-1 hover:bg-muted rounded text-xs font-medium transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Trading Interface */}
      <main className="flex-1 max-w-[2000px] mx-auto w-full p-2">
        {/* Mobile: Stats First */}
        <section className="xl:hidden mb-2">
          <HeroStats />
        </section>

        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-2">
          {/* Chart Column */}
          <div className="lg:col-span-2 xl:col-span-6 flex flex-col gap-2 xl:h-[calc(100vh-68px)]">
            {/* Price Ticker */}
            <PriceTicker />

            {/* Chart */}
            <TradingChart />

            {/* Bottom Tabs (AsterDEX style) */}
            <BottomTabs />

            {/* Desktop: Stats at Bottom */}
            <div className="hidden xl:block">
              <HeroStats />
            </div>
          </div>

          {/* Orderbook - Hidden on mobile, shown on tablet+ */}
          <div className="hidden lg:block xl:col-span-3">
            <div className="sticky top-[52px]">
              <OrderbookPanel />
            </div>
          </div>

          {/* Right Panel - Full width on mobile, shares row with orderbook on tablet */}
          <div className="lg:col-span-2 xl:col-span-3">
            <div className="xl:sticky xl:top-[52px]">
              <RightPanel />
            </div>
          </div>
        </div>

        {/* Mobile Orderbook - Collapsible section at bottom */}
        <div className="lg:hidden mt-2">
          <OrderbookPanel />
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-border bg-card/30 mt-auto">
        <div className="max-w-[2000px] mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] md:text-xs text-muted-foreground">
            <p>AI Trading • Next.js • Supabase • Grok 4</p>
            <div className="flex items-center gap-3">
              <Link href="/admin" className="hover:text-primary transition-colors">
                Admin
              </Link>
              <span className="text-border">•</span>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
