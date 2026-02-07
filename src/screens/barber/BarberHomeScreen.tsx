import React, { useState, useCallback } from 'react';
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
  RefreshControl,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useBarberTodayStats, useBarberBookings, useUpdateBookingStatus } from '../../hooks/useBarberData';
import { useNotificationContext } from '../../providers/NotificationProvider';
import { BarberTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';
import { Booking } from '../../types';

type Props = NativeStackScreenProps<BarberTabParamList, 'BarberHome'>;

export const BarberHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const { unreadCount } = useNotificationContext();
  // 使用 barber_id（barbers 表的 ID），而非 user.id（users 表的 ID）
  const barberId = user?.barber_id || '';
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const { stats, loading: statsLoading } = useBarberTodayStats(barberId);
  const { bookings, loading: bookingsLoading, refetch } = useBarberBookings(barberId, today);
  const { cancelBooking, updating } = useUpdateBookingStatus();

  const [refreshing, setRefreshing] = useState(false);

  // 取消預約 Modal 狀態
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早安';
    if (hour < 18) return '午安';
    return '晚安';
  };

  const formatTodayDate = () => {
    const now = new Date();
    const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    return `${now.getMonth() + 1}/${now.getDate()} (${days[now.getDay()]})`;
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
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const upcomingBookings = bookings
    .filter(b => b.status === 'confirmed')
    .slice(0, 5);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        overScrollMode="never"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.name || '理髮師'}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.dateText}>{formatTodayDate()}</Text>
            <TouchableOpacity
              style={styles.bellButton}
              onPress={() => {
                if (rootNavigation) {
                  rootNavigation.navigate('Notifications');
                } else {
                  navigation.navigate('Notifications' as any);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.foreground} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Stats */}
        <Text style={styles.sectionTitle}>今日摘要</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color={colors.primary} />
            <Text style={styles.statValue}>{stats.bookingCount}</Text>
            <Text style={styles.statLabel}>預約數</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={24} color={colors.primary} />
            <Text style={styles.statValue}>${stats.estimatedRevenue.toLocaleString()}</Text>
            <Text style={styles.statLabel}>預估營收</Text>
          </View>
        </View>

        {/* Upcoming Bookings */}
        <Text style={styles.sectionTitle}>即將到來的預約</Text>

        {bookingsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : upcomingBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={40} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>今天沒有更多預約了</Text>
          </View>
        ) : (
          upcomingBookings.map((booking) => {
            // 優先顯示 name，若無則用 email 或 phone
            const customerDisplayName = booking.customer?.name?.trim()
              || booking.customer?.email?.split('@')[0]
              || booking.customer?.phone
              || '顧客';
            return (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeText}>{booking.start_time?.slice(0, 5) || ''}</Text>
                </View>
                <View style={styles.bookingInfo}>
                  <View style={styles.customerNameRow}>
                    <Text style={styles.customerName}>{customerDisplayName}</Text>
                    {booking.customer_note && (
                      <Ionicons name="chatbubble" size={14} color={colors.primary} />
                    )}
                  </View>
                  <Text style={styles.serviceText}>
                    {booking.services?.map((s: any) => s.service?.name).join(', ') || '服務'}
                  </Text>
                </View>
                <Text style={styles.priceText}>${booking.total_price}</Text>
              </View>

              {/* 顧客備註 */}
              {booking.customer_note && (
                <View style={styles.noteRow}>
                  <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
                  <Text style={styles.noteText} numberOfLines={2}>{booking.customer_note}</Text>
                </View>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleOpenCancelModal(booking)}
                  disabled={updating}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={18} color={colors.destructive} />
                  <Text style={styles.cancelButtonText}>取消預約</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
          })
        )}
      </ScrollView>

      {/* 取消預約 Modal */}
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
                  顧客：{selectedBooking.customer?.name?.trim()
                    || selectedBooking.customer?.email?.split('@')[0]
                    || selectedBooking.customer?.phone
                    || '顧客'}
                </Text>
                <Text style={styles.modalBookingText}>
                  時間：{selectedBooking.start_time?.slice(0, 5)}
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
                  {updating ? '處理中...' : '確認取消'}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bellButton: {
    padding: spacing.sm,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.destructive,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.primaryMedium,
    color: '#FFFFFF',
  },
  greeting: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  userName: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  dateText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
    letterSpacing: 2,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0, // 直角風格
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  statValue: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily.displayBold,
    color: colors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0, // 直角風格
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
  bookingCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0, // 直角風格
    padding: spacing.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  timeBox: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  timeText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.primaryMedium,
    color: colors.primaryForeground,
  },
  bookingInfo: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  customerName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
    marginBottom: 2,
  },
  serviceText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
  priceText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.displaySemiBold,
    color: colors.primary,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.background,
    padding: spacing.sm,
    marginBottom: spacing.md,
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
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.destructive,
    paddingVertical: spacing.sm,
    borderRadius: 0,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chineseMedium,
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
    fontFamily: typography.fontFamily.chineseMedium,
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
    fontFamily: typography.fontFamily.chinese,
    color: colors.foreground,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  reasonInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chinese,
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
    fontFamily: typography.fontFamily.chineseMedium,
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
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primaryForeground,
  },
});
