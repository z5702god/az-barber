# 店主後台 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立店主專屬後台，在理髮師功能基礎上增加員工管理、服務項目管理、全店報表功能

**Architecture:** 擴展現有理髮師 Tab Navigator，新增「管理」Tab 包含 Stack Navigator。店主角色（owner）可存取所有理髮師功能加上管理功能。管理功能包含員工 CRUD、服務 CRUD、全店報表。

**Tech Stack:** React Native, Expo, TypeScript, Supabase, React Navigation, React Native Paper

---

## Task 1: 更新導航類型定義

**Files:**
- Modify: `src/navigation/types.ts`

**Step 1: 更新 types.ts 加入店主導航類型**

```typescript
// src/navigation/types.ts
import { NavigatorScreenParams } from '@react-navigation/native';
import { Service } from '../types';

// 根導航參數
export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  BarberMain: NavigatorScreenParams<BarberTabParamList>;
  OwnerMain: NavigatorScreenParams<OwnerTabParamList>; // 新增
  BookingFlow: NavigatorScreenParams<BookingStackParamList>;
};

// 顧客 Tab 導航參數
export type MainTabParamList = {
  Home: undefined;
  Booking: undefined;
  MyBookings: undefined;
  Profile: undefined;
};

// 理髮師 Tab 導航參數
export type BarberTabParamList = {
  BarberHome: undefined;
  BookingCalendar: undefined;
  Availability: undefined;
  Stats: undefined;
  BarberProfile: undefined;
};

// 店主 Tab 導航參數 (新增)
export type OwnerTabParamList = {
  BarberHome: undefined;
  BookingCalendar: undefined;
  Availability: undefined;
  Stats: undefined;
  Manage: NavigatorScreenParams<ManageStackParamList>;
  BarberProfile: undefined;
};

// 管理 Stack 導航參數 (新增)
export type ManageStackParamList = {
  ManageHome: undefined;
  StaffList: undefined;
  StaffEdit: { staffId?: string }; // undefined = 新增
  ServiceList: undefined;
  ServiceEdit: { serviceId?: string }; // undefined = 新增
  ShopReports: undefined;
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

// 管理端導航參數（保留給未來擴展）
export type ManageStackParamListLegacy = {
  Dashboard: undefined;
  MySchedule: undefined;
  Availability: undefined;
  StaffManagement: undefined;
  ServiceManagement: undefined;
  Reports: undefined;
  CustomerManagement: undefined;
};
```

**Step 2: 確認 TypeScript 編譯通過**

```bash
npx tsc --noEmit
```
Expected: 無錯誤

**Step 3: Commit**

```bash
git add src/navigation/types.ts
git commit -m "feat: add OwnerTabParamList and ManageStackParamList navigation types"
```

---

## Task 2: 建立管理相關 Hooks

**Files:**
- Create: `src/hooks/useStaffManagement.ts`
- Create: `src/hooks/useServiceManagement.ts`
- Create: `src/hooks/useShopStats.ts`

**Step 1: 建立 useStaffManagement hook**

```typescript
// src/hooks/useStaffManagement.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Barber, User } from '../types';

interface StaffMember extends Barber {
  user?: User;
}

export function useStaffList() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('barbers')
      .select(`
        *,
        user:users!barbers_user_id_fkey(id, name, email, phone)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setStaff(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  return { staff, loading, refetch: fetchStaff };
}

export function useStaffMember(staffId: string | undefined) {
  const [member, setMember] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!staffId) {
      setLoading(false);
      return;
    }

    const fetchMember = async () => {
      const { data, error } = await supabase
        .from('barbers')
        .select(`
          *,
          user:users!barbers_user_id_fkey(id, name, email, phone)
        `)
        .eq('id', staffId)
        .single();

      if (!error && data) {
        setMember(data);
      }
      setLoading(false);
    };

    fetchMember();
  }, [staffId]);

  return { member, loading };
}

export function useStaffMutations() {
  const [saving, setSaving] = useState(false);

  const updateStaff = async (staffId: string, data: { display_name: string; status: string }) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('barbers')
        .update(data)
        .eq('id', staffId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  const createStaff = async (data: {
    email: string;
    name: string;
    display_name: string;
  }) => {
    setSaving(true);
    try {
      // 1. 先檢查 email 是否已存在
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', data.email)
        .single();

      let userId: string;

      if (existingUser) {
        // 用戶已存在，更新角色
        userId = existingUser.id;
        await supabase
          .from('users')
          .update({ role: 'barber' })
          .eq('id', userId);
      } else {
        // 建立新用戶記錄（需要用戶自行註冊帳號）
        return { success: false, error: '請先讓員工註冊帳號，再將其設為理髮師' };
      }

      // 2. 建立 barbers 記錄
      const { error: barberError } = await supabase
        .from('barbers')
        .insert({
          user_id: userId,
          display_name: data.display_name,
          status: 'active',
        });

      if (barberError) throw barberError;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  return { updateStaff, createStaff, saving };
}
```

**Step 2: 建立 useServiceManagement hook**

```typescript
// src/hooks/useServiceManagement.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Service } from '../types';

export function useServiceList() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('sort_order')
      .order('name');

    if (!error && data) {
      setServices(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { services, loading, refetch: fetchServices };
}

export function useServiceItem(serviceId: string | undefined) {
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serviceId) {
      setLoading(false);
      return;
    }

    const fetchService = async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (!error && data) {
        setService(data);
      }
      setLoading(false);
    };

    fetchService();
  }, [serviceId]);

  return { service, loading };
}

export function useServiceMutations() {
  const [saving, setSaving] = useState(false);

  const createService = async (data: {
    name: string;
    duration_minutes: number;
    price: number;
    sort_order?: number;
  }) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('services')
        .insert({
          ...data,
          is_active: true,
          sort_order: data.sort_order || 0,
        });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  const updateService = async (serviceId: string, data: {
    name: string;
    duration_minutes: number;
    price: number;
    sort_order?: number;
    is_active: boolean;
  }) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('services')
        .update(data)
        .eq('id', serviceId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  return { createService, updateService, saving };
}
```

**Step 3: 建立 useShopStats hook**

```typescript
// src/hooks/useShopStats.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

interface ShopStats {
  totalRevenue: number;
  completedCount: number;
  cancelledCount: number;
  avgPrice: number;
}

interface StaffRank {
  id: string;
  display_name: string;
  revenue: number;
  bookingCount: number;
}

interface ServiceRank {
  name: string;
  count: number;
  revenue: number;
}

export function useShopStats(startDate: string, endDate: string) {
  const [stats, setStats] = useState<ShopStats>({
    totalRevenue: 0,
    completedCount: 0,
    cancelledCount: 0,
    avgPrice: 0,
  });
  const [staffRanking, setStaffRanking] = useState<StaffRank[]>([]);
  const [serviceRanking, setServiceRanking] = useState<ServiceRank[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);

    // 全店營收統計
    const { data: bookings } = await supabase
      .from('bookings')
      .select('total_price, status, barber_id')
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

    // 員工排行
    const { data: staffData } = await supabase
      .from('bookings')
      .select(`
        total_price,
        barber:barbers!bookings_barber_id_fkey(id, display_name)
      `)
      .eq('status', 'completed')
      .gte('booking_date', startDate)
      .lte('booking_date', endDate);

    if (staffData) {
      const staffMap = new Map<string, StaffRank>();
      staffData.forEach((item: any) => {
        const barberId = item.barber?.id;
        if (!barberId) return;

        const existing = staffMap.get(barberId);
        if (existing) {
          existing.revenue += item.total_price || 0;
          existing.bookingCount += 1;
        } else {
          staffMap.set(barberId, {
            id: barberId,
            display_name: item.barber?.display_name || 'Unknown',
            revenue: item.total_price || 0,
            bookingCount: 1,
          });
        }
      });

      const ranked = Array.from(staffMap.values())
        .sort((a, b) => b.revenue - a.revenue);
      setStaffRanking(ranked);
    }

    // 服務排行
    const { data: serviceData } = await supabase
      .from('booking_services')
      .select(`
        service:services(name, price),
        booking:bookings!inner(status, booking_date)
      `)
      .eq('booking.status', 'completed')
      .gte('booking.booking_date', startDate)
      .lte('booking.booking_date', endDate);

    if (serviceData) {
      const serviceMap = new Map<string, ServiceRank>();
      serviceData.forEach((item: any) => {
        const name = item.service?.name;
        if (!name) return;

        const existing = serviceMap.get(name);
        if (existing) {
          existing.count += 1;
          existing.revenue += item.service?.price || 0;
        } else {
          serviceMap.set(name, {
            name,
            count: 1,
            revenue: item.service?.price || 0,
          });
        }
      });

      const ranked = Array.from(serviceMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setServiceRanking(ranked);
    }

    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, staffRanking, serviceRanking, loading };
}

export function useQuickStats() {
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    monthlyBookings: 0,
    activeStaff: 0,
    activeServices: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuickStats = async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString().split('T')[0];

      // 本月營收
      const { data: bookings } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('status', 'completed')
        .gte('booking_date', startOfMonth)
        .lte('booking_date', endOfMonth);

      // 員工數
      const { count: staffCount } = await supabase
        .from('barbers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // 服務數
      const { count: serviceCount } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      setStats({
        monthlyRevenue: bookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0,
        monthlyBookings: bookings?.length || 0,
        activeStaff: staffCount || 0,
        activeServices: serviceCount || 0,
      });
      setLoading(false);
    };

    fetchQuickStats();
  }, []);

  return { stats, loading };
}
```

**Step 4: 確認編譯通過**

```bash
npx tsc --noEmit
```
Expected: 無錯誤

**Step 5: Commit**

```bash
git add src/hooks/useStaffManagement.ts src/hooks/useServiceManagement.ts src/hooks/useShopStats.ts
git commit -m "feat: add owner management hooks (staff, service, shop stats)"
```

---

## Task 3: 建立 ManageHomeScreen

**Files:**
- Create: `src/screens/owner/ManageHomeScreen.tsx`
- Create: `src/screens/owner/index.ts`

**Step 1: 建立 ManageHomeScreen**

```typescript
// src/screens/owner/ManageHomeScreen.tsx
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, List } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuickStats } from '../../hooks/useShopStats';
import { ManageStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ManageStackParamList, 'ManageHome'>;

export const ManageHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { stats, loading } = useQuickStats();

  return (
    <ScrollView style={styles.container}>
      <Text variant="titleMedium" style={styles.sectionTitle}>本月統計</Text>
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium">${stats.monthlyRevenue.toLocaleString()}</Text>
            <Text variant="bodySmall">本月營收</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium">{stats.monthlyBookings}</Text>
            <Text variant="bodySmall">完成預約</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium">{stats.activeStaff}</Text>
            <Text variant="bodySmall">員工數</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium">{stats.activeServices}</Text>
            <Text variant="bodySmall">服務項目</Text>
          </Card.Content>
        </Card>
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>管理功能</Text>
      <Card style={styles.menuCard}>
        <List.Item
          title="員工管理"
          description="新增、編輯員工資料"
          left={(props) => <List.Icon {...props} icon="account-group" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('StaffList')}
        />
        <List.Item
          title="服務管理"
          description="管理服務項目與價格"
          left={(props) => <List.Icon {...props} icon="content-cut" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('ServiceList')}
        />
        <List.Item
          title="全店報表"
          description="查看營收與員工業績"
          left={(props) => <List.Icon {...props} icon="chart-line" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('ShopReports')}
        />
      </Card>
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
  menuCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
});
```

**Step 2: 建立 index.ts**

```typescript
// src/screens/owner/index.ts
export { ManageHomeScreen } from './ManageHomeScreen';
```

**Step 3: 確認編譯通過**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/screens/owner/
git commit -m "feat: add ManageHomeScreen for owner dashboard"
```

---

## Task 4: 建立 StaffListScreen 和 StaffEditScreen

**Files:**
- Create: `src/screens/owner/StaffListScreen.tsx`
- Create: `src/screens/owner/StaffEditScreen.tsx`
- Modify: `src/screens/owner/index.ts`

**Step 1: 建立 StaffListScreen**

```typescript
// src/screens/owner/StaffListScreen.tsx
import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, FAB, Chip, Avatar } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useStaffList } from '../../hooks/useStaffManagement';
import { ManageStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ManageStackParamList, 'StaffList'>;

export const StaffListScreen: React.FC<Props> = ({ navigation }) => {
  const { staff, loading, refetch } = useStaffList();

  const renderItem = ({ item }: { item: any }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('StaffEdit', { staffId: item.id })}
    >
      <Card.Content style={styles.cardContent}>
        <Avatar.Text
          size={48}
          label={item.display_name?.charAt(0) || 'S'}
          style={styles.avatar}
        />
        <View style={styles.info}>
          <Text variant="titleMedium">{item.display_name}</Text>
          <Text variant="bodySmall" style={styles.email}>
            {item.user?.email}
          </Text>
        </View>
        <Chip
          style={{
            backgroundColor: item.status === 'active' ? '#E8F5E9' : '#FFEBEE',
          }}
          textStyle={{
            color: item.status === 'active' ? '#4CAF50' : '#F44336',
            fontSize: 12,
          }}
        >
          {item.status === 'active' ? '在職' : '停用'}
        </Chip>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={staff}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>尚無員工資料</Text>
        }
        onRefresh={refetch}
        refreshing={loading}
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('StaffEdit', {})}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#2196F3',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  email: {
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 32,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
```

**Step 2: 建立 StaffEditScreen**

```typescript
// src/screens/owner/StaffEditScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Switch, Card } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useStaffMember, useStaffMutations } from '../../hooks/useStaffManagement';
import { ManageStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ManageStackParamList, 'StaffEdit'>;

export const StaffEditScreen: React.FC<Props> = ({ navigation, route }) => {
  const { staffId } = route.params || {};
  const isEditing = !!staffId;

  const { member, loading } = useStaffMember(staffId);
  const { updateStaff, createStaff, saving } = useStaffMutations();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (member) {
      setDisplayName(member.display_name);
      setEmail(member.user?.email || '');
      setIsActive(member.status === 'active');
    }
  }, [member]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('錯誤', '請輸入顯示名稱');
      return;
    }

    if (isEditing && staffId) {
      const result = await updateStaff(staffId, {
        display_name: displayName,
        status: isActive ? 'active' : 'inactive',
      });

      if (result.success) {
        Alert.alert('成功', '員工資料已更新', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('錯誤', result.error || '更新失敗');
      }
    } else {
      if (!email.trim()) {
        Alert.alert('錯誤', '請輸入 Email');
        return;
      }

      const result = await createStaff({
        email,
        name: displayName,
        display_name: displayName,
      });

      if (result.success) {
        Alert.alert('成功', '員工已新增', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('錯誤', result.error || '新增失敗');
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>載入中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="顯示名稱"
            value={displayName}
            onChangeText={setDisplayName}
            style={styles.input}
            mode="outlined"
          />

          {!isEditing && (
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}

          {isEditing && (
            <View style={styles.switchRow}>
              <Text variant="bodyLarge">啟用狀態</Text>
              <Switch value={isActive} onValueChange={setIsActive} />
            </View>
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        style={styles.saveButton}
      >
        {isEditing ? '儲存' : '新增'}
      </Button>

      {!isEditing && (
        <Text variant="bodySmall" style={styles.hint}>
          注意：員工需要先使用此 Email 註冊帳號
        </Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
  },
  input: {
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  saveButton: {
    marginHorizontal: 16,
  },
  hint: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
    paddingHorizontal: 16,
  },
});
```

**Step 3: 更新 index.ts**

```typescript
// src/screens/owner/index.ts
export { ManageHomeScreen } from './ManageHomeScreen';
export { StaffListScreen } from './StaffListScreen';
export { StaffEditScreen } from './StaffEditScreen';
```

**Step 4: Commit**

```bash
git add src/screens/owner/
git commit -m "feat: add StaffListScreen and StaffEditScreen"
```

---

## Task 5: 建立 ServiceListScreen 和 ServiceEditScreen

**Files:**
- Create: `src/screens/owner/ServiceListScreen.tsx`
- Create: `src/screens/owner/ServiceEditScreen.tsx`
- Modify: `src/screens/owner/index.ts`

**Step 1: 建立 ServiceListScreen**

```typescript
// src/screens/owner/ServiceListScreen.tsx
import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, FAB, Chip } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useServiceList } from '../../hooks/useServiceManagement';
import { ManageStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ManageStackParamList, 'ServiceList'>;

export const ServiceListScreen: React.FC<Props> = ({ navigation }) => {
  const { services, loading, refetch } = useServiceList();

  const renderItem = ({ item }: { item: any }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('ServiceEdit', { serviceId: item.id })}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.info}>
          <Text variant="titleMedium">{item.name}</Text>
          <Text variant="bodySmall" style={styles.detail}>
            {item.duration_minutes} 分鐘 · ${item.price}
          </Text>
        </View>
        <Chip
          style={{
            backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE',
          }}
          textStyle={{
            color: item.is_active ? '#4CAF50' : '#F44336',
            fontSize: 12,
          }}
        >
          {item.is_active ? '啟用' : '停用'}
        </Chip>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={services}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>尚無服務項目</Text>
        }
        onRefresh={refetch}
        refreshing={loading}
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('ServiceEdit', {})}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
  },
  detail: {
    color: '#666',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 32,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
```

**Step 2: 建立 ServiceEditScreen**

```typescript
// src/screens/owner/ServiceEditScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Switch, Card } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useServiceItem, useServiceMutations } from '../../hooks/useServiceManagement';
import { ManageStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ManageStackParamList, 'ServiceEdit'>;

export const ServiceEditScreen: React.FC<Props> = ({ navigation, route }) => {
  const { serviceId } = route.params || {};
  const isEditing = !!serviceId;

  const { service, loading } = useServiceItem(serviceId);
  const { createService, updateService, saving } = useServiceMutations();

  const [name, setName] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (service) {
      setName(service.name);
      setDuration(String(service.duration_minutes));
      setPrice(String(service.price));
      setSortOrder(String(service.sort_order));
      setIsActive(service.is_active);
    }
  }, [service]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('錯誤', '請輸入服務名稱');
      return;
    }
    if (!price.trim() || isNaN(Number(price))) {
      Alert.alert('錯誤', '請輸入有效價格');
      return;
    }
    if (!duration.trim() || isNaN(Number(duration))) {
      Alert.alert('錯誤', '請輸入有效時長');
      return;
    }

    const data = {
      name: name.trim(),
      duration_minutes: Number(duration),
      price: Number(price),
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
    };

    let result;
    if (isEditing && serviceId) {
      result = await updateService(serviceId, data);
    } else {
      result = await createService(data);
    }

    if (result.success) {
      Alert.alert('成功', isEditing ? '服務已更新' : '服務已新增', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('錯誤', result.error || '操作失敗');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>載入中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="服務名稱"
            value={name}
            onChangeText={setName}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="時長（分鐘）"
            value={duration}
            onChangeText={setDuration}
            style={styles.input}
            mode="outlined"
            keyboardType="number-pad"
          />

          <TextInput
            label="價格"
            value={price}
            onChangeText={setPrice}
            style={styles.input}
            mode="outlined"
            keyboardType="number-pad"
            left={<TextInput.Affix text="$" />}
          />

          <TextInput
            label="排序順序"
            value={sortOrder}
            onChangeText={setSortOrder}
            style={styles.input}
            mode="outlined"
            keyboardType="number-pad"
          />

          {isEditing && (
            <View style={styles.switchRow}>
              <Text variant="bodyLarge">啟用狀態</Text>
              <Switch value={isActive} onValueChange={setIsActive} />
            </View>
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        style={styles.saveButton}
      >
        {isEditing ? '儲存' : '新增'}
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
  },
  input: {
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  saveButton: {
    marginHorizontal: 16,
  },
});
```

**Step 3: 更新 index.ts**

```typescript
// src/screens/owner/index.ts
export { ManageHomeScreen } from './ManageHomeScreen';
export { StaffListScreen } from './StaffListScreen';
export { StaffEditScreen } from './StaffEditScreen';
export { ServiceListScreen } from './ServiceListScreen';
export { ServiceEditScreen } from './ServiceEditScreen';
```

**Step 4: Commit**

```bash
git add src/screens/owner/
git commit -m "feat: add ServiceListScreen and ServiceEditScreen"
```

---

## Task 6: 建立 ShopReportsScreen

**Files:**
- Create: `src/screens/owner/ShopReportsScreen.tsx`
- Modify: `src/screens/owner/index.ts`

**Step 1: 建立 ShopReportsScreen**

```typescript
// src/screens/owner/ShopReportsScreen.tsx
import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, SegmentedButtons, Divider } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useShopStats } from '../../hooks/useShopStats';
import { ManageStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ManageStackParamList, 'ShopReports'>;

type Period = 'week' | 'month' | 'quarter';

export const ShopReportsScreen: React.FC<Props> = () => {
  const [period, setPeriod] = useState<Period>('month');

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

  const { stats, staffRanking, serviceRanking, loading } = useShopStats(startDate, endDate);

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

      <Text variant="titleMedium" style={styles.sectionTitle}>營收總覽</Text>
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium">${stats.totalRevenue.toLocaleString()}</Text>
            <Text variant="bodySmall">總營收</Text>
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

      <Text variant="titleMedium" style={styles.sectionTitle}>員工業績排行</Text>
      <Card style={styles.card}>
        {staffRanking.length === 0 ? (
          <Card.Content>
            <Text style={styles.emptyText}>尚無資料</Text>
          </Card.Content>
        ) : (
          <Card.Content>
            {staffRanking.map((staff, index) => (
              <View key={staff.id}>
                <View style={styles.rankItem}>
                  <View style={styles.rankLeft}>
                    <Text variant="titleMedium" style={styles.rankNumber}>
                      #{index + 1}
                    </Text>
                    <View>
                      <Text variant="bodyLarge">{staff.display_name}</Text>
                      <Text variant="bodySmall" style={styles.rankDetail}>
                        {staff.bookingCount} 筆預約
                      </Text>
                    </View>
                  </View>
                  <Text variant="titleMedium">${staff.revenue.toLocaleString()}</Text>
                </View>
                {index < staffRanking.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))}
          </Card.Content>
        )}
      </Card>

      <Text variant="titleMedium" style={styles.sectionTitle}>熱門服務 TOP 5</Text>
      <Card style={styles.card}>
        {serviceRanking.length === 0 ? (
          <Card.Content>
            <Text style={styles.emptyText}>尚無資料</Text>
          </Card.Content>
        ) : (
          <Card.Content>
            {serviceRanking.map((service, index) => (
              <View key={service.name}>
                <View style={styles.rankItem}>
                  <View style={styles.rankLeft}>
                    <Text variant="titleMedium" style={styles.rankNumber}>
                      #{index + 1}
                    </Text>
                    <View>
                      <Text variant="bodyLarge">{service.name}</Text>
                      <Text variant="bodySmall" style={styles.rankDetail}>
                        {service.count} 次
                      </Text>
                    </View>
                  </View>
                  <Text variant="titleMedium">${service.revenue.toLocaleString()}</Text>
                </View>
                {index < serviceRanking.length - 1 && <Divider style={styles.divider} />}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankNumber: {
    width: 32,
    color: '#2196F3',
  },
  rankDetail: {
    color: '#666',
  },
  divider: {
    marginVertical: 4,
  },
});
```

**Step 2: 更新 index.ts**

```typescript
// src/screens/owner/index.ts
export { ManageHomeScreen } from './ManageHomeScreen';
export { StaffListScreen } from './StaffListScreen';
export { StaffEditScreen } from './StaffEditScreen';
export { ServiceListScreen } from './ServiceListScreen';
export { ServiceEditScreen } from './ServiceEditScreen';
export { ShopReportsScreen } from './ShopReportsScreen';
```

**Step 3: Commit**

```bash
git add src/screens/owner/
git commit -m "feat: add ShopReportsScreen with staff and service rankings"
```

---

## Task 7: 建立 ManageStackNavigator 和 OwnerTabNavigator

**Files:**
- Create: `src/navigation/ManageStackNavigator.tsx`
- Create: `src/navigation/OwnerTabNavigator.tsx`

**Step 1: 建立 ManageStackNavigator**

```typescript
// src/navigation/ManageStackNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ManageStackParamList } from './types';
import {
  ManageHomeScreen,
  StaffListScreen,
  StaffEditScreen,
  ServiceListScreen,
  ServiceEditScreen,
  ShopReportsScreen,
} from '../screens/owner';

const Stack = createNativeStackNavigator<ManageStackParamList>();

export const ManageStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ManageHome"
        component={ManageHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StaffList"
        component={StaffListScreen}
        options={{ title: '員工管理' }}
      />
      <Stack.Screen
        name="StaffEdit"
        component={StaffEditScreen}
        options={({ route }) => ({
          title: route.params?.staffId ? '編輯員工' : '新增員工',
        })}
      />
      <Stack.Screen
        name="ServiceList"
        component={ServiceListScreen}
        options={{ title: '服務管理' }}
      />
      <Stack.Screen
        name="ServiceEdit"
        component={ServiceEditScreen}
        options={({ route }) => ({
          title: route.params?.serviceId ? '編輯服務' : '新增服務',
        })}
      />
      <Stack.Screen
        name="ShopReports"
        component={ShopReportsScreen}
        options={{ title: '全店報表' }}
      />
    </Stack.Navigator>
  );
};
```

**Step 2: 建立 OwnerTabNavigator**

```typescript
// src/navigation/OwnerTabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { OwnerTabParamList } from './types';
import { ManageStackNavigator } from './ManageStackNavigator';
import {
  BarberHomeScreen,
  BookingCalendarScreen,
  AvailabilityScreen,
  StatsScreen,
  BarberProfileScreen,
} from '../screens/barber';

const Tab = createBottomTabNavigator<OwnerTabParamList>();

export const OwnerTabNavigator: React.FC = () => {
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
            case 'Manage':
              iconName = focused ? 'cog' : 'cog-outline';
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
        name="Manage"
        component={ManageStackNavigator}
        options={{ title: '管理', headerShown: false }}
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

**Step 3: 確認編譯通過**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/navigation/ManageStackNavigator.tsx src/navigation/OwnerTabNavigator.tsx
git commit -m "feat: add ManageStackNavigator and OwnerTabNavigator"
```

---

## Task 8: 更新 AppNavigator 支援 owner 角色

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`

**Step 1: 更新 AppNavigator**

在現有 AppNavigator 中加入 owner 角色判斷：

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
import { OwnerTabNavigator } from './OwnerTabNavigator';

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
    if (user?.role === 'owner') {
      return OwnerTabNavigator;
    }
    if (user?.role === 'barber') {
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

**Step 3: Commit**

```bash
git add src/navigation/AppNavigator.tsx
git commit -m "feat: update AppNavigator to support owner role with 6 tabs"
```

---

## Task 9: 整合測試

**Step 1: 執行 TypeScript 編譯檢查**

```bash
npx tsc --noEmit
```
Expected: 無錯誤

**Step 2: 最終 Commit**

```bash
git add .
git commit -m "feat: complete owner dashboard implementation"
```

---

## Summary

| Task | 說明 | 檔案 |
|------|------|------|
| 1 | 更新導航類型 | types.ts |
| 2 | 建立管理 Hooks | useStaffManagement.ts, useServiceManagement.ts, useShopStats.ts |
| 3 | 建立 ManageHomeScreen | ManageHomeScreen.tsx |
| 4 | 建立員工管理畫面 | StaffListScreen.tsx, StaffEditScreen.tsx |
| 5 | 建立服務管理畫面 | ServiceListScreen.tsx, ServiceEditScreen.tsx |
| 6 | 建立全店報表 | ShopReportsScreen.tsx |
| 7 | 建立導航器 | ManageStackNavigator.tsx, OwnerTabNavigator.tsx |
| 8 | 更新 AppNavigator | AppNavigator.tsx |
| 9 | 整合測試 | - |
