'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActivePosition } from './ActivePosition'
import { TradeTable } from './TradeTable'
import { TweetFeed } from './TweetFeed'
import { Card } from '@/components/ui/card'
import { Target, History, MessageSquare } from 'lucide-react'

export function BottomTabs() {
  return (
    <Card className="border-t xl:flex-1 xl:flex xl:flex-col xl:min-h-[300px]">
      <Tabs defaultValue="position" className="w-full xl:flex-1 xl:flex xl:flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-11 p-0 xl:flex-shrink-0">
          <TabsTrigger
            value="position"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-11"
          >
            <Target className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Active </span>Position
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-11"
          >
            <History className="h-4 w-4 mr-2" />
            Trade History
          </TabsTrigger>
          <TabsTrigger
            value="tweets"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-11"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Tweets & </span>Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="position" className="m-0 p-4 max-h-[350px] xl:max-h-none xl:flex-1 overflow-y-auto">
          <ActivePosition />
        </TabsContent>

        <TabsContent value="history" className="m-0 p-0 xl:flex-1 xl:flex xl:flex-col">
          <div className="max-h-[350px] xl:max-h-none xl:flex-1 overflow-y-auto">
            <TradeTable />
          </div>
        </TabsContent>

        <TabsContent value="tweets" className="m-0 p-4 xl:flex-1 xl:flex xl:flex-col">
          <div className="max-h-[350px] xl:max-h-none xl:flex-1 overflow-y-auto">
            <TweetFeed />
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
}
