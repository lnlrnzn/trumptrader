import WebSocket from 'ws'
import { createClient } from '@supabase/supabase-js'

export interface MonitorConfig {
  apiKey: string
  webhookUrl: string
  checkInterval?: number // seconds, default 60
  reconnectDelay?: number // ms, default 5000
}

export interface MonitorStats {
  connected: boolean
  accounts: number
  totalTweetsReceived: number
  lastTweetAt: Date | null
  connectionStartedAt: Date | null
  reconnectCount: number
}

/**
 * Twitter Monitor Service
 * Monitors multiple Twitter accounts via WebSocket connection to TwitterAPI.io
 */
export class TwitterMonitor {
  private ws: WebSocket | null = null
  private config: MonitorConfig
  private stats: MonitorStats
  private reconnectTimeout: NodeJS.Timeout | null = null
  private pingTimeout: NodeJS.Timeout | null = null
  private shouldRun: boolean = false
  private filterRule: string = ''
  private monitoredAccounts: string[] = []

  constructor(config: MonitorConfig) {
    this.config = {
      checkInterval: 60,
      reconnectDelay: 5000,
      ...config
    }

    this.stats = {
      connected: false,
      accounts: 0,
      totalTweetsReceived: 0,
      lastTweetAt: null,
      connectionStartedAt: null,
      reconnectCount: 0
    }
  }

  /**
   * Start monitoring
   */
  async start(): Promise<void> {
    if (this.shouldRun) {
      console.log('⚠️  Monitor already running')
      return
    }

    console.log('🚀 Starting Twitter Monitor...')
    this.shouldRun = true

    // Load accounts from database
    await this.loadAccounts()

    // Connect to WebSocket
    await this.connect()
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping Twitter Monitor...')
    this.shouldRun = false

    // Clear timeouts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout)
      this.pingTimeout = null
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.stats.connected = false
    console.log('✅ Monitor stopped')
  }

  /**
   * Get current stats
   */
  getStats(): MonitorStats {
    return { ...this.stats }
  }

  /**
   * Reload accounts from database
   */
  async reloadAccounts(): Promise<void> {
    console.log('🔄 Reloading accounts...')
    await this.loadAccounts()

    // Reconnect if running
    if (this.shouldRun && this.ws) {
      console.log('🔄 Reconnecting with new filter rules...')
      await this.stop()
      await this.start()
    }
  }

  /**
   * Load enabled accounts from database
   */
  private async loadAccounts(): Promise<void> {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data: accounts, error } = await supabase
        .from('twitter_accounts')
        .select('username')
        .eq('enabled', true)

      if (error) {
        throw error
      }

      this.monitoredAccounts = accounts?.map(a => a.username) || []
      this.stats.accounts = this.monitoredAccounts.length

      // Build filter rule: "from:user1 OR from:user2 OR from:user3"
      if (this.monitoredAccounts.length > 0) {
        this.filterRule = this.monitoredAccounts
          .map(username => `from:${username}`)
          .join(' OR ')
      } else {
        this.filterRule = ''
      }

      console.log(`📋 Loaded ${this.stats.accounts} accounts`)
      console.log(`🔍 Filter rule: ${this.filterRule}`)
    } catch (error) {
      console.error('❌ Error loading accounts:', error)
      throw error
    }
  }

  /**
   * Connect to TwitterAPI.io WebSocket
   */
  private async connect(): Promise<void> {
    if (!this.shouldRun) return

    if (this.monitoredAccounts.length === 0) {
      console.log('⚠️  No accounts to monitor, skipping connection')
      return
    }

    try {
      console.log('🔌 Connecting to TwitterAPI.io WebSocket...')

      // Build WebSocket URL with filter rule and interval
      const wsUrl = `wss://ws.twitterapi.io/twitter/tweet/websocket?rule=${encodeURIComponent(this.filterRule)}&interval=${this.config.checkInterval}`

      this.ws = new WebSocket(wsUrl, {
        headers: {
          'X-API-Key': this.config.apiKey
        }
      })

      this.ws.on('open', () => {
        console.log('✅ WebSocket connected')
        this.stats.connected = true
        this.stats.connectionStartedAt = new Date()
        this.resetPingTimeout()
      })

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data.toString())
      })

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error)
        this.stats.connected = false
      })

      this.ws.on('close', () => {
        console.log('🔌 WebSocket closed')
        this.stats.connected = false

        if (this.pingTimeout) {
          clearTimeout(this.pingTimeout)
          this.pingTimeout = null
        }

        // Reconnect if still running
        if (this.shouldRun) {
          console.log(`🔄 Reconnecting in ${this.config.reconnectDelay}ms...`)
          this.stats.reconnectCount++

          this.reconnectTimeout = setTimeout(() => {
            this.connect()
          }, this.config.reconnectDelay)
        }
      })

    } catch (error) {
      console.error('❌ Connection error:', error)
      this.stats.connected = false

      // Retry connection
      if (this.shouldRun) {
        this.reconnectTimeout = setTimeout(() => {
          this.connect()
        }, this.config.reconnectDelay)
      }
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data)

      switch (message.event) {
        case 'connected':
          console.log('🎉 Connected event received')
          console.log('Message:', message.message)
          break

        case 'ping':
          // Heartbeat - reset timeout
          this.resetPingTimeout()
          break

        case 'tweet':
          console.log('🐦 New tweet received!')
          this.handleTweet(message)
          break

        default:
          console.log('📨 Unknown message type:', message.event)
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error)
    }
  }

  /**
   * Handle received tweet
   */
  private async handleTweet(message: any): Promise<void> {
    try {
      this.stats.totalTweetsReceived++
      this.stats.lastTweetAt = new Date()

      console.log('Tweet:', message.tweet?.text?.substring(0, 100))
      console.log('Author:', message.tweet?.author?.username)

      // Convert to webhook payload format and process
      const payload = {
        event: 'tweet_matched',
        rule_id: message.rule_id || 'websocket',
        rule_tag: 'websocket_monitor',
        tweets: [message.tweet],
        timestamp: new Date().toISOString()
      }

      // Call internal webhook processor
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Call': 'true' // Mark as internal call
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        console.error('❌ Webhook processing failed:', await response.text())
      } else {
        console.log('✅ Tweet processed successfully')
      }

    } catch (error) {
      console.error('❌ Error handling tweet:', error)
    }
  }

  /**
   * Reset ping timeout (heartbeat mechanism)
   */
  private resetPingTimeout(): void {
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout)
    }

    // If no ping received in 90 seconds, assume connection dead
    this.pingTimeout = setTimeout(() => {
      console.log('⚠️  No ping received, connection may be dead')
      if (this.ws) {
        this.ws.close()
      }
    }, 90000)
  }
}

// Singleton instance
let monitorInstance: TwitterMonitor | null = null

/**
 * Get or create monitor instance
 */
export function getMonitor(): TwitterMonitor {
  if (!monitorInstance) {
    const apiKey = process.env.TWITTER_API_KEY
    const webhookUrl = process.env.NEXT_PUBLIC_WS_URL
      ? `${process.env.NEXT_PUBLIC_WS_URL}/api/twitter-webhook`
      : 'http://localhost:3000/api/twitter-webhook'

    if (!apiKey) {
      throw new Error('TWITTER_API_KEY not configured')
    }

    monitorInstance = new TwitterMonitor({
      apiKey,
      webhookUrl,
      checkInterval: 60, // Check every 60 seconds
      reconnectDelay: 5000 // Reconnect after 5 seconds
    })
  }

  return monitorInstance
}

/**
 * Initialize monitor (called at app startup)
 */
export async function initializeMonitor(): Promise<void> {
  try {
    const monitor = getMonitor()
    await monitor.start()
    console.log('✅ Twitter Monitor initialized')
  } catch (error) {
    console.error('❌ Failed to initialize monitor:', error)
  }
}
