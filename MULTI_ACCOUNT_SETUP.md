# Multi-Account Trading System - Setup Guide

## Overview

Your Trump trading bot now supports monitoring **multiple Twitter accounts** simultaneously, each with:
- Custom LLM analysis prompts
- Individual confidence multipliers
- Account-specific trading symbols
- Independent position sizing and leverage
- Per-account statistics tracking

---

## Quick Start

### 1. Run Database Migrations

**Option A: Supabase Dashboard** (Easiest)
1. Go to https://supabase.com/dashboard
2. Select your project → SQL Editor
3. Run these migrations in order:
   - Copy/paste `supabase/migrations/001_create_twitter_accounts.sql` → Execute
   - Copy/paste `supabase/migrations/002_create_trades_and_tweets.sql` → Execute

**Option B: Supabase CLI**
```bash
supabase db push
```

**Verify migrations**:
```sql
SELECT username, display_name, enabled FROM twitter_accounts;
```
You should see the default `realDonaldTrump` account.

---

### 2. Access Admin UI

Navigate to: **http://localhost:3000/admin**

You'll see:
- Total accounts, enabled accounts, total trades, total PnL
- Table of all accounts with status, symbols, multiplier, stats
- Add Account button

---

### 3. Add Your First Additional Account

Click **"+ Add Account"** and fill in:

**Example: Elon Musk**
```
Username: elonmusk (no @ symbol)
Display Name: Elon Musk
Confidence Multiplier: 80% (slider to 0.8)
Custom Prompt:
You are a crypto trading analyst analyzing Elon Musk's tweets for Bitcoin price impact.

Consider these factors:
1. Direct crypto mentions (Bitcoin, Dogecoin, crypto, blockchain)
2. Tesla/SpaceX announcements (affects risk appetite)
3. Memes and cultural impact (Elon's tweets move markets via sentiment)
4. Technology commentary (AI, autonomy, energy)
5. Market manipulation jokes (often sarcastic, gauge seriously)

Confidence scoring:
- 90-100: Direct Bitcoin mention or major company announcement
- 75-89: Crypto-adjacent topics or Tesla earnings
- 50-74: Tech commentary with indirect crypto impact
- 0-49: Memes or unrelated content (use HOLD)

Respond ONLY with valid JSON:
{
  "signal": "LONG" | "SHORT" | "HOLD",
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "expected_magnitude": "small" | "medium" | "large"
}
Enabled: ✓
```

Click **"Create Account"**

---

### 4. Configure TwitterAPI.io Webhook

Update your TwitterAPI.io filter rule to include multiple accounts:

**Filter Rule**:
```
from:realDonaldTrump OR from:elonmusk OR from:VitalikButerin
```

**Webhook URL**:
```
https://yourdomain.com/api/twitter-webhook
```

Now tweets from ANY of these accounts will be processed with their respective custom prompts and settings.

---

## Account Settings Explained

### Username
Twitter handle WITHOUT the @ symbol
- ✅ `realDonaldTrump`
- ❌ `@realDonaldTrump`

### Display Name
Human-readable name shown in UI and logs
- Used in LLM prompt context: "Analyze this tweet from {Display Name}..."

### Enabled/Disabled
Toggle to temporarily pause monitoring without deleting the account
- Disabled accounts won't trigger trades
- Tweets from disabled accounts are ignored

### Confidence Multiplier
Scales the LLM's confidence score before comparing to threshold
- `1.0` (100%) = Full weight (use LLM score as-is)
- `0.8` (80%) = Downweight slightly (e.g., less-trusted source)
- `0.5` (50%) = Half weight
- `0.0` (0%) = Effectively disabled (never trades)

**Example**:
- LLM returns 90% confidence
- Multiplier is 0.8
- Adjusted confidence = 90% × 0.8 = 72%
- If threshold is 75%, trade is NOT executed

### Symbols
Trading pairs to trade when this account tweets
- Default: `["BTCUSDT"]`
- Can add: `["BTCUSDT", "ETHUSDT"]` (trades all symbols)
- Currently trades the first symbol in the list

### Custom Prompt
Account-specific system prompt for LLM analysis
- If empty/null: Uses default Trump-focused prompt
- If provided: Replaces entire system prompt

**Prompt Tips**:
- Start with: "You are a crypto trading analyst analyzing [NAME]'s tweets for Bitcoin price impact."
- Define what to look for in THEIR specific tweets
- Set confidence thresholds appropriate for their influence
- Always end with the JSON schema requirement

### Position Size % (Optional)
Override global `MAX_POSITION_SIZE_PERCENT` for this account
- Leave empty = use global setting (15%)
- Set to 10% = only risk 10% of balance on this account's signals
- Set to 20% = allow larger positions for high-conviction sources

### Min Confidence Threshold (Optional)
Override global `MIN_CONFIDENCE_THRESHOLD` for this account
- Leave empty = use global setting (75%)
- Set to 85% = require higher confidence for this account
- Set to 60% = allow lower confidence (use for proven reliable sources)

### Leverage (Optional)
Override global `LEVERAGE` for this account
- Leave empty = use global setting (100x)
- Set to 50x = less risky trades for this account
- Set to 125x = max leverage for high-confidence sources

---

## How It Works

### Flow Diagram

```
Tweet arrives
   ↓
Webhook receives tweet
   ↓
Check: Is author in enabled accounts?
   ↓ YES
Load account config from database
   ↓
Analyze with account's custom_prompt
   ↓
Apply confidence_multiplier
   ↓
Check: adjusted_confidence >= account's min_threshold?
   ↓ YES
Execute trade with account's symbols/leverage/position_size
   ↓
Save to database with source_account_id
```

### Database Schema

**twitter_accounts** - Account configurations
- Stores: username, custom_prompt, confidence_multiplier, symbols, etc.

**tweets** - All received tweets
- Links to: source_account_id

**llm_decisions** - Analysis results
- Links to: tweet_id, source_account_id
- Stores: confidence, adjusted_confidence

**trades** - Executed positions
- Links to: tweet_id, llm_decision_id, source_account_id
- Allows filtering: "Show me all trades from Elon tweets"

---

## Testing an Account

Before going live, test your account's LLM analysis:

### Via Admin UI (Coming Soon)
1. Go to `/admin`
2. Click **"Test"** next to account
3. Enter sample tweet
4. See LLM decision with custom prompt

### Via API
```bash
curl -X POST http://localhost:3000/api/accounts/{ACCOUNT_ID}/test \
  -H "Content-Type: application/json" \
  -d '{"tweet_text": "Bitcoin to the moon! 🚀"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "signal": "LONG",
    "confidence": 85,
    "adjusted_confidence": 68,
    "reasoning": "Direct Bitcoin mention with positive sentiment",
    "expected_magnitude": "medium"
  }
}
```

---

## Account Management API

### List All Accounts
```bash
GET /api/accounts?stats=true
```

### Create Account
```bash
POST /api/accounts
{
  "username": "VitalikButerin",
  "display_name": "Vitalik Buterin",
  "enabled": true,
  "confidence_multiplier": 0.9,
  "symbols": ["BTCUSDT", "ETHUSDT"],
  "custom_prompt": "..."
}
```

### Update Account
```bash
PATCH /api/accounts/{id}
{
  "enabled": false
}
```

### Delete Account
```bash
DELETE /api/accounts/{id}
```

---

## Example Accounts

### Donald Trump (Political/Economic)
```javascript
{
  username: "realDonaldTrump",
  display_name: "Donald Trump",
  confidence_multiplier: 1.0,
  min_confidence_threshold: 75,
  custom_prompt: "Analyze Trump tweets for Bitcoin impact focusing on: economic policy, war/peace, trade policy, crypto regulation..."
}
```

### Elon Musk (Tech/Crypto)
```javascript
{
  username: "elonmusk",
  display_name: "Elon Musk",
  confidence_multiplier: 0.8,
  min_confidence_threshold: 70,
  symbols: ["BTCUSDT", "DOGEUSDT"],
  custom_prompt: "Analyze Elon tweets for crypto impact focusing on: direct crypto mentions, Tesla announcements, memes, tech commentary..."
}
```

### Vitalik Buterin (Ethereum/Crypto)
```javascript
{
  username: "VitalikButerin",
  display_name: "Vitalik Buterin",
  confidence_multiplier: 0.95,
  symbols: ["ETHUSDT", "BTCUSDT"],
  custom_prompt: "Analyze Vitalik tweets for crypto impact focusing on: Ethereum updates, scaling solutions, crypto philosophy, technical developments..."
}
```

### CZ (Crypto Exchange)
```javascript
{
  username: "cz_binance",
  display_name: "Changpeng Zhao",
  confidence_multiplier: 0.85,
  custom_prompt: "Analyze CZ tweets for crypto impact focusing on: exchange listings, market structure, regulatory developments, industry trends..."
}
```

### Michael Saylor (Bitcoin Maxi)
```javascript
{
  username: "saylor",
  display_name: "Michael Saylor",
  confidence_multiplier: 0.9,
  leverage: 75, // Lower leverage for macro-focused signals
  custom_prompt: "Analyze Michael Saylor tweets for Bitcoin impact focusing on: Bitcoin strategy updates, macro economics, institutional adoption, treasury purchases..."
}
```

---

## Production Deployment

### 1. Environment Variables
Ensure these are set:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENROUTER_API_KEY=...
ASTER_DEX_KEY=...
ASTER_SECRET_KEY=...
```

### 2. Deploy to Vercel/Railway
```bash
vercel --prod
# OR
railway up
```

### 3. Update TwitterAPI.io Webhook
Change webhook URL from `localhost` to your production URL:
```
https://your-app.vercel.app/api/twitter-webhook
```

### 4. Monitor Logs
```bash
vercel logs --follow
```

Watch for:
- `✅ Tweet from monitored account: @username`
- `💾 Tweet saved to database`
- `💾 LLM decision saved to database`
- `✅ Trade executed successfully!`

---

## Troubleshooting

### "Skipping tweet from @username (not monitored)"
**Solution**: Add the account via `/admin` UI

### "Skipping tweet from @username (account disabled)"
**Solution**: Toggle the account to "Active" in admin UI

### "Adjusted confidence too low (68% < 75%)"
**Solution**: Either:
- Increase confidence_multiplier (give account more weight)
- Lower min_confidence_threshold for that account
- Improve custom_prompt to generate higher confidence scores

### Trades not being saved to database
**Solution**: Check Supabase connection and RLS policies

### Can't see account stats
**Solution**: Wait for first trade to complete, then refresh

---

## Scaling to 10+ Accounts

### Performance Considerations
- Each tweet is processed independently
- LLM calls are async (non-blocking)
- Database writes are batched
- Webhook responds immediately (processing happens in background)

### TwitterAPI.io Limits
- Free tier: 100 tweets/month
- Pro tier: 10,000 tweets/month
- Use `OR` operator to monitor up to 25 accounts: `from:a OR from:b OR from:c...`

### Trading Conflicts
If two accounts tweet within cooldown period:
- First tweet's trade executes
- Second tweet's trade is blocked ("Position already open")
- This is by design (ONE_WAY mode)

To allow multiple simultaneous positions:
- Separate AsterDEX accounts per Twitter account
- Deploy multiple bot instances
- Implement position stacking logic

---

## Advanced: Per-Account Trading Strategies

### Conservative Accounts (Lower Risk)
```javascript
{
  username: "FedChair",
  confidence_multiplier: 0.7,  // Downweight Fed signals
  leverage: 50,                 // Half leverage
  position_size_percent: 10,    // Smaller positions
  min_confidence_threshold: 85  // Higher bar
}
```

### Aggressive Accounts (Higher Risk)
```javascript
{
  username: "cryptowhale",
  confidence_multiplier: 1.0,   // Full weight
  leverage: 125,                // Max leverage
  position_size_percent: 20,    // Larger positions
  min_confidence_threshold: 65  // Lower bar
}
```

---

## Next Steps

1. ✅ Run database migrations
2. ✅ Add 2-3 accounts via `/admin`
3. ✅ Test each account with sample tweets
4. ✅ Update TwitterAPI.io filter
5. ✅ Monitor logs for incoming tweets
6. ✅ Analyze per-account performance
7. ✅ Adjust confidence multipliers based on results

---

**System ready for multi-account trading!** 🚀

Monitor your accounts at: **http://localhost:3000/admin**

Track all trades at: **http://localhost:3000**
