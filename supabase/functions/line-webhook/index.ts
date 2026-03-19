// LINE Webhook Edge Function
// Handles LINE Official Account messages and processes booking requests via OpenAI

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// ─── LINE Signature Verification ───────────────────────────────

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const hash = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return hash === signature
}

// ─── LINE Profile API ──────────────────────────────────────────

async function getLineProfile(lineUserId: string, accessToken: string): Promise<string> {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })
    if (res.ok) {
      const profile = await res.json()
      return profile.displayName || 'LINE 顧客'
    }
  } catch (e) {
    console.error('Failed to get LINE profile:', e)
  }
  return 'LINE 顧客'
}

// ─── LINE Reply API ────────────────────────────────────────────

async function replyToLine(replyToken: string, text: string, accessToken: string) {
  // LINE has a 5000 character limit per text message
  const messages = []
  if (text.length <= 5000) {
    messages.push({ type: 'text', text })
  } else {
    // Split into multiple messages
    let remaining = text
    while (remaining.length > 0) {
      messages.push({ type: 'text', text: remaining.slice(0, 5000) })
      remaining = remaining.slice(5000)
      if (messages.length >= 5) break // LINE max 5 messages per reply
    }
  }

  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('LINE Reply API error:', err)
  }
}

// ─── OpenAI Tool Definitions (reused from ai-chat) ────────────

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_barbers',
      description: '取得所有理髮師列表',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_barber_availability',
      description: '查詢指定理髮師在特定日期的可預約時段',
      parameters: {
        type: 'object',
        properties: {
          barber_name: { type: 'string', description: '理髮師名字，例如 AZ 或 Wendy' },
          date: { type: 'string', description: '日期，格式 YYYY-MM-DD' },
        },
        required: ['barber_name', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_barber_holidays',
      description: '查詢指定理髮師近期的特殊休假（過年、出國、進修等）。當客人問到某位設計師的休假、放假時使用此工具。',
      parameters: {
        type: 'object',
        properties: {
          barber_name: { type: 'string', description: '理髮師名字，例如 AZ 或 Wendy' },
        },
        required: ['barber_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_services',
      description: '取得所有服務項目、價格和所需時間',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_booking',
      description: '建立預約',
      parameters: {
        type: 'object',
        properties: {
          barber_name: { type: 'string', description: '理髮師名字' },
          date: { type: 'string', description: '預約日期 YYYY-MM-DD' },
          start_time: { type: 'string', description: '開始時間 HH:mm' },
          service_names: { type: 'array', items: { type: 'string' }, description: '服務項目名稱陣列' },
        },
        required: ['barber_name', 'date', 'start_time', 'service_names'],
      },
    },
  },
]

// ─── System Prompt ─────────────────────────────────────────────

function getSystemPrompt(): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']

  const formatDate = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const todayStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}（週${weekdays[now.getDay()]}）`

  const upcoming: string[] = []
  for (let i = 0; i <= 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const label = i === 0 ? '今天' : i === 1 ? '明天' : i === 2 ? '後天' : `${i}天後`
    upcoming.push(`${label} = ${formatDate(d)}（週${weekdays[d.getDay()]}）`)
  }

  return `你是 omexa barber 理髮店的預約小幫手，叫小安。這是 LINE 聊天，像朋友聊天一樣跟客人說話。

【最高優先規則 - 必須用工具查詢】
你對店裡的任何資訊一無所知！所有關於設計師、時段、服務、價格、休假的問題，你都必須先用工具查詢資料庫，絕對不可以憑記憶或猜測回答。
- 問有空嗎 / 哪天能約 → get_barber_availability
- 問休假 / 放假 / 過年 / 連假 / 出國 → get_barber_holidays
- 問服務 / 價格 / 項目 → get_services
- 問有哪些設計師 → get_barbers
如果不確定該用哪個工具，寧可多查也不要猜！

今天是 ${todayStr}。

近期日期對照：
${upcoming.join('\n')}

你可以幫客人：
- 看設計師（AZ、Wendy）哪天有空
- 查設計師的近期休假（過年、出國等）
- 介紹服務跟價格
- 幫忙預約

預約時段：整點預約（10:00、11:00...這樣）

說話風格：
- 用口語，像朋友對話
- 簡短直接，不要太囉嗦
- 可以用「～」「喔」「欸」這類語氣詞
- 不要用項目符號列表，用自然的句子
- 不要說「請問」「您」，直接說「你」
- LINE 訊息要簡短，避免太長的回覆

預約流程（必須按照這個順序，缺少任何一項就要先問）：
1. 確認服務項目（如果客人沒說，推薦「洗剪」或「單剪」讓他選）
2. 確認要約哪位設計師（AZ 或 Wendy，一定要問！不能跳過）
3. 確認日期
4. 確認時段（先用 get_barber_availability 查空檔再給客人選）
5. 最後確認所有細節，客人同意後才建立預約

重要：
- 絕對不能跳過詢問設計師這一步！我們有 AZ 和 Wendy 兩位設計師，客人必須選一位。
- 客人說「星期X」時，查上面的日期對照表找到正確日期，再用 get_barber_availability 查詢。
- 再次強調：不要假設任何事情，一律用工具查詢資料庫後再回答！`
}

// ─── Tool Implementations (reused from ai-chat) ───────────────

async function getBarbers(supabase: any) {
  const { data, error } = await supabase
    .from('barbers')
    .select('id, display_name, status')
    .eq('status', 'active')

  if (error) return { error: error.message }
  return { barbers: data.map((b: any) => ({ id: b.id, name: b.display_name })) }
}

async function getBarberAvailability(supabase: any, barberName: string, date: string) {
  const { data: barber } = await supabase
    .from('barbers')
    .select('id, display_name')
    .ilike('display_name', `%${barberName}%`)
    .eq('status', 'active')
    .single()

  if (!barber) return { error: `找不到理髮師：${barberName}` }

  const dateObj = new Date(date)
  const dayOfWeek = dateObj.getDay()

  // Check for exception (holiday) on this specific date
  const { data: exceptionData } = await supabase
    .from('availability')
    .select('*')
    .eq('barber_id', barber.id)
    .eq('specific_date', date)
    .eq('is_exception', true)
    .limit(1)

  if (exceptionData && exceptionData.length > 0) {
    const exc = exceptionData[0]
    const description = exc.description ? `（原因：${exc.description}）` : ''
    return {
      available: false,
      message: `${barber.display_name} 在 ${date} 休假${description}`,
    }
  }

  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .eq('barber_id', barber.id)
    .eq('day_of_week', dayOfWeek)
    .limit(1)

  if (!availability || availability.length === 0) {
    return { available: false, message: `${barber.display_name} 這天沒有排班` }
  }

  const avail = availability[0]

  const { data: bookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('barber_id', barber.id)
    .eq('booking_date', date)
    .neq('status', 'cancelled')

  const slots = generateAvailableSlots(avail.start_time, avail.end_time, bookings || [])

  return {
    barber: barber.display_name,
    date,
    working_hours: `${avail.start_time.slice(0, 5)} - ${avail.end_time.slice(0, 5)}`,
    available_slots: slots,
    message: slots.length > 0
      ? `${barber.display_name} 在 ${date} 有 ${slots.length} 個可預約時段`
      : `${barber.display_name} 在 ${date} 已預約滿`,
  }
}

function generateAvailableSlots(
  startTime: string,
  endTime: string,
  bookings: { start_time: string; end_time: string }[]
): string[] {
  const slots: string[] = []
  const [startH] = startTime.split(':').map(Number)
  const [endH] = endTime.split(':').map(Number)

  let currentHour = startH
  while (currentHour < endH) {
    const slotStart = `${String(currentHour).padStart(2, '0')}:00`
    const slotStartMinutes = currentHour * 60

    const isBooked = bookings.some((b) => {
      const [bStartH, bStartM] = b.start_time.split(':').map(Number)
      const [bEndH, bEndM] = b.end_time.split(':').map(Number)
      const bookingStart = bStartH * 60 + bStartM
      const bookingEnd = bEndH * 60 + bEndM
      return slotStartMinutes < bookingEnd && slotStartMinutes + 60 > bookingStart
    })

    if (!isBooked) {
      slots.push(slotStart)
    }
    currentHour += 1
  }

  return slots
}

async function getBarberHolidays(supabase: any, barberName: string) {
  const { data: barber } = await supabase
    .from('barbers')
    .select('id, display_name')
    .ilike('display_name', `%${barberName}%`)
    .eq('status', 'active')
    .single()

  if (!barber) return { error: `找不到理髮師：${barberName}` }

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const { data: exceptions, error } = await supabase
    .from('availability')
    .select('specific_date, description')
    .eq('barber_id', barber.id)
    .eq('is_exception', true)
    .gte('specific_date', today)
    .order('specific_date')

  if (error) return { error: error.message }

  if (!exceptions || exceptions.length === 0) {
    return {
      barber: barber.display_name,
      holidays: [],
      message: `${barber.display_name} 近期沒有設定特殊休假`,
    }
  }

  const holidays: { start: string; end: string; description: string }[] = []
  let current = {
    start: exceptions[0].specific_date,
    end: exceptions[0].specific_date,
    description: exceptions[0].description || '休假',
  }

  for (let i = 1; i < exceptions.length; i++) {
    const exc = exceptions[i]
    const prevDate = new Date(current.end + 'T12:00:00')
    prevDate.setDate(prevDate.getDate() + 1)
    const prevNextStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`

    if (exc.specific_date === prevNextStr && (exc.description || '休假') === current.description) {
      current.end = exc.specific_date
    } else {
      holidays.push(current)
      current = {
        start: exc.specific_date,
        end: exc.specific_date,
        description: exc.description || '休假',
      }
    }
  }
  holidays.push(current)

  const summary = holidays.map(h => {
    const range = h.start === h.end ? h.start : `${h.start} ~ ${h.end}`
    return `${range}（${h.description}）`
  }).join('、')

  return {
    barber: barber.display_name,
    holidays,
    message: `${barber.display_name} 的近期休假：${summary}`,
  }
}

async function getServices(supabase: any) {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price')
    .eq('is_active', true)
    .order('sort_order')

  if (error) return { error: error.message }
  return {
    services: data.map((s: any) => ({
      name: s.name,
      duration: `${s.duration_minutes} 分鐘`,
      price: `$${s.price}`,
    })),
  }
}

async function createBooking(supabase: any, userId: string | null, lineDisplayName: string | null, args: any) {
  const { barber_name, date, start_time, service_names } = args

  const { data: barber } = await supabase
    .from('barbers')
    .select('id, display_name')
    .ilike('display_name', `%${barber_name}%`)
    .eq('status', 'active')
    .single()

  if (!barber) return { error: `找不到理髮師：${barber_name}` }

  const { data: services } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price')
    .eq('is_active', true)

  const selectedServices = services.filter((s: any) =>
    service_names.some((name: string) => s.name.includes(name) || name.includes(s.name))
  )

  if (selectedServices.length === 0) {
    return { error: `找不到服務項目：${service_names.join(', ')}` }
  }

  const totalDuration = selectedServices.reduce((sum: number, s: any) => sum + s.duration_minutes, 0)
  const totalPrice = selectedServices.reduce((sum: number, s: any) => sum + s.price, 0)

  const [startH, startM] = start_time.split(':').map(Number)
  const endMinutes = startH * 60 + startM + totalDuration
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`

  // Check for conflicts
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id')
    .eq('barber_id', barber.id)
    .eq('booking_date', date)
    .neq('status', 'cancelled')
    .lt('start_time', endTime)
    .gt('end_time', start_time)

  if (conflicts && conflicts.length > 0) {
    return { error: '此時段已被預約，請選擇其他時間' }
  }

  // Create booking — linked user gets customer_id, otherwise walk-in with LINE display name
  const bookingData: any = {
    barber_id: barber.id,
    booking_date: date,
    start_time,
    end_time: endTime,
    total_duration: totalDuration,
    total_price: totalPrice,
    status: 'confirmed',
  }

  if (userId) {
    bookingData.customer_id = userId
  }
  // Always save LINE display name for display (works as fallback even when customer_id is set)
  bookingData.walk_in_name = lineDisplayName || 'LINE 顧客'

  console.log('[LINE-DEBUG] createBooking bookingData:', JSON.stringify(bookingData))

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select()
    .single()

  console.log('[LINE-DEBUG] createBooking result:', JSON.stringify({ booking, bookingError }))

  if (bookingError) return { error: bookingError.message }

  await supabase.from('booking_services').insert(
    selectedServices.map((s: any) => ({
      booking_id: booking.id,
      service_id: s.id,
    }))
  )

  return {
    success: true,
    booking: {
      id: booking.id,
      barber: barber.display_name,
      date,
      time: `${start_time} - ${endTime}`,
      services: selectedServices.map((s: any) => s.name),
      total_price: `$${totalPrice}`,
      total_duration: `${totalDuration} 分鐘`,
    },
    message: `預約成功！${barber.display_name} - ${date} ${start_time}`,
  }
}

async function executeToolCall(
  supabase: any,
  toolName: string,
  args: any,
  userId: string | null,
  lineDisplayName: string | null
): Promise<any> {
  switch (toolName) {
    case 'get_barbers':
      return await getBarbers(supabase)
    case 'get_barber_availability':
      return await getBarberAvailability(supabase, args.barber_name, args.date)
    case 'get_barber_holidays':
      return await getBarberHolidays(supabase, args.barber_name)
    case 'get_services':
      return await getServices(supabase)
    case 'create_booking':
      return await createBooking(supabase, userId, lineDisplayName, args)
    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}

// ─── Conversation History Management ──────────────────────────

const MAX_HISTORY_MESSAGES = 20 // Keep last 20 messages to avoid token overflow

async function getConversationHistory(supabase: any, lineUserId: string): Promise<{ userId: string | null; messages: any[] }> {
  const { data } = await supabase
    .from('line_conversations')
    .select('user_id, messages')
    .eq('line_user_id', lineUserId)
    .single()

  if (!data) {
    return { userId: null, messages: [] }
  }

  return {
    userId: data.user_id,
    messages: data.messages || [],
  }
}

async function saveConversationHistory(supabase: any, lineUserId: string, userId: string | null, messages: any[]) {
  // Trim to last N messages
  const trimmed = messages.slice(-MAX_HISTORY_MESSAGES)

  const { error } = await supabase
    .from('line_conversations')
    .upsert({
      line_user_id: lineUserId,
      user_id: userId,
      messages: trimmed,
    }, { onConflict: 'line_user_id' })

  if (error) {
    console.error('Failed to save conversation:', error.message)
  }
}

async function lookupUserByLineId(supabase: any, lineUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('line_user_id', lineUserId)
    .single()

  return data?.id || null
}

// Create or get a user record for LINE messaging users
// This ensures booking.customer.name displays correctly in the app
async function getOrCreateLineUser(
  supabase: any,
  lineUserId: string,
  displayName: string
): Promise<string | null> {
  const botEmail = `line_msg_${lineUserId}@bot.local`

  // Check if we already have a user for this LINE messaging user
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, name')
    .eq('email', botEmail)
    .single()

  if (existingUser) {
    // Update name if LINE display name changed
    if (existingUser.name !== displayName) {
      await supabase.from('users').update({ name: displayName }).eq('id', existingUser.id)
    }
    return existingUser.id
  }

  // Create auth user (required for users table foreign key)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: botEmail,
    email_confirm: true,
    user_metadata: { source: 'line_bot', line_messaging_user_id: lineUserId },
  })

  if (authError || !authData?.user) {
    console.error('[LINE] Failed to create auth user:', authError?.message)
    return null
  }

  // Create public user record
  const { error: userError } = await supabase.from('users').insert({
    id: authData.user.id,
    name: displayName,
    email: botEmail,
    role: 'customer',
  })

  if (userError) {
    console.error('[LINE] Failed to create public user:', userError.message)
    return null
  }

  console.log('[LINE] Created bot user for', displayName, '→', authData.user.id)
  return authData.user.id
}

// ─── Main Handler ─────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'GET') {
    return new Response('LINE Webhook is running', { status: 200 })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const LINE_CHANNEL_SECRET = Deno.env.get('LINE_MESSAGING_CHANNEL_SECRET')
    const LINE_ACCESS_TOKEN = Deno.env.get('LINE_MESSAGING_ACCESS_TOKEN')
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

    if (!LINE_CHANNEL_SECRET || !LINE_ACCESS_TOKEN) {
      throw new Error('LINE credentials not configured')
    }
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    // Read body as text for signature verification
    const body = await req.text()

    // Verify LINE webhook signature
    const signature = req.headers.get('x-line-signature')
    if (!signature) {
      return new Response('Missing signature', { status: 401 })
    }

    const isValid = await verifySignature(body, signature, LINE_CHANNEL_SECRET)
    if (!isValid) {
      return new Response('Invalid signature', { status: 401 })
    }

    // Parse webhook events
    const webhook = JSON.parse(body)
    const events = webhook.events || []

    // LINE expects 200 immediately; process asynchronously is not needed
    // since Supabase Edge Functions wait for completion anyway.
    // But we should respond 200 quickly to avoid LINE retries.

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    for (const event of events) {
      // Only process text message events
      if (event.type !== 'message' || event.message.type !== 'text') {
        continue
      }

      const lineUserId = event.source.userId
      const userMessage = event.message.text
      const replyToken = event.replyToken

      if (!lineUserId || !replyToken) continue

      try {
        // Look up linked app user and get LINE display name in parallel
        const [appUserIdResult, lineDisplayName] = await Promise.all([
          lookupUserByLineId(serviceClient, lineUserId),
          getLineProfile(lineUserId, LINE_ACCESS_TOKEN),
        ])
        let appUserId = appUserIdResult
        console.log('[LINE-DEBUG] lineUserId:', lineUserId, '| appUserId:', appUserId, '| lineDisplayName:', lineDisplayName)

        // If user is linked but has no name, update their profile with LINE display name
        if (appUserId && lineDisplayName && lineDisplayName !== 'LINE 顧客') {
          const { data: userData } = await serviceClient
            .from('users')
            .select('name')
            .eq('id', appUserId)
            .single()
          if (!userData?.name?.trim()) {
            await serviceClient
              .from('users')
              .update({ name: lineDisplayName })
              .eq('id', appUserId)
          }
        }

        // If no linked app user, create/get a bot user so booking.customer.name works
        if (!appUserId && lineDisplayName && lineDisplayName !== 'LINE 顧客') {
          const botUserId = await getOrCreateLineUser(serviceClient, lineUserId, lineDisplayName)
          if (botUserId) {
            appUserId = botUserId
            console.log('[LINE-DEBUG] Using bot user:', botUserId)
          }
        }

        // Load conversation history
        const conversation = await getConversationHistory(serviceClient, lineUserId)

        // If we found a user now but didn't have one before, update
        if (appUserId && !conversation.userId) {
          conversation.userId = appUserId
        }
        // Use cached userId if lookup returned null but we had one before
        if (!appUserId && conversation.userId) {
          appUserId = conversation.userId
        }

        // Build messages for OpenAI
        const messages: any[] = [
          { role: 'system', content: getSystemPrompt() },
          ...conversation.messages,
          { role: 'user', content: userMessage },
        ]

        // Call OpenAI
        let response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            tools,
            tool_choice: 'auto',
            temperature: 0.7,
            max_tokens: 800,
          }),
        })

        let result = await response.json()

        if (result.error) {
          console.error('OpenAI error:', result.error)
          await replyToLine(replyToken, '抱歉，系統暫時有問題，請稍後再試～', LINE_ACCESS_TOKEN)
          continue
        }

        let assistantMessage = result.choices[0].message

        // Process tool calls
        while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          const toolMessages = []

          for (const toolCall of assistantMessage.tool_calls) {
            const args = JSON.parse(toolCall.function.arguments)
            const toolResult = await executeToolCall(
              serviceClient,
              toolCall.function.name,
              args,
              appUserId,
              lineDisplayName
            )

            toolMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult),
            })
          }

          messages.push(assistantMessage)
          messages.push(...toolMessages)

          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages,
              tools,
              tool_choice: 'auto',
              temperature: 0.7,
              max_tokens: 800,
            }),
          })

          result = await response.json()

          if (result.error) {
            console.error('OpenAI error in tool loop:', result.error)
            break
          }

          assistantMessage = result.choices[0].message
        }

        const replyText = assistantMessage.content || '抱歉，我沒有聽懂，可以再說一次嗎？'

        // Reply to LINE
        await replyToLine(replyToken, replyText, LINE_ACCESS_TOKEN)

        // Save conversation history (only user + assistant text messages, skip tool calls)
        const updatedHistory = [
          ...conversation.messages,
          { role: 'user', content: userMessage },
          { role: 'assistant', content: replyText },
        ]
        await saveConversationHistory(serviceClient, lineUserId, appUserId, updatedHistory)

      } catch (eventError) {
        console.error('Error processing event:', eventError)
        try {
          await replyToLine(replyToken, '抱歉，系統暫時有問題，請稍後再試～', LINE_ACCESS_TOKEN)
        } catch (_) {
          // Ignore reply errors
        }
      }
    }

    // Always return 200 to LINE
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Webhook error:', error)
    // Still return 200 to prevent LINE from retrying
    return new Response(JSON.stringify({ status: 'error' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
