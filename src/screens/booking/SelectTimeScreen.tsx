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
