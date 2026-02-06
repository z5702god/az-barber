// Delete Account Edge Function
// Completely deletes a user's account including auth record and all related data
// Required by Apple App Store Guidelines 5.1.1

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user's identity
    const { data: { user }, error: authError } = await adminClient.auth.getUser(userToken)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id

    // 1. Delete push tokens
    await adminClient.from('push_tokens').delete().eq('user_id', userId)

    // 2. Cancel upcoming bookings
    await adminClient
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_by: 'customer',
        cancellation_reason: '帳號已刪除',
      })
      .eq('customer_id', userId)
      .in('status', ['confirmed', 'pending'])

    // 3. Check if user is a barber and clean up barber data
    const { data: userData } = await adminClient
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userData?.role === 'barber' || userData?.role === 'owner') {
      // Get barber record
      const { data: barberData } = await adminClient
        .from('barbers')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (barberData) {
        // Cancel all upcoming bookings for this barber
        await adminClient
          .from('bookings')
          .update({
            status: 'cancelled',
            cancelled_by: 'barber',
            cancellation_reason: '理髮師帳號已刪除',
          })
          .eq('barber_id', barberData.id)
          .in('status', ['confirmed', 'pending'])

        // Delete availability
        await adminClient.from('availability').delete().eq('barber_id', barberData.id)

        // Delete barber record
        await adminClient.from('barbers').delete().eq('id', barberData.id)
      }
    }

    // 4. Delete user profile from users table
    await adminClient.from('users').delete().eq('id', userId)

    // 5. Delete the auth user (this is the critical step Apple requires)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete auth account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
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
