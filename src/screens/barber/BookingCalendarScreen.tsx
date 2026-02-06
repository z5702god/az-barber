import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Calendar, DateData } from 'react-native-calendars';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useBarberBookings, useBarberMonthlyBookingDates, useUpdateBookingStatus } from '../../hooks/useBarberData';
import { BarberTabParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';
import { Booking } from '../../types';

type Props = NativeStackScreenProps<BarberTabParamList, 'BookingCalendar'>;

export const BookingCalendarScreen: React.FC<Props> = () => {
  const { user } = useAuth();
  // 使用 barber_id（barbers 表的 ID），而非 user.id（users 表的 ID）
  const barberId = user?.barber_id || '';
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"

  const { bookings, loading, refetch } = useBarberBookings(barberId, selectedDate);
  const { bookedDates, refetch: refetchDates } = useBarberMonthlyBookingDates(barberId, currentMonth);
  const { cancelBooking, updating } = useUpdateBookingStatus();

  // 取消預約 Modal 狀態
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const handleMonthChange = (month: DateData) => {
    setCurrentMonth(month.dateString.slice(0, 7));
  };

  // Generate marked dates with gold dots for dates with bookings
  const generateMarkedDates = () => {
    const marked: { [key: string]: any } = {};

    // Add gold dots for all booked dates
    bookedDates.forEach(date => {
      marked[date] = {
        marked: true,
        dotColor: colors.primary,
      };
    });

    // Add selection highlight for selected date
    if (marked[selectedDate]) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: colors.primary,
      };
    } else {
      marked[selectedDate] = {
        selected: true,
        selectedColor: colors.primary,
      };
    }

    return marked;
  };

  const handleOpenCancelModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedBooking || !cancelReason.trim()) return;

    const result = await cancelBooking(
      selectedBooking.id,
      cancelReason.trim(),
      user?.name || '理髮師'
    );

    if (result.success) {
      setCancelModalVisible(false);
      setSelectedBooking(null);
      setCancelReason('');
      refetch();
      refetchDates(); // Refresh calendar dots
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return colors.primary;
      case 'completed': return colors.primary; // 金色
      case 'cancelled': return colors.mutedForeground;
      default: return colors.mutedForeground;
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

  const calendarTheme = {
    backgroundColor: colors.background,
    calendarBackground: colors.card,
    textSectionTitleColor: colors.mutedForeground,
    selectedDayBackgroundColor: colors.primary,
    selectedDayTextColor: colors.primaryForeground,
    todayTextColor: colors.primary,
    dayTextColor: colors.foreground,
    textDisabledColor: colors.border,
    dotColor: colors.primary,
    selectedDotColor: colors.primaryForeground,
    arrowColor: colors.primary,
    monthTextColor: colors.foreground,
    textDayFontFamily: typography.fontFamily.body,
    textMonthFontFamily: typography.fontFamily.displayMedium,
    textDayHeaderFontFamily: typography.fontFamily.body,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <Calendar
        onDayPress={handleDayPress}
        onMonthChange={handleMonthChange}
        markedDates={generateMarkedDates()}
        theme={calendarTheme}
        style={styles.calendar}
      />

      <View style={styles.dateHeader}>
        <Text style={styles.dateTitle}>{formattedDate}</Text>
        <Text style={styles.bookingCount}>{bookings.length} 筆預約</Text>
      </View>

      <ScrollView style={styles.bookingList} showsVerticalScrollIndicator={false}>
        {bookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>今日無預約</Text>
          </View>
        ) : (
          bookings.map((booking) => {
            // 優先顯示 name，若無則用 email 或 phone
            const customerDisplayName = booking.customer?.name
              || booking.customer?.email?.split('@')[0]
              || booking.customer?.phone
              || '顧客';
            return (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                  <Text style={styles.statusText}>{getStatusLabel(booking.status)}</Text>
                </View>
                <View style={styles.timeContainer}>
                  <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
                  <Text style={styles.timeText}>
                    {booking.start_time?.slice(0, 5) || ''} - {booking.end_time?.slice(0, 5) || ''}
                  </Text>
                </View>
              </View>

              <View style={styles.customerNameRow}>
                <Text style={styles.customerName}>
                  {customerDisplayName}
                </Text>
                {booking.customer_note && (
                  <Ionicons name="chatbubble" size={14} color={colors.primary} />
                )}
              </View>

              <Text style={styles.serviceText}>
                {booking.services?.map((s: any) => s.service?.name).join(' + ')}
              </Text>

              <View style={styles.priceRow}>
                <Ionicons name="cash-outline" size={16} color={colors.primary} />
                <Text style={styles.priceText}>${booking.total_price}</Text>
              </View>

              {/* 顧客備註 */}
              {booking.customer_note && (
                <View style={styles.noteRow}>
                  <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
                  <Text style={styles.noteText}>{booking.customer_note}</Text>
                </View>
              )}

              {booking.status === 'confirmed' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleOpenCancelModal(booking)}
                    disabled={updating}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={18} color={colors.destructive} />
                    <Text style={styles.cancelButtonText}>取消預約</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
          })
        )}
      </ScrollView>

      {/* Cancel Booking Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>取消預約</Text>
            {selectedBooking && (
              <View style={styles.modalBookingInfo}>
                <Text style={styles.modalBookingText}>
                  顧客：{selectedBooking.customer?.name
                    || selectedBooking.customer?.email?.split('@')[0]
                    || selectedBooking.customer?.phone
                    || '顧客'}
                </Text>
                <Text style={styles.modalBookingText}>
                  時間：{selectedBooking.start_time?.slice(0, 5) || ''}
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>取消原因（必填）</Text>
              <TextInput
                style={styles.reasonInput}
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="請輸入取消原因，顧客會收到推播通知"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>返回</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  !cancelReason.trim() && styles.modalConfirmButtonDisabled,
                ]}
                onPress={handleConfirmCancel}
                disabled={!cancelReason.trim() || updating}
              >
                <Text style={styles.modalConfirmButtonText}>
                  {updating ? '處理中...' : '確定取消'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.displayMedium,
    color: colors.foreground,
  },
  bookingCount: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
  },
  bookingList: {
    flex: 1,
    padding: spacing.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
  },
  bookingCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.secondaryMedium,
    color: colors.primaryForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  customerName: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  serviceText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priceText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.displayBold,
    color: colors.primary,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.background,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  noteText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.foreground,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.destructive,
    paddingVertical: spacing.sm,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.secondaryMedium,
    color: colors.destructive,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.displayMedium,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  modalBookingInfo: {
    backgroundColor: colors.background,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  modalBookingText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  reasonInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
    minHeight: 100,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.secondaryMedium,
    color: colors.foreground,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: colors.destructive,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  modalConfirmButtonDisabled: {
    opacity: 0.5,
  },
  modalConfirmButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.secondaryMedium,
    color: colors.primaryForeground,
  },
});
