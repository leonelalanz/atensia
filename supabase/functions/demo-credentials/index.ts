import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const DEMO_ACCOUNTS = {
  'superadmin@incidentdesk.com': 'Test1234!',
  'admin@acmecorp.com': 'Test1234!',
  'agente@acmecorp.com': 'Test1234!',
  'dev@acmecorp.com': 'Test1234!',
}

// Rate limiting: store IP -> request count + timestamp
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function getClientIp(req: Request): string {
  return req.headers.get('cf-connecting-ip') ||
         req.headers.get('x-forwarded-for')?.split(',')[0] ||
         'unknown'
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const limit = 5 // max 5 requests
  const window = 3600000 // 1 hour in milliseconds

  let data = rateLimitStore.get(ip)

  // Reset if window expired
  if (!data || now > data.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + window })
    return { allowed: true, remaining: limit - 1 }
  }

  // Check if limit exceeded
  if (data.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  // Increment counter
  data.count += 1
  return { allowed: true, remaining: limit - data.count }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get client IP for rate limiting
    const clientIp = getClientIp(req)
    const rateLimit = checkRateLimit(clientIp)

    // Check rate limit
    if (!rateLimit.allowed) {
      console.log(`[SECURITY] Rate limit exceeded for IP: ${clientIp}`)
      return new Response(
        JSON.stringify({
          error: 'Too many requests. Please try again in 1 hour.',
          retryAfter: 3600
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': '3600'
          },
        }
      )
    }

    // Parse request body
    let email: string
    try {
      const body = await req.json()
      email = body.email?.toLowerCase().trim()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate email
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if email is valid demo account
    const password = DEMO_ACCOUNTS[email as keyof typeof DEMO_ACCOUNTS]

    if (!password) {
      // Log failed attempt (but don't reveal which emails are valid)
      console.log(`[SECURITY] Invalid demo account requested: ${email} from IP: ${clientIp}`)
      return new Response(
        JSON.stringify({ error: 'Demo account not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Log successful request
    console.log(`[AUDIT] Demo credentials requested for: ${email} from IP: ${clientIp}`)

    // Return credentials with expiration time
    const expiresAt = new Date(Date.now() + 3600000).toISOString() // 1 hour from now

    return new Response(
      JSON.stringify({
        password,
        expiresAt,
        message: 'Demo credentials are valid for 1 hour'
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
      }
    )
  } catch (error) {
    console.error('[ERROR] Unexpected error in demo-credentials:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
