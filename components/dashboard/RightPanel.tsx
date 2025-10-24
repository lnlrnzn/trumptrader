'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { TweetFeed } from './TweetFeed'
import { TradeTable } from './TradeTable'
import { MessageSquare, LineChart } from 'lucide-react'

export function RightPanel() {
  return (
    <Card className="flex flex-col h-[calc(100vh-60px)]">
      <Tabs defaultValue="tweets" className="w-full h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 m-2 mb-0">
          <TabsTrigger value="tweets" className="flex items-center gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" />
            Tweets
          </TabsTrigger>
          <TabsTrigger value="trades" className="flex items-center gap-1.5 text-xs">
            <LineChart className="h-3.5 w-3.5" />
            Trades
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tweets" className="m-2 mt-2 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <TweetFeed />
          </div>
        </TabsContent>

        <TabsContent value="trades" className="m-2 mt-2 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <TradeTable />
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
}
