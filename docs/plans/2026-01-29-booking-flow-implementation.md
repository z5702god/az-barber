# Booking Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a 4-step booking flow: Select Services → Select Time → Confirm → Success

**Architecture:** Stack navigator for booking flow, integrated into existing tab navigator. Services fetched from Supabase, time slots calculated from availability minus existing bookings.

**Tech Stack:** React Native, Expo, TypeScript, React Navigation, React Native Paper, Supabase

---

## Task 1: Create Booking Stack Navigator

**Files:**
- Create: `src/navigation/BookingNavigator.tsx`
- Modify: `src/navigation/AppNavigator.tsx`

**Step 1: Create BookingNavigator.tsx**

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BookingStackParamList } from './types';

import { SelectServicesScreen } from '../screens/booking/SelectServicesScreen';
import { SelectTimeScreen } from '../screens/booking/SelectTimeScreen';
import { ConfirmBookingScreen } from '../screens/booking/ConfirmBookingScreen';
import { BookingSuccessScreen } from '../screens/booking/BookingSuccessScreen';

const Stack = createNativeStackNavigator<BookingStackParamList>();

export const BookingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: '返回',
      }}
    >
      <Stack.Screen
        name="SelectServices"
        component={SelectServicesScreen}
        options={{ title: '選擇服務' }}
      />
      <Stack.Screen
        name="SelectDateTime"
        component={SelectTimeScreen}
        options={{ title: '選擇時段' }}
      />
      <Stack.Screen
        name="ConfirmBooking"
        component={ConfirmBookingScreen}
        options={{ title: '確認預約' }}
      />
      <Stack.Screen
        name="BookingSuccess"
        component={BookingSuccessScreen}
        options={{ title: '預約成功', headerShown: false }}
      />
    </Stack.Navigator>
  );
};
```

**Step 2: Update navigation types**

Modify `src/navigation/types.ts` - update BookingStackParamList to include selectedServices array:

```typescript
import { Service } from '../types';

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
```

**Step 3: Update AppNavigator to include BookingNavigator**

In `src/navigation/AppNavigator.tsx`, add BookingStack to RootStack:

```typescript
import { BookingNavigator } from './BookingNavigator';

// In RootStackParamList (types.ts):
export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  BookingFlow: { barberId: string };
};

// In AppNavigator, add after Main screen:
<Stack.Screen
  name="BookingFlow"
  component={BookingNavigator}
  options={{ headerShown: false }}
  initialParams={{ barberId: '' }}
/>
```

**Step 4: Commit**

```bash
git add src/navigation/
git commit -m "feat(nav): add booking stack navigator"
```

---

## Task 2: Create SelectServicesScreen

**Files:**
- Create: `src/screens/booking/SelectServicesScreen.tsx`

**Step 1: Create the screen**

```typescript
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Checkbox,
  Button,
  Card,
  Divider,
  ActivityIndicator
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../services/supabase';
import { Service } from '../../types';
import { BookingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<BookingStackParamList, 'SelectServices'>;

export const SelectServicesScreen: React.FC<Props> = ({ navigation, route }) => {
  const { barberId } = route.params;
  const [services, setServices] = useState<Service[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectedServices = services.filter(s => selectedIds.has(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  const handleNext = () => {
    navigation.navigate('SelectDateTime', {
      barberId,
      selectedServices,
      totalDuration,
      totalPrice,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {services.map((service) => (
          <Card
            key={service.id}
            style={styles.serviceCard}
            onPress={() => toggleService(service.id)}
          >
            <Card.Content style={styles.serviceContent}>
              <Checkbox
                status={selectedIds.has(service.id) ? 'checked' : 'unchecked'}
                onPress={() => toggleService(service.id)}
              />
              <View style={styles.serviceInfo}>
                <Text variant="titleMedium">{service.name}</Text>
                <Text variant="bodySmall" style={styles.serviceDetail}>
                  {service.duration_minutes} 分鐘
                </Text>
              </View>
              <Text variant="titleMedium" style={styles.price}>
                ${service.price}
              </Text>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <View style={styles.summaryBar}>
        <Divider />
        <View style={styles.summaryContent}>
          <View>
            <Text variant="bodyMedium">
              已選 {selectedIds.size} 項服務
            </Text>
            <Text variant="bodySmall" style={styles.summaryDetail}>
              總時間：{totalDuration} 分鐘 ｜ 總價格：${totalPrice.toLocaleString()}
            </Text>
          </View>
          <Button
            mode="contained"
            onPress={handleNext}
            disabled={selectedIds.size === 0}
          >
            下一步
          </Button>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  serviceCard: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  serviceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 8,
  },
  serviceDetail: {
    color: '#666',
    marginTop: 2,
  },
  price: {
    fontWeight: 'bold',
  },
  summaryBar: {
    backgroundColor: '#fff',
    paddingBottom: 24,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  summaryDetail: {
    color: '#666',
    marginTop: 4,
  },
});
```

**Step 2: Create booking screens folder**

```bash
mkdir -p src/screens/booking
```

**Step 3: Commit**

```bash
git add src/screens/booking/SelectServicesScreen.tsx
git commit -m "feat(booking): add SelectServicesScreen"
```

---

## Task 3: Create Time Slot Utility Functions

**Files:**
- Create: `src/utils/timeSlots.ts`

**Step 1: Create utility functions**

```typescript
import { Availability, Booking, TimeSlot } from '../types';

/**
 * Generate 30-minute time slots for a given availability window
 */
export const generateTimeSlots = (
  startTime: string,
  endTime: string,
  intervalMinutes: number = 30
): string[] => {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  while (currentMinutes < endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
    currentMinutes += intervalMinutes;
  }

  return slots;
};

/**
 * Check if a time slot has enough consecutive time for the service duration
 */
export const isSlotAvailable = (
  slotStart: string,
  requiredDuration: number,
  availabilityEnd: string,
  existingBookings: Booking[]
): boolean => {
  const [slotHour, slotMin] = slotStart.split(':').map(Number);
  const slotStartMinutes = slotHour * 60 + slotMin;
  const slotEndMinutes = slotStartMinutes + requiredDuration;

  // Check if slot fits within availability window
  const [endHour, endMin] = availabilityEnd.split(':').map(Number);
  const availEndMinutes = endHour * 60 + endMin;

  if (slotEndMinutes > availEndMinutes) {
    return false;
  }

  // Check for conflicts with existing bookings
  for (const booking of existingBookings) {
    if (booking.status === 'cancelled') continue;

    const [bookStartHour, bookStartMin] = booking.start_time.split(':').map(Number);
    const [bookEndHour, bookEndMin] = booking.end_time.split(':').map(Number);
    const bookStartMinutes = bookStartHour * 60 + bookStartMin;
    const bookEndMinutes = bookEndHour * 60 + bookEndMin;

    // Check for overlap
    if (slotStartMinutes < bookEndMinutes && slotEndMinutes > bookStartMinutes) {
      return false;
    }
  }

  return true;
};

/**
 * Get available time slots for a specific date
 */
export const getAvailableSlots = (
  availability: Availability | null,
  existingBookings: Booking[],
  requiredDuration: number
): TimeSlot[] => {
  if (!availability) {
    return [];
  }

  const allSlots = generateTimeSlots(availability.start_time, availability.end_time);

  return allSlots.map(slot => ({
    start_time: slot,
    end_time: addMinutesToTime(slot, requiredDuration),
    available: isSlotAvailable(slot, requiredDuration, availability.end_time, existingBookings),
  }));
};

/**
 * Add minutes to a time string
 */
export const addMinutesToTime = (time: string, minutes: number): string => {
  const [hour, min] = time.split(':').map(Number);
  const totalMinutes = hour * 60 + min + minutes;
  const newHour = Math.floor(totalMinutes / 60);
  const newMin = totalMinutes % 60;
  return `${newHour.toString().padStart(2, '0')}:${newMin.toString().padStart(2, '0')}`;
};

/**
 * Format date to YYYY-MM-DD
 */
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Get day of week (0 = Sunday, 6 = Saturday)
 */
export const getDayOfWeek = (date: Date): number => {
  return date.getDay();
};
```

**Step 2: Commit**

```bash
git add src/utils/timeSlots.ts
git commit -m "feat(utils): add time slot calculation utilities"
```

---

## Task 4: Create SelectTimeScreen

**Files:**
- Create: `src/screens/booking/SelectTimeScreen.tsx`

**Step 1: Create the screen**

```typescript
import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Text,
  Button,
  Divider,
  ActivityIndicator,
  useTheme
} from 'react-native-paper';
import { Calendar, DateData } from 'react-native-calendars';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../services/supabase';
import { Availability, Booking, TimeSlot } from '../../types';
import { BookingStackParamList } from '../../navigation/types';
import {
  getAvailableSlots,
  formatDate,
  getDayOfWeek,
  addMinutesToTime
} from '../../utils/timeSlots';

type Props = NativeStackScreenProps<BookingStackParamList, 'SelectDateTime'>;

export const SelectTimeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { barberId, selectedServices, totalDuration, totalPrice } = route.params;
  const theme = useTheme();

  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => formatDate(new Date()), []);

  useEffect(() => {
    fetchAvailabilityAndBookings(selectedDate);
  }, [selectedDate]);

  const fetchAvailabilityAndBookings = async (date: string) => {
    setLoading(true);
    setSelectedTime(null);

    try {
      const dateObj = new Date(date);
      const dayOfWeek = getDayOfWeek(dateObj);

      // Fetch availability for this day
      const { data: availData } = await supabase
        .from('availability')
        .select('*')
        .eq('barber_id', barberId)
        .or(`day_of_week.eq.${dayOfWeek},specific_date.eq.${date}`)
        .order('is_exception', { ascending: false })
        .limit(1);

      // Fetch existing bookings for this date
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .eq('barber_id', barberId)
        .eq('booking_date', date)
        .neq('status', 'cancelled');

      setAvailability(availData?.[0] || null);
      setExistingBookings(bookingsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = useMemo(() => {
    return getAvailableSlots(availability, existingBookings, totalDuration);
  }, [availability, existingBookings, totalDuration]);

  const handleDateSelect = (day: DateData) => {
    if (day.dateString >= today) {
      setSelectedDate(day.dateString);
    }
  };

  const handleNext = () => {
    if (!selectedTime) return;

    navigation.navigate('ConfirmBooking', {
      barberId,
      selectedServices,
      date: selectedDate,
      startTime: selectedTime,
      endTime: addMinutesToTime(selectedTime, totalDuration),
      totalDuration,
      totalPrice,
    });
  };

  const markedDates = {
    [selectedDate]: { selected: true, selectedColor: theme.colors.primary },
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Calendar
          current={selectedDate}
          minDate={today}
          onDayPress={handleDateSelect}
          markedDates={markedDates}
          theme={{
            todayTextColor: theme.colors.primary,
            selectedDayBackgroundColor: theme.colors.primary,
          }}
        />

        <View style={styles.slotsContainer}>
          <Text variant="titleMedium" style={styles.slotsTitle}>
            {selectedDate} 可選時段
          </Text>
          <Text variant="bodySmall" style={styles.durationText}>
            需要 {totalDuration} 分鐘
          </Text>

          {loading ? (
            <ActivityIndicator style={styles.loader} />
          ) : !availability ? (
            <Text style={styles.noSlots}>該日休息，無法預約</Text>
          ) : timeSlots.filter(s => s.available).length === 0 ? (
            <Text style={styles.noSlots}>該日無可用時段</Text>
          ) : (
            <View style={styles.slotsGrid}>
              {timeSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.start_time}
                  style={[
                    styles.slotButton,
                    !slot.available && styles.slotDisabled,
                    selectedTime === slot.start_time && styles.slotSelected,
                  ]}
                  onPress={() => slot.available && setSelectedTime(slot.start_time)}
                  disabled={!slot.available}
                >
                  <Text
                    style={[
                      styles.slotText,
                      !slot.available && styles.slotTextDisabled,
                      selectedTime === slot.start_time && styles.slotTextSelected,
                    ]}
                  >
                    {slot.start_time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.summaryBar}>
        <Divider />
        <View style={styles.summaryContent}>
          <View>
            {selectedTime ? (
              <>
                <Text variant="bodyMedium">
                  已選：{selectedDate} {selectedTime}
                </Text>
                <Text variant="bodySmall" style={styles.summaryDetail}>
                  預計結束：{addMinutesToTime(selectedTime, totalDuration)}
                </Text>
              </>
            ) : (
              <Text variant="bodyMedium" style={styles.summaryDetail}>
                請選擇時段
              </Text>
            )}
          </View>
          <Button
            mode="contained"
            onPress={handleNext}
            disabled={!selectedTime}
          >
            下一步
          </Button>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  slotsContainer: {
    padding: 16,
  },
  slotsTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  durationText: {
    color: '#666',
    marginBottom: 16,
  },
  loader: {
    marginTop: 24,
  },
  noSlots: {
    textAlign: 'center',
    color: '#666',
    marginTop: 24,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 80,
    alignItems: 'center',
  },
  slotDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#e0e0e0',
  },
  slotSelected: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  slotText: {
    fontSize: 14,
    color: '#333',
  },
  slotTextDisabled: {
    color: '#bbb',
  },
  slotTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  summaryBar: {
    backgroundColor: '#fff',
    paddingBottom: 24,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  summaryDetail: {
    color: '#666',
    marginTop: 4,
  },
});
```

**Step 2: Install react-native-calendars**

```bash
cd "/Users/luke/Desktop/az barber" && npx expo install react-native-calendars
```

**Step 3: Commit**

```bash
git add src/screens/booking/SelectTimeScreen.tsx package.json package-lock.json
git commit -m "feat(booking): add SelectTimeScreen with calendar"
```

---

## Task 5: Create ConfirmBookingScreen

**Files:**
- Create: `src/screens/booking/ConfirmBookingScreen.tsx`

**Step 1: Create the screen**

```typescript
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  Button,
  Card,
  TextInput,
  Divider,
  ActivityIndicator
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../services/supabase';
import { Barber } from '../../types';
import { BookingStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';

type Props = NativeStackScreenProps<BookingStackParamList, 'ConfirmBooking'>;

export const ConfirmBookingScreen: React.FC<Props> = ({ navigation, route }) => {
  const {
    barberId,
    selectedServices,
    date,
    startTime,
    endTime,
    totalDuration,
    totalPrice
  } = route.params;

  const { session } = useAuth();
  const [barber, setBarber] = useState<Barber | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBarber();
  }, []);

  const fetchBarber = async () => {
    try {
      const { data } = await supabase
        .from('barbers')
        .select('*')
        .eq('id', barberId)
        .single();
      setBarber(data);
    } catch (error) {
      console.error('Error fetching barber:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!session?.user?.id) {
      Alert.alert('錯誤', '請先登入');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_id: session.user.id,
          barber_id: barberId,
          booking_date: date,
          start_time: startTime,
          end_time: endTime,
          total_duration: totalDuration,
          total_price: totalPrice,
          notes: notes || null,
          status: 'confirmed',
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 2. Create booking_services relations
      const bookingServices = selectedServices.map(service => ({
        booking_id: booking.id,
        service_id: service.id,
      }));

      const { error: servicesError } = await supabase
        .from('booking_services')
        .insert(bookingServices);

      if (servicesError) throw servicesError;

      // Navigate to success screen
      navigation.replace('BookingSuccess', { bookingId: booking.id });
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert('預約失敗', '請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${dateStr}（${weekDays[d.getDay()]}）`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.section}>
              <Text variant="labelLarge" style={styles.label}>👤 理髮師</Text>
              <Text variant="bodyLarge">{barber?.display_name || '未知'}</Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.section}>
              <Text variant="labelLarge" style={styles.label}>📅 預約時間</Text>
              <Text variant="bodyLarge">
                {formatDate(date)} {startTime} - {endTime}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.section}>
              <Text variant="labelLarge" style={styles.label}>✂️ 服務項目</Text>
              {selectedServices.map(service => (
                <View key={service.id} style={styles.serviceRow}>
                  <Text variant="bodyMedium">• {service.name}</Text>
                  <Text variant="bodyMedium">
                    {service.duration_minutes}分 ${service.price}
                  </Text>
                </View>
              ))}
            </View>

            <Divider style={styles.divider} />

            <View style={styles.totalSection}>
              <Text variant="titleMedium">總時間：{totalDuration} 分鐘</Text>
              <Text variant="titleLarge" style={styles.totalPrice}>
                總價格：${totalPrice.toLocaleString()}
              </Text>
              <Text variant="bodySmall" style={styles.paymentNote}>
                （現場付款）
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.label}>📝 備註（選填）</Text>
            <TextInput
              mode="outlined"
              placeholder="有任何特殊需求可以在這裡說明"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={styles.notesInput}
            />
          </Card.Content>
        </Card>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={submitting}
          disabled={submitting}
          contentStyle={styles.confirmButtonContent}
        >
          確認預約
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  section: {
    marginVertical: 8,
  },
  label: {
    color: '#666',
    marginBottom: 4,
  },
  divider: {
    marginVertical: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  totalSection: {
    marginTop: 8,
    alignItems: 'center',
  },
  totalPrice: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  paymentNote: {
    color: '#666',
    marginTop: 4,
  },
  notesInput: {
    marginTop: 8,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#fff',
  },
  confirmButtonContent: {
    paddingVertical: 8,
  },
});
```

**Step 2: Commit**

```bash
git add src/screens/booking/ConfirmBookingScreen.tsx
git commit -m "feat(booking): add ConfirmBookingScreen"
```

---

## Task 6: Create BookingSuccessScreen

**Files:**
- Create: `src/screens/booking/BookingSuccessScreen.tsx`

**Step 1: Create the screen**

```typescript
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { Booking, Barber } from '../../types';
import { BookingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<BookingStackParamList, 'BookingSuccess'>;

export const BookingSuccessScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [barber, setBarber] = useState<Barber | null>(null);

  useEffect(() => {
    fetchBookingDetails();
  }, []);

  const fetchBookingDetails = async () => {
    try {
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('*, barber:barbers(*)')
        .eq('id', bookingId)
        .single();

      if (bookingData) {
        setBooking(bookingData);
        setBarber(bookingData.barber);
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${dateStr}（${weekDays[d.getDay()]}）`;
  };

  const handleViewBookings = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Main' as any,
            state: {
              routes: [{ name: 'MyBookings' }],
              index: 0,
            },
          },
        ],
      })
    );
  };

  const handleGoHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main' as any }],
      })
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.checkmark}>✅</Text>
        <Text variant="headlineMedium" style={styles.title}>
          預約成功！
        </Text>

        {booking && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyLarge" style={styles.info}>
                📅 {formatDate(booking.booking_date)} {booking.start_time}
              </Text>
              <Text variant="bodyLarge" style={styles.info}>
                👤 理髮師：{barber?.display_name || '未知'}
              </Text>
            </Card.Content>
          </Card>
        )}

        <View style={styles.buttons}>
          <Button
            mode="contained"
            onPress={handleViewBookings}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            查看我的預約
          </Button>
          <Button
            mode="outlined"
            onPress={handleGoHome}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            返回首頁
          </Button>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  checkmark: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 24,
  },
  card: {
    width: '100%',
    marginBottom: 32,
  },
  info: {
    textAlign: 'center',
    marginVertical: 4,
  },
  buttons: {
    width: '100%',
  },
  button: {
    marginVertical: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
```

**Step 2: Commit**

```bash
git add src/screens/booking/BookingSuccessScreen.tsx
git commit -m "feat(booking): add BookingSuccessScreen"
```

---

## Task 7: Integrate Navigation and Update HomeScreen

**Files:**
- Modify: `src/navigation/types.ts`
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/navigation/BookingNavigator.tsx`
- Modify: `src/screens/customer/HomeScreen.tsx`

**Step 1: Update types.ts with complete types**

Replace entire file content with updated imports and types for Service in BookingStackParamList.

**Step 2: Update AppNavigator.tsx to include BookingFlow**

Add BookingNavigator import and Stack.Screen for BookingFlow.

**Step 3: Update HomeScreen handleBooking**

Change navigation to use BookingFlow:

```typescript
const handleBooking = (barberId: string) => {
  // @ts-ignore
  navigation.getParent()?.navigate('BookingFlow', {
    screen: 'SelectServices',
    params: { barberId }
  });
};
```

**Step 4: Create index.ts for booking screens**

```typescript
// src/screens/booking/index.ts
export { SelectServicesScreen } from './SelectServicesScreen';
export { SelectTimeScreen } from './SelectTimeScreen';
export { ConfirmBookingScreen } from './ConfirmBookingScreen';
export { BookingSuccessScreen } from './BookingSuccessScreen';
```

**Step 5: Commit**

```bash
git add src/navigation/ src/screens/
git commit -m "feat(booking): integrate booking flow navigation"
```

---

## Task 8: Final Testing and Cleanup

**Step 1: Run the app**

```bash
cd "/Users/luke/Desktop/az barber" && npx expo start
```

**Step 2: Test the complete flow**

1. Open app on simulator/device
2. Login (if auth is set up)
3. Tap on a barber's "預約" button
4. Select services → verify total updates
5. Select date and time
6. Confirm booking
7. Verify success screen and navigation

**Step 3: Final commit**

```bash
git add .
git commit -m "feat(booking): complete booking flow implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Booking Stack Navigator | `navigation/BookingNavigator.tsx` |
| 2 | SelectServicesScreen | `screens/booking/SelectServicesScreen.tsx` |
| 3 | Time Slot Utilities | `utils/timeSlots.ts` |
| 4 | SelectTimeScreen | `screens/booking/SelectTimeScreen.tsx` |
| 5 | ConfirmBookingScreen | `screens/booking/ConfirmBookingScreen.tsx` |
| 6 | BookingSuccessScreen | `screens/booking/BookingSuccessScreen.tsx` |
| 7 | Navigation Integration | Multiple files |
| 8 | Testing | Manual testing |
