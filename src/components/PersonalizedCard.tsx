import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { differenceInDays, parseISO, isSameDay } from 'date-fns';
import { CustomerStats } from '../hooks/useCustomerStats';
import { useResponsive } from '../hooks/useResponsive';
import { colors, spacing, typography } from '../theme';

interface PersonalizedCardProps {
  stats: CustomerStats;
}

export const PersonalizedCard: React.FC<PersonalizedCardProps> = ({ stats }) => {
  const navigation = useNavigation();
  const r = useResponsive();

  if (stats.loading) return null;

  const navigateToBookingDetail = (bookingId: string) => {
    (navigation.getParent() as any)?.navigate('BookingDetail', { bookingId });
  };

  const navigateToBookingFlow = (barberId: string) => {
    (navigation.getParent() as any)?.navigate('BookingFlow', {
      screen: 'SelectServices',
      params: { barberId },
    });
  };

  const renderContent = () => {
    switch (stats.state) {
      case 'upcoming':
        return renderUpcoming();
      case 'just_completed':
        return renderJustCompleted();
      case 'regular':
        return renderRegular();
      case 'long_absence':
        return renderLongAbsence();
      default:
        return null;
    }
  };

  const renderUpcoming = () => {
    const booking = stats.nextBooking;
    if (!booking) return null;

    const now = new Date();
    const bookingDate = parseISO(booking.booking_date);
    const isToday = isSameDay(bookingDate, now);
    const daysUntil = differenceInDays(bookingDate, now);

    let countdown: string;
    if (isToday) {
      countdown = `今天 ${booking.start_time}`;
    } else if (daysUntil === 1) {
      countdown = '明天';
    } else {
      countdown = `還有 ${daysUntil} 天`;
    }

    const barberName = booking.barber?.display_name || '';
    const serviceNames = booking.services
      ?.map(s => s.service?.name)
      .filter(Boolean)
      .join('、') || '';

    return (
      <TouchableOpacity
        style={[styles.card, { padding: r.sp.md }]}
        onPress={() => navigateToBookingDetail(booking.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <View style={[styles.iconContainer, { width: r.iconSmall, height: r.iconSmall }]}>
            <Ionicons name="calendar-outline" size={r.isTablet ? 24 : 20} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardLabel, { fontSize: r.fs.sm }]}>即將到來的預約</Text>
            <Text style={[styles.cardTitle, { fontSize: r.fs.lg }]}>{countdown}</Text>
            {(barberName || serviceNames) && (
              <Text style={[styles.cardSubtitle, { fontSize: r.fs.sm }]} numberOfLines={1}>
                {[barberName, serviceNames].filter(Boolean).join(' · ')}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={r.isTablet ? 24 : 20} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderJustCompleted = () => {
    const booking = stats.lastCompletedBooking;
    if (!booking) return null;

    const serviceNames = booking.services
      ?.map(s => s.service?.name)
      .filter(Boolean)
      .join('、') || '';

    return (
      <View style={[styles.card, { padding: r.sp.md }]}>
        <View style={styles.cardRow}>
          <View style={[styles.iconContainer, styles.iconSuccess, { width: r.iconSmall, height: r.iconSmall }]}>
            <Ionicons name="checkmark-circle-outline" size={r.isTablet ? 24 : 20} color={colors.success} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardLabel, { fontSize: r.fs.sm }]}>服務完成</Text>
            {serviceNames && (
              <Text style={[styles.cardTitle, { fontSize: r.fs.md }]} numberOfLines={1}>
                {serviceNames}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderRegular = () => {
    const lastBooking = stats.lastCompletedBooking || stats.lastBooking;
    if (!lastBooking) return null;

    const barberName = lastBooking.barber?.display_name || '';
    const barberId = lastBooking.barber_id;
    const serviceNames = lastBooking.services
      ?.map(s => s.service?.name)
      .filter(Boolean)
      .join('、') || '';

    return (
      <TouchableOpacity
        style={[styles.card, { padding: r.sp.md }]}
        onPress={() => navigateToBookingFlow(barberId)}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <View style={[styles.iconContainer, { width: r.iconSmall, height: r.iconSmall }]}>
            <Ionicons name="repeat-outline" size={r.isTablet ? 24 : 20} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardLabel, { fontSize: r.fs.sm }]}>再來一次？</Text>
            <Text style={[styles.cardTitle, { fontSize: r.fs.md }]}>快速預約</Text>
            {(barberName || serviceNames) && (
              <Text style={[styles.cardSubtitle, { fontSize: r.fs.sm }]} numberOfLines={1}>
                上次：{[barberName, serviceNames].filter(Boolean).join(' · ')}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={r.isTablet ? 24 : 20} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderLongAbsence = () => {
    const days = stats.daysSinceLastVisit;
    const lastBooking = stats.lastCompletedBooking || stats.lastBooking;
    const barberId = lastBooking?.barber_id;

    const handlePress = () => {
      if (barberId) {
        navigateToBookingFlow(barberId);
      }
    };

    return (
      <TouchableOpacity
        style={[styles.card, { padding: r.sp.md }]}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={!barberId}
      >
        <View style={styles.cardRow}>
          <View style={[styles.iconContainer, { width: r.iconSmall, height: r.iconSmall }]}>
            <Ionicons name="hand-left-outline" size={r.isTablet ? 24 : 20} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { fontSize: r.fs.md }]}>
              {days !== null ? `已經 ${days} 天沒來了` : '來預約看看吧'}
            </Text>
          </View>
          {barberId && (
            <Ionicons name="chevron-forward" size={r.isTablet ? 24 : 20} color={colors.mutedForeground} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingHorizontal: r.sp.lg, marginTop: r.sp.sm }]}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconSuccess: {
    backgroundColor: colors.successLight,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
});
