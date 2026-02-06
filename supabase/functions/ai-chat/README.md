# AI Chat Edge Function 設定指南

## 1. 設定 OpenAI API Key（安全方式）

**重要：永遠不要把 API key 寫在程式碼裡！**

### 方法 A：使用 Supabase Dashboard

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 前往 **Settings** → **Edge Functions**
4. 點擊 **Add new secret**
5. 新增：
   - Name: `OPENAI_API_KEY`
   - Value: `你的新 API key`

### 方法 B：使用 Supabase CLI

```bash
# 安裝 Supabase CLI（如果還沒安裝）
brew install supabase/tap/supabase

# 登入
supabase login

# 連結專案
supabase link --project-ref uokzhoteojtnluhpqvjj

# 設定 secret
supabase secrets set OPENAI_API_KEY=sk-proj-你的新key
```

## 2. 部署 Edge Function

```bash
cd /Users/luke/Desktop/az-barber

# 部署
supabase functions deploy ai-chat

# 或者本地測試
supabase functions serve ai-chat --env-file .env.local
```

## 3. 測試 API

```bash
curl -X POST 'https://uokzhoteojtnluhpqvjj.supabase.co/functions/v1/ai-chat' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"message": "Wendy 週三有空嗎？"}'
```

## 4. API 規格

### Request

```json
POST /functions/v1/ai-chat
{
  "message": "Wendy 週三下午有空嗎？",
  "conversation_history": [
    {"role": "user", "content": "之前的訊息"},
    {"role": "assistant", "content": "之前的回覆"}
  ]
}
```

### Response

```json
{
  "message": "Wendy 週三下午有以下時段可預約：14:00、14:30、15:00...",
  "tool_results": [
    {
      "tool": "get_barber_availability",
      "args": {"barber_name": "Wendy", "date": "2024-02-07"},
      "result": {"available_slots": ["14:00", "14:30", ...]}
    }
  ]
}
```

## 5. 支援的查詢範例

- "AZ 明天有空嗎？"
- "Wendy 週六下午有什麼時段？"
- "洗剪多少錢？"
- "幫我預約週六 10:00 洗剪"
- "有哪些服務？"
- "有哪些理髮師？"
