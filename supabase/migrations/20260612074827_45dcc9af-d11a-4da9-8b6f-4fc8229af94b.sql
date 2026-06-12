-- Migrate legacy synthetic phone-emails to a real-format domain so Supabase Auth's
-- stricter email validator stops rejecting them. The new domain is owned by us and
-- never receives mail — it just needs to be a structurally valid TLD.
UPDATE auth.users
   SET email = REPLACE(email, '@phone.local', '@phone.bengkelstroban.com')
 WHERE email LIKE '%@phone.local';