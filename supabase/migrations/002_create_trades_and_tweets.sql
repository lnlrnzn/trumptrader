-- Create tweets table to store received tweets
CREATE TABLE tweets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id TEXT NOT NULL UNIQUE, -- Twitter's tweet ID
  text TEXT NOT NULL,
  author_username TEXT NOT NULL, -- Twitter handle (e.g., "realDonaldTrump")
  author_name TEXT NOT NULL, -- Display name
  created_at TIMESTAMPTZ NOT NULL, -- When tweet was posted
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When we received it
  metrics JSONB, -- Likes, retweets, etc.
  source_account_id UUID REFERENCES twitter_accounts(id) ON DELETE SET NULL, -- Which monitored account this came from

  -- Indexes
  CONSTRAINT tweets_created_at_check CHECK (created_at <= received_at)
);

CREATE INDEX idx_tweets_author_username ON tweets(author_username);
CREATE INDEX idx_tweets_source_account_id ON tweets(source_account_id);
CREATE INDEX idx_tweets_created_at ON tweets(created_at DESC);

-- Create llm_decisions table to store analysis results
CREATE TABLE llm_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id UUID NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  source_account_id UUID REFERENCES twitter_accounts(id) ON DELETE SET NULL,
  signal TEXT NOT NULL CHECK (signal IN ('LONG', 'SHORT', 'HOLD')),
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  adjusted_confidence FLOAT NOT NULL CHECK (adjusted_confidence >= 0 AND adjusted_confidence <= 100), -- After applying confidence_multiplier
  reasoning TEXT NOT NULL,
  expected_magnitude TEXT CHECK (expected_magnitude IN ('small', 'medium', 'large')),
  executed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_llm_decisions_tweet_id ON llm_decisions(tweet_id);
CREATE INDEX idx_llm_decisions_source_account_id ON llm_decisions(source_account_id);
CREATE INDEX idx_llm_decisions_executed ON llm_decisions(executed);

-- Create trades/positions table
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Linking
  tweet_id UUID REFERENCES tweets(id) ON DELETE SET NULL,
  llm_decision_id UUID REFERENCES llm_decisions(id) ON DELETE SET NULL,
  source_account_id UUID NOT NULL REFERENCES twitter_accounts(id) ON DELETE RESTRICT, -- Which account triggered this trade

  -- Trade details
  symbol TEXT NOT NULL, -- e.g., "BTCUSDT"
  side TEXT NOT NULL CHECK (side IN ('LONG', 'SHORT')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'LIQUIDATED')),

  -- Entry
  entry_price FLOAT NOT NULL,
  position_size FLOAT NOT NULL, -- Quantity in contracts/coins
  leverage INTEGER NOT NULL,
  margin FLOAT NOT NULL, -- Margin used

  -- Targets
  tp1_price FLOAT NOT NULL,
  tp2_price FLOAT NOT NULL,
  tp3_price FLOAT NOT NULL,
  sl_price FLOAT NOT NULL,
  liq_price FLOAT NOT NULL,

  -- Target hit status
  tp1_hit BOOLEAN NOT NULL DEFAULT false,
  tp2_hit BOOLEAN NOT NULL DEFAULT false,
  tp3_hit BOOLEAN NOT NULL DEFAULT false,
  sl_hit BOOLEAN NOT NULL DEFAULT false,

  -- Exit
  exit_price FLOAT,
  exit_reason TEXT CHECK (exit_reason IN ('TP1', 'TP2', 'TP3', 'SL', 'LIQUIDATED', 'MANUAL', 'TIME_EXIT')),

  -- PnL
  realized_pnl FLOAT,
  realized_pnl_percent FLOAT,

  -- Timestamps
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,

  -- Order IDs (for tracking with exchange)
  entry_order_id TEXT,
  tp1_order_id TEXT,
  tp2_order_id TEXT,
  tp3_order_id TEXT,
  sl_order_id TEXT,

  CONSTRAINT trades_closed_check CHECK (
    (status = 'CLOSED' AND closed_at IS NOT NULL AND exit_price IS NOT NULL AND realized_pnl IS NOT NULL) OR
    (status = 'LIQUIDATED' AND closed_at IS NOT NULL) OR
    (status = 'OPEN' AND closed_at IS NULL)
  )
);

-- Indexes for trades
CREATE INDEX idx_trades_source_account_id ON trades(source_account_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_opened_at ON trades(opened_at DESC);
CREATE INDEX idx_trades_tweet_id ON trades(tweet_id);

-- Enable RLS
ALTER TABLE tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now, update with proper auth later)
CREATE POLICY "Allow all operations on tweets"
  ON tweets FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on llm_decisions"
  ON llm_decisions FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on trades"
  ON trades FOR ALL
  USING (true) WITH CHECK (true);

-- Comments
COMMENT ON TABLE tweets IS 'Stores tweets received from TwitterAPI.io webhook';
COMMENT ON TABLE llm_decisions IS 'Stores LLM analysis results for tweets';
COMMENT ON TABLE trades IS 'Stores all trading positions (open and closed)';
COMMENT ON COLUMN trades.source_account_id IS 'Links trade to the Twitter account that triggered it';
COMMENT ON COLUMN llm_decisions.adjusted_confidence IS 'Original confidence * account.confidence_multiplier';
