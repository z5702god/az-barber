# 理髮師預約 App 設計與開發計劃

## 專案概述

為小型理髮店（3-4位理髮師）開發跨平台（iOS + Android）預約 App，讓客人可以自助查看可預約時段並完成預約，解決目前透過 LINE 預約需要等待回覆的問題。

## 技術架構

- **前端**：React Native + TypeScript + Expo
- **後端**：Supabase（PostgreSQL + Auth + Realtime）
- **推播**：Expo Push Notifications
- **登入**：LINE + Apple + Google 社群登入

## 開發流程 - Superpowers Skills

本專案使用 Claude Code 的 Superpowers Skills 進行開發，確保高品質的程式碼和流程：

| 階段 | Skill | 用途 |
|------|-------|------|
| 規劃 | `/superpowers:brainstorming` | 需求探索與設計討論 |
| 規劃 | `/superpowers:writing-plans` | 撰寫詳細實作計劃 |
| 開發 | `/superpowers:executing-plans` | 執行實作計劃 |
| 開發 | `/superpowers:test-driven-development` | 測試驅動開發 |
| 除錯 | `/superpowers:systematic-debugging` | 系統性除錯 |
| 審查 | `/superpowers:requesting-code-review` | 請求程式碼審查 |
| 完成 | `/superpowers:verification-before-completion` | 完成前驗證 |
| 整合 | `/superpowers:finishing-a-development-branch` | 完成開發分支 |

### 開發原則

1. **新功能開發前**：使用 `brainstorming` 確認需求
2. **實作前**：使用 `writing-plans` 制定計劃
3. **寫程式時**：使用 `test-driven-development` 先寫測試
4. **遇到 bug**：使用 `systematic-debugging` 有系統地排查
5. **完成功能後**：使用 `requesting-code-review` 審查程式碼
6. **提交前**：使用 `verification-before-completion` 驗證

## 使用者角色與權限

| 角色 | 權限 |
|------|------|
| 客人 | 預約、查看/取消自己的預約 |
| 理髮師 | 管理自己的預約、設定可預約時段 |
| 店長 | 完整權限：員工管理、服務價格管理、報表 |

## 資料結構

```sql
-- 用戶
users (id, name, phone, email, role, avatar_url, created_at)

-- 理髮師資料
barbers (id, user_id, display_name, photo_url, status, created_at)

-- 服務項目
services (id, name, duration_minutes, price, is_active, created_at)

-- 可預約時段
availability (id, barber_id, day_of_week, specific_date, start_time, end_time, is_exception)

-- 預約
bookings (id, customer_id, barber_id, booking_date, start_time, end_time, total_duration, total_price, status, created_at)

-- 預約服務項目（多對多）
booking_services (booking_id, service_id)
```

## 主要功能畫面

### 客人端
1. 登入（LINE/Apple/Google）
2. 首頁（店家資訊、理髮師列表）
3. 選擇理髮師
4. 選擇服務（多選，顯示總時間+總價格）
5. 選擇日期時段
6. 確認預約
7. 我的預約（即將到來/歷史）

### 理髮師端
1. 今日預約
2. 日曆檢視
3. 設定可預約時段

### 店長端
1. 所有理髮師功能
2. 員工管理
3. 服務項目管理
4. 預約統計報表
5. 營收報表
6. 客人資料管理

## 開發階段

### 第一階段：基礎建設 ✅
- [x] 專案初始化 (React Native + Expo + TypeScript)
- [x] Supabase 資料表設計 (schema.sql)
- [x] 資料表 RLS 設定
- [x] 社群登入畫面 (LINE + Apple + Google)
- [x] 基本導航架構 (React Navigation)
- [x] UI 元件庫設定 (react-native-paper)
- [ ] Supabase 專案建立與設定（需手動）

### 第二階段：客人端功能
- [x] 首頁畫面
- [ ] 理髮師列表與詳情
- [ ] 服務選擇（多選 + 價格時間計算）
- [ ] 時段查詢邏輯
- [ ] 預約流程
- [x] 我的預約頁面
- [x] 取消/更改預約
- [ ] 推播通知設定

### 第三階段：管理端功能
- [ ] 角色判斷與介面切換
- [ ] 理髮師：預約列表檢視
- [ ] 理髮師：時段設定
- [ ] 店長：員工管理（CRUD）
- [ ] 店長：服務項目管理
- [ ] 店長：預約統計報表
- [ ] 店長：營收報表
- [ ] 店長：客人資料管理

## 核心業務邏輯

### 時段計算
1. 客人選擇服務組合 → 加總所需時間
2. 查詢理髮師該日可預約時段
3. 扣除已被預約的時段
4. 找出足夠長度的連續空檔
5. 顯示可選時段

### 預約規則
- 客人可自由取消/更改，無時間限制
- 預約成功後推播通知
- 現場付款，無線上金流

## 驗證方式

1. **登入測試**：使用 LINE/Apple/Google 登入，確認用戶資料正確建立
2. **預約流程**：完整走過選理髮師→選服務→選時段→確認預約
3. **時段計算**：確認已預約時段正確被排除
4. **權限測試**：確認不同角色看到正確的介面
5. **推播測試**：預約成功後收到通知

## 未來擴展（暫不實作）
- 客人評價/評分
- 理髮師作品集
- 會員等級/優惠
- LINE 官方帳號通知整合
