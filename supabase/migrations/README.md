# Database Migrations

These SQL files set up the database schema for the multi-account Twitter trading bot.

## Running Migrations

### Option 1: Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to "SQL Editor"
4. Copy the contents of each migration file and run them in order:
   - `001_create_twitter_accounts.sql`
   - `002_create_trades_and_tweets.sql`

### Option 2: Supabase CLI (Recommended for development)

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push

# Or run individual migrations
psql $DATABASE_URL < supabase/migrations/001_create_twitter_accounts.sql
psql $DATABASE_URL < supabase/migrations/002_create_trades_and_tweets.sql
```

### Option 3: Direct psql

```bash
# Get connection string from Supabase dashboard (Settings > Database)
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" -f supabase/migrations/001_create_twitter_accounts.sql
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" -f supabase/migrations/002_create_trades_and_tweets.sql
```

## Schema Overview

### Tables Created

1. **twitter_accounts** - Monitored Twitter accounts with custom settings
   - username, display_name, enabled
   - custom_prompt, confidence_multiplier
   - symbols[], position_size_percent, min_confidence_threshold, leverage

2. **tweets** - Received tweets from webhook
   - tweet_id, text, author, timestamps
   - source_account_id (foreign key)

3. **llm_decisions** - LLM analysis results
   - signal, confidence, adjusted_confidence, reasoning
   - source_account_id (foreign key)

4. **trades** - Trading positions
   - Entry/exit prices, targets, PnL
   - source_account_id (foreign key to track which account triggered trade)

## Default Data

The migrations insert one default account:
- **@realDonaldTrump** with standard Trump-focused trading prompt

Add more accounts via the Admin UI (`/admin`) after running migrations.

## Verifying Migrations

After running migrations, verify with:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check default account
SELECT username, display_name, enabled, symbols
FROM twitter_accounts;

-- Check indexes
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## Rolling Back

If you need to undo migrations:

```sql
-- WARNING: This deletes all data!
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS llm_decisions CASCADE;
DROP TABLE IF EXISTS tweets CASCADE;
DROP TABLE IF EXISTS twitter_accounts CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```
