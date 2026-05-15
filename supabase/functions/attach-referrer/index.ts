import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const code = typeof body?.code === 'string' ? body.code.trim() : ''
    if (!code) {
      return new Response(JSON.stringify({ success: false, error: 'Empty code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Ambil IP klien dari header (Cloudflare/Supabase edge proxy)
    const xff = req.headers.get('x-forwarded-for') || ''
    const cfip = req.headers.get('cf-connecting-ip') || ''
    const ip = (cfip || xff.split(',')[0] || '').trim() || null

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Hard-block duplicate IP signup (if IP detected and not allowlisted, and used by another user)
    if (ip) {
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )
      const { data: token } = await supabase.auth.getUser()
      const meId = token?.user?.id ?? null

      const { data: allow } = await admin
        .from('referral_ip_allowlist')
        .select('ip')
        .eq('ip', ip)
        .maybeSingle()

      if (!allow) {
        const { data: dup } = await admin
          .from('profiles')
          .select('id')
          .eq('signup_ip', ip)
          .neq('id', meId ?? '00000000-0000-0000-0000-000000000000')
          .limit(1)
          .maybeSingle()

        if (dup) {
          return new Response(JSON.stringify({ success: false, error: 'duplicate_signup_ip' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    const { data, error } = await supabase.rpc('attach_referrer', { _code: code, _ip: ip })

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(data ?? { success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})