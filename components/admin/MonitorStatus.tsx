'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface WebhookStats {
  accounts: number
  totalTweetsReceived: number
  lastTweetAt: string | null
  webhookUrl: string
  publicUrl: string | null
}

export function MonitorStatus() {
  const [stats, setStats] = useState<WebhookStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/webhook-stats')
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
        setError(null)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to fetch webhook status')
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  // Copy webhook URL
  const copyWebhookUrl = () => {
    if (stats?.webhookUrl) {
      navigator.clipboard.writeText(stats.webhookUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-gray-400">Loading webhook status...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Webhook Status Card */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">📡 Twitter Webhook Monitor</h2>
            <p className="text-gray-400 text-sm">Real-time tweet notifications via TwitterAPI.io</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 text-blue-300">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="font-medium text-sm">Webhook Ready</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-gray-400 text-xs mb-1">Monitored Accounts</div>
            <div className="text-2xl font-bold">{stats?.accounts || 0}</div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-gray-400 text-xs mb-1">Tweets Received</div>
            <div className="text-2xl font-bold text-blue-400">{stats?.totalTweetsReceived || 0}</div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-gray-400 text-xs mb-1">Last Tweet</div>
            <div className="text-sm font-medium">
              {stats?.lastTweetAt
                ? formatDistanceToNow(new Date(stats.lastTweetAt), { addSuffix: true })
                : 'Never'}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-900/30 border border-red-500 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Webhook Configuration Card */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">🔧 Setup Instructions</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Your Webhook URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={stats?.webhookUrl || ''}
                readOnly
                className="flex-1 px-4 py-2 bg-gray-700 rounded-lg font-mono text-sm"
              />
              <button
                onClick={copyWebhookUrl}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
              >
                {copied ? '✓ Copied!' : 'Copy URL'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              For local development, use <a href="https://ngrok.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">ngrok</a> to expose your localhost
            </p>
          </div>

          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-green-400 mb-3">📝 Configure Webhook in TwitterAPI.io</h4>
            <ol className="text-sm text-gray-300 space-y-2">
              <li className="flex">
                <span className="font-bold text-green-400 mr-2">1.</span>
                <span>Go to <a href="https://twitterapi.io/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">TwitterAPI.io Dashboard</a></span>
              </li>
              <li className="flex">
                <span className="font-bold text-green-400 mr-2">2.</span>
                <span>Navigate to <strong>Tweet Filter Rules</strong> page</span>
              </li>
              <li className="flex">
                <span className="font-bold text-green-400 mr-2">3.</span>
                <div className="flex-1">
                  <span>Click <strong>Add Rule</strong> and configure:</span>
                  <ul className="mt-2 space-y-1 ml-4">
                    <li>• <strong>Webhook URL:</strong> Paste the URL from above</li>
                    <li>• <strong>Filter Rule:</strong> <code className="bg-gray-700 px-2 py-0.5 rounded text-xs">from:realDonaldTrump</code> (or other monitored accounts)</li>
                    <li>• <strong>Interval:</strong> <code className="bg-gray-700 px-2 py-0.5 rounded text-xs">60 seconds</code></li>
                    <li>• <strong>Label:</strong> Give it a name like "Trump Trader"</li>
                  </ul>
                </div>
              </li>
              <li className="flex">
                <span className="font-bold text-green-400 mr-2">4.</span>
                <span>Click <strong>Save</strong> and <strong>Activate</strong> the rule</span>
              </li>
            </ol>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-blue-400 mb-2">💡 How It Works</h4>
            <ul className="text-sm text-gray-300 space-y-1.5">
              <li>• TwitterAPI.io checks Twitter every 60 seconds for new tweets from your monitored accounts</li>
              <li>• When a new tweet is found, it POSTs the data to your webhook URL</li>
              <li>• The bot analyzes the tweet with AI and executes trades automatically</li>
              <li>• You can monitor multiple accounts by adding OR rules: <code className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">from:user1 OR from:user2</code></li>
            </ul>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-400 mb-2">💰 Cost Estimate</h4>
            <p className="text-sm text-gray-300 mb-2">
              With 60-second interval (1 check per minute):
            </p>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• <strong>~1,440 checks per day</strong> × $0.00012 = <strong>$0.17/day</strong></li>
              <li>• <strong>~43,200 checks per month</strong> × $0.00012 = <strong>~$5/month</strong></li>
              <li>• Additional $0.00015 per tweet found and processed</li>
            </ul>
            <p className="text-xs text-gray-400 mt-2">
              Adjust interval based on your needs. Longer intervals = lower costs.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
