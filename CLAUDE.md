# AZ Barber App

## 專案概述
React Native + Expo 理髮預約 App，支援顧客預約和理髮師管理。

## 重要提醒

### 開發前必做
```bash
# 啟動 Metro Bundler（每次開發/測試前都要執行！）
npx expo start
```
然後按 `i` 開啟 iOS 模擬器，或按 `a` 開啟 Android 模擬器。

> ⚠️ 如果看到 "No script URL provided" 錯誤，就是忘記啟動 Metro Bundler！

---

## 技術棧

| 類別 | 技術 |
|------|------|
| Framework | React Native + Expo |
| Language | TypeScript |
| Backend | Supabase (Auth + PostgreSQL) |
| Navigation | React Navigation v6 |
| UI Library | React Native Paper |
| Icons | @expo/vector-icons (Ionicons) |

---

## 常用指令

```bash
# 開發
npx expo start              # 啟動開發伺服器（必須先執行！）
npx expo start --clear      # 清除快取後啟動

# 建置
npx expo run:ios            # 本地建置 iOS（開發版）
npx expo run:ios --configuration Release  # 本地建置 iOS（正式版）
eas build --platform ios    # 雲端建置 iOS

# Supabase
npx supabase start          # 啟動本地 Supabase
npx supabase db reset       # 重置資料庫並重新 seed

# Supabase 遠端操作（需先登入）
npx supabase login          # 登入 Supabase CLI
npx supabase link --project-ref uokzhoteojtnluhpqvjj  # 連結專案
npx supabase functions deploy ai-chat                  # 部署 Edge Function
npx supabase secrets set KEY=value                     # 設定環境變數
npx supabase secrets list                              # 列出所有 secrets
```

---

## 專案結構

```
src/
├── screens/
│   ├── auth/           # 登入畫面
│   ├── customer/       # 顧客端畫面
│   │   ├── HomeScreen.tsx
│   │   ├── MyBookingsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── AIChatScreen.tsx
│   ├── barber/         # 理髮師端畫面
│   │   ├── BarberHomeScreen.tsx
│   │   ├── BookingCalendarScreen.tsx
│   │   ├── AvailabilityScreen.tsx
│   │   ├── StatsScreen.tsx
│   │   └── BarberProfileScreen.tsx
│   ├── booking/        # 預約流程
│   │   ├── SelectServicesScreen.tsx
│   │   ├── SelectTimeScreen.tsx
│   │   ├── ConfirmBookingScreen.tsx
│   │   └── BookingSuccessScreen.tsx
│   └── shared/         # 共用畫面
│       └── EditProfileScreen.tsx
├── hooks/              # Custom hooks
│   ├── useAuth.tsx
│   └── useAIChat.ts
├── services/           # 外部服務
│   ├── supabase.ts
│   └── aiChat.ts
├── navigation/         # 導航設定
│   ├── AppNavigator.tsx
│   ├── CustomerTabNavigator.tsx
│   ├── BarberTabNavigator.tsx
│   └── types.ts
├── theme/              # 主題樣式
│   └── index.ts
├── types/              # TypeScript 類型
│   └── index.ts
└── utils/              # 工具函數
    └── timeSlots.ts
```

---

## 設計規範

### 色彩
- **主色 (Primary)**：`#C9A96E` 金色
- **背景**：`#111111` 深黑
- **卡片**：`#1A1A1A`
- **邊框**：`#2A2A2A`
- **文字**：`#FAFAFA`
- **次要文字**：`#71717A`

### 字體
- **標題**：Playfair Display
- **程式碼/數字**：JetBrains Mono
- **內文**：Inter

### 風格
- 直角設計（borderRadius: 0）
- 深色主題
- 金色強調

---

## 資料庫結構

### 主要資料表
- `users` - 用戶（含 role: customer/barber/owner）
- `barbers` - 理髮師資料
- `services` - 服務項目
- `bookings` - 預約
- `booking_services` - 預約與服務關聯
- `availability` - 理髮師可用時段

### 理髮師 ID（硬編碼於前端）
- AZ：`11111111-1111-1111-1111-111111111111`
- Wendy：`22222222-2222-2222-2222-222222222222`

---

## Supabase 設定

### 專案資訊
- **Project ID**: `uokzhoteojtnluhpqvjj`
- **Project URL**: `https://uokzhoteojtnluhpqvjj.supabase.co`
- **Dashboard**: https://supabase.com/dashboard/project/uokzhoteojtnluhpqvjj

### Edge Functions
- `ai-chat` - AI 預約助理，使用 OpenAI GPT-4o-mini
  - 路徑：`supabase/functions/ai-chat/index.ts`
  - 需要 secret：`OPENAI_API_KEY`

### 必要 Secrets
在 Supabase Dashboard → Project Settings → Edge Functions → Secrets 設定：
- `OPENAI_API_KEY` - OpenAI API 金鑰

### 部署 Edge Function
```bash
# 1. 先登入（如果還沒登入）
npx supabase login

# 2. 連結專案
npx supabase link --project-ref uokzhoteojtnluhpqvjj

# 3. 設定 secrets（如果需要）
npx supabase secrets set OPENAI_API_KEY=sk-xxx

# 4. 部署
npx supabase functions deploy ai-chat
```

---

## 測試帳號設定

### 建立理髮師帳號
1. 先在 App 註冊一個帳號
2. 執行以下 SQL：

```sql
-- 設定為理髮師
UPDATE users SET role = 'barber' WHERE email = 'az@test.com';

-- 建立 barber 資料
INSERT INTO barbers (id, user_id, display_name)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  (SELECT id FROM users WHERE email = 'az@test.com'),
  'AZ'
);

-- 加入 availability
INSERT INTO availability (barber_id, day_of_week, start_time, end_time, is_exception)
VALUES
  ('11111111-1111-1111-1111-111111111111', 1, '10:00', '19:00', FALSE),
  ('11111111-1111-1111-1111-111111111111', 2, '10:00', '19:00', FALSE),
  ('11111111-1111-1111-1111-111111111111', 3, '10:00', '19:00', FALSE),
  ('11111111-1111-1111-1111-111111111111', 4, '10:00', '19:00', FALSE),
  ('11111111-1111-1111-1111-111111111111', 5, '10:00', '19:00', FALSE),
  ('11111111-1111-1111-1111-111111111111', 6, '10:00', '19:00', FALSE);
```

---

## 上架準備

### EAS Build
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile production
eas submit --platform ios
```

### 需要準備
- Apple Developer Account ($99/年)
- App 圖示 1024x1024
- 截圖（6.7" 和 5.5"）
- 隱私權政策 URL

---

## 重要實作細節

### 預約系統
- **防止雙重預約**：資料庫有 trigger `check_booking_overlap()` 防止同一理髮師同一時段被重複預約
- **服務選擇**：每個類別（剪髮、燙髮、染髮、護髮）只能選一項，但可跨類別組合
- **時段計算**：使用 `src/utils/timeSlots.ts` 計算可用時段

### 導航系統
- 使用 React Navigation v7 (native-stack)
- 預約流程使用自訂 Header 元件（避免 iOS 原生 header 樣式問題）
- Modal 呈現方式：`presentation: 'modal'`

### UI 注意事項
- 所有按鈕、卡片使用直角設計（borderRadius: 0）
- 避免使用 iOS 原生 headerLeft/headerRight，改用完全自訂的 header 元件
- StatusBar 使用 `light-content` 配合深色主題
