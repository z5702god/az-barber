import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  SafeAreaView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isAfter, isSameDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../services/supabase';
import { useResponsive } from '../../hooks/useResponsive';
import { Booking } from '../../types';
import { RootStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'BookingDetail'>;

export const BookingDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const r = useResponsive();
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  // 備註編輯狀態
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const fetchBooking = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *, cancelled_by, cancellation_reason,
          barber:barbers(*, user:users(*)),
          services:booking_services(service:services(*))
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      setBooking(data);
    } catch (error) {
      // Error fetching booking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const isUpcoming = (): boolean => {
    if (!booking || booking.status !== 'confirmed') return false;

    const bookingDate = parseISO(booking.booking_date);
    const now = new Date();

    if (isAfter(bookingDate, now)) return true;

    if (isSameDay(bookingDate, now) && booking.start_time) {
      const [hours, minutes] = booking.start_time.split(':').map(Number);
      const bookingDateTime = new Date(bookingDate);
      bookingDateTime.setHours(hours, minutes, 0, 0);
      return isAfter(bookingDateTime, now);
    }

    return false;
  };

  const handleOpenNoteModal = () => {
    setNoteText(booking?.customer_note || '');
    setNoteModalVisible(true);
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          customer_note: noteText.trim() || null,
          note_updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) throw error;

      // 更新本地狀態
      setBooking(prev => prev ? {
        ...prev,
        customer_note: noteText.trim() || undefined,
        note_updated_at: new Date().toISOString(),
      } : null);

      setNoteModalVisible(false);
      Alert.alert('已儲存', '備註已更新');
    } catch (error) {
      Alert.alert('錯誤', '儲存備註失敗，請稍後再試');
    } finally {
      setSavingNote(false);
    }
  };

  const handleCancel = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      '取消預約',
      '確定要取消這個預約嗎？',
      [
        { text: '返回', style: 'cancel' },
        {
          text: '確定取消',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const { error } = await supabase
                .from('bookings')
                .update({ status: 'cancelled', cancelled_by: 'customer' })
                .eq('id', bookingId);

              if (error) throw error;

              Alert.alert('已取消', '您的預約已成功取消', [
                { text: '確定', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('錯誤', '取消預約失敗，請稍後再試');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return colors.primary;
      case 'completed': return colors.success;
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

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={r.scale(48, 58)} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { fontSize: r.fs.md }]}>找不到預約資訊</Text>
        <TouchableOpacity style={[styles.backButton, { paddingVertical: r.sp.sm, paddingHorizontal: r.sp.lg }]} onPress={() => navigation.goBack()}>
          <Text style={[styles.backButtonText, { fontSize: r.fs.md }]}>返回</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const dateObj = parseISO(booking.booking_date);
  const formattedDate = format(dateObj, 'yyyy年M月d日 EEEE', { locale: zhTW });
  const serviceNames = booking.services
    ?.map((s: any) => s.service?.name)
    .filter(Boolean) || [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: r.sp.md, paddingVertical: r.sp.md }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={r.scale(24, 28)} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: r.fs.lg }]}>預約詳情</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={[styles.statusSection, { paddingVertical: r.sp.lg }]}>
          <View style={[styles.statusBadge, { paddingVertical: r.sp.xs, paddingHorizontal: r.sp.lg, backgroundColor: getStatusColor(booking.status) }]}>
            <Text style={[styles.statusText, { fontSize: r.fs.sm }]}>{getStatusLabel(booking.status)}</Text>
          </View>
          {booking.status === 'cancelled' && (
            <View style={[styles.cancellationInfo, { marginTop: r.sp.sm }]}>
              <Text style={[styles.cancellationBy, { fontSize: r.fs.sm }]}>
                {(booking as any).cancelled_by === 'barber' ? '理髮師取消' :
                 (booking as any).cancelled_by === 'customer' ? '您已取消' : '已取消'}
              </Text>
              {(booking as any).cancellation_reason ? (
                <Text style={[styles.cancellationReason, { fontSize: r.fs.sm, marginTop: r.sp.xs }]}>
                  原因：{(booking as any).cancellation_reason}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Date & Time Card */}
        <View style={[styles.card, { marginHorizontal: r.sp.lg, marginBottom: r.sp.md, padding: r.sp.md }]}>
          <View style={[styles.cardHeader, { gap: r.sp.sm, marginBottom: r.sp.md, paddingBottom: r.sp.sm }]}>
            <Ionicons name="calendar-outline" size={r.scale(20, 24)} color={colors.primary} />
            <Text style={[styles.cardTitle, { fontSize: r.fs.sm }]}>預約時間</Text>
          </View>
          <Text style={[styles.dateText, { fontSize: r.fs.lg, marginBottom: r.sp.sm }]}>{formattedDate}</Text>
          <View style={[styles.timeRow, { gap: r.sp.xs }]}>
            <Ionicons name="time-outline" size={r.scale(18, 22)} color={colors.mutedForeground} />
            <Text style={[styles.timeText, { fontSize: r.fs.md }]}>
              {booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)}
            </Text>
            <Text style={[styles.durationText, { fontSize: r.fs.sm }]}>({booking.total_duration} 分鐘)</Text>
          </View>
        </View>

        {/* Barber Card */}
        <View style={[styles.card, { marginHorizontal: r.sp.lg, marginBottom: r.sp.md, padding: r.sp.md }]}>
          <View style={[styles.cardHeader, { gap: r.sp.sm, marginBottom: r.sp.md, paddingBottom: r.sp.sm }]}>
            <Ionicons name="person-outline" size={r.scale(20, 24)} color={colors.primary} />
            <Text style={[styles.cardTitle, { fontSize: r.fs.sm }]}>服務人員</Text>
          </View>
          <Text style={[styles.barberName, { fontSize: r.fs.lg }]}>{booking.barber?.display_name || '理髮師'}</Text>
        </View>

        {/* Services Card */}
        <View style={[styles.card, { marginHorizontal: r.sp.lg, marginBottom: r.sp.md, padding: r.sp.md }]}>
          <View style={[styles.cardHeader, { gap: r.sp.sm, marginBottom: r.sp.md, paddingBottom: r.sp.sm }]}>
            <Ionicons name="cut-outline" size={r.scale(20, 24)} color={colors.primary} />
            <Text style={[styles.cardTitle, { fontSize: r.fs.sm }]}>服務項目</Text>
          </View>
          {serviceNames.map((name: string, index: number) => {
            const serviceData = booking.services?.[index] as any;
            const price = serviceData?.service?.price || 0;
            const duration = serviceData?.service?.duration_minutes || 0;
            return (
              <View key={index} style={[styles.serviceRow, { paddingVertical: r.sp.sm }]}>
                <Text style={[styles.serviceName, { fontSize: r.fs.md }]}>{name}</Text>
                <View style={[styles.serviceDetails, { gap: r.sp.md }]}>
                  <Text style={[styles.serviceInfo, { fontSize: r.fs.sm }]}>{duration}分鐘</Text>
                  <Text style={[styles.servicePrice, { fontSize: r.fs.md }]}>${price}</Text>
                </View>
              </View>
            );
          })}
          <View style={[styles.totalRow, { paddingTop: r.sp.md, marginTop: r.sp.sm }]}>
            <Text style={[styles.totalLabel, { fontSize: r.fs.md }]}>總計</Text>
            <Text style={[styles.totalPrice, { fontSize: r.fs.xl }]}>${booking.total_price}</Text>
          </View>
          <Text style={[styles.paymentNote, { fontSize: r.fs.xs, marginTop: r.sp.xs }]}>現場付款</Text>
        </View>

        {/* Note Card - Only show for upcoming bookings */}
        {isUpcoming() && (
          <View style={[styles.card, { marginHorizontal: r.sp.lg, marginBottom: r.sp.md, padding: r.sp.md }]}>
            <View style={[styles.cardHeader, { gap: r.sp.sm, marginBottom: r.sp.md, paddingBottom: r.sp.sm }]}>
              <Ionicons name="chatbubble-outline" size={r.scale(20, 24)} color={colors.primary} />
              <Text style={[styles.cardTitle, { fontSize: r.fs.sm }]}>給理髮師的備註</Text>
            </View>
            {booking.customer_note ? (
              <Text style={[styles.noteText, { fontSize: r.fs.md }]}>{booking.customer_note}</Text>
            ) : (
              <Text style={[styles.noteEmptyText, { fontSize: r.fs.md }]}>尚未填寫備註</Text>
            )}
            <TouchableOpacity
              style={[styles.editNoteButton, { marginTop: r.sp.md, paddingVertical: r.sp.sm, gap: r.sp.xs }]}
              onPress={handleOpenNoteModal}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={r.scale(18, 22)} color={colors.primary} />
              <Text style={[styles.editNoteButtonText, { fontSize: r.fs.sm }]}>
                {booking.customer_note ? '編輯備註' : '新增備註'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cancel Button - Only show for upcoming bookings */}
        {isUpcoming() && (
          <TouchableOpacity
            style={[styles.cancelButton, { marginHorizontal: r.sp.lg, marginTop: r.sp.lg, paddingVertical: r.sp.md, gap: r.sp.sm }]}
            onPress={handleCancel}
            disabled={cancelling}
            activeOpacity={0.8}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={r.scale(20, 24)} color={colors.destructive} />
                <Text style={[styles.cancelButtonText, { fontSize: r.fs.md }]}>取消預約</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Rebook Button - Show for completed/cancelled bookings */}
        {!isUpcoming() && booking.barber_id && (
          <TouchableOpacity
            style={[styles.rebookButton, { marginHorizontal: r.sp.lg, marginTop: r.sp.lg, paddingVertical: r.sp.md, gap: r.sp.sm }]}
            onPress={() => {
              (navigation as any).navigate('BookingFlow', {
                screen: 'SelectServices',
                params: { barberId: booking.barber_id },
              });
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={r.scale(20, 24)} color={colors.primary} />
            <Text style={[styles.rebookButtonText, { fontSize: r.fs.md }]}>再次預約</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.bottomPadding, { height: r.sp.xxl }]} />
      </ScrollView>

      {/* Note Edit Modal */}
      <Modal
        visible={noteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalOverlay, { padding: r.sp.lg }]}
        >
          <View style={[styles.modal, { padding: r.sp.lg, maxWidth: r.modalMaxWidth, alignSelf: 'center', width: '100%' }]}>
            <Text style={[styles.modalTitle, { fontSize: r.fs.lg, marginBottom: r.sp.xs }]}>編輯備註</Text>
            <Text style={[styles.modalSubtitle, { fontSize: r.fs.sm, marginBottom: r.sp.md }]}>
              告訴理髮師您的需求或狀況（例如：會晚到、髮型偏好等）
            </Text>

            <TextInput
              style={[styles.noteInput, { padding: r.sp.md, fontSize: r.fs.md, minHeight: r.scale(120, 150) }]}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="輸入備註..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={200}
            />

            <Text style={[styles.charCount, { fontSize: r.fs.xs, marginTop: r.sp.xs, marginBottom: r.sp.md }]}>{noteText.length}/200</Text>

            <View style={[styles.modalButtonRow, { gap: r.sp.sm }]}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { paddingVertical: r.sp.sm }]}
                onPress={() => setNoteModalVisible(false)}
              >
                <Text style={[styles.modalCancelButtonText, { fontSize: r.fs.sm }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, { paddingVertical: r.sp.sm }]}
                onPress={handleSaveNote}
                disabled={savingNote}
              >
                <Text style={[styles.modalSaveButtonText, { fontSize: r.fs.sm }]}>
                  {savingNote ? '儲存中...' : '儲存'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
  backButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  backButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  scrollView: {
    flex: 1,
  },
  statusSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statusBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.secondaryMedium,
    color: colors.primaryForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cancellationInfo: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  cancellationBy: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.mutedForeground,
  },
  cancellationReason: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
    letterSpacing: 1,
  },
  dateText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
  },
  durationText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
  },
  barberName: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  serviceName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  serviceInfo: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
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
    paddingTop: spacing.md,
    marginTop: spacing.sm,
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
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.destructive,
  },
  rebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  rebookButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
  // Note styles
  noteText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chinese,
    color: colors.foreground,
    lineHeight: 24,
  },
  noteEmptyText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  editNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editNoteButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
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
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  noteInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chinese,
    color: colors.foreground,
    minHeight: 120,
  },
  charCount: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    textAlign: 'right',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
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
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primaryForeground,
  },
});
