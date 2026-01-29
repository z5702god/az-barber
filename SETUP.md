# AZ Barber App 設定指南

## 1. Supabase 設定

### 1.1 建立 Supabase 專案

1. 前往 [supabase.com](https://supabase.com) 建立帳號
2. 點擊 "New Project" 建立新專案
3. 記下以下資訊：
   - Project URL (例如: `https://xxxxx.supabase.co`)
   - anon public key

### 1.2 建立資料表

1. 進入 Supabase Dashboard
2. 點擊左側 "SQL Editor"
3. 複製 `supabase/schema.sql` 的內容並執行
4. 複製 `supabase/seed.sql` 的內容並執行（初始服務項目）

### 1.3 設定認證

#### Google 登入
1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 建立 OAuth 2.0 用戶端 ID
3. 在 Supabase Dashboard > Authentication > Providers 啟用 Google
4. 填入 Client ID 和 Client Secret

#### Apple 登入
1. 前往 [Apple Developer](https://developer.apple.com)
2. 建立 Sign in with Apple 服務
3. 在 Supabase Dashboard > Authentication > Providers 啟用 Apple
4. 填入相關憑證

#### LINE 登入
1. 前往 [LINE Developers](https://developers.line.biz)
2. 建立 LINE Login channel
3. LINE 登入需要自訂實作（Supabase 原生不支援）
4. 可使用 LINE 的 OAuth API 取得 token 後，用 Supabase 的自訂 JWT 驗證

### 1.4 更新 App 設定

編輯 `src/services/supabase.ts`：

```typescript
const SUPABASE_URL = 'https://你的專案.supabase.co';
const SUPABASE_ANON_KEY = '你的 anon key';
```

## 2. 執行 App

```bash
# 進入專案目錄
cd "az barber"

# 安裝依賴（已完成）
npm install

# 啟動開發伺服器
npm start

# iOS 模擬器
npm run ios

# Android 模擬器
npm run android
```

## 3. 設定店長和理髮師

### 3.1 設定店長

1. 使用 App 登入（任何社群帳號）
2. 在 Supabase Dashboard > Table Editor > users 找到該用戶
3. 將 `role` 欄位改為 `owner`

### 3.2 新增理髮師

1. 理髮師使用 App 登入
2. 在 Supabase Dashboard 更新用戶 `role` 為 `barber`
3. 在 `barbers` 表新增記錄：

```sql
INSERT INTO barbers (user_id, display_name, photo_url)
VALUES ('用戶UUID', '理髮師名稱', '照片URL或NULL');
```

## 4. 專案結構

```
az barber/
├── App.tsx                 # 主要進入點
├── src/
│   ├── components/         # 共用元件
│   ├── screens/            # 畫面
│   │   ├── auth/           # 登入相關
│   │   ├── customer/       # 客人端畫面
│   │   └── manage/         # 管理端畫面
│   ├── navigation/         # 導航設定
│   ├── services/           # API 服務
│   ├── hooks/              # 自訂 Hooks
│   ├── types/              # TypeScript 型別
│   ├── utils/              # 工具函數
│   └── constants/          # 常數
├── supabase/
│   ├── schema.sql          # 資料表結構
│   └── seed.sql            # 初始資料
└── assets/                 # 圖片等資源
```

## 5. 開發進度

### 第一階段：基礎建設 ✅
- [x] 專案初始化 (React Native + Expo + TypeScript)
- [x] Supabase 資料表設計
- [x] 認證系統架構
- [x] 基本導航架構

### 第二階段：客人端（待開發）
- [ ] 服務選擇畫面
- [ ] 時段查詢與預約
- [ ] 推播通知

### 第三階段：管理端（待開發）
- [ ] 理髮師預約列表
- [ ] 時段設定
- [ ] 店長管理功能
- [ ] 報表功能
