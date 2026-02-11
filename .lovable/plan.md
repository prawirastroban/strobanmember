

# Add Performance Indexes for Scale

Add database indexes on frequently queried foreign key columns to improve query performance when serving thousands of customers.

## What Changes

Two indexes will be created:
- **loyalty_transactions.user_id** -- speeds up transaction history lookups and the admin loyalty points manager
- **reward_redemptions.user_id** -- speeds up redemption history queries and reward status checks

## Technical Details

A single database migration will be created with:

```sql
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON public.loyalty_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user_id ON public.reward_redemptions (user_id);
```

No code changes are needed -- these indexes work transparently behind existing queries.

