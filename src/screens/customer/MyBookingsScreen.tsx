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
import { Booking } from '../../types';
import { RootStackParamList } from '../../navigation/types';
import { colors, spacing, borderRadius, typography } from '../../theme';

type TabType = 'upcoming' | 'history';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const MyBookingsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
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

  const handleCancel = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;
      fetchBookings();
    } catch (error) {
      // Error cancelling booking
    }
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

  const renderBookingCard = (booking: Booking) => {
    const dateObj = parseISO(booking.booking_date);
    const day = format(dateObj, 'dd');
    const month = format(dateObj, 'MMM').toUpperCase();
    const serviceNames = booking.services
      ?.map((s: any) => s.service?.name)
      .filter(Boolean)
      .join(' + ') || '服務';

    return (
      <TouchableOpacity
        key={booking.id}
        style={styles.bookingCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('BookingDetail', { bookingId: booking.id })}
      >
        <View style={styles.dateColumn}>
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateMonth}>{month}</Text>
        </View>

        <View style={styles.bookingInfo}>
          <Text style={styles.serviceName}>{serviceNames}</Text>
          <Text style={styles.bookingDetails}>
            {booking.start_time} • {booking.barber?.display_name || '理髮師'}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>
    );
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

      {/* Tab Buttons */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'upcoming' && styles.tabButtonActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'upcoming' && styles.tabTextActive,
          ]}>
            即將到來
          </Text>
          {activeTab === 'upcoming' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'history' && styles.tabTextActive,
          ]}>
            歷史紀錄
          </Text>
          {activeTab === 'history' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {displayedBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="calendar-outline"
              size={48}
              color={colors.mutedForeground}
            />
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming'
                ? '沒有即將到來的預約'
                : '沒有歷史預約紀錄'}
            </Text>
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
  serviceName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
    marginBottom: spacing.xs,
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
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
});
