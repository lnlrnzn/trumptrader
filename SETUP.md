# 🛠️ Setup Guide

## ✅ What's Already Done

The core trading bot is fully implemented and ready to test! Here's what we've built:

### Core Components
- ✅ **AsterDEX Integration**: Web3 signing, order placement, position management
- ✅ **Grok 4 LLM Analyzer**: Tweet sentiment analysis via OpenRouter
- ✅ **Trading Engine**: Sequential order logic (Entry → TP1/2/3 → SL)
- ✅ **Twitter Webhook**: Real-time tweet processing endpoint
- ✅ **Safety Features**: Cooldowns, confidence thresholds, daily limits
- ✅ **Dashboard**: Status overview and quick start guide

### Project Structure
```
trump-trader/
├── lib/
│   ├── asterdex/
│   │   ├── client.ts        # ✅ AsterDEX API client
│   │   └── signer.ts        # ✅ Web3 signing (Keccak + ECDSA)
│   ├── openrouter/
│   │   └── client.ts        # ✅ Grok 4 LLM integration
│   ├── twitter/
│   │   └── client.ts        # TwitterAPI.io client (optional)
│   └── supabase/
│       └── client.ts        # Supabase client (optional)
├── services/
│   └── trading-engine.ts    # ✅ Main trading logic
├── utils/
│   └── calculations.ts      # ✅ PnL, targets, position sizing
├── app/
│   ├── page.tsx            # ✅ Dashboard
│   └── api/
│       └── twitter-webhook/ # ✅ Webhook endpoint
│           └── route.ts
├── types/                   # ✅ TypeScript definitions
├── scripts/
│   └── test-aster.ts       # ✅ Test script
└── .env.local              # ⚠️ Needs API keys

```

## 📋 What You Need to Do

### Step 1: Add Missing API Keys (5 minutes)

Edit `.env.local` and add:

```env
# TwitterAPI.io (Required)
TWITTER_API_KEY=your_key_here
# Get from: https://twitterapi.io/dashboard

# OpenRouter (Required)
OPENROUTER_API_KEY=your_key_here
# Get from: https://openrouter.ai/keys

# Supabase (Optional - for logging trades)
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
# Get from: https://supabase.com/dashboard
```

### Step 2: Test AsterDEX Connection (2 minutes)

```bash
cd trump-trader
npx tsx scripts/test-aster.ts
```

**Expected output:**
```
🔍 Testing AsterDEX API connection...

Test 1: Getting server time...
✅ Server time: 2025-01-15T14:30:00.000Z

Test 2: Getting exchange info for BTCUSDT...
✅ BTCUSDT found:
   - Status: TRADING
   - Quote Asset: USDT

Test 3: Getting current BTC price...
✅ BTC Price: $45,234.50

Test 4: Getting account balance...
✅ Account Balance:
   - Total: $1,234.56
   - Available: $1,234.56
   - Margin Used: $0.00
   - Unrealized PnL: $0.00

Test 5: Checking for open BTC position...
✅ No open position

🎉 All tests passed!
```

**If you see errors:**
- Check your `.env.local` has the correct AsterDEX keys
- Verify your internet connection
- Make sure AsterDEX API is accessible

### Step 3: Run Development Server (1 minute)

```bash
npm run dev
```

Open http://localhost:3000 - you should see the dashboard!

### Step 4: Setup Twitter Webhook (10 minutes)

You have two options:

#### Option A: Use ngrok (for local testing)

1. Install ngrok:
```bash
npm install -g ngrok
```

2. Start ngrok:
```bash
ngrok http 3000
```

3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

4. Go to https://twitterapi.io/dashboard

5. Navigate to "Tweet Filter Rules" → "Add Rule":
   - **Tag**: `trump_tweets`
   - **Value**: `from:realDonaldTrump`
   - **Interval**: `10` seconds
   - **Webhook URL**: `https://abc123.ngrok.io/api/twitter-webhook`

6. Click "Save" and "Activate"

#### Option B: Deploy to Vercel first (recommended for production)

1. Push to GitHub
2. Deploy to Vercel
3. Use your Vercel URL: `https://your-app.vercel.app/api/twitter-webhook`

### Step 5: Test Webhook Endpoint (2 minutes)

```bash
curl -X POST http://localhost:3000/api/twitter-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "tweet_matched",
    "rule_tag": "trump_tweets",
    "tweets": [{
      "id": "123456",
      "text": "Bitcoin is the future of finance! Amazing technology!",
      "author": {"username": "realDonaldTrump"},
      "created_at": "2025-01-15T10:00:00Z"
    }],
    "timestamp": "2025-01-15T10:00:05Z"
  }'
```

**Expected logs:**
```
🐦 Incoming tweet webhook...
Tweet: Bitcoin is the future of finance! Amazing tech...
Author: realDonaldTrump
Processing tweet: tweet_...
1️⃣ Analyzing with LLM...
🤖 LLM Analysis: { signal: 'LONG', confidence: 88, reasoning: '...' }
⏸️  No trade executed (TRADING_ENABLED=false)
```

## 🧪 Testing Before Going Live

### Test 1: LLM Analysis Only

Keep `TRADING_ENABLED=false` and test webhook with various tweet examples:

**Bullish tweets:**
```json
{"text": "Bitcoin is the best investment!"}
{"text": "Crypto will change the world!"}
```

**Bearish tweets:**
```json
{"text": "Bitcoin is a total scam!"}
{"text": "Crypto needs heavy regulation NOW!"}
```

**Neutral tweets:**
```json
{"text": "Had a great meeting today"}
{"text": "Beautiful weather in Mar-a-Lago"}
```

Monitor logs to see LLM decisions.

### Test 2: With Small Position (When Ready)

1. **Fund your AsterDEX account** with a small test amount (e.g., $50-100)

2. **Adjust position size** in `.env.local`:
```env
MAX_POSITION_SIZE_PERCENT=5  # Only 5% per trade for testing
```

3. **Enable trading**:
```env
TRADING_ENABLED=true
```

4. **Send test webhook** with a strong bullish tweet

5. **Monitor logs** - you should see:
```
📊 Executing trade...
Signal: LONG
Confidence: 88
1️⃣ Getting account balance...
Balance: 100 USDT
2️⃣ Position size: 5 USDT
3️⃣ Getting current BTC price...
...
✅ Entry order placed: ...
✅ Order filled at: $45,234.50
✅ TP orders placed
✅ SL order placed
🎉 Trade executed successfully!
```

6. **Check AsterDEX** - you should see:
   - Open LONG position on BTCUSDT
   - 3x Take Profit orders at different prices
   - 1x Stop Loss order

7. **Close the position manually** (don't wait for TP/SL):
```bash
# Create a quick test script
echo 'import {createAsterClient} from "./lib/asterdex/client";
const c = createAsterClient();
await c.closePosition("BTCUSDT", "LONG");
console.log("Position closed");' > close.ts

npx tsx close.ts
```

## 🚨 Safety Checklist Before Going Live

- [ ] Tested with `TRADING_ENABLED=false` first
- [ ] Tested with VERY small position (5% or less)
- [ ] Verified all orders placed correctly (Entry + 3 TPs + SL)
- [ ] Manually closed test position successfully
- [ ] Checked liquidation price is reasonable (should be ~1% away)
- [ ] Set up alerts (phone, email) to monitor
- [ ] Understand you can lose 100% of position at 100x leverage
- [ ] Have emergency close plan ready

## 📊 Going Live

### Conservative Approach (Recommended)
1. Start with 10-15% position size
2. Monitor first 3-5 trades manually
3. Only increase after proven success
4. Never go all-in on one trade

### Aggressive Approach (High Risk)
1. Keep 15-20% position size
2. Trust the system
3. Monitor via dashboard
4. Be ready to hit emergency stop

## 🆘 Emergency Procedures

### If Position Goes Bad
1. Open AsterDEX website
2. Cancel all pending orders
3. Close position at market price
4. Review what went wrong

### If Bot Malfunctions
1. Set `TRADING_ENABLED=false` immediately
2. Close any open positions manually
3. Review logs to debug
4. Fix issue before re-enabling

### If Twitter Webhook Spams
1. Go to TwitterAPI.io dashboard
2. Deactivate the filter rule
3. Check why (false positives, wrong filter)
4. Fix and reactivate

## 📈 Monitoring

### What to Watch
- Dashboard at http://localhost:3000 (or your Vercel URL)
- Console logs (`npm run dev` output)
- AsterDEX website (positions, orders)
- Twitter (to see actual Trump tweets)

### Key Metrics
- Win rate (should be >50% ideally)
- Average PnL per trade
- How often TP1/TP2/TP3 hit vs SL
- Liquidations (should be ZERO!)

## 🔧 Troubleshooting

### "Error creating AsterDEX signature"
- Check your `ASTER_SECRET_KEY` is correct
- Ensure it's a valid private key (64 hex characters)

### "OpenRouter API error: 401"
- Invalid `OPENROUTER_API_KEY`
- Get new key from https://openrouter.ai/keys

### "No tweets in payload"
- TwitterAPI.io not sending correct format
- Check their docs or test with curl first

### Orders not placed after entry
- Check AsterDEX rate limits
- Verify you have available balance
- Look for error logs

## 🎯 Next Steps

1. ✅ Complete setup (Steps 1-5)
2. ✅ Test with `TRADING_ENABLED=false`
3. ✅ Test with small position
4. ✅ Monitor first few trades closely
5. ✅ Gradually increase confidence
6. ⚠️ Never stop monitoring!

## 📞 Support Resources

- AsterDEX Docs: https://docs.asterdex.com/
- TwitterAPI.io: https://docs.twitterapi.io/
- OpenRouter: https://openrouter.ai/docs
- Grok 4 Info: https://x.ai/

---

**Remember: This is high-risk trading. Start small, monitor actively, never risk more than you can afford to lose!**

Good luck! 🚀
