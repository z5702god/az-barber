import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { format, parseISO, isAfter, isSameDay } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useResponsive';
import { Booking } from '../../types';
import { RootStackParamList } from '../../navigation/types';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { BookingCardSkeleton } from '../../components/Skeleton';

type TabType = 'upcoming' | 'history';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const MyBookingsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const r = useResponsive();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');

  const fetchBookings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          barber:barbers(*, user:users(*)),
          services:booking_services(service:services(*))
        `)
        .eq('customer_id', user.id)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      // Error fetching bookings
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Refresh data when screen comes into focus (e.g., after cancelling from BookingDetail)
  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  // 判斷預約是否為即將到來
  const isUpcoming = (booking: Booking): boolean => {
    if (booking.status !== 'confirmed') return false;

    const bookingDate = parseISO(booking.booking_date);
    const now = new Date();

    // 如果預約日期在今天之後 → upcoming
    if (isAfter(bookingDate, now)) return true;

    // 如果是今天，檢查時間是否還沒過
    if (isSameDay(bookingDate, now) && booking.start_time) {
      const [hours, minutes] = booking.start_time.split(':').map(Number);
      const bookingDateTime = new Date(bookingDate);
      bookingDateTime.setHours(hours, minutes, 0, 0);
      return isAfter(bookingDateTime, now);
    }

    return false;
  };

  const upcomingBookings = bookings.filter(isUpcoming);
  const pastBookings = bookings.filter((b) => !isUpcoming(b));

  const displayedBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      case 'confirmed': return '已確認';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success;
      case 'cancelled': return colors.mutedForeground;
      case 'confirmed': return colors.primary;
      default: return colors.mutedForeground;
    }
  };

  const renderBookingCard = (booking: Booking) => {
    const dateObj = parseISO(booking.booking_date);
    const day = format(dateObj, 'dd');
    const month = format(dateObj, 'MMM').toUpperCase();
    const serviceNames = booking.services
      ?.map((s: any) => s.service?.name)
      .filter(Boolean)
      .join(' + ') || '服務';
    const showStatus = activeTab === 'history';

    return (
      <TouchableOpacity
        key={booking.id}
        style={[styles.bookingCard, { minHeight: r.isTablet ? 88 : 72, padding: r.sp.md, marginBottom: r.sp.md }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('BookingDetail', { bookingId: booking.id })}
      >
        <View style={[styles.dateColumn, { marginRight: r.sp.md, minWidth: r.isTablet ? 60 : 44 }]}>
          <Text style={[styles.dateDay, { fontSize: r.fs.xl }, booking.status === 'cancelled' && { color: colors.mutedForeground }]}>{day}</Text>
          <Text style={[styles.dateMonth, { fontSize: r.fs.xs }]}>{month}</Text>
        </View>

        <View style={styles.bookingInfo}>
          <View style={[styles.serviceNameRow, { gap: r.sp.sm, marginBottom: r.sp.xs }]}>
            <Text style={[styles.serviceName, { fontSize: r.fs.md }]}>{serviceNames}</Text>
            {showStatus && (
              <View style={[styles.statusBadge, { paddingVertical: r.scale(2, 4), paddingHorizontal: r.sp.sm, backgroundColor: `${getStatusColor(booking.status)}20` }]}>
                <Text style={[styles.statusBadgeText, { fontSize: r.fs.xs, color: getStatusColor(booking.status) }]}>
                  {getStatusLabel(booking.status)}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.bookingDetails, { fontSize: r.fs.sm }]}>
            {booking.start_time?.slice(0, 5)} • {booking.barber?.display_name || '理髮師'}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={r.scale(20, 24)}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={[styles.tabContainer, { paddingHorizontal: r.sp.lg }]}>
          <View style={[styles.tabButton, styles.tabButtonActive, { paddingVertical: r.sp.md, marginRight: r.sp.xl }]}>
            <Text style={[styles.tabText, styles.tabTextActive, { fontSize: r.fs.md }]}>即將到來</Text>
            <View style={styles.tabIndicator} />
          </View>
          <View style={[styles.tabButton, { paddingVertical: r.sp.md, marginRight: r.sp.xl }]}>
            <Text style={[styles.tabText, { fontSize: r.fs.md }]}>歷史紀錄</Text>
          </View>
        </View>
        <View style={{ padding: r.sp.md }}>
          <BookingCardSkeleton />
          <BookingCardSkeleton />
          <BookingCardSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Tab Buttons */}
      <View style={[styles.tabContainer, { paddingHorizontal: r.sp.lg }]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'upcoming' && styles.tabButtonActive, { paddingVertical: r.sp.md, marginRight: r.sp.xl }]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'upcoming' && styles.tabTextActive,
            { fontSize: r.fs.md },
          ]}>
            即將到來
          </Text>
          {activeTab === 'upcoming' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive, { paddingVertical: r.sp.md, marginRight: r.sp.xl }]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'history' && styles.tabTextActive,
            { fontSize: r.fs.md },
          ]}>
            歷史紀錄
          </Text>
          {activeTab === 'history' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { padding: r.sp.md }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        overScrollMode="never"
      >
        {displayedBookings.length === 0 ? (
          <View style={[styles.emptyContainer, { paddingVertical: r.sp.xxl * 2 }]}>
            <Ionicons
              name={activeTab === 'upcoming' ? 'calendar-outline' : 'time-outline'}
              size={r.scale(48, 64)}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyText, { marginTop: r.sp.md, fontSize: r.fs.md }]}>
              {activeTab === 'upcoming'
                ? '沒有即將到來的預約'
                : '沒有歷史預約紀錄'}
            </Text>
            <Text style={[styles.emptySubtext, { marginTop: r.sp.xs, fontSize: r.fs.sm }]}>
              {activeTab === 'upcoming'
                ? '立即預約，讓自己煥然一新'
                : '完成預約後紀錄會顯示在這裡'}
            </Text>
            {activeTab === 'upcoming' && (
              <TouchableOpacity
                style={[styles.emptyActionButton, { marginTop: r.sp.lg, paddingVertical: r.sp.sm + 2, paddingHorizontal: r.sp.xl }]}
                onPress={() => (navigation as any).navigate('Home')}
                activeOpacity={0.7}
              >
                <Text style={[styles.emptyActionText, { fontSize: r.fs.md }]}>立即預約</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          displayedBookings.map(renderBookingCard)
        )}
      </ScrollView>
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    paddingVertical: spacing.md,
    marginRight: spacing.xl,
    position: 'relative',
  },
  tabButtonActive: {},
  tabText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: colors.foreground,
    fontFamily: typography.fontFamily.chineseMedium,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    backgroundColor: colors.card,
    borderRadius: 0, // 直角風格
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dateColumn: {
    alignItems: 'center',
    marginRight: spacing.md,
    minWidth: 44,
  },
  dateDay: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.displayBold,
    color: colors.primary,
  },
  dateMonth: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    letterSpacing: 1,
  },
  bookingInfo: {
    flex: 1,
  },
  serviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  serviceName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
    flexShrink: 1,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  statusBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.secondaryMedium,
    letterSpacing: 0.5,
  },
  bookingDetails: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  emptySubtext: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
  emptyActionButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
  },
  emptyActionText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseSemiBold,
    color: colors.primaryForeground,
  },
});
