# 預約流程設計文件

## 概述

實作客人端的完整預約流程，採用分步式設計。

## 流程

```
首頁 → 選擇服務 → 選擇日期時段 → 確認預約 → 完成
```

## 決策紀錄

| 項目 | 決策 | 原因 |
|------|------|------|
| 流程類型 | 分步式（4個畫面） | 使用者體驗較清晰 |
| 服務選擇 | 必須選擇至少一項 | 確保預約有明確內容 |
| 時段顯示 | 30分鐘按鈕 | 直覺好選擇 |

## 新增畫面

### 1. SelectServicesScreen

**路徑**: `src/screens/booking/SelectServicesScreen.tsx`

**功能**:
- 顯示所有可用服務（Checkbox 多選）
- 每項顯示：名稱、時間、價格
- 底部固定顯示：已選數量、總時間、總價格
- 下一步按鈕（至少選一項才啟用）

**資料來源**:
```typescript
const { data: services } = await supabase
  .from('services')
  .select('*')
  .eq('is_active', true)
  .order('sort_order');
```

### 2. SelectTimeScreen

**路徑**: `src/screens/booking/SelectTimeScreen.tsx`

**功能**:
- 日曆選擇日期（過去日期不可選）
- 顯示該日可選時段（30分鐘為單位）
- 灰色標示不可選時段（已被預約或時間不夠）
- 底部顯示已選時段和預計結束時間

**時段計算邏輯**:
1. 取得理髮師該日營業時段 (availability)
2. 取得該日已有預約 (bookings)
3. 產生 30 分鐘時段
4. 標記可選/不可選（需有足夠連續空檔）

### 3. ConfirmBookingScreen

**路徑**: `src/screens/booking/ConfirmBookingScreen.tsx`

**功能**:
- 顯示預約摘要（理髮師、時間、服務項目）
- 顯示總時間、總價格
- 備註輸入欄（選填）
- 確認預約按鈕

### 4. BookingSuccessScreen

**路徑**: `src/screens/booking/BookingSuccessScreen.tsx`

**功能**:
- 顯示成功訊息
- 顯示預約摘要
- 「查看我的預約」按鈕
- 「返回首頁」按鈕

## 資料傳遞

使用 React Navigation params:

```
SelectServicesScreen
  params: { barberId }
  傳出: { barberId, selectedServices[] }

SelectTimeScreen
  params: { barberId, selectedServices[] }
  傳出: { barberId, selectedServices[], date, startTime, endTime }

ConfirmBookingScreen
  params: { barberId, selectedServices[], date, startTime, endTime }
  傳出: 建立預約

BookingSuccessScreen
  params: { bookingId }
```

## 建立預約 API

```typescript
// 1. 建立 booking 記錄
const { data: booking } = await supabase
  .from('bookings')
  .insert({
    customer_id: userId,
    barber_id: barberId,
    booking_date: date,
    start_time: startTime,
    end_time: endTime,
    total_duration: totalMinutes,
    total_price: totalPrice,
    notes: notes
  })
  .select()
  .single();

// 2. 建立 booking_services 關聯
await supabase
  .from('booking_services')
  .insert(selectedServices.map(s => ({
    booking_id: booking.id,
    service_id: s.id
  })));
```

## 實作順序

1. 設定 Navigation（Booking Stack）
2. SelectServicesScreen
3. SelectTimeScreen（含時段計算邏輯）
4. ConfirmBookingScreen
5. BookingSuccessScreen
6. 整合測試
