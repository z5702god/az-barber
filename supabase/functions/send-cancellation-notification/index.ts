// Send Cancellation Notification Edge Function
// Sends push notification to customer when barber cancels their booking

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS: '*' is acceptable here since this is consumed by a mobile app,
// and authentication is enforced via JWT in the Authorization header.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  pushToken: string
  customerName: string
  barberName: string
  bookingDate: string
  bookingTime: string
  cancellationReason: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify JWT authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const userToken = authHeader.replace('Bearer ', '')

    // Verify the user's identity
    const authClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authError } = await authClient.auth.getUser(userToken)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user has a barber role
    const { data: userData, error: userError } = await authClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || (userData.role !== 'barber' && userData.role !== 'owner')) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: only barbers can send cancellation notifications' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: RequestBody = await req.json()
    const { pushToken, customerName, barberName, bookingDate, bookingTime, cancellationReason } = body

    if (!pushToken) {
      return new Response(
        JSON.stringify({ error: 'Push token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send push notification via Expo Push API
    const message = {
      to: pushToken,
      sound: 'default',
      title: '預約已被取消',
      body: `${barberName} 取消了您 ${bookingDate} ${bookingTime} 的預約。原因：${cancellationReason}`,
      data: {
        type: 'booking_cancelled',
        barberName,
        bookingDate,
        bookingTime,
        cancellationReason,
      },
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const result = await response.json()

    if (result.data?.status === 'error') {
      console.error('Push notification error:', result.data)
      return new Response(
        JSON.stringify({ error: 'Failed to send notification', details: result.data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
