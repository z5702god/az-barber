// Send Booking Notification Edge Function
// Sends push notification to barber when a customer creates a new booking

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  barberId: string
  customerName: string
  bookingDate: string
  bookingTime: string
  services: string
  totalPrice: number
}

serve(async (req) => {
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

    const body: RequestBody = await req.json()
    const { barberId, customerName, bookingDate, bookingTime, services, totalPrice } = body

    if (!barberId) {
      return new Response(
        JSON.stringify({ error: 'barberId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Look up barber's user_id from barbers table
    const { data: barberData, error: barberError } = await authClient
      .from('barbers')
      .select('user_id, display_name')
      .eq('id', barberId)
      .single()

    if (barberError || !barberData) {
      return new Response(
        JSON.stringify({ error: 'Barber not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Look up barber's push token
    const { data: pushTokenData } = await authClient
      .from('push_tokens')
      .select('token')
      .eq('user_id', barberData.user_id)
      .single()

    if (!pushTokenData?.token) {
      // Barber has no push token registered - not an error, just skip
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'No push token for barber' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send push notification via Expo Push API
    const message = {
      to: pushTokenData.token,
      sound: 'default',
      title: '新預約通知',
      body: `${customerName} 預約了 ${bookingDate} ${bookingTime} 的 ${services}`,
      data: {
        type: 'booking_confirmed',
        customerName,
        bookingDate,
        bookingTime,
        services,
        totalPrice,
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
