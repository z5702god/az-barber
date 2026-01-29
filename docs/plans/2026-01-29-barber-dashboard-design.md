# 理髮師後台設計文件

> 建立日期：2026-01-29

## 概述

為理髮師角色建立專屬的管理後台，包含預約管理、時段設定、統計報表等功能。

## 設計決策

| 項目 | 決策 |
|------|------|
| 功能範圍 | 進階版：預約管理 + 時段設定 + 收入統計 + 顧客歷史 |
| 導航方式 | 獨立 Tab 導航（根據 role 切換） |
| 預約顯示 | 日曆視圖 |
| 開發順序 | 先功能後 UI 優化 |
| 測試策略 | TDD (測試驅動開發) |

---

## 導航架構

理髮師登入後顯示獨立的 5 個 Tab：

```
┌─────┬──────┬──────┬──────┬──────┐
│ 首頁 │ 預約 │ 時段 │ 統計 │ 我的 │
└─────┴──────┴──────┴──────┴──────┘
```

### 角色判斷邏輯

```
登入後 → 檢查 user.role
├── customer → CustomerTabNavigator
├── barber   → BarberTabNavigator
└── owner    → OwnerTabNavigator (未來)
```

---

## 畫面設計

### 1. 首頁 (BarberHomeScreen)

**功能：**
- 顯示今日預約數量和預估收入
- 列出今天接下來的預約（最多 3-5 個）
- 可直接標記預約為「完成」或「取消」

**UI 元素：**
- 問候語 + 日期
- 統計卡片（預約數、預估收入）
- 預約列表（時間、顧客名、服務、價格、操作按鈕）

---

### 2. 預約管理 (BookingCalendarScreen)

**功能：**
- 日曆顯示整月，有預約的日期標記圓點
- 點選日期顯示當天所有預約
- 預約狀態色彩：已確認(藍)、已完成(綠)、已取消(灰)
- 可標記預約為「完成」或「取消」

**UI 元素：**
- 月曆元件（使用 react-native-calendars）
- 選中日期的預約列表
- 預約卡片含狀態標籤和操作按鈕

---

### 3. 時段設定 (AvailabilityScreen)

**功能：**
- 設定每週固定營業時段（週一至週日）
- 新增特殊休假（單日或連續多日）
- 休假日自動阻擋顧客預約

**資料對應：**
- `availability.day_of_week` (0-6)：每週固定時段
- `availability.specific_date` + `is_exception=true`：特殊休假

**UI 元素：**
- 每週時段列表 + 編輯按鈕
- 特殊休假列表 + 新增/刪除按鈕
- 時間選擇器（開始/結束時間）

---

### 4. 統計 (StatsScreen)

**功能：**
- 時間篩選：本週 / 本月 / 本季 / 自訂
- 收入摘要：總收入、完成數、平均單價、取消數
- 熱門服務排行
- 顧客歷史列表

**UI 元素：**
- 時間範圍選擇器
- 統計數字卡片 (2x2 grid)
- 熱門服務 TOP 3 列表
- 顧客列表（來店次數、消費金額）

---

### 5. 個人資料 (BarberProfileScreen)

**功能：**
- 顯示個人資訊（頭像、名字、Email）
- 編輯個人資料入口
- 通知設定入口
- 登出

**UI 元素：**
- 頭像 + 名字 + Email
- 選單列表
- 登出按鈕

---

## 檔案結構

```
src/
├── screens/
│   └── barber/                      # 新增
│       ├── BarberHomeScreen.tsx
│       ├── BookingCalendarScreen.tsx
│       ├── AvailabilityScreen.tsx
│       ├── StatsScreen.tsx
│       ├── BarberProfileScreen.tsx
│       └── index.ts
├── navigation/
│   ├── AppNavigator.tsx             # 修改：根據 role 切換
│   └── BarberTabNavigator.tsx       # 新增
├── hooks/
│   └── useBarberData.ts             # 新增
└── components/
    └── barber/                      # 新增（如需共用元件）
        ├── BookingCard.tsx
        └── StatCard.tsx
```

---

## 資料庫查詢

### 取得理髮師今日預約
```sql
SELECT b.*, u.name as customer_name, u.phone as customer_phone
FROM bookings b
JOIN users u ON b.customer_id = u.id
WHERE b.barber_id = :barber_id
  AND b.booking_date = CURRENT_DATE
  AND b.status = 'confirmed'
ORDER BY b.start_time;
```

### 取得理髮師統計
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
  SUM(total_price) FILTER (WHERE status = 'completed') as total_revenue
FROM bookings
WHERE barber_id = :barber_id
  AND booking_date BETWEEN :start_date AND :end_date;
```

### 取得熱門服務
```sql
SELECT s.name, COUNT(*) as count, SUM(s.price) as revenue
FROM booking_services bs
JOIN bookings b ON bs.booking_id = b.id
JOIN services s ON bs.service_id = s.id
WHERE b.barber_id = :barber_id
  AND b.status = 'completed'
  AND b.booking_date BETWEEN :start_date AND :end_date
GROUP BY s.id, s.name
ORDER BY count DESC
LIMIT 3;
```

---

## 測試策略

採用 TDD，每個功能先寫測試再實作：

1. **Unit Tests**：資料處理函式、hook 邏輯
2. **Integration Tests**：API 呼叫、資料庫互動
3. **Component Tests**：UI 元件渲染、使用者互動

---

## 實作順序

1. 導航架構（角色切換）
2. BarberHomeScreen（今日摘要）
3. BookingCalendarScreen（日曆 + 預約管理）
4. AvailabilityScreen（時段設定）
5. StatsScreen（統計報表）
6. BarberProfileScreen（個人資料）
