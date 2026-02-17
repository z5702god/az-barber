// AI Chat Edge Function - OpenAI GPT-4
// Handles natural language booking queries for AZ Barber app

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS: '*' is acceptable here since this is consumed by a mobile app (not browser-based),
// and authentication is enforced via JWT in the Authorization header.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tool definitions for OpenAI function calling
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

// Generate system prompt with current date (Asia/Taipei timezone)
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

  // Calculate upcoming dates for each day of the week
  const upcoming: string[] = []
  for (let i = 0; i <= 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const label = i === 0 ? '今天' : i === 1 ? '明天' : i === 2 ? '後天' : `${i}天後`
    upcoming.push(`${label} = ${formatDate(d)}（週${weekdays[d.getDay()]}）`)
  }

  return `你是 AZ Barber 理髮店的預約小幫手，叫小安。像朋友聊天一樣跟客人說話，不要太正式。

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
- 確認預約時簡單說就好，例如：「好～幫你約 Wendy 明天下午兩點洗剪，這樣 OK 嗎？」

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

// Read-only tool names that don't need user authentication
const READ_ONLY_TOOLS = ['get_barbers', 'get_barber_availability', 'get_barber_holidays', 'get_services']

// Tool implementations
async function executeToolCall(
  readClient: any,
  userClient: any,
  toolName: string,
  args: any,
  userId: string
): Promise<any> {
  switch (toolName) {
    case 'get_barbers':
      return await getBarbers(readClient)
    case 'get_barber_availability':
      return await getBarberAvailability(readClient, args.barber_name, args.date)
    case 'get_barber_holidays':
      return await getBarberHolidays(readClient, args.barber_name)
    case 'get_services':
      return await getServices(readClient)
    case 'create_booking':
      return await createBooking(userClient, userId, args)
    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}

async function getBarbers(supabase: any) {
  const { data, error } = await supabase
    .from('barbers')
    .select('id, display_name, status')
    .eq('status', 'active')

  if (error) return { error: error.message }
  return { barbers: data.map((b: any) => ({ id: b.id, name: b.display_name })) }
}

async function getBarberAvailability(supabase: any, barberName: string, date: string) {
  // Find barber by name
  const { data: barber } = await supabase
    .from('barbers')
    .select('id, display_name')
    .ilike('display_name', `%${barberName}%`)
    .eq('status', 'active')
    .single()

  if (!barber) return { error: `找不到理髮師：${barberName}` }

  // Get day of week (0 = Sunday)
  const dateObj = new Date(date)
  const dayOfWeek = dateObj.getDay()

  // Check for special holiday (exception) on this specific date
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

  // Get regular availability for this day from database
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

  // Get existing bookings for this date
  const { data: bookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('barber_id', barber.id)
    .eq('booking_date', date)
    .neq('status', 'cancelled')

  // Generate available slots (hourly intervals)
  const slots = generateAvailableSlots(
    avail.start_time,
    avail.end_time,
    bookings || []
  )

  return {
    barber: barber.display_name,
    date: date,
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

  // Start from the first full hour
  let currentHour = startH

  // Generate hourly slots only (e.g., 10:00, 11:00, 12:00)
  while (currentHour < endH) {
    const slotStart = `${String(currentHour).padStart(2, '0')}:00`
    const slotStartMinutes = currentHour * 60

    // Check if slot conflicts with any booking (assuming 1-hour minimum slot)
    const isBooked = bookings.some((b) => {
      const [bStartH, bStartM] = b.start_time.split(':').map(Number)
      const [bEndH, bEndM] = b.end_time.split(':').map(Number)
      const bookingStart = bStartH * 60 + bStartM
      const bookingEnd = bEndH * 60 + bEndM
      // Check if this hour overlaps with any booking
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
  // Find barber by name
  const { data: barber } = await supabase
    .from('barbers')
    .select('id, display_name')
    .ilike('display_name', `%${barberName}%`)
    .eq('status', 'active')
    .single()

  if (!barber) return { error: `找不到理髮師：${barberName}` }

  // Get today's date in Asia/Taipei timezone
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // Query all upcoming exceptions (holidays)
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

  // Group consecutive dates with same description into ranges
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
      // Consecutive date with same description — extend range
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
    holidays: holidays,
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

async function createBooking(supabase: any, userId: string, args: any) {
  const { barber_name, date, start_time, service_names } = args

  // Find barber
  const { data: barber } = await supabase
    .from('barbers')
    .select('id, display_name')
    .ilike('display_name', `%${barber_name}%`)
    .eq('status', 'active')
    .single()

  if (!barber) return { error: `找不到理髮師：${barber_name}` }

  // Find services
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

  // Calculate totals
  const totalDuration = selectedServices.reduce((sum: number, s: any) => sum + s.duration_minutes, 0)
  const totalPrice = selectedServices.reduce((sum: number, s: any) => sum + s.price, 0)

  // Calculate end time
  const [startH, startM] = start_time.split(':').map(Number)
  const endMinutes = startH * 60 + startM + totalDuration
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`

  // Check availability again (overlap = existing.start < new.end AND existing.end > new.start)
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

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      customer_id: userId,
      barber_id: barber.id,
      booking_date: date,
      start_time: start_time,
      end_time: endTime,
      total_duration: totalDuration,
      total_price: totalPrice,
      status: 'confirmed',
    })
    .select()
    .single()

  if (bookingError) return { error: bookingError.message }

  // Link services to booking
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
      date: date,
      time: `${start_time} - ${endTime}`,
      services: selectedServices.map((s: any) => s.name),
      total_price: `$${totalPrice}`,
      total_duration: `${totalDuration} 分鐘`,
    },
    message: `預約成功！${barber.display_name} - ${date} ${start_time}`,
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Extract the user's JWT from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid Authorization header')
    }
    const userToken = authHeader.replace('Bearer ', '')

    // Create a service role client for read operations (bypasses RLS to see all bookings for availability)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user's identity using the service role client
    const authClient = serviceClient
    const { data: { user }, error: authError } = await authClient.auth.getUser(userToken)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: '未授權：請先登入' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const userId = user.id

    // Create a user-scoped client for write operations (RLS enforced)
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      },
    })

    // Parse request body
    const { message, conversation_history = [] } = await req.json()

    if (!message) {
      throw new Error('Message is required')
    }

    // Build messages array
    const messages = [
      { role: 'system', content: getSystemPrompt() },
      ...conversation_history,
      { role: 'user', content: message },
    ]

    // Call OpenAI API
    let response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        tools: tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    let result = await response.json()

    if (result.error) {
      throw new Error(result.error.message)
    }

    let assistantMessage = result.choices[0].message
    const toolResults: any[] = []

    // Process tool calls if any
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolMessages = []

      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments)
        const toolResult = await executeToolCall(
          serviceClient,
          userClient,
          toolCall.function.name,
          args,
          userId
        )

        toolResults.push({
          tool: toolCall.function.name,
          args: args,
          result: toolResult,
        })

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        })
      }

      // Continue conversation with tool results
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
          messages: messages,
          tools: tools,
          tool_choice: 'auto',
          temperature: 0.7,
          max_tokens: 1000,
        }),
      })

      result = await response.json()
      assistantMessage = result.choices[0].message
    }

    // Return final response
    return new Response(
      JSON.stringify({
        message: assistantMessage.content,
        tool_results: toolResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
