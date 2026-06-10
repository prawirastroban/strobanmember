import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

type Range = 'today' | '7d' | '30d'

function dateRange(range: Range) {
  const end = 'today'
  if (range === 'today') return { startDate: 'today', endDate: end }
  if (range === '7d') return { startDate: '7daysAgo', endDate: end }
  return { startDate: '30daysAgo', endDate: end }
}

// Base64URL (no padding) for JWT
function b64url(bytes: Uint8Array | string): string {
  const str = typeof bytes === 'string' ? bytes : String.fromCharCode(...bytes)
  return btoa(str).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function pemToPkcs8(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

async function getAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`
  const keyData = pemToPkcs8(sa.private_key.replace(/\\n/g, '\n'))
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuf = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  )
  const jwt = `${unsigned}.${b64url(new Uint8Array(sigBuf))}`

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const json = await resp.json()
  if (!resp.ok) throw new Error('Token error: ' + JSON.stringify(json))
  return json.access_token
}

async function runReport(token: string, propertyId: string, body: unknown) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const j = await r.json()
  if (!r.ok) throw new Error('runReport error: ' + JSON.stringify(j))
  return j
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const propertyId = Deno.env.get('GA4_PROPERTY_ID')
    const saRaw = Deno.env.get('GA4_SERVICE_ACCOUNT_JSON')
    if (!propertyId || !saRaw) {
      return new Response(
        JSON.stringify({ error: 'GA4_PROPERTY_ID atau GA4_SERVICE_ACCOUNT_JSON belum diset' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    if (!/^\d+$/.test(propertyId)) {
      return new Response(
        JSON.stringify({
          error:
            'GA4_PROPERTY_ID harus berupa angka (Property ID dari Admin → Property Settings), bukan Measurement ID (G-XXXXXXX).',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const sa = JSON.parse(saRaw)

    const url = new URL(req.url)
    const range = (url.searchParams.get('range') as Range) || '7d'
    const dr = dateRange(range)

    const token = await getAccessToken(sa)

    const [totals, byDate, sources, devices, pages] = await Promise.all([
      runReport(token, propertyId, {
        dateRanges: [dr],
        metrics: [
          { name: 'totalUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
      }),
      runReport(token, propertyId, {
        dateRanges: [dr],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
      runReport(token, propertyId, {
        dateRanges: [dr],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 6,
      }),
      runReport(token, propertyId, {
        dateRanges: [dr],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }],
      }),
      runReport(token, propertyId, {
        dateRanges: [dr],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 8,
      }),
    ])

    const totalRow = totals.rows?.[0]?.metricValues || []
    const num = (i: number) => Number(totalRow[i]?.value ?? 0)

    const parseRows = (rep: any, dim = 0, met = 0) =>
      (rep.rows || []).map((r: any) => ({
        key: r.dimensionValues?.[dim]?.value ?? '',
        value: Number(r.metricValues?.[met]?.value ?? 0),
      }))

    const trend = (byDate.rows || []).map((r: any) => ({
      date: r.dimensionValues?.[0]?.value ?? '',
      users: Number(r.metricValues?.[0]?.value ?? 0),
      sessions: Number(r.metricValues?.[1]?.value ?? 0),
    }))

    return new Response(
      JSON.stringify({
        range,
        totals: {
          users: num(0),
          sessions: num(1),
          pageViews: num(2),
          bounceRate: num(3),
          avgSessionDuration: num(4),
        },
        trend,
        sources: parseRows(sources),
        devices: parseRows(devices),
        topPages: parseRows(pages),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})