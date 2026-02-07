import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { Booking, Barber } from '../../types';
import { BookingStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<BookingStackParamList, 'BookingSuccess'>;

export const BookingSuccessScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchBookingDetails();
  }, []);

  const fetchBookingDetails = async () => {
    try {
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('*, barber:barbers(*)')
        .eq('id', bookingId)
        .single();

      if (bookingData) {
        setBooking(bookingData);
        setBarber(bookingData.barber);
      }
    } catch (error) {
      if (__DEV__) console.error('Error fetching booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    // Append T00:00:00 to avoid timezone shift when parsing date-only strings
    const d = new Date(dateStr + 'T00:00:00');
    const weekDays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    return `${d.getMonth() + 1}/${d.getDate()} (${weekDays[d.getDay()]})`;
  };

  const handleViewBookings = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Main' as any,
            state: {
              routes: [{ name: 'MyBookings' }],
              index: 0,
            },
          },
        ],
      })
    );
  };

  const handleGoHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main' as any }],
      })
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark" size={48} color={colors.primaryForeground} />
        </View>

        <Text style={styles.title}>預約成功！</Text>
        <Text style={styles.subtitle}>您的預約已確認</Text>

        {/* Booking Details Card */}
        {loading && (
          <View style={{ marginBottom: spacing.xl }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
        {booking && (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={styles.cardText}>
                {formatDate(booking.booking_date)} {booking.start_time?.slice(0, 5)}
              </Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardRow}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
              <Text style={styles.cardText}>
                設計師：{barber?.display_name || '理髮師'}
              </Text>
            </View>
          </View>
        )}

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleViewBookings}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>查看我的預約</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleGoHome}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>返回首頁</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 0, 
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily.chineseBold,
    color: colors.foreground,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0, 
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  cardText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
    flex: 1,
  },
  buttons: {
    width: '100%',
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 0, 
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseSemiBold,
    color: colors.primaryForeground,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 0, 
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
});
