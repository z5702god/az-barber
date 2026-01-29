# 個人資料編輯設計文件

> 建立日期：2026-01-29

## 概述

為所有使用者（顧客、理髮師、店主）提供個人資料編輯功能，可修改姓名、電話、生日、性別、偏好設定。

## 設計決策

| 項目 | 決策 |
|------|------|
| 欄位範圍 | 完整欄位：姓名、電話、生日、性別、偏好 |
| 頭像功能 | 暫不實作（後續功能） |
| 畫面結構 | 單一 EditProfileScreen |
| 驗證方式 | 前端即時驗證 + 後端驗證 |

---

## 資料庫更新

### users 表新增欄位

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
```

### 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| birthday | DATE | 生日，選填 |
| gender | TEXT | 性別，選填，可選值：male/female/other/prefer_not_to_say |
| preferences | JSONB | 偏好設定，如通知設定等 |

---

## 畫面設計

### EditProfileScreen（編輯個人資料）

**入口：**
- ProfileScreen 右上角編輯按鈕
- ProfileScreen 個人資訊區塊點擊

**欄位：**

| 欄位 | 類型 | 必填 | 驗證規則 |
|------|------|------|----------|
| 姓名 | TextInput | 是 | 2-50 字元 |
| 電話 | TextInput | 否 | 台灣手機格式 09xxxxxxxx |
| 生日 | DatePicker | 否 | 不可為未來日期 |
| 性別 | Select | 否 | 四選一 |
| 偏好設定 | Switches | 否 | - |

**偏好設定項目：**
- 預約提醒通知（預設開啟）
- 促銷資訊通知（預設關閉）

**UI 元素：**
- 表單區塊（ScrollView）
- 儲存按鈕（底部固定）
- 載入狀態指示器
- 錯誤訊息顯示

---

## 類型定義

### 更新 User 介面

```typescript
export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: UserRole;
  avatar_url?: string;
  birthday?: string;      // 新增：YYYY-MM-DD
  gender?: Gender;        // 新增
  preferences?: UserPreferences;  // 新增
  created_at: string;
}

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface UserPreferences {
  booking_reminder: boolean;
  promo_notifications: boolean;
}
```

---

## 檔案結構

### 新增檔案

```
src/
├── screens/
│   └── shared/
│       └── EditProfileScreen.tsx
└── hooks/
    └── useProfileEdit.ts
```

### 修改檔案

```
src/
├── types/
│   └── index.ts              # 新增 Gender, UserPreferences 類型
├── screens/
│   └── customer/
│       └── ProfileScreen.tsx # 加入編輯按鈕導航
└── navigation/
    └── types.ts              # 加入 EditProfile 路由
```

---

## 導航更新

### 顧客 Tab 導航

```typescript
export type MainTabParamList = {
  Home: undefined;
  Booking: undefined;
  MyBookings: undefined;
  Profile: undefined;
};

// Profile 內部需要 Stack Navigator 支援 EditProfile
export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
};
```

---

## 實作順序

1. 更新類型定義（Gender, UserPreferences）
2. 建立 useProfileEdit hook
3. 建立 EditProfileScreen
4. 更新 ProfileScreen 加入編輯入口
5. 更新導航支援
6. 資料庫 migration（手動執行）
7. 整合測試

---

## 測試策略

- **Unit Tests**：useProfileEdit hook 的資料處理邏輯
- **Component Tests**：表單驗證、UI 狀態
- **Integration Tests**：Supabase API 呼叫
