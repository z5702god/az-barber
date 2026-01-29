# 店主後台設計文件

> 建立日期：2026-01-29

## 概述

為店主角色建立管理後台，在理髮師功能基礎上增加員工管理、服務項目管理、全店報表功能。

## 設計決策

| 項目 | 決策 |
|------|------|
| 功能範圍 | 完整管理：員工管理 + 服務管理 + 全店報表 |
| 導航方式 | 擴展理髮師 Tab（5個 + 管理 Tab） |
| 報表內容 | 基本報表：總營收、員工排行、服務排行 |
| 開發順序 | 先功能後 UI 優化 |
| 測試策略 | TDD |

## 前置條件

此功能依賴理髮師後台完成，需要：
- BarberTabNavigator 已建立
- 理髮師相關畫面已完成
- useBarberData hooks 已建立

---

## 導航架構

### 店主 Tab 結構（6 個 Tab）

```
┌─────┬──────┬──────┬──────┬──────┬──────┐
│ 首頁 │ 預約 │ 時段 │ 統計 │ 管理 │ 我的 │
└─────┴──────┴──────┴──────┴──────┴──────┘
  ↑      ↑      ↑      ↑      ↑      ↑
  複用   複用   複用   複用   新增   複用
```

### 管理 Tab 內的 Stack Navigator

```
ManageStackNavigator
├── ManageHome        ← 管理入口選單
├── StaffList         ← 員工列表
├── StaffEdit         ← 新增/編輯員工
├── ServiceList       ← 服務列表
├── ServiceEdit       ← 新增/編輯服務
└── ShopReports       ← 全店報表
```

### 角色權限對照

| 角色 | Tab 數量 | 內容 |
|------|----------|------|
| customer | 4 | 首頁、預約、我的預約、個人 |
| barber | 5 | 首頁、預約、時段、統計、個人 |
| owner | 6 | 首頁、預約、時段、統計、**管理**、個人 |

---

## 畫面設計

### 1. ManageHomeScreen（管理入口）

**功能：**
- 三個管理入口卡片（員工/服務/報表）
- 本月快速統計（營收、預約數、員工數、服務數）

**UI 元素：**
- 管理入口列表（可點擊進入子畫面）
- 統計卡片 2x2 grid

---

### 2. StaffListScreen（員工列表）

**功能：**
- 顯示所有理髮師（含頭像、名字、Email、狀態）
- 新增員工按鈕
- 點擊進入編輯畫面

**資料來源：**
```sql
SELECT b.*, u.name, u.email
FROM barbers b
JOIN users u ON b.user_id = u.id
ORDER BY b.created_at DESC;
```

---

### 3. StaffEditScreen（新增/編輯員工）

**新增員工流程：**
1. 輸入：顯示名稱、Email、初始密碼
2. 建立 auth.users 帳號（透過 Supabase Admin API 或 Edge Function）
3. 建立 users 記錄（role = 'barber'）
4. 建立 barbers 記錄

**編輯員工：**
- 修改顯示名稱
- 切換狀態（active/inactive）

**注意：** 不提供刪除功能，只能停用（保留歷史資料完整性）

---

### 4. ServiceListScreen（服務列表）

**功能：**
- 顯示所有服務（名稱、時長、價格、狀態）
- 新增服務按鈕
- 點擊進入編輯畫面

**資料來源：**
```sql
SELECT * FROM services ORDER BY sort_order, name;
```

---

### 5. ServiceEditScreen（新增/編輯服務）

**欄位：**
- 服務名稱（必填）
- 服務時長（分鐘，必填）
- 價格（必填）
- 排序順序（選填，預設 0）
- 狀態（啟用/停用）

**注意：** 不提供刪除功能，只能停用（保留歷史預約資料關聯）

---

### 6. ShopReportsScreen（全店報表）

**功能：**
- 時間篩選（本週/本月/本季）
- 營收總覽：總營收、完成預約數、平均單價、取消數
- 員工業績排行：按營收排序
- 熱門服務排行：按次數排序

**資料查詢：**

```sql
-- 全店營收
SELECT
  SUM(total_price) FILTER (WHERE status = 'completed') as total_revenue,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count
FROM bookings
WHERE booking_date BETWEEN :start_date AND :end_date;

-- 員工排行
SELECT
  b.display_name,
  SUM(bk.total_price) as revenue,
  COUNT(*) as booking_count
FROM bookings bk
JOIN barbers b ON bk.barber_id = b.user_id
WHERE bk.status = 'completed'
  AND bk.booking_date BETWEEN :start_date AND :end_date
GROUP BY b.id, b.display_name
ORDER BY revenue DESC;

-- 服務排行
SELECT
  s.name,
  COUNT(*) as count,
  SUM(s.price) as revenue
FROM booking_services bs
JOIN bookings bk ON bs.booking_id = bk.id
JOIN services s ON bs.service_id = s.id
WHERE bk.status = 'completed'
  AND bk.booking_date BETWEEN :start_date AND :end_date
GROUP BY s.id, s.name
ORDER BY count DESC
LIMIT 5;
```

---

## 檔案結構

### 新增檔案

```
src/
├── screens/
│   └── owner/
│       ├── ManageHomeScreen.tsx
│       ├── StaffListScreen.tsx
│       ├── StaffEditScreen.tsx
│       ├── ServiceListScreen.tsx
│       ├── ServiceEditScreen.tsx
│       ├── ShopReportsScreen.tsx
│       └── index.ts
├── navigation/
│   ├── OwnerTabNavigator.tsx
│   └── ManageStackNavigator.tsx
└── hooks/
    ├── useStaffManagement.ts
    ├── useServiceManagement.ts
    └── useShopStats.ts
```

### 修改檔案

```
src/
├── navigation/
│   ├── types.ts              # 加入 OwnerTabParamList, ManageStackParamList
│   └── AppNavigator.tsx      # 加入 owner 角色判斷
└── types/
    └── index.ts              # 如需新增類型
```

---

## 實作順序

1. 更新導航類型定義
2. 建立 ManageStackNavigator
3. 建立 OwnerTabNavigator
4. 建立 ManageHomeScreen
5. 建立 useStaffManagement hook
6. 建立 StaffListScreen + StaffEditScreen
7. 建立 useServiceManagement hook
8. 建立 ServiceListScreen + ServiceEditScreen
9. 建立 useShopStats hook
10. 建立 ShopReportsScreen
11. 更新 AppNavigator 支援 owner 角色
12. 整合測試

---

## 測試策略

- **Unit Tests**：hooks 的資料處理邏輯
- **Integration Tests**：Supabase API 呼叫
- **Component Tests**：UI 渲染、表單驗證
