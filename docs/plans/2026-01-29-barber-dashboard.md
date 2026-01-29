# 理髮師後台 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立理髮師專屬後台，包含預約管理、時段設定、統計報表功能

**Architecture:** 根據 user.role 切換不同的 Tab Navigator。理髮師看到 5 個 Tab：首頁、預約日曆、時段設定、統計、個人資料。使用現有的 Supabase 資料庫和 React Native Paper 元件。

**Tech Stack:** React Native, Expo, TypeScript, Supabase, React Navigation, React Native Paper, Jest

---

## Task 0: 設定測試環境

**Files:**
- Create: `jest.config.js`
- Create: `src/__tests__/setup.ts`
- Modify: `package.json`

**Step 1: 安裝 Jest 和相關依賴**

```bash
npm install --save-dev jest @types/jest ts-jest @testing-library/react-native @testing-library/jest-native jest-expo
```

**Step 2: 建立 jest.config.js**

```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-paper|react-native-vector-icons|react-native-calendars)',
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect', '<rootDir>/src/__tests__/setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
};
```

**Step 3: 建立測試 setup 檔案**

```typescript
// src/__tests__/setup.ts
import '@testing-library/jest-native/extend-expect';

// Mock Supabase
jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
    })),
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
```

**Step 4: 更新 package.json scripts**

在 `package.json` 的 scripts 中加入：
```json
"test": "jest",
"test:watch": "jest --watch"
```

**Step 5: 執行測試確認設定正確**

```bash
npm test -- --passWithNoTests
```
Expected: 測試環境正常啟動

**Step 6: Commit**

```bash
git add jest.config.js src/__tests__/setup.ts package.json package-lock.json
git commit -m "chore: setup Jest testing environment"
```

---

## Task 1: 更新導航類型定義

**Files:**
- Modify: `src/navigation/types.ts`

**Step 1: 寫測試（類型測試用 TypeScript 編譯驗證）**

確認類型正確的方式是編譯不報錯，此步驟跳過獨立測試。

**Step 2: 更新 types.ts 加入理髮師導航類型**

```typescript
// src/navigation/types.ts
import { NavigatorScreenParams } from '@react-navigation/native';
import { Service } from '../types';

// 根導航參數
export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  BarberMain: NavigatorScreenParams<BarberTabParamList>; // 新增
  BookingFlow: NavigatorScreenParams<BookingStackParamList>;
};

// 顧客 Tab 導航參數
export type MainTabParamList = {
  Home: undefined;
  Booking: undefined;
  MyBookings: undefined;
  Profile: undefined;
};

// 理髮師 Tab 導航參數 (新增)
export type BarberTabParamList = {
  BarberHome: undefined;
  BookingCalendar: undefined;
  Availability: undefined;
  Stats: undefined;
  BarberProfile: undefined;
};

// 預約流程導航參數
export type BookingStackParamList = {
  SelectServices: { barberId: string };
  SelectDateTime: {
    barberId: string;
    selectedServices: Service[];
    totalDuration: number;
    totalPrice: number;
  };
  ConfirmBooking: {
    barberId: string;
    selectedServices: Service[];
    date: string;
    startTime: string;
    endTime: string;
    totalDuration: number;
    totalPrice: number;
  };
  BookingSuccess: { bookingId: string };
};

// 管理端導航參數（保留給未來店主使用）
export type ManageStackParamList = {
  Dashboard: undefined;
  MySchedule: undefined;
  Availability: undefined;
  StaffManagement: undefined;
  ServiceManagement: undefined;
  Reports: undefined;
  CustomerManagement: undefined;
};
```

**Step 3: 確認 TypeScript 編譯通過**

```bash
npx tsc --noEmit
```
Expected: 無錯誤

**Step 4: Commit**

```bash
git add src/navigation/types.ts
git commit -m "feat: add BarberTabParamList navigation types"
```

---

## Task 2: 建立理髮師資料 Hook

**Files:**
- Create: `src/hooks/useBarberData.ts`
- Create: `src/__tests__/hooks/useBarberData.test.ts`

**Step 1: 寫失敗測試**

```typescript
// src/__tests__/hooks/useBarberData.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useBarberBookings } from '../../hooks/useBarberData';

// Mock data
const mockBookings = [
  {
    id: '1',
    customer_id: 'c1',
    barber_id: 'b1',
    booking_date: '2026-01-29',
    start_time: '14:00',
    end_time: '14:30',
    total_price: 350,
    status: 'confirmed',
    customer: { id: 'c1', name: '王小明', phone: '0912345678' },
  },
];

jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockBookings, error: null }),
    })),
  },
}));

describe('useBarberBookings', () => {
  it('should fetch bookings for a barber on a specific date', async () => {
    const { result } = renderHook(() => useBarberBookings('b1', '2026-01-29'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bookings).toHaveLength(1);
    expect(result.current.bookings[0].customer?.name).toBe('王小明');
  });
});
```

**Step 2: 執行測試確認失敗**

```bash
npm test -- useBarberData.test.ts
```
Expected: FAIL - Cannot find module

**Step 3: 實作 useBarberData hook**

```typescript
// src/hooks/useBarberData.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Booking, Availability } from '../types';

// 取得理髮師特定日期的預約
export function useBarberBookings(barberId: string, date: string) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!barberId || !date) return;

    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:users!bookings_customer_id_fkey(id, name, phone),
          services:booking_services(service:services(*))
        `)
        .eq('barber_id', barberId)
        .eq('booking_date', date)
        .order('start_time');

      if (fetchError) throw fetchError;
      setBookings(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [barberId, date]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return { bookings, loading, error, refetch: fetchBookings };
}

// 取得理髮師今日摘要統計
export function useBarberTodayStats(barberId: string) {
  const [stats, setStats] = useState({
    bookingCount: 0,
    estimatedRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!barberId) return;

    const fetchStats = async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('bookings')
        .select('total_price, status')
        .eq('barber_id', barberId)
        .eq('booking_date', today)
        .in('status', ['confirmed', 'completed']);

      if (!error && data) {
        setStats({
          bookingCount: data.length,
          estimatedRevenue: data.reduce((sum, b) => sum + (b.total_price || 0), 0),
        });
      }
      setLoading(false);
    };

    fetchStats();
  }, [barberId]);

  return { stats, loading };
}

// 更新預約狀態
export function useUpdateBookingStatus() {
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (bookingId: string, status: 'completed' | 'cancelled') => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setUpdating(false);
    }
  };

  return { updateStatus, updating };
}
```

**Step 4: 執行測試確認通過**

```bash
npm test -- useBarberData.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useBarberData.ts src/__tests__/hooks/useBarberData.test.ts
git commit -m "feat: add useBarberData hooks for barber dashboard"
```

---

## Task 3: 建立 BarberHomeScreen

**Files:**
- Create: `src/screens/barber/BarberHomeScreen.tsx`
- Create: `src/screens/barber/index.ts`
- Create: `src/__tests__/screens/barber/BarberHomeScreen.test.tsx`

**Step 1: 寫失敗測試**

```typescript
// src/__tests__/screens/barber/BarberHomeScreen.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { BarberHomeScreen } from '../../../screens/barber/BarberHomeScreen';

// Mock hooks
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'b1', name: '測試理髮師', role: 'barber' },
  }),
}));

jest.mock('../../../hooks/useBarberData', () => ({
  useBarberTodayStats: () => ({
    stats: { bookingCount: 3, estimatedRevenue: 1050 },
    loading: false,
  }),
  useBarberBookings: () => ({
    bookings: [
      {
        id: '1',
        start_time: '14:00',
        end_time: '14:30',
        total_price: 350,
        status: 'confirmed',
        customer: { name: '王小明' },
        services: [{ service: { name: '男士剪髮' } }],
      },
    ],
    loading: false,
    refetch: jest.fn(),
  }),
  useUpdateBookingStatus: () => ({
    updateStatus: jest.fn(),
    updating: false,
  }),
}));

// Mock navigation
const mockNavigation = { navigate: jest.fn() };

describe('BarberHomeScreen', () => {
  it('should display greeting with barber name', () => {
    render(<BarberHomeScreen navigation={mockNavigation as any} route={{} as any} />);
    expect(screen.getByText(/測試理髮師/)).toBeTruthy();
  });

  it('should display today booking count', () => {
    render(<BarberHomeScreen navigation={mockNavigation as any} route={{} as any} />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('should display estimated revenue', () => {
    render(<BarberHomeScreen navigation={mockNavigation as any} route={{} as any} />);
    expect(screen.getByText('$1,050')).toBeTruthy();
  });
});
```

**Step 2: 執行測試確認失敗**

```bash
npm test -- BarberHomeScreen.test.tsx
```
Expected: FAIL - Cannot find module

**Step 3: 實作 BarberHomeScreen**

```typescript
// src/screens/barber/BarberHomeScreen.tsx
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useBarberTodayStats, useBarberBookings, useUpdateBookingStatus } from '../../hooks/useBarberData';
import { BarberTabParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<BarberTabParamList, 'BarberHome'>;

export const BarberHomeScreen: React.FC<Props> = () => {
  const { user } = useAuth();
  const barberId = user?.id || '';
  const today = new Date().toISOString().split('T')[0];

  const { stats, loading: statsLoading } = useBarberTodayStats(barberId);
  const { bookings, loading: bookingsLoading, refetch } = useBarberBookings(barberId, today);
  const { updateStatus, updating } = useUpdateBookingStatus();

  const todayString = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const handleComplete = async (bookingId: string) => {
    await updateStatus(bookingId, 'completed');
    refetch();
  };

  const handleCancel = async (bookingId: string) => {
    await updateStatus(bookingId, 'cancelled');
    refetch();
  };

  const upcomingBookings = bookings
    .filter(b => b.status === 'confirmed')
    .slice(0, 5);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall">早安，{user?.name}</Text>
        <Text variant="bodyMedium" style={styles.dateText}>{todayString}</Text>
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>今日摘要</Text>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium">{stats.bookingCount}</Text>
            <Text variant="bodySmall">個預約</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium">${stats.estimatedRevenue.toLocaleString()}</Text>
            <Text variant="bodySmall">預估收入</Text>
          </Card.Content>
        </Card>
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>接下來的預約</Text>
      {upcomingBookings.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>今天沒有更多預約了</Text>
          </Card.Content>
        </Card>
      ) : (
        upcomingBookings.map((booking) => (
          <Card key={booking.id} style={styles.bookingCard}>
            <Card.Content>
              <View style={styles.bookingHeader}>
                <Text variant="titleMedium">{booking.start_time}</Text>
                <Text variant="bodyLarge">{booking.customer?.name}</Text>
              </View>
              <Text variant="bodySmall" style={styles.serviceText}>
                {booking.services?.map((s: any) => s.service?.name).join(', ')}
              </Text>
              <Text variant="bodyMedium">${booking.total_price}</Text>
              <Divider style={styles.divider} />
              <View style={styles.actionRow}>
                <Button
                  mode="contained"
                  onPress={() => handleComplete(booking.id)}
                  disabled={updating}
                  compact
                >
                  完成
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => handleCancel(booking.id)}
                  disabled={updating}
                  compact
                >
                  取消
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  dateText: {
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    padding: 16,
    paddingBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: 'center',
  },
  bookingCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceText: {
    color: '#666',
    marginVertical: 4,
  },
  divider: {
    marginVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyCard: {
    marginHorizontal: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
});
```

**Step 4: 建立 index.ts 匯出**

```typescript
// src/screens/barber/index.ts
export { BarberHomeScreen } from './BarberHomeScreen';
```

**Step 5: 執行測試確認通過**

```bash
npm test -- BarberHomeScreen.test.tsx
```
Expected: PASS

**Step 6: Commit**

```bash
git add src/screens/barber/
git commit -m "feat: add BarberHomeScreen with today summary"
```

---

## Task 4: 建立 BookingCalendarScreen

**Files:**
- Create: `src/screens/barber/BookingCalendarScreen.tsx`
- Modify: `src/screens/barber/index.ts`

**Step 1: 實作 BookingCalendarScreen**

```typescript
// src/screens/barber/BookingCalendarScreen.tsx
import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Chip } from 'react-native-paper';
import { Calendar, DateData } from 'react-native-calendars';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useBarberBookings, useUpdateBookingStatus } from '../../hooks/useBarberData';
import { BarberTabParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<BarberTabParamList, 'BookingCalendar'>;

export const BookingCalendarScreen: React.FC<Props> = () => {
  const { user } = useAuth();
  const barberId = user?.id || '';
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { bookings, loading, refetch } = useBarberBookings(barberId, selectedDate);
  const { updateStatus, updating } = useUpdateBookingStatus();

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const handleComplete = async (bookingId: string) => {
    await updateStatus(bookingId, 'completed');
    refetch();
  };

  const handleCancel = async (bookingId: string) => {
    await updateStatus(bookingId, 'cancelled');
    refetch();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#9E9E9E';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return '已確認';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const formattedDate = new Date(selectedDate).toLocaleDateString('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={handleDayPress}
        markedDates={{
          [selectedDate]: { selected: true, selectedColor: '#2196F3' },
        }}
        theme={{
          todayTextColor: '#2196F3',
          selectedDayBackgroundColor: '#2196F3',
        }}
      />

      <View style={styles.dateHeader}>
        <Text variant="titleMedium">{formattedDate}</Text>
        <Text variant="bodySmall">{bookings.length} 個預約</Text>
      </View>

      <ScrollView style={styles.bookingList}>
        {bookings.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>這天沒有預約</Text>
            </Card.Content>
          </Card>
        ) : (
          bookings.map((booking) => (
            <Card key={booking.id} style={styles.bookingCard}>
              <Card.Content>
                <View style={styles.bookingHeader}>
                  <Chip
                    style={{ backgroundColor: getStatusColor(booking.status) }}
                    textStyle={{ color: '#fff', fontSize: 12 }}
                  >
                    {getStatusLabel(booking.status)}
                  </Chip>
                  <Text variant="titleMedium">
                    {booking.start_time} - {booking.end_time}
                  </Text>
                </View>
                <Text variant="bodyLarge" style={styles.customerName}>
                  {booking.customer?.name}
                </Text>
                <Text variant="bodySmall" style={styles.serviceText}>
                  {booking.services?.map((s: any) => s.service?.name).join(', ')}
                </Text>
                <Text variant="bodyMedium">${booking.total_price}</Text>

                {booking.status === 'confirmed' && (
                  <>
                    <View style={styles.actionRow}>
                      <Button
                        mode="contained"
                        onPress={() => handleComplete(booking.id)}
                        disabled={updating}
                        compact
                      >
                        完成
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => handleCancel(booking.id)}
                        disabled={updating}
                        compact
                      >
                        取消
                      </Button>
                    </View>
                  </>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  bookingList: {
    flex: 1,
    padding: 16,
  },
  bookingCard: {
    marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    marginVertical: 4,
  },
  serviceText: {
    color: '#666',
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  emptyCard: {},
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
});
```

**Step 2: 更新 index.ts**

```typescript
// src/screens/barber/index.ts
export { BarberHomeScreen } from './BarberHomeScreen';
export { BookingCalendarScreen } from './BookingCalendarScreen';
```

**Step 3: 確認編譯通過**

```bash
npx tsc --noEmit
```
Expected: 無錯誤

**Step 4: Commit**

```bash
git add src/screens/barber/
git commit -m "feat: add BookingCalendarScreen with calendar view"
```

---

## Task 5: 建立 AvailabilityScreen

**Files:**
- Create: `src/screens/barber/AvailabilityScreen.tsx`
- Create: `src/hooks/useAvailability.ts`
- Modify: `src/screens/barber/index.ts`

**Step 1: 建立 useAvailability hook**

```typescript
// src/hooks/useAvailability.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Availability } from '../types';

const DAY_NAMES = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

export function useWeeklyAvailability(barberId: string) {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAvailability = useCallback(async () => {
    if (!barberId) return;

    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('barber_id', barberId)
      .is('specific_date', null)
      .order('day_of_week');

    if (!error) {
      setAvailability(data || []);
    }
    setLoading(false);
  }, [barberId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const updateDayAvailability = async (
    dayOfWeek: number,
    startTime: string | null,
    endTime: string | null
  ) => {
    const existing = availability.find(a => a.day_of_week === dayOfWeek);

    if (startTime === null || endTime === null) {
      // 設為休息 - 刪除該紀錄
      if (existing) {
        await supabase.from('availability').delete().eq('id', existing.id);
      }
    } else if (existing) {
      // 更新現有紀錄
      await supabase
        .from('availability')
        .update({ start_time: startTime, end_time: endTime })
        .eq('id', existing.id);
    } else {
      // 新增紀錄
      await supabase.from('availability').insert({
        barber_id: barberId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_exception: false,
      });
    }

    fetchAvailability();
  };

  return { availability, loading, refetch: fetchAvailability, updateDayAvailability, DAY_NAMES };
}

export function useExceptionDates(barberId: string) {
  const [exceptions, setExceptions] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExceptions = useCallback(async () => {
    if (!barberId) return;

    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('barber_id', barberId)
      .not('specific_date', 'is', null)
      .eq('is_exception', true)
      .gte('specific_date', new Date().toISOString().split('T')[0])
      .order('specific_date');

    if (!error) {
      setExceptions(data || []);
    }
    setLoading(false);
  }, [barberId]);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  const addException = async (startDate: string, endDate: string, note?: string) => {
    const dates: string[] = [];
    let current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    const records = dates.map(date => ({
      barber_id: barberId,
      specific_date: date,
      start_time: '00:00',
      end_time: '00:00',
      is_exception: true,
    }));

    await supabase.from('availability').insert(records);
    fetchExceptions();
  };

  const removeException = async (id: string) => {
    await supabase.from('availability').delete().eq('id', id);
    fetchExceptions();
  };

  return { exceptions, loading, addException, removeException, refetch: fetchExceptions };
}
```

**Step 2: 實作 AvailabilityScreen**

```typescript
// src/screens/barber/AvailabilityScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, List, Portal, Modal, TextInput } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useWeeklyAvailability, useExceptionDates } from '../../hooks/useAvailability';
import { BarberTabParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<BarberTabParamList, 'Availability'>;

export const AvailabilityScreen: React.FC<Props> = () => {
  const { user } = useAuth();
  const barberId = user?.id || '';

  const { availability, loading: weeklyLoading, updateDayAvailability, DAY_NAMES } = useWeeklyAvailability(barberId);
  const { exceptions, loading: exceptionsLoading, addException, removeException } = useExceptionDates(barberId);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  const [addExceptionModal, setAddExceptionModal] = useState(false);
  const [exceptionStartDate, setExceptionStartDate] = useState('');
  const [exceptionEndDate, setExceptionEndDate] = useState('');

  const getDaySchedule = (dayOfWeek: number) => {
    const schedule = availability.find(a => a.day_of_week === dayOfWeek);
    if (schedule) {
      return `${schedule.start_time} - ${schedule.end_time}`;
    }
    return '休息';
  };

  const handleEditDay = (dayOfWeek: number) => {
    const schedule = availability.find(a => a.day_of_week === dayOfWeek);
    if (schedule) {
      setStartTime(schedule.start_time);
      setEndTime(schedule.end_time);
    } else {
      setStartTime('09:00');
      setEndTime('18:00');
    }
    setEditingDay(dayOfWeek);
    setEditModalVisible(true);
  };

  const handleSaveDay = async () => {
    if (editingDay === null) return;
    await updateDayAvailability(editingDay, startTime, endTime);
    setEditModalVisible(false);
  };

  const handleSetDayOff = async () => {
    if (editingDay === null) return;
    await updateDayAvailability(editingDay, null, null);
    setEditModalVisible(false);
  };

  const handleAddException = async () => {
    if (!exceptionStartDate) {
      Alert.alert('錯誤', '請輸入開始日期');
      return;
    }
    await addException(exceptionStartDate, exceptionEndDate || exceptionStartDate);
    setAddExceptionModal(false);
    setExceptionStartDate('');
    setExceptionEndDate('');
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="titleMedium" style={styles.sectionTitle}>每週固定時段</Text>
      <Card style={styles.card}>
        {DAY_NAMES.map((name, index) => (
          <List.Item
            key={index}
            title={name}
            description={getDaySchedule(index)}
            right={() => (
              <Button mode="text" onPress={() => handleEditDay(index)}>
                編輯
              </Button>
            )}
          />
        ))}
      </Card>

      <View style={styles.sectionHeader}>
        <Text variant="titleMedium">特殊休假</Text>
        <Button mode="contained" onPress={() => setAddExceptionModal(true)} compact>
          新增
        </Button>
      </View>
      <Card style={styles.card}>
        {exceptions.length === 0 ? (
          <Card.Content>
            <Text style={styles.emptyText}>沒有設定特殊休假</Text>
          </Card.Content>
        ) : (
          exceptions.map((exc) => (
            <List.Item
              key={exc.id}
              title={exc.specific_date}
              right={() => (
                <Button mode="text" onPress={() => removeException(exc.id)}>
                  刪除
                </Button>
              )}
            />
          ))
        )}
      </Card>

      {/* Edit Day Modal */}
      <Portal>
        <Modal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            編輯 {editingDay !== null ? DAY_NAMES[editingDay] : ''} 時段
          </Text>
          <TextInput
            label="開始時間"
            value={startTime}
            onChangeText={setStartTime}
            placeholder="09:00"
            style={styles.input}
          />
          <TextInput
            label="結束時間"
            value={endTime}
            onChangeText={setEndTime}
            placeholder="18:00"
            style={styles.input}
          />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={handleSetDayOff}>
              設為休息
            </Button>
            <Button mode="contained" onPress={handleSaveDay}>
              儲存
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Add Exception Modal */}
      <Portal>
        <Modal
          visible={addExceptionModal}
          onDismiss={() => setAddExceptionModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>新增休假</Text>
          <TextInput
            label="開始日期 (YYYY-MM-DD)"
            value={exceptionStartDate}
            onChangeText={setExceptionStartDate}
            placeholder="2026-02-10"
            style={styles.input}
          />
          <TextInput
            label="結束日期 (可選，留空為單日)"
            value={exceptionEndDate}
            onChangeText={setExceptionEndDate}
            placeholder="2026-02-12"
            style={styles.input}
          />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setAddExceptionModal(false)}>
              取消
            </Button>
            <Button mode="contained" onPress={handleAddException}>
              新增
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    padding: 16,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});
```

**Step 3: 更新 index.ts**

```typescript
// src/screens/barber/index.ts
export { BarberHomeScreen } from './BarberHomeScreen';
export { BookingCalendarScreen } from './BookingCalendarScreen';
export { AvailabilityScreen } from './AvailabilityScreen';
```

**Step 4: Commit**

```bash
git add src/screens/barber/ src/hooks/useAvailability.ts
git commit -m "feat: add AvailabilityScreen for managing work hours"
```

---

## Task 6: 建立 StatsScreen

**Files:**
- Create: `src/screens/barber/StatsScreen.tsx`
- Create: `src/hooks/useBarberStats.ts`
- Modify: `src/screens/barber/index.ts`

**Step 1: 建立 useBarberStats hook**

```typescript
// src/hooks/useBarberStats.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

interface Stats {
  totalRevenue: number;
  completedCount: number;
  cancelledCount: number;
  avgPrice: number;
}

interface ServiceRank {
  name: string;
  count: number;
  revenue: number;
}

interface CustomerHistory {
  id: string;
  name: string;
  visitCount: number;
  totalSpent: number;
  lastVisit: string;
}

export function useBarberStats(barberId: string, startDate: string, endDate: string) {
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    completedCount: 0,
    cancelledCount: 0,
    avgPrice: 0,
  });
  const [topServices, setTopServices] = useState<ServiceRank[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<CustomerHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!barberId) return;
    setLoading(true);

    // 取得預約統計
    const { data: bookings } = await supabase
      .from('bookings')
      .select('total_price, status')
      .eq('barber_id', barberId)
      .gte('booking_date', startDate)
      .lte('booking_date', endDate);

    if (bookings) {
      const completed = bookings.filter(b => b.status === 'completed');
      const cancelled = bookings.filter(b => b.status === 'cancelled');
      const revenue = completed.reduce((sum, b) => sum + (b.total_price || 0), 0);

      setStats({
        totalRevenue: revenue,
        completedCount: completed.length,
        cancelledCount: cancelled.length,
        avgPrice: completed.length > 0 ? Math.round(revenue / completed.length) : 0,
      });
    }

    // 取得熱門服務（簡化版）
    const { data: serviceData } = await supabase
      .from('booking_services')
      .select(`
        service:services(name, price),
        booking:bookings!inner(barber_id, status, booking_date)
      `)
      .eq('booking.barber_id', barberId)
      .eq('booking.status', 'completed')
      .gte('booking.booking_date', startDate)
      .lte('booking.booking_date', endDate);

    if (serviceData) {
      const serviceMap = new Map<string, { count: number; revenue: number }>();
      serviceData.forEach((item: any) => {
        const name = item.service?.name || 'Unknown';
        const price = item.service?.price || 0;
        const existing = serviceMap.get(name) || { count: 0, revenue: 0 };
        serviceMap.set(name, {
          count: existing.count + 1,
          revenue: existing.revenue + price,
        });
      });

      const ranked = Array.from(serviceMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      setTopServices(ranked);
    }

    // 取得近期顧客
    const { data: customerData } = await supabase
      .from('bookings')
      .select(`
        customer_id,
        total_price,
        booking_date,
        customer:users!bookings_customer_id_fkey(id, name)
      `)
      .eq('barber_id', barberId)
      .eq('status', 'completed')
      .order('booking_date', { ascending: false })
      .limit(50);

    if (customerData) {
      const customerMap = new Map<string, CustomerHistory>();
      customerData.forEach((item: any) => {
        const customerId = item.customer_id;
        const existing = customerMap.get(customerId);
        if (existing) {
          existing.visitCount += 1;
          existing.totalSpent += item.total_price || 0;
        } else {
          customerMap.set(customerId, {
            id: customerId,
            name: item.customer?.name || 'Unknown',
            visitCount: 1,
            totalSpent: item.total_price || 0,
            lastVisit: item.booking_date,
          });
        }
      });

      const sorted = Array.from(customerMap.values())
        .sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime())
        .slice(0, 10);

      setRecentCustomers(sorted);
    }

    setLoading(false);
  }, [barberId, startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, topServices, recentCustomers, loading };
}
```

**Step 2: 實作 StatsScreen**

```typescript
// src/screens/barber/StatsScreen.tsx
import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, SegmentedButtons } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useBarberStats } from '../../hooks/useBarberStats';
import { BarberTabParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<BarberTabParamList, 'Stats'>;

type Period = 'week' | 'month' | 'quarter';

export const StatsScreen: React.FC<Props> = () => {
  const { user } = useAuth();
  const barberId = user?.id || '';
  const [period, setPeriod] = useState<Period>('week');

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start: Date;

    switch (period) {
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start = new Date(now);
        start.setMonth(now.getMonth() - 3);
        break;
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  }, [period]);

  const { stats, topServices, recentCustomers, loading } = useBarberStats(barberId, startDate, endDate);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.periodSelector}>
        <SegmentedButtons
          value={period}
          onValueChange={(value) => setPeriod(value as Period)}
          buttons={[
            { value: 'week', label: '本週' },
            { value: 'month', label: '本月' },
            { value: 'quarter', label: '本季' },
          ]}
        />
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>收入統計</Text>
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium">${stats.totalRevenue.toLocaleString()}</Text>
            <Text variant="bodySmall">總收入</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium">{stats.completedCount}</Text>
            <Text variant="bodySmall">完成預約</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium">${stats.avgPrice}</Text>
            <Text variant="bodySmall">平均單價</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium">{stats.cancelledCount}</Text>
            <Text variant="bodySmall">取消預約</Text>
          </Card.Content>
        </Card>
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>熱門服務 TOP 3</Text>
      <Card style={styles.card}>
        {topServices.length === 0 ? (
          <Card.Content>
            <Text style={styles.emptyText}>尚無資料</Text>
          </Card.Content>
        ) : (
          <Card.Content>
            {topServices.map((service, index) => (
              <View key={service.name} style={styles.rankItem}>
                <Text variant="bodyLarge">
                  {index + 1}. {service.name}
                </Text>
                <Text variant="bodySmall" style={styles.rankDetail}>
                  {service.count} 次 · ${service.revenue.toLocaleString()}
                </Text>
              </View>
            ))}
          </Card.Content>
        )}
      </Card>

      <Text variant="titleMedium" style={styles.sectionTitle}>近期顧客</Text>
      <Card style={styles.card}>
        {recentCustomers.length === 0 ? (
          <Card.Content>
            <Text style={styles.emptyText}>尚無資料</Text>
          </Card.Content>
        ) : (
          <Card.Content>
            {recentCustomers.map((customer) => (
              <View key={customer.id} style={styles.customerItem}>
                <View>
                  <Text variant="bodyLarge">{customer.name}</Text>
                  <Text variant="bodySmall" style={styles.customerDetail}>
                    來店 {customer.visitCount} 次 · 消費 ${customer.totalSpent.toLocaleString()}
                  </Text>
                </View>
                <Text variant="bodySmall">{customer.lastVisit}</Text>
              </View>
            ))}
          </Card.Content>
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  periodSelector: {
    padding: 16,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  statCard: {
    width: '46%',
    margin: 4,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  rankItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  rankDetail: {
    color: '#666',
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  customerDetail: {
    color: '#666',
  },
});
```

**Step 3: 更新 index.ts**

```typescript
// src/screens/barber/index.ts
export { BarberHomeScreen } from './BarberHomeScreen';
export { BookingCalendarScreen } from './BookingCalendarScreen';
export { AvailabilityScreen } from './AvailabilityScreen';
export { StatsScreen } from './StatsScreen';
```

**Step 4: Commit**

```bash
git add src/screens/barber/ src/hooks/useBarberStats.ts
git commit -m "feat: add StatsScreen with revenue and customer analytics"
```

---

## Task 7: 建立 BarberProfileScreen

**Files:**
- Create: `src/screens/barber/BarberProfileScreen.tsx`
- Modify: `src/screens/barber/index.ts`

**Step 1: 實作 BarberProfileScreen**

```typescript
// src/screens/barber/BarberProfileScreen.tsx
import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, List, Avatar, Button, Divider } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { BarberTabParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<BarberTabParamList, 'BarberProfile'>;

export const BarberProfileScreen: React.FC<Props> = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('登出', '確定要登出嗎？', [
      { text: '取消', style: 'cancel' },
      { text: '登出', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <Avatar.Text
          size={80}
          label={user?.name?.charAt(0) || 'B'}
          style={styles.avatar}
        />
        <Text variant="headlineSmall" style={styles.name}>{user?.name}</Text>
        <Text variant="bodyMedium" style={styles.email}>{user?.email}</Text>
        <Text variant="bodySmall" style={styles.role}>理髮師</Text>
      </View>

      <Card style={styles.menuCard}>
        <List.Item
          title="編輯個人資料"
          left={(props) => <List.Icon {...props} icon="account-edit" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => Alert.alert('提示', '功能開發中')}
        />
        <Divider />
        <List.Item
          title="通知設定"
          left={(props) => <List.Icon {...props} icon="bell-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => Alert.alert('提示', '功能開發中')}
        />
        <Divider />
        <List.Item
          title="關於"
          left={(props) => <List.Icon {...props} icon="information-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => Alert.alert('關於', 'AZ Barber v1.0.0')}
        />
      </Card>

      <Button
        mode="outlined"
        onPress={handleSignOut}
        style={styles.signOutButton}
        textColor="#F44336"
      >
        登出
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  avatar: {
    backgroundColor: '#2196F3',
  },
  name: {
    marginTop: 12,
  },
  email: {
    color: '#666',
    marginTop: 4,
  },
  role: {
    color: '#2196F3',
    marginTop: 4,
  },
  menuCard: {
    margin: 16,
  },
  signOutButton: {
    marginHorizontal: 16,
    marginBottom: 32,
    borderColor: '#F44336',
  },
});
```

**Step 2: 更新 index.ts**

```typescript
// src/screens/barber/index.ts
export { BarberHomeScreen } from './BarberHomeScreen';
export { BookingCalendarScreen } from './BookingCalendarScreen';
export { AvailabilityScreen } from './AvailabilityScreen';
export { StatsScreen } from './StatsScreen';
export { BarberProfileScreen } from './BarberProfileScreen';
```

**Step 3: Commit**

```bash
git add src/screens/barber/
git commit -m "feat: add BarberProfileScreen"
```

---

## Task 8: 建立 BarberTabNavigator

**Files:**
- Create: `src/navigation/BarberTabNavigator.tsx`

**Step 1: 實作 BarberTabNavigator**

```typescript
// src/navigation/BarberTabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { BarberTabParamList } from './types';
import {
  BarberHomeScreen,
  BookingCalendarScreen,
  AvailabilityScreen,
  StatsScreen,
  BarberProfileScreen,
} from '../screens/barber';

const Tab = createBottomTabNavigator<BarberTabParamList>();

export const BarberTabNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'BarberHome':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'BookingCalendar':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Availability':
              iconName = focused ? 'clock' : 'clock-outline';
              break;
            case 'Stats':
              iconName = focused ? 'chart-bar' : 'chart-bar';
              break;
            case 'BarberProfile':
              iconName = focused ? 'account' : 'account-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen
        name="BarberHome"
        component={BarberHomeScreen}
        options={{ title: '首頁', headerTitle: 'AZ Barber' }}
      />
      <Tab.Screen
        name="BookingCalendar"
        component={BookingCalendarScreen}
        options={{ title: '預約', headerTitle: '預約管理' }}
      />
      <Tab.Screen
        name="Availability"
        component={AvailabilityScreen}
        options={{ title: '時段', headerTitle: '營業時段' }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{ title: '統計', headerTitle: '營業統計' }}
      />
      <Tab.Screen
        name="BarberProfile"
        component={BarberProfileScreen}
        options={{ title: '我的', headerTitle: '個人資料' }}
      />
    </Tab.Navigator>
  );
};
```

**Step 2: Commit**

```bash
git add src/navigation/BarberTabNavigator.tsx
git commit -m "feat: add BarberTabNavigator"
```

---

## Task 9: 更新 AppNavigator 支援角色切換

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`

**Step 1: 更新 AppNavigator**

```typescript
// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAuth } from '../hooks/useAuth';
import { RootStackParamList, MainTabParamList } from './types';

// Navigators
import { BookingNavigator } from './BookingNavigator';
import { BarberTabNavigator } from './BarberTabNavigator';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { HomeScreen } from '../screens/customer/HomeScreen';
import { MyBookingsScreen } from '../screens/customer/MyBookingsScreen';
import { ProfileScreen } from '../screens/customer/ProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const CustomerTabNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Booking':
              iconName = focused ? 'calendar-plus' : 'calendar-plus';
              break;
            case 'MyBookings':
              iconName = focused ? 'calendar-check' : 'calendar-check-outline';
              break;
            case 'Profile':
              iconName = focused ? 'account' : 'account-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: '首頁', headerTitle: 'AZ Barber' }}
      />
      <Tab.Screen
        name="Booking"
        component={HomeScreen}
        options={{ title: '預約', headerTitle: '預約服務' }}
      />
      <Tab.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{ title: '我的預約', headerTitle: '我的預約' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: '個人', headerTitle: '個人資料' }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { session, user, loading } = useAuth();

  if (loading) {
    return null; // 或顯示 loading 畫面
  }

  // 根據角色選擇導航器
  const getMainNavigator = () => {
    if (user?.role === 'barber' || user?.role === 'owner') {
      return BarberTabNavigator;
    }
    return CustomerTabNavigator;
  };

  const MainNavigator = getMainNavigator();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen
              name="BookingFlow"
              component={BookingNavigator}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

**Step 2: 確認編譯通過**

```bash
npx tsc --noEmit
```
Expected: 無錯誤

**Step 3: Commit**

```bash
git add src/navigation/AppNavigator.tsx
git commit -m "feat: update AppNavigator to support role-based navigation"
```

---

## Task 10: 整合測試

**Step 1: 執行所有測試**

```bash
npm test
```
Expected: All tests pass

**Step 2: 在模擬器中測試**

1. 啟動 Metro: `npm start`
2. 在 Xcode 執行 iOS 模擬器
3. 用理髮師帳號登入（需先在 Supabase 設定）
4. 確認看到理髮師 Tab 導航
5. 測試各畫面功能

**Step 3: 最終 Commit**

```bash
git add .
git commit -m "feat: complete barber dashboard implementation"
```

---

## Summary

| Task | 說明 | 檔案 |
|------|------|------|
| 0 | 設定 Jest 測試環境 | jest.config.js, setup.ts |
| 1 | 更新導航類型 | types.ts |
| 2 | 建立理髮師資料 Hook | useBarberData.ts |
| 3 | 建立 BarberHomeScreen | BarberHomeScreen.tsx |
| 4 | 建立 BookingCalendarScreen | BookingCalendarScreen.tsx |
| 5 | 建立 AvailabilityScreen | AvailabilityScreen.tsx, useAvailability.ts |
| 6 | 建立 StatsScreen | StatsScreen.tsx, useBarberStats.ts |
| 7 | 建立 BarberProfileScreen | BarberProfileScreen.tsx |
| 8 | 建立 BarberTabNavigator | BarberTabNavigator.tsx |
| 9 | 更新 AppNavigator | AppNavigator.tsx |
| 10 | 整合測試 | - |
