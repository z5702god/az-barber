import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  LayoutAnimation,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Text, ActivityIndicator, Divider } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { Service, Availability, Booking, User } from '../../types';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useResponsive';
import {
  getAvailableSlots,
  formatDate,
  getDayOfWeek,
  addMinutesToTime,
} from '../../utils/timeSlots';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'BarberAddBooking'>;

// Service categories (same as SelectServicesScreen)
const SERVICE_CATEGORIES: { [key: string]: string[] } = {
  '剪髮': ['洗剪', '單剪'],
  '燙髮': ['單燙髮（肩上）', '單燙髮（耳下）'],
  '染髮': ['單染髮'],
  '護髮 & 頭皮保養': ['護髮（基礎）', '護髮（標準）', '護髮（深層）', '頭皮精油保養', '頭皮養髮保養'],
};

const getCategoryForService = (serviceName: string): string => {
  for (const [category, services] of Object.entries(SERVICE_CATEGORIES)) {
    if (services.includes(serviceName)) return category;
  }
  return '其他服務';
};

export const BarberAddBookingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { barberId, preselectedDate } = route.params;
  const { session, user } = useAuth();
  const insets = useSafeAreaInsets();
  const r = useResponsive();

  // Customer type
  const [customerType, setCustomerType] = useState<'registered' | 'walkin'>('walkin');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');

  // Services
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [servicesLoading, setServicesLoading] = useState(true);

  // Date & Time
  const [selectedDate, setSelectedDate] = useState<string>(preselectedDate || formatDate(new Date()));
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timeLoading, setTimeLoading] = useState(false);
  const [holidayNote, setHolidayNote] = useState<string | null>(null);

  // Notes & Submit
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const today = useMemo(() => formatDate(new Date()), []);

  // Fetch services on mount
  useEffect(() => {
    fetchServices();
  }, []);

  // Fetch availability when date changes
  useEffect(() => {
    fetchAvailabilityAndBookings(selectedDate);
  }, [selectedDate]);

  // Debounced customer search
  useEffect(() => {
    if (customerType !== 'registered' || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => searchCustomers(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, customerType]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      setServices(data || []);
    } catch {
      Alert.alert('錯誤', '載入服務失敗');
    } finally {
      setServicesLoading(false);
    }
  };

  const searchCustomers = async (query: string) => {
    setSearchLoading(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('id, name, phone, email')
        .eq('role', 'customer')
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10);
      setSearchResults(data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchAvailabilityAndBookings = async (date: string) => {
    setTimeLoading(true);
    setSelectedTime(null);
    try {
      const dateObj = new Date(date + 'T12:00:00');
      const dayOfWeek = getDayOfWeek(dateObj);

      // Check holiday exception
      const { data: exceptionData } = await supabase
        .from('availability')
        .select('*')
        .eq('barber_id', barberId)
        .eq('specific_date', date)
        .eq('is_exception', true)
        .limit(1);

      if (exceptionData && exceptionData.length > 0) {
        setAvailability(null);
        setExistingBookings([]);
        setHolidayNote(exceptionData[0].description || null);
        return;
      }

      setHolidayNote(null);

      // Get weekly availability
      const { data: availData } = await supabase
        .from('availability')
        .select('*')
        .eq('barber_id', barberId)
        .eq('day_of_week', dayOfWeek)
        .is('specific_date', null)
        .limit(1);

      // Get existing bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .eq('barber_id', barberId)
        .eq('booking_date', date)
        .neq('status', 'cancelled');

      setAvailability(availData?.[0] || null);
      setExistingBookings(bookingsData || []);
    } catch {
      setAvailability(null);
      setExistingBookings([]);
    } finally {
      setTimeLoading(false);
    }
  };

  // Grouped services
  const groupedServices = useMemo(() => {
    const groups: { [key: string]: Service[] } = {};
    const categoryOrder = Object.keys(SERVICE_CATEGORIES);

    services.forEach(service => {
      const category = getCategoryForService(service.name);
      if (!groups[category]) groups[category] = [];
      groups[category].push(service);
    });

    const sorted: { category: string; services: Service[] }[] = [];
    categoryOrder.forEach(cat => {
      if (groups[cat]) sorted.push({ category: cat, services: groups[cat] });
    });
    Object.keys(groups).forEach(cat => {
      if (!categoryOrder.includes(cat)) sorted.push({ category: cat, services: groups[cat] });
    });
    return sorted;
  }, [services]);

  const toggleService = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newSelected = new Set(selectedServiceIds);
    const selectedService = services.find(s => s.id === id);
    if (!selectedService) return;

    const selectedCategory = getCategoryForService(selectedService.name);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      services.forEach(service => {
        if (getCategoryForService(service.name) === selectedCategory && newSelected.has(service.id)) {
          newSelected.delete(service.id);
        }
      });
      newSelected.add(id);
    }
    setSelectedServiceIds(newSelected);
  };

  const selectedServices = services.filter(s => selectedServiceIds.has(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  // Time slots
  const timeSlots = useMemo(() => {
    return getAvailableSlots(availability, existingBookings, totalDuration || 60, selectedDate, 60);
  }, [availability, existingBookings, totalDuration, selectedDate]);

  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const weekDays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    return `${d.getMonth() + 1}/${d.getDate()} (${weekDays[d.getDay()]})`;
  };

  // Validation
  const isCustomerValid = customerType === 'registered'
    ? selectedCustomer !== null
    : walkInName.trim().length > 0;
  const isServiceValid = selectedServiceIds.size > 0;
  const isTimeValid = selectedTime !== null;
  const canSubmit = isCustomerValid && isServiceValid && isTimeValid && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const userId = session?.user?.id || user?.id;
    if (!userId) {
      Alert.alert('錯誤', '請先登入');
      return;
    }

    setSubmitting(true);
    try {
      const endTime = addMinutesToTime(selectedTime!, totalDuration);

      // Conflict check
      const { data: conflictingBookings, error: checkError } = await supabase
        .from('bookings')
        .select('id, start_time, end_time')
        .eq('barber_id', barberId)
        .eq('booking_date', selectedDate)
        .neq('status', 'cancelled');

      if (checkError) throw checkError;

      const [newStartHour, newStartMin] = selectedTime!.split(':').map(Number);
      const [newEndHour, newEndMin] = endTime.split(':').map(Number);
      const newStartMinutes = newStartHour * 60 + newStartMin;
      const newEndMinutes = newEndHour * 60 + newEndMin;

      const hasConflict = conflictingBookings?.some(booking => {
        const [bsh, bsm] = booking.start_time.split(':').map(Number);
        const [beh, bem] = booking.end_time.split(':').map(Number);
        return newStartMinutes < (beh * 60 + bem) && newEndMinutes > (bsh * 60 + bsm);
      });

      if (hasConflict) {
        Alert.alert('時段已被預約', '這個時段已經有預約了，請選擇其他時段。');
        setSubmitting(false);
        return;
      }

      // Build booking data
      const bookingData: Record<string, any> = {
        barber_id: barberId,
        booking_date: selectedDate,
        start_time: selectedTime,
        end_time: endTime,
        total_duration: totalDuration,
        total_price: totalPrice,
        customer_note: notes || null,
        status: 'confirmed',
        created_by: userId,
      };

      if (customerType === 'registered' && selectedCustomer) {
        bookingData.customer_id = selectedCustomer.id;
      } else {
        bookingData.walk_in_name = walkInName.trim();
        bookingData.walk_in_phone = walkInPhone.trim() || null;
      }

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) {
        if (bookingError.code === '23505' || bookingError.message?.includes('overlap')) {
          Alert.alert('時段已被預約', '請選擇其他時段。');
          setSubmitting(false);
          return;
        }
        throw bookingError;
      }

      // Create booking_services
      const bookingServices = selectedServices.map(service => ({
        booking_id: booking.id,
        service_id: service.id,
      }));

      const { error: servicesError } = await supabase
        .from('booking_services')
        .insert(bookingServices);

      if (servicesError) throw servicesError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('新增成功', '預約已成功建立', [
        { text: '確定', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('新增失敗', '請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>新增預約</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* === Section 1: Customer === */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>顧客</Text>

            {/* Toggle */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleButton, customerType === 'registered' && styles.toggleActive]}
                onPress={() => { setCustomerType('registered'); setSelectedCustomer(null); }}
              >
                <Text style={[styles.toggleText, customerType === 'registered' && styles.toggleTextActive]}>
                  已註冊顧客
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, customerType === 'walkin' && styles.toggleActive]}
                onPress={() => { setCustomerType('walkin'); setSearchQuery(''); setSearchResults([]); }}
              >
                <Text style={[styles.toggleText, customerType === 'walkin' && styles.toggleTextActive]}>
                  現場客人
                </Text>
              </TouchableOpacity>
            </View>

            {customerType === 'registered' ? (
              <View>
                {selectedCustomer ? (
                  <View style={styles.selectedCustomerChip}>
                    <Ionicons name="person" size={16} color={colors.primary} />
                    <Text style={styles.selectedCustomerText}>
                      {selectedCustomer.name}{selectedCustomer.phone ? ` (${selectedCustomer.phone})` : ''}
                    </Text>
                    <TouchableOpacity onPress={() => { setSelectedCustomer(null); setSearchQuery(''); }}>
                      <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="搜尋姓名或電話..."
                      placeholderTextColor={colors.mutedForeground}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCapitalize="none"
                    />
                    {searchLoading && (
                      <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.sm }} />
                    )}
                    {searchResults.length > 0 && (
                      <View style={styles.searchResults}>
                        {searchResults.map(customer => (
                          <TouchableOpacity
                            key={customer.id}
                            style={styles.searchResultItem}
                            onPress={() => {
                              setSelectedCustomer(customer);
                              setSearchQuery('');
                              setSearchResults([]);
                            }}
                          >
                            <Text style={styles.searchResultName}>{customer.name || '未命名'}</Text>
                            <Text style={styles.searchResultPhone}>
                              {customer.phone || customer.email || ''}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
                      <Text style={styles.noResults}>找不到符合的顧客</Text>
                    )}
                  </>
                )}
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="姓名（必填）"
                  placeholderTextColor={colors.mutedForeground}
                  value={walkInName}
                  onChangeText={setWalkInName}
                />
                <TextInput
                  style={[styles.input, { marginTop: spacing.sm }]}
                  placeholder="電話（選填）"
                  placeholderTextColor={colors.mutedForeground}
                  value={walkInPhone}
                  onChangeText={setWalkInPhone}
                  keyboardType="phone-pad"
                />
              </View>
            )}
          </View>

          <Divider style={styles.sectionDivider} />

          {/* === Section 2: Services === */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>服務項目</Text>

            {servicesLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.md }} />
            ) : (
              groupedServices.map(({ category, services: catServices }) => (
                <View key={category} style={{ marginBottom: spacing.md }}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryLine} />
                    <Text style={styles.categoryTitle}>{category}</Text>
                    <View style={styles.categoryLine} />
                  </View>

                  {catServices.map((service) => {
                    const isSelected = selectedServiceIds.has(service.id);
                    return (
                      <TouchableOpacity
                        key={service.id}
                        style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
                        onPress={() => toggleService(service.id)}
                        activeOpacity={0.7}
                      >
                        {isSelected && <View style={styles.selectedIndicator} />}
                        <View style={styles.serviceContent}>
                          <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                            {isSelected && (
                              <Ionicons name="checkmark" size={14} color={colors.background} />
                            )}
                          </View>
                          <View style={{ flex: 1, paddingRight: spacing.sm }}>
                            <Text style={[styles.serviceName, isSelected && { color: colors.foreground }]}>
                              {service.name}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                              <Text style={styles.serviceDuration}>{formatDuration(service.duration_minutes)}</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Text style={styles.priceCurrency}>$</Text>
                            <Text style={[styles.servicePrice, isSelected && { color: colors.primary }]}>
                              {service.price.toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))
            )}

            {selectedServiceIds.size > 0 && (
              <View style={styles.serviceSummary}>
                <Text style={styles.serviceSummaryText}>
                  {selectedServiceIds.size} 項服務 • ${totalPrice.toLocaleString()} • {formatDuration(totalDuration)}
                </Text>
              </View>
            )}
          </View>

          <Divider style={styles.sectionDivider} />

          {/* === Section 3: Date & Time === */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>日期與時段</Text>

            <View style={styles.calendarContainer}>
              <Calendar
                current={selectedDate}
                minDate={today}
                onDayPress={(day: DateData) => {
                  if (day.dateString >= today) setSelectedDate(day.dateString);
                }}
                markedDates={{
                  [selectedDate]: { selected: true, selectedColor: colors.primary },
                }}
                theme={{
                  calendarBackground: colors.card,
                  textSectionTitleColor: colors.mutedForeground,
                  dayTextColor: colors.foreground,
                  todayTextColor: colors.primary,
                  selectedDayBackgroundColor: colors.primary,
                  selectedDayTextColor: colors.primaryForeground,
                  monthTextColor: colors.foreground,
                  arrowColor: colors.foreground,
                  textDisabledColor: colors.mutedForeground,
                  textDayFontSize: r.fs.sm,
                  textMonthFontSize: r.fs.md,
                  textDayHeaderFontSize: r.fs.xs,
                }}
                hideExtraDays
                enableSwipeMonths
              />
            </View>

            <Text style={styles.timeSlotsLabel}>可預約時段</Text>

            {timeLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.md }} />
            ) : !availability ? (
              <Text style={styles.noSlots}>{holidayNote ? `休假：${holidayNote}` : '當日公休'}</Text>
            ) : timeSlots.filter(s => s.available).length === 0 ? (
              <Text style={styles.noSlots}>沒有可預約的時段</Text>
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
                    onPress={() => {
                      if (slot.available) {
                        Haptics.selectionAsync();
                        setSelectedTime(slot.start_time);
                      }
                    }}
                    disabled={!slot.available}
                    activeOpacity={0.7}
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

          <Divider style={styles.sectionDivider} />

          {/* === Section 4: Notes === */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>備註（選填）</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="備註..."
              placeholderTextColor={colors.mutedForeground}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={200}
            />
          </View>
        </ScrollView>

        {/* Bottom Bar */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {selectedTime && isServiceValid && (
            <Text style={styles.bottomSummary}>
              {formatDateDisplay(selectedDate)} • {selectedTime} - {addMinutesToTime(selectedTime, totalDuration)} • ${totalPrice.toLocaleString()}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.7}
          >
            {submitting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <ActivityIndicator size="small" color={colors.primaryForeground} />
                <Text style={styles.submitButtonText}>處理中...</Text>
              </View>
            ) : (
              <Text style={[styles.submitButtonText, !canSubmit && { color: colors.mutedForeground }]}>
                確認新增
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.chineseSemiBold,
    color: colors.foreground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  sectionDivider: {
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },

  // Customer toggle
  toggleRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  toggleActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(201, 169, 110, 0.1)',
  },
  toggleText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
  toggleTextActive: {
    color: colors.primary,
    fontFamily: typography.fontFamily.chineseMedium,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chinese,
    color: colors.foreground,
  },
  selectedCustomerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(201, 169, 110, 0.1)',
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
  },
  selectedCustomerText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  searchResults: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    maxHeight: 200,
  },
  searchResultItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  searchResultPhone: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  noResults: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  // Services
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  categoryLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  categoryTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
    letterSpacing: 1,
    paddingHorizontal: spacing.md,
  },
  serviceCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: spacing.sm,
  },
  serviceCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(201, 169, 110, 0.08)',
  },
  selectedIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
  },
  serviceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingVertical: spacing.md + 4,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  radioOuterSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  serviceName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
    marginBottom: 4,
  },
  serviceDuration: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
  },
  priceCurrency: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    marginRight: 1,
  },
  servicePrice: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.displaySemiBold,
    color: colors.foreground,
  },
  serviceSummary: {
    backgroundColor: 'rgba(201, 169, 110, 0.1)',
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.sm,
    alignItems: 'center',
  },
  serviceSummaryText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
  },

  // Calendar & Time
  calendarContainer: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  timeSlotsLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  noSlots: {
    textAlign: 'center',
    color: colors.mutedForeground,
    marginTop: spacing.md,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotButton: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 76,
    alignItems: 'center',
  },
  slotDisabled: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
    opacity: 0.5,
  },
  slotSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
  },
  slotTextDisabled: {
    color: colors.mutedForeground,
  },
  slotTextSelected: {
    color: colors.primaryForeground,
    fontFamily: typography.fontFamily.secondarySemiBold,
  },

  // Notes
  notesInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chinese,
    color: colors.foreground,
    minHeight: 80,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
  },
  bottomSummary: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonDisabled: {
    backgroundColor: colors.secondary,
  },
  submitButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseSemiBold,
    color: colors.primaryForeground,
  },
});
