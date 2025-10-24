import type { LLMDecision } from '@/types/twitter'

export interface LLMAnalysisResult {
  signal: 'LONG' | 'SHORT' | 'HOLD'
  confidence: number
  reasoning: string
  expected_magnitude?: 'small' | 'medium' | 'large'
}

const TRADING_SYSTEM_PROMPT = `You are a crypto trading analyst specializing in analyzing Donald Trump's tweets for Bitcoin price impact.

Your task is to determine if a tweet will cause Bitcoin to go UP (LONG), DOWN (SHORT), or have NO IMPACT (HOLD).

Consider these factors:
1. Direct crypto mentions (Bitcoin, crypto, blockchain, digital currency)
2. Economic policy (inflation, Fed policy, interest rates, dollar strength)
3. War/peace signals (geopolitical tension, military actions)
4. Tech regulation (mentions of regulating tech companies, crypto regulation)
5. Market sentiment (positive/negative tone, fear/greed indicators)
6. Trade policy (tariffs, international trade, sanctions)

Confidence scoring:
- 90-100: Extremely clear signal with direct crypto mention or major policy announcement
- 75-89: Strong signal with indirect but significant impact
- 50-74: Moderate signal with unclear impact
- 0-49: Weak or neutral signal (use HOLD for these)

Expected magnitude:
- large: Major policy announcements, direct crypto statements, war/peace declarations
- medium: Economic policy changes, significant political events
- small: General commentary, minor news

Respond ONLY with valid JSON in this exact format:
{
  "signal": "LONG" | "SHORT" | "HOLD",
  "confidence": 0-100,
  "reasoning": "brief 1-2 sentence explanation",
  "expected_magnitude": "small" | "medium" | "large"
}

Examples:
- "Bitcoin is a scam! Total fraud!" → {"signal": "SHORT", "confidence": 95, "reasoning": "Direct negative Bitcoin statement from influential figure", "expected_magnitude": "large"}
- "I love crypto and blockchain technology!" → {"signal": "LONG", "confidence": 90, "reasoning": "Direct positive crypto endorsement", "expected_magnitude": "large"}
- "Meeting with Fed Chair Powell today to discuss inflation" → {"signal": "SHORT", "confidence": 72, "reasoning": "Fed meeting suggests potential rate hikes, negative for risk assets", "expected_magnitude": "medium"}
- "Just had a great burger!" → {"signal": "HOLD", "confidence": 5, "reasoning": "No relevance to crypto or financial markets", "expected_magnitude": "small"}
- "Terrible economic disaster coming" → {"signal": "SHORT", "confidence": 68, "reasoning": "Negative economic outlook typically bearish for crypto", "expected_magnitude": "medium"}
- "Big tech needs to be regulated NOW!" → {"signal": "SHORT", "confidence": 60, "reasoning": "Regulation threats can extend to crypto markets", "expected_magnitude": "medium"}
- "Peace deal with [country] - huge win!" → {"signal": "LONG", "confidence": 65, "reasoning": "Peace signals reduce uncertainty, positive for risk assets", "expected_magnitude": "medium"}

IMPORTANT: Only return the JSON, no other text.`

export class OpenRouterClient {
  private apiKey: string
  private baseUrl: string = 'https://openrouter.ai/api/v1'
  private model: string

  constructor(apiKey: string, model: string = 'x-ai/grok-4-fast') {
    if (!apiKey) {
      throw new Error('OpenRouter API key is required')
    }
    this.apiKey = apiKey
    this.model = model
  }

  /**
   * Analyze a tweet for trading signal with optional custom prompt
   */
  async analyzeTweetWithPrompt(
    tweetText: string,
    customPrompt?: string,
    accountName?: string
  ): Promise<LLMAnalysisResult> {
    try {
      const systemPrompt = customPrompt || TRADING_SYSTEM_PROMPT
      const contextName = accountName || 'this person'

      console.log(`🤖 Analyzing tweet${accountName ? ` from ${accountName}` : ''} with Grok 4...`)
      console.log('Tweet:', tweetText.substring(0, 100) + '...')

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000',
          'X-Title': 'Trump Trading Bot'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: `Analyze this tweet from ${contextName} for Bitcoin trading signal:\n\n"${tweetText}"`
            }
          ],
          temperature: 0.3,  // Lower temperature for more consistent output
          max_tokens: 200
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content

      if (!content) {
        throw new Error('No content in OpenRouter response')
      }

      // Parse JSON response
      let analysis: LLMAnalysisResult
      try {
        // Clean the content (remove markdown code blocks if present)
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        analysis = JSON.parse(cleanContent)
      } catch (parseError) {
        console.error('Failed to parse LLM response:', content)
        throw new Error('Invalid JSON response from LLM')
      }

      // Validate response structure
      if (!analysis.signal || !['LONG', 'SHORT', 'HOLD'].includes(analysis.signal)) {
        throw new Error('Invalid signal in LLM response')
      }

      if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 100) {
        throw new Error('Invalid confidence score in LLM response')
      }

      console.log('✅ LLM Analysis:', {
        signal: analysis.signal,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning
      })

      return analysis

    } catch (error) {
      console.error('❌ Error analyzing tweet with LLM:', error)

      // Return a safe default decision (HOLD with low confidence)
      return {
        signal: 'HOLD',
        confidence: 0,
        reasoning: `Error analyzing tweet: ${error instanceof Error ? error.message : 'Unknown error'}`,
        expected_magnitude: undefined
      }
    }
  }

  /**
   * Analyze a tweet for trading signal (backward compatible)
   * @deprecated Use analyzeTweetWithPrompt instead
   */
  async analyzeTweet(tweetText: string, tweetId: string): Promise<LLMDecision> {
    const analysis = await this.analyzeTweetWithPrompt(tweetText, undefined, 'Donald Trump')

    return {
      tweetId,
      signal: analysis.signal,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      expected_magnitude: analysis.expected_magnitude,
      executed: false,
      createdAt: new Date()
    }
  }

  /**
   * Test LLM connection
   */
  async test(): Promise<boolean> {
    try {
      const testTweet = "Bitcoin is the future of money!"
      const result = await this.analyzeTweet(testTweet, 'test_id')

      return result.signal !== undefined && result.confidence !== undefined
    } catch (error) {
      console.error('LLM test failed:', error)
      return false
    }
  }

  /**
   * Get available models (for debugging)
   */
  async getModels(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('Error fetching models:', error)
      return []
    }
  }
}

/**
 * Create OpenRouter client from environment variables
 */
export function createOpenRouterClient(): OpenRouterClient {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required')
  }

  // Use Grok 4 Fast (FREE) by default, fallback to Grok 4 if specified
  const model = process.env.OPENROUTER_MODEL || 'x-ai/grok-4-fast'

  return new OpenRouterClient(apiKey, model)
}
