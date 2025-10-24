-- Create twitter_accounts table for managing monitored Twitter accounts
CREATE TABLE twitter_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE, -- Twitter handle (e.g., "realDonaldTrump")
  display_name TEXT NOT NULL, -- Display name (e.g., "Donald Trump")
  enabled BOOLEAN NOT NULL DEFAULT true, -- Active/inactive toggle
  custom_prompt TEXT, -- Account-specific LLM prompt (nullable, falls back to default)
  confidence_multiplier FLOAT NOT NULL DEFAULT 1.0 CHECK (confidence_multiplier >= 0 AND confidence_multiplier <= 1), -- Weight factor (0.0-1.0)
  symbols TEXT[] NOT NULL DEFAULT ARRAY['BTCUSDT'], -- Assets to trade (e.g., ["BTCUSDT", "ETHUSDT"])
  position_size_percent FLOAT CHECK (position_size_percent > 0 AND position_size_percent <= 100), -- Override global setting
  min_confidence_threshold FLOAT CHECK (min_confidence_threshold >= 0 AND min_confidence_threshold <= 100), -- Override global (e.g., 75)
  leverage INTEGER CHECK (leverage > 0 AND leverage <= 125), -- Override global (e.g., 100x)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on username for fast lookups
CREATE INDEX idx_twitter_accounts_username ON twitter_accounts(username);

-- Create index on enabled accounts for webhook filtering
CREATE INDEX idx_twitter_accounts_enabled ON twitter_accounts(enabled) WHERE enabled = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_twitter_accounts_updated_at
  BEFORE UPDATE ON twitter_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default account (Donald Trump)
INSERT INTO twitter_accounts (
  username,
  display_name,
  enabled,
  custom_prompt,
  confidence_multiplier,
  symbols,
  position_size_percent,
  min_confidence_threshold,
  leverage
) VALUES (
  'realDonaldTrump',
  'Donald Trump',
  true,
  'You are a crypto trading analyst specializing in analyzing Donald Trump''s tweets for Bitcoin price impact.

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
}',
  1.0,
  ARRAY['BTCUSDT'],
  NULL, -- Use global setting
  NULL, -- Use global setting (75)
  NULL  -- Use global setting (100)
);

-- Enable Row Level Security (optional, for future admin auth)
ALTER TABLE twitter_accounts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (update this later with proper auth)
CREATE POLICY "Allow all operations on twitter_accounts"
  ON twitter_accounts
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE twitter_accounts IS 'Stores configuration for monitored Twitter accounts';
COMMENT ON COLUMN twitter_accounts.username IS 'Twitter handle without @ symbol';
COMMENT ON COLUMN twitter_accounts.custom_prompt IS 'Account-specific LLM system prompt. If NULL, uses default prompt.';
COMMENT ON COLUMN twitter_accounts.confidence_multiplier IS 'Multiplier applied to LLM confidence score (0.0 = ignore, 1.0 = full weight)';
COMMENT ON COLUMN twitter_accounts.symbols IS 'Array of trading symbols this account can trigger (e.g., ["BTCUSDT", "ETHUSDT"])';
