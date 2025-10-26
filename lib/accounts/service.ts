/**
 * Twitter Account Management Service
 * Handles CRUD operations for monitored Twitter accounts
 */

import { createClient } from '@supabase/supabase-js'
import type {
  TwitterAccount,
  CreateAccountInput,
  UpdateAccountInput,
  AccountStats,
  AccountWithStats,
  AccountTestResult
} from '@/types/account'

export class AccountService {
  private supabase

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured')
    }

    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * Get all Twitter accounts
   */
  async getAllAccounts(): Promise<TwitterAccount[]> {
    const { data, error } = await this.supabase
      .from('twitter_accounts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching accounts:', error)
      throw new Error(`Failed to fetch accounts: ${error.message}`)
    }

    return data.map(this.mapDatabaseToAccount)
  }

  /**
   * Get only enabled accounts (for webhook processing)
   */
  async getEnabledAccounts(): Promise<TwitterAccount[]> {
    const { data, error } = await this.supabase
      .from('twitter_accounts')
      .select('*')
      .eq('enabled', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching enabled accounts:', error)
      throw new Error(`Failed to fetch enabled accounts: ${error.message}`)
    }

    return data.map(this.mapDatabaseToAccount)
  }

  /**
   * Get account by username
   */
  async getAccountByUsername(username: string): Promise<TwitterAccount | null> {
    const { data, error } = await this.supabase
      .from('twitter_accounts')
      .select('*')
      .eq('username', username)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      console.error('Error fetching account:', error)
      throw new Error(`Failed to fetch account: ${error.message}`)
    }

    return this.mapDatabaseToAccount(data)
  }

  /**
   * Get account by ID
   */
  async getAccountById(id: string): Promise<TwitterAccount | null> {
    const { data, error } = await this.supabase
      .from('twitter_accounts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching account:', error)
      throw new Error(`Failed to fetch account: ${error.message}`)
    }

    return this.mapDatabaseToAccount(data)
  }

  /**
   * Create new account
   */
  async createAccount(input: CreateAccountInput): Promise<TwitterAccount> {
    // Validate username doesn't exist
    const existing = await this.getAccountByUsername(input.username)
    if (existing) {
      throw new Error(`Account with username "${input.username}" already exists`)
    }

    const { data, error } = await this.supabase
      .from('twitter_accounts')
      .insert({
        username: input.username,
        display_name: input.display_name,
        enabled: input.enabled ?? true,
        custom_prompt: input.custom_prompt ?? null,
        confidence_multiplier: input.confidence_multiplier ?? 1.0,
        symbols: input.symbols ?? ['BTCUSDT'],
        position_size_percent: input.position_size_percent ?? null,
        min_confidence_threshold: input.min_confidence_threshold ?? null,
        leverage: input.leverage ?? null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating account:', error)
      throw new Error(`Failed to create account: ${error.message}`)
    }

    return this.mapDatabaseToAccount(data)
  }

  /**
   * Update account
   */
  async updateAccount(id: string, input: UpdateAccountInput): Promise<TwitterAccount> {
    const { data, error } = await this.supabase
      .from('twitter_accounts')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating account:', error)
      throw new Error(`Failed to update account: ${error.message}`)
    }

    return this.mapDatabaseToAccount(data)
  }

  /**
   * Delete account
   */
  async deleteAccount(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('twitter_accounts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting account:', error)
      throw new Error(`Failed to delete account: ${error.message}`)
    }
  }

  /**
   * Toggle account enabled status
   */
  async toggleAccount(id: string, enabled: boolean): Promise<TwitterAccount> {
    return this.updateAccount(id, { enabled })
  }

  /**
   * Get account statistics
   */
  async getAccountStats(accountId: string): Promise<AccountStats | null> {
    const { data: trades, error } = await this.supabase
      .from('trades')
      .select('*')
      .eq('source_account_id', accountId)

    if (error) {
      console.error('Error fetching account stats:', error)
      throw new Error(`Failed to fetch account stats: ${error.message}`)
    }

    if (!trades || trades.length === 0) {
      return null
    }

    const account = await this.getAccountById(accountId)
    if (!account) return null

    const openTrades = trades.filter(t => t.status === 'OPEN')
    const closedTrades = trades.filter(t => t.status === 'CLOSED')
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0)
    const profitableTrades = closedTrades.filter(t => (t.realized_pnl || 0) > 0)
    const winRate = closedTrades.length > 0 ? (profitableTrades.length / closedTrades.length) * 100 : 0

    // Get average confidence from decisions
    const { data: decisions } = await this.supabase
      .from('llm_decisions')
      .select('adjusted_confidence')
      .eq('source_account_id', accountId)

    const avgConfidence = decisions && decisions.length > 0
      ? decisions.reduce((sum, d) => sum + d.adjusted_confidence, 0) / decisions.length
      : 0

    const lastTrade = trades.sort((a, b) =>
      new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()
    )[0]

    return {
      account_id: accountId,
      username: account.username,
      display_name: account.display_name,
      total_trades: trades.length,
      open_trades: openTrades.length,
      closed_trades: closedTrades.length,
      total_pnl: totalPnl,
      win_rate: winRate,
      avg_confidence: avgConfidence,
      last_trade_at: lastTrade ? new Date(lastTrade.opened_at) : null
    }
  }

  /**
   * Get all accounts with stats
   */
  async getAllAccountsWithStats(): Promise<AccountWithStats[]> {
    const accounts = await this.getAllAccounts()

    const accountsWithStats = await Promise.all(
      accounts.map(async (account) => {
        const stats = await this.getAccountStats(account.id)
        return {
          ...account,
          stats: stats ?? null
        }
      })
    )

    return accountsWithStats
  }

  /**
   * Test account's LLM analysis
   */
  async testAccountAnalysis(accountId: string, tweetText: string): Promise<AccountTestResult> {
    try {
      const account = await this.getAccountById(accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      // Import LLM client
      const { createOpenRouterClient } = await import('@/lib/openrouter/client')
      const llmClient = createOpenRouterClient()

      // Analyze with account's custom prompt
      const decision = await llmClient.analyzeTweetWithPrompt(
        tweetText,
        account.custom_prompt || undefined,
        account.display_name
      )

      // Apply confidence multiplier
      const adjustedConfidence = Math.min(100, decision.confidence * account.confidence_multiplier)

      return {
        success: true,
        decision: {
          id: 'test',
          tweet_id: 'test',
          source_account_id: accountId,
          signal: decision.signal,
          confidence: decision.confidence,
          adjusted_confidence: adjustedConfidence,
          reasoning: decision.reasoning,
          expected_magnitude: decision.expected_magnitude || null,
          executed: false,
          created_at: new Date()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Map database row to TwitterAccount
   */
  private mapDatabaseToAccount(data: any): TwitterAccount {
    return {
      id: data.id,
      username: data.username,
      display_name: data.display_name,
      enabled: data.enabled,
      custom_prompt: data.custom_prompt,
      confidence_multiplier: data.confidence_multiplier,
      symbols: data.symbols,
      position_size_percent: data.position_size_percent,
      min_confidence_threshold: data.min_confidence_threshold,
      leverage: data.leverage,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at)
    }
  }
}

/**
 * Create AccountService instance
 */
export function createAccountService(): AccountService {
  return new AccountService()
}
