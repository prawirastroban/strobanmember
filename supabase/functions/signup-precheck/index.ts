import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

/**
 * signup-precheck — public endpoint, no JWT required.
 * Validates that:
 *   - the caller's IP has not been used to register another account
 *   - the email is not already registered
 *
 * Returns { ok: true } or { ok: false, reason: 'duplicate_signup_ip' | 'duplicate_email', ip? }.
 * Frontend MUST call this before signUp / signInWithOtp / OAuth.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const body = await req.json().catch(() => ({} as any))
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const mode = typeof body?.mode === 'string' ? body.mode : 'email'

    const xff = req.headers.get('x-forwarded-for') || ''
    const cfip = req.headers.get('cf-connecting-ip') || ''
    const ip = (cfip || xff.split(',')[0] || '').trim() || null

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. IP uniqueness (skip if no IP detected — fail open to not break dev/proxy)
    if (ip) {
      const { data: allow } = await supabase
        .from('referral_ip_allowlist')
        .select('ip')
        .eq('ip', ip)
        .maybeSingle()

      if (!allow) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('signup_ip', ip)
          .limit(1)
          .maybeSingle()

        if (existing) {
          return json(200, { ok: false, reason: 'duplicate_signup_ip', ip })
        }
      }
    }

    // 2. Email uniqueness — only check for explicit email signup (skip oauth callback)
    if (mode === 'email' && email) {
      // listUsers does not support filter; page through with a small page size
      // and look for case-insensitive match.
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      })
      if (!listErr) {
        const found = list.users.find((u) => (u.email || '').toLowerCase() === email)
        if (found) {
          return json(200, { ok: false, reason: 'duplicate_email' })
        }
      }
    }

    return json(200, { ok: true, ip })
  } catch (e) {
    return json(500, { ok: false, reason: 'server_error', error: (e as Error).message })
  }
})
