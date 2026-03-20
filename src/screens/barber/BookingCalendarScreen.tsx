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
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Calendar, DateData } from 'react-native-calendars';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useResponsive';
import { useBarberBookings, useBarberMonthlyBookingDates, useUpdateBookingStatus } from '../../hooks/useBarberData';
import { BarberSelector, BARBER_ALL } from '../../components/BarberSelector';
import { BarberTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';
import { Booking } from '../../types';

type Props = NativeStackScreenProps<BarberTabParamList, 'BookingCalendar'>;

export const BookingCalendarScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const r = useResponsive();
  const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const isOwner = user?.role === 'owner';
  const [selectedBarberId, setSelectedBarberId] = useState(isOwner ? BARBER_ALL : (user?.barber_id || ''));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"

  const { bookings, loading, refetch } = useBarberBookings(selectedBarberId, selectedDate);
  const { bookedDates, refetch: refetchDates } = useBarberMonthlyBookingDates(selectedBarberId, currentMonth);
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
    } else {
      Alert.alert('取消失敗', result.error || '請稍後再試');
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
    textDayFontSize: r.fs.sm,
    textMonthFontSize: r.fs.md,
    textDayHeaderFontSize: r.fs.xs,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Owner: Barber Selector */}
      {isOwner && (
        <BarberSelector
          selectedBarberId={selectedBarberId}
          onSelect={setSelectedBarberId}
          showAll={true}
        />
      )}

      <Calendar
        onDayPress={handleDayPress}
        onMonthChange={handleMonthChange}
        markedDates={generateMarkedDates()}
        theme={calendarTheme}
        style={styles.calendar}
      />

      <View style={[styles.dateHeader, { padding: r.sp.lg }]}>
        <Text style={[styles.dateTitle, { fontSize: r.fs.md }]}>{formattedDate}</Text>
        <View style={[styles.dateHeaderRight, { gap: r.sp.md }]}>
          <Text style={[styles.bookingCount, { fontSize: r.fs.sm }]}>{bookings.length} 筆預約</Text>
          <TouchableOpacity
            style={[styles.addButton, { paddingVertical: r.sp.xs, paddingHorizontal: r.sp.md, gap: r.sp.xs }]}
            onPress={() => rootNavigation?.navigate('BarberAddBooking', {
              barberId: selectedBarberId === BARBER_ALL ? (user?.barber_id || '') : selectedBarberId,
              preselectedDate: selectedDate,
            })}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={r.isTablet ? 22 : 18} color={colors.primaryForeground} />
            <Text style={[styles.addButtonText, { fontSize: r.fs.sm }]}>新增</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={[styles.bookingList, { padding: r.sp.lg }]} showsVerticalScrollIndicator={false}>
        {bookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={r.isTablet ? 56 : 48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { marginTop: r.sp.md, fontSize: r.fs.md }]}>今日無預約</Text>
          </View>
        ) : (
          bookings.map((booking) => {
            const isWalkIn = !booking.customer_id;
            const customerDisplayName = booking.customer?.name?.trim()
              || booking.walk_in_name
              || booking.customer?.email?.split('@')[0]
              || booking.customer?.phone
              || '顧客';
            return (
            <View key={booking.id} style={[styles.bookingCard, { padding: r.sp.md, marginBottom: r.sp.md }]}>
              <View style={[styles.bookingHeader, { marginBottom: r.sp.sm }]}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status), paddingVertical: r.sp.xs, paddingHorizontal: r.sp.sm }]}>
                  <Text style={[styles.statusText, { fontSize: r.fs.xs }]}>{getStatusLabel(booking.status)}</Text>
                </View>
                <View style={[styles.timeContainer, { gap: r.sp.xs }]}>
                  <Ionicons name="time-outline" size={r.isTablet ? 18 : 16} color={colors.mutedForeground} />
                  <Text style={[styles.timeText, { fontSize: r.fs.sm }]}>
                    {booking.start_time?.slice(0, 5) || ''} - {booking.end_time?.slice(0, 5) || ''}
                  </Text>
                </View>
              </View>

              <View style={[styles.customerNameRow, { gap: r.sp.xs, marginBottom: r.sp.xs }]}>
                <Text style={[styles.customerName, { fontSize: r.fs.lg }]}>
                  {customerDisplayName}
                </Text>
                {isWalkIn && (
                  <View style={styles.walkInBadge}>
                    <Text style={styles.walkInBadgeText}>現場客</Text>
                  </View>
                )}
                {booking.customer_note && (
                  <Ionicons name="chatbubble" size={r.isTablet ? 16 : 14} color={colors.primary} />
                )}
              </View>

              <Text style={[styles.serviceText, { fontSize: r.fs.sm, marginBottom: r.sp.sm }]}>
                {selectedBarberId === BARBER_ALL && (booking as any).barber?.display_name
                  ? `${(booking as any).barber.display_name} · `
                  : ''}
                {booking.services?.map((s: any) => s.service?.name).join(' + ')}
              </Text>

              <View style={[styles.priceRow, { gap: r.sp.xs }]}>
                <Ionicons name="cash-outline" size={r.isTablet ? 18 : 16} color={colors.primary} />
                <Text style={[styles.priceText, { fontSize: r.fs.md }]}>${booking.total_price}</Text>
              </View>

              {/* 顧客備註 */}
              {booking.customer_note && (
                <View style={[styles.noteRow, { gap: r.sp.xs, padding: r.sp.sm, marginTop: r.sp.sm }]}>
                  <Ionicons name="chatbubble-outline" size={r.isTablet ? 16 : 14} color={colors.primary} />
                  <Text style={[styles.noteText, { fontSize: r.fs.sm }]}>{booking.customer_note}</Text>
                </View>
              )}

              {booking.status === 'confirmed' && (
                <View style={[styles.actionRow, { gap: r.sp.sm, marginTop: r.sp.md, paddingTop: r.sp.md }]}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { gap: r.sp.xs, paddingVertical: r.sp.sm }]}
                    onPress={() => handleOpenCancelModal(booking)}
                    disabled={updating}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={r.isTablet ? 20 : 18} color={colors.destructive} />
                    <Text style={[styles.cancelButtonText, { fontSize: r.fs.sm }]}>取消預約</Text>
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
          style={styles.modalKeyboardView}
        >
          <ScrollView
            contentContainerStyle={[styles.modalScrollContent, { padding: r.sp.lg }]}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View style={[styles.modal, { padding: r.sp.lg, ...(r.isTablet && { maxWidth: r.modalMaxWidth, alignSelf: 'center' as const, width: '100%' }) }]}>
              <Text style={[styles.modalTitle, { fontSize: r.fs.lg, marginBottom: r.sp.md }]}>取消預約</Text>
              {selectedBooking && (
                <View style={[styles.modalBookingInfo, { padding: r.sp.md, marginBottom: r.sp.md, gap: r.sp.xs }]}>
                  <Text style={[styles.modalBookingText, { fontSize: r.fs.sm }]}>
                    顧客：{selectedBooking.customer?.name?.trim()
                      || selectedBooking.walk_in_name
                      || selectedBooking.customer?.email?.split('@')[0]
                      || selectedBooking.customer?.phone
                      || '顧客'}
                  </Text>
                  <Text style={[styles.modalBookingText, { fontSize: r.fs.sm }]}>
                    時間：{selectedBooking.start_time?.slice(0, 5) || ''}
                  </Text>
                </View>
              )}

              <View style={[styles.inputGroup, { marginBottom: r.sp.md }]}>
                <Text style={[styles.inputLabel, { fontSize: r.fs.sm, marginBottom: r.sp.xs }]}>取消原因（必填）</Text>
                <TextInput
                  style={[styles.reasonInput, { padding: r.sp.md, fontSize: r.fs.md }]}
                  value={cancelReason}
                  onChangeText={setCancelReason}
                  placeholder="請輸入取消原因，顧客會收到推播通知"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={[styles.modalButtonRow, { gap: r.sp.sm }]}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { paddingVertical: r.sp.sm }]}
                  onPress={() => setCancelModalVisible(false)}
                >
                  <Text style={[styles.modalCancelButtonText, { fontSize: r.fs.sm }]}>返回</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalConfirmButton,
                    { paddingVertical: r.sp.sm },
                    !cancelReason.trim() && styles.modalConfirmButtonDisabled,
                  ]}
                  onPress={handleConfirmCancel}
                  disabled={!cancelReason.trim() || updating}
                >
                  <Text style={[styles.modalConfirmButtonText, { fontSize: r.fs.sm }]}>
                    {updating ? '處理中...' : '確定取消'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  modalKeyboardView: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
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
  walkInBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  walkInBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
  },
  dateHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.secondaryMedium,
    color: colors.primaryForeground,
  },
});
