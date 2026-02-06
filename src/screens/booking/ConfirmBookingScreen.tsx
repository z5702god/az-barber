import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import { Text, ActivityIndicator, Divider } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { Barber } from '../../types';
import { BookingStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, typography } from '../../theme';

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

  const { session, user } = useAuth();
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
      // Error fetching barber
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    const userId = session?.user?.id || user?.id;
    if (!userId) {
      Alert.alert('錯誤', '請先登入');
      return;
    }

    setSubmitting(true);
    try {
      // 0. Check for conflicting bookings BEFORE creating
      const { data: conflictingBookings, error: checkError } = await supabase
        .from('bookings')
        .select('id, start_time, end_time')
        .eq('barber_id', barberId)
        .eq('booking_date', date)
        .neq('status', 'cancelled');

      if (checkError) throw checkError;

      // Check for time overlap
      const [newStartHour, newStartMin] = startTime.split(':').map(Number);
      const [newEndHour, newEndMin] = endTime.split(':').map(Number);
      const newStartMinutes = newStartHour * 60 + newStartMin;
      const newEndMinutes = newEndHour * 60 + newEndMin;

      const hasConflict = conflictingBookings?.some(booking => {
        const [bookStartHour, bookStartMin] = booking.start_time.split(':').map(Number);
        const [bookEndHour, bookEndMin] = booking.end_time.split(':').map(Number);
        const bookStartMinutes = bookStartHour * 60 + bookStartMin;
        const bookEndMinutes = bookEndHour * 60 + bookEndMin;

        // Check for overlap: new booking starts before existing ends AND new booking ends after existing starts
        return newStartMinutes < bookEndMinutes && newEndMinutes > bookStartMinutes;
      });

      if (hasConflict) {
        Alert.alert(
          '時段已被預約',
          '很抱歉，這個時段剛剛被其他人預約了，請重新選擇時段。',
          [{ text: '重新選擇', onPress: () => navigation.goBack() }]
        );
        setSubmitting(false);
        return;
      }

      // 1. Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_id: userId,
          barber_id: barberId,
          booking_date: date,
          start_time: startTime,
          end_time: endTime,
          total_duration: totalDuration,
          total_price: totalPrice,
          customer_note: notes || null,
          status: 'confirmed',
        })
        .select()
        .single();

      if (bookingError) {
        // Check if it's a duplicate booking error from database constraint
        if (bookingError.code === '23505' || bookingError.message?.includes('overlap')) {
          Alert.alert(
            '時段已被預約',
            '很抱歉，這個時段剛剛被其他人預約了，請重新選擇時段。',
            [{ text: '重新選擇', onPress: () => navigation.goBack() }]
          );
          setSubmitting(false);
          return;
        }
        throw bookingError;
      }

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
      Alert.alert('預約失敗', '請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const weekDays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    return `${d.getMonth() + 1}/${d.getDate()} (${weekDays[d.getDay()]})`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Appointment Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>預約資訊</Text>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color={colors.mutedForeground} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>設計師</Text>
              <Text style={styles.infoValue}>{barber?.display_name || '未知'}</Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.mutedForeground} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>日期與時間</Text>
              <Text style={styles.infoValue}>
                {formatDate(date)} • {startTime} - {endTime}
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={colors.mutedForeground} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>時長</Text>
              <Text style={styles.infoValue}>{totalDuration} 分鐘</Text>
            </View>
          </View>
        </View>

        {/* Services Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>服務項目</Text>

          {selectedServices.map((service, index) => (
            <React.Fragment key={service.id}>
              <View style={styles.serviceRow}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDuration}>{service.duration_minutes} 分鐘</Text>
                </View>
                <Text style={styles.servicePrice}>${service.price}</Text>
              </View>
              {index < selectedServices.length - 1 && <Divider style={styles.divider} />}
            </React.Fragment>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>總計</Text>
            <Text style={styles.totalPrice}>${totalPrice.toLocaleString()}</Text>
          </View>
          <Text style={styles.paymentNote}>現場付款</Text>
        </View>

        {/* Notes Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>備註（選填）</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="有任何特殊需求或備註嗎..."
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
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.confirmButton, submitting && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={styles.confirmButtonText}>確認預約</Text>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0, 
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  divider: {
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
    marginBottom: 2,
  },
  serviceDuration: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
  servicePrice: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.displayMedium,
    color: colors.foreground,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  totalPrice: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.displayBold,
    color: colors.primary,
  },
  paymentNote: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  notesInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chinese,
    color: colors.foreground,
    minHeight: 80,
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
    justifyContent: 'center',
    minHeight: 52,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseSemiBold,
    color: colors.primaryForeground,
  },
});
