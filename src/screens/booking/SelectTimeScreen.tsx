import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Calendar, DateData } from 'react-native-calendars';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../services/supabase';
import { Availability, Booking } from '../../types';
import { BookingStackParamList } from '../../navigation/types';
import {
  getAvailableSlots,
  formatDate,
  getDayOfWeek,
  addMinutesToTime
} from '../../utils/timeSlots';
import { colors, spacing, borderRadius, typography } from '../../theme';

type Props = NativeStackScreenProps<BookingStackParamList, 'SelectDateTime'>;

export const SelectTimeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { barberId, selectedServices, totalDuration, totalPrice } = route.params;

  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const today = useMemo(() => formatDate(new Date()), []);

  useEffect(() => {
    fetchAvailabilityAndBookings(selectedDate);
  }, [selectedDate]);

  const fetchAvailabilityAndBookings = async (date: string) => {
    setLoading(true);
    setSelectedTime(null);

    try {
      setFetchError(false);
      const dateObj = new Date(date + 'T00:00:00');
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
      if (__DEV__) console.error('Error fetching data:', error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = useMemo(() => {
    // 只允許整點預約（60分鐘間隔）
    return getAvailableSlots(availability, existingBookings, totalDuration, selectedDate, 60);
  }, [availability, existingBookings, totalDuration, selectedDate]);

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
    [selectedDate]: { selected: true, selectedColor: colors.primary },
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            minDate={today}
            onDayPress={handleDateSelect}
            markedDates={markedDates}
            theme={{
              calendarBackground: colors.background,
              textSectionTitleColor: colors.mutedForeground,
              dayTextColor: colors.foreground,
              todayTextColor: colors.primary,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: colors.primaryForeground,
              monthTextColor: colors.foreground,
              arrowColor: colors.foreground,
              textDisabledColor: colors.mutedForeground,
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 12,
            }}
            hideExtraDays
            enableSwipeMonths
          />
        </View>

        {/* Available Times Section */}
        <View style={styles.slotsContainer}>
          <Text style={styles.slotsTitle}>可預約時段</Text>

          {loading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : fetchError ? (
            <Text style={styles.noSlots}>載入失敗，請選擇其他日期或重試</Text>
          ) : !availability ? (
            <Text style={styles.noSlots}>當日公休</Text>
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
                  onPress={() => slot.available && setSelectedTime(slot.start_time)}
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

        {/* Selection Info */}
        {selectedTime && (
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionLabel}>已選擇</Text>
            <Text style={styles.selectionValue}>
              {selectedDate.split('-').slice(1).join('/')} • {selectedTime}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !selectedTime && styles.confirmButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!selectedTime}
        >
          <Text style={[
            styles.confirmButtonText,
            !selectedTime && styles.confirmButtonTextDisabled,
          ]}>
            繼續
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  calendarContainer: {
    marginHorizontal: spacing.md,
  },
  slotsContainer: {
    padding: spacing.md,
  },
  slotsTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  loader: {
    marginTop: spacing.xl,
  },
  noSlots: {
    textAlign: 'center',
    color: colors.mutedForeground,
    marginTop: spacing.xl,
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
    borderRadius: 0, 
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
  selectionInfo: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: 0, 
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  selectionLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  selectionValue: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 0, 
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: colors.secondary,
  },
  confirmButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseSemiBold,
    color: colors.primaryForeground,
  },
  confirmButtonTextDisabled: {
    color: colors.mutedForeground,
  },
});
