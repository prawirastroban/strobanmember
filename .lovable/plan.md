
# Fix All Warning-Level Security Findings

## 1. Add `.env` to `.gitignore`
Update `.gitignore` to exclude `.env` files from version control, preventing accidental exposure of future secrets.

## 2. Add Input Validation to Edge Functions
Add Zod-based validation to both edge functions:
- **chat**: Validate `messages` is an array of objects with `role` (enum) and `content` (string, max 4000 chars), limited to 50 messages.
- **register-push-token**: Validate `token` (string, 10-500 chars) and `platform` (enum: ios/android/web) for POST; validate `token` string for DELETE.

## 3. Fix `update_updated_at_column` Search Path
Run a migration to recreate the function with `SET search_path = public` to prevent search path injection.

## 4. Move `pg_net` Extension to a Dedicated Schema
Run a migration to create an `extensions` schema and move `pg_net` out of `public`.

## 5. Restrict Rewards Visibility to Authenticated Users
Update the RLS policy on `rewards` so only authenticated users can view active rewards (not anonymous visitors).

## 6. Leaked Password Protection
This is a platform-level setting that cannot be changed via code. It will be marked as requiring manual action.

---

## Technical Details

### Migration SQL

```sql
-- Fix update_updated_at_column search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Move pg_net to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_net SET SCHEMA extensions;

-- Restrict rewards to authenticated users only
DROP POLICY IF EXISTS "Anyone can view active rewards" ON public.rewards;
CREATE POLICY "Authenticated users can view active rewards"
  ON public.rewards FOR SELECT
  TO authenticated
  USING (is_active = true);
```

### Edge Function Changes

**chat/index.ts** - Add a Zod schema import and validate the request body before processing. Reject payloads that don't match the expected structure with a 400 response.

**register-push-token/index.ts** - Add Zod validation for both POST (token + platform) and DELETE (token only) request bodies. Return 400 for invalid inputs.

### .gitignore Update
Add `.env` and `.env.*` patterns (excluding `.env.example`).

### Files Modified
- `.gitignore`
- `supabase/functions/chat/index.ts`
- `supabase/functions/register-push-token/index.ts`
- New migration file for DB changes

### Security Findings Cleanup
After fixes, delete resolved findings and update the leaked password one as requiring manual platform action.
