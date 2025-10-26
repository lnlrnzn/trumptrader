'use client'

import { useEffect, useState } from 'react'
import type { TwitterAccount, AccountWithStats, CreateAccountInput } from '@/types/account'
import { MonitorStatus } from '@/components/admin/MonitorStatus'

export default function AdminPage() {
  const [accounts, setAccounts] = useState<AccountWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<TwitterAccount | null>(null)
  const [testingAccount, setTestingAccount] = useState<string | null>(null)
  const [testTweet, setTestTweet] = useState('')
  const [testResult, setTestResult] = useState<any>(null)

  // Form state
  const [formData, setFormData] = useState<CreateAccountInput>({
    username: '',
    display_name: '',
    enabled: true,
    confidence_multiplier: 1.0,
    symbols: ['BTCUSDT'],
    custom_prompt: null
  })

  // Fetch accounts
  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/accounts?stats=true')
      const data = await response.json()

      if (data.success) {
        setAccounts(data.data)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  // Handle create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingAccount
        ? `/api/accounts/${editingAccount.id}`
        : '/api/accounts'

      const method = editingAccount ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message)
        setShowModal(false)
        setEditingAccount(null)
        resetForm()
        fetchAccounts()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error saving account:', error)
      alert('Failed to save account')
    }
  }

  // Handle delete
  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Are you sure you want to delete @${username}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message)
        fetchAccounts()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account')
    }
  }

  // Handle toggle
  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentStatus })
      })

      const data = await response.json()

      if (data.success) {
        fetchAccounts()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error toggling account:', error)
    }
  }

  // Handle test analysis
  const handleTest = async (accountId: string) => {
    if (!testTweet.trim()) {
      alert('Please enter a test tweet')
      return
    }

    try {
      const response = await fetch(`/api/accounts/${accountId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweet_text: testTweet })
      })

      const data = await response.json()

      if (data.success) {
        setTestResult(data.data)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error testing account:', error)
      alert('Failed to test account')
    }
  }

  // Open modal for adding
  const openAddModal = () => {
    resetForm()
    setEditingAccount(null)
    setShowModal(true)
  }

  // Open modal for editing
  const openEditModal = (account: TwitterAccount) => {
    setFormData({
      username: account.username,
      display_name: account.display_name,
      enabled: account.enabled,
      confidence_multiplier: account.confidence_multiplier,
      symbols: account.symbols,
      custom_prompt: account.custom_prompt,
      position_size_percent: account.position_size_percent,
      min_confidence_threshold: account.min_confidence_threshold,
      leverage: account.leverage
    })
    setEditingAccount(account)
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      username: '',
      display_name: '',
      enabled: true,
      confidence_multiplier: 1.0,
      symbols: ['BTCUSDT'],
      custom_prompt: null
    })
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">⚙️ Account Management</h1>
            <p className="text-gray-400">Manage Twitter accounts for automated trading</p>
          </div>
          <button
            onClick={openAddModal}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition"
          >
            + Add Account
          </button>
        </div>

        {/* Twitter Monitor Status */}
        <div className="mb-8">
          <MonitorStatus />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Total Accounts</div>
            <div className="text-2xl font-bold">{accounts.length}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Enabled</div>
            <div className="text-2xl font-bold text-green-500">
              {accounts.filter(a => a.enabled).length}
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Total Trades</div>
            <div className="text-2xl font-bold">
              {accounts.reduce((sum, a) => sum + (a.stats?.total_trades || 0), 0)}
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Total PnL</div>
            <div className={`text-2xl font-bold ${
              accounts.reduce((sum, a) => sum + (a.stats?.total_pnl || 0), 0) >= 0
                ? 'text-green-500'
                : 'text-red-500'
            }`}>
              ${accounts.reduce((sum, a) => sum + (a.stats?.total_pnl || 0), 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Accounts Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-400">Loading accounts...</div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <div className="text-gray-400 mb-4">No accounts configured</div>
            <button
              onClick={openAddModal}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition"
            >
              Add Your First Account
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Account</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Symbols</th>
                  <th className="px-4 py-3 text-left">Multiplier</th>
                  <th className="px-4 py-3 text-left">Stats</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-750">
                    <td className="px-4 py-4">
                      <div className="font-medium">@{account.username}</div>
                      <div className="text-sm text-gray-400">{account.display_name}</div>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggle(account.id, account.enabled)}
                        className={`px-3 py-1 rounded-full text-sm ${
                          account.enabled
                            ? 'bg-green-900 text-green-300'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {account.enabled ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">{account.symbols.join(', ')}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">{(account.confidence_multiplier * 100).toFixed(0)}%</div>
                    </td>
                    <td className="px-4 py-4">
                      {account.stats ? (
                        <div className="text-sm">
                          <div>{account.stats.total_trades} trades</div>
                          <div className={account.stats.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                            ${account.stats.total_pnl.toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No trades yet</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                      <button
                        onClick={() => setTestingAccount(testingAccount === account.id ? null : account.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => openEditModal(account)}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(account.id, account.username)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Test Panel */}
        {testingAccount && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">🧪 Test Analysis</h2>
              <button
                onClick={() => {
                  setTestingAccount(null)
                  setTestTweet('')
                  setTestResult(null)
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Test Tweet</label>
                <textarea
                  value={testTweet}
                  onChange={(e) => setTestTweet(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded h-24"
                  placeholder="Enter a sample tweet to test the LLM analysis..."
                />
              </div>

              <button
                onClick={() => handleTest(testingAccount)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
              >
                Analyze Tweet
              </button>

              {testResult && (
                <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                  <h3 className="font-bold mb-3 text-lg">Analysis Result</h3>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-400">Signal</div>
                      <div className={`text-2xl font-bold ${
                        testResult.signal === 'LONG' ? 'text-green-500' :
                        testResult.signal === 'SHORT' ? 'text-red-500' :
                        'text-gray-400'
                      }`}>
                        {testResult.signal}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Confidence</div>
                      <div className="text-2xl font-bold">
                        {testResult.confidence}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Adjusted Confidence</div>
                      <div className="text-2xl font-bold">
                        {testResult.adjusted_confidence}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Expected Magnitude</div>
                      <div className="text-lg font-medium capitalize">
                        {testResult.expected_magnitude || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400 mb-2">Reasoning</div>
                    <div className="text-sm bg-gray-800 p-3 rounded">
                      {testResult.reasoning}
                    </div>
                  </div>

                  {testResult.adjusted_confidence >= 75 && testResult.signal !== 'HOLD' && (
                    <div className="mt-4 p-3 bg-green-900 border border-green-700 rounded">
                      <div className="font-medium text-green-300">✅ Trade Would Execute</div>
                      <div className="text-sm text-green-400 mt-1">
                        Confidence is above threshold - this would trigger a {testResult.signal} position
                      </div>
                    </div>
                  )}

                  {testResult.adjusted_confidence < 75 && testResult.signal !== 'HOLD' && (
                    <div className="mt-4 p-3 bg-yellow-900 border border-yellow-700 rounded">
                      <div className="font-medium text-yellow-300">⚠️ Trade Would Not Execute</div>
                      <div className="text-sm text-yellow-400 mt-1">
                        Confidence is below threshold ({testResult.adjusted_confidence}% {'<'} 75%)
                      </div>
                    </div>
                  )}

                  {testResult.signal === 'HOLD' && (
                    <div className="mt-4 p-3 bg-gray-600 border border-gray-500 rounded">
                      <div className="font-medium text-gray-300">⏸️ No Trade Signal</div>
                      <div className="text-sm text-gray-400 mt-1">
                        LLM determined this tweet does not warrant a trade
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">
                {editingAccount ? 'Edit Account' : 'Add New Account'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Username (no @)</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 rounded"
                      placeholder="realDonaldTrump"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Display Name</label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 rounded"
                      placeholder="Donald Trump"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Confidence Multiplier ({(formData.confidence_multiplier || 1) * 100}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formData.confidence_multiplier}
                    onChange={(e) => setFormData({ ...formData, confidence_multiplier: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Multiplies LLM confidence score (0% = ignore, 100% = full weight)
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Custom LLM Prompt (optional)</label>
                  <textarea
                    value={formData.custom_prompt || ''}
                    onChange={(e) => setFormData({ ...formData, custom_prompt: e.target.value || null })}
                    className="w-full px-3 py-2 bg-gray-700 rounded h-32"
                    placeholder="Leave empty to use default Trump-focused prompt..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="enabled" className="text-sm">Enabled</label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingAccount(null)
                      resetForm()
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
                  >
                    {editingAccount ? 'Update Account' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
