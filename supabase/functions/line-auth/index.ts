import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS: '*' is used here because this Edge Function is called from a mobile app
// (React Native) which does not enforce browser CORS restrictions.
// The GET /callback endpoint handles redirects from LINE OAuth and is not browser-origin restricted.
// The POST /callback endpoint is called from the mobile app and returns tokens.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const LINE_CHANNEL_ID = Deno.env.get('LINE_CHANNEL_ID')!
const LINE_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// LINE OAuth endpoints
const LINE_AUTH_URL = 'https://access.line.me/oauth2/v2.1/authorize'
const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token'
const LINE_PROFILE_URL = 'https://api.line.me/v2/profile'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.split('/').pop()

  try {
    // Step 1: Generate LINE Login URL
    if (path === 'login') {
      const { redirectUri, state } = await req.json()

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: LINE_CHANNEL_ID,
        redirect_uri: redirectUri || `${SUPABASE_URL}/functions/v1/line-auth/callback`,
        state: state || crypto.randomUUID(),
        scope: 'profile openid email',
      })

      const loginUrl = `${LINE_AUTH_URL}?${params.toString()}`

      return new Response(
        JSON.stringify({ url: loginUrl, state: params.get('state') }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: Handle LINE Callback (exchange code for token)
    if (path === 'callback') {
      // For GET request (redirect from LINE)
      if (req.method === 'GET') {
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const error = url.searchParams.get('error')

        if (error) {
          // Redirect to app with error
          return Response.redirect(`az-barber-app://auth/callback?error=${error}`)
        }

        if (!code) {
          return Response.redirect('az-barber-app://auth/callback?error=no_code')
        }

        // Exchange code for tokens
        const tokenResponse = await fetch(LINE_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: `${SUPABASE_URL}/functions/v1/line-auth/callback`,
            client_id: LINE_CHANNEL_ID,
            client_secret: LINE_CHANNEL_SECRET,
          }),
        })

        if (!tokenResponse.ok) {
          const err = await tokenResponse.text()
          console.error('Token exchange failed:', err)
          return Response.redirect('az-barber-app://auth/callback?error=token_exchange_failed')
        }

        const tokens = await tokenResponse.json()

        // Get LINE profile
        const profileResponse = await fetch(LINE_PROFILE_URL, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })

        if (!profileResponse.ok) {
          return Response.redirect('az-barber-app://auth/callback?error=profile_fetch_failed')
        }

        const profile = await profileResponse.json()

        // Create Supabase admin client
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false }
        })

        // Check if user exists with LINE ID
        const lineEmail = `line_${profile.userId}@line.local`

        // Try to create auth user (ignore error if already exists)
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: lineEmail,
          email_confirm: true,
          user_metadata: {
            name: profile.displayName,
            avatar_url: profile.pictureUrl,
            line_user_id: profile.userId,
            provider: 'line',
          },
        })

        if (authError) {
          console.log('createUser skipped (user likely exists):', authError.message)
        }

        // Generate magic link — works whether user was just created or already existed
        // Also returns the user object so we can get the userId
        const { data: session, error: sessionError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: lineEmail,
        })

        if (sessionError) {
          console.error('Failed to generate session:', sessionError)
          return Response.redirect('az-barber-app://auth/callback?error=session_failed')
        }

        // Get userId from either createUser result or generateLink result
        const userId = authUser?.user?.id || session.user?.id

        if (!userId) {
          console.error('Could not determine userId')
          return Response.redirect('az-barber-app://auth/callback?error=user_not_found')
        }

        // Ensure public.users record exists with line_user_id
        await supabase.from('users').upsert({
          id: userId,
          email: lineEmail,
          name: profile.displayName,
          avatar_url: profile.pictureUrl,
          line_user_id: profile.userId,
          role: 'customer',
        })

        // Extract token from the magic link
        const magicLinkUrl = new URL(session.properties.action_link)
        const token = magicLinkUrl.searchParams.get('token')

        // Redirect to app with token and state for CSRF validation
        // Use encodeURIComponent to prevent special chars in token from breaking URL parsing
        const redirectParams = new URLSearchParams({
          token: token || '',
          type: 'magiclink',
          state: state || '',
        })
        return Response.redirect(`az-barber-app://auth/callback?${redirectParams.toString()}`)
      }

      // For POST request (from app)
      if (req.method === 'POST') {
        const { code, redirectUri } = await req.json()

        // Exchange code for tokens
        const tokenResponse = await fetch(LINE_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: LINE_CHANNEL_ID,
            client_secret: LINE_CHANNEL_SECRET,
          }),
        })

        if (!tokenResponse.ok) {
          const err = await tokenResponse.text()
          return new Response(
            JSON.stringify({ error: 'Token exchange failed', details: err }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const tokens = await tokenResponse.json()

        // Get LINE profile
        const profileResponse = await fetch(LINE_PROFILE_URL, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })

        if (!profileResponse.ok) {
          const err = await profileResponse.text()
          return new Response(
            JSON.stringify({ error: 'Failed to fetch LINE profile', details: err }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const profile = await profileResponse.json()

        return new Response(
          JSON.stringify({ tokens, profile }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
