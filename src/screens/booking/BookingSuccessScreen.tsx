import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../services/supabase';
import { Booking, Barber } from '../../types';
import { BookingStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';
import { PressableButton } from '../../components/PressableButton';
import { useResponsive } from '../../hooks/useResponsive';

type Props = NativeStackScreenProps<BookingStackParamList, 'BookingSuccess'>;

export const BookingSuccessScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;
  const r = useResponsive();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  // Animation values
  const iconScale = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(20)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    fetchBookingDetails();

    // Staggered entrance animation
    Animated.sequence([
      // 1. Icon spring scale: 0 → 1.15 → 1
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
      // 2. Title fade + slide
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(titleTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
      // 3. Subtitle fade + slide
      Animated.parallel([
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(subtitleTranslateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]),
      // 4. Card fade + slide
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(cardTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
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

      <View style={[styles.content, { padding: r.sp.xl }]}>
        {/* Success Icon */}
        <Animated.View style={[styles.iconContainer, { width: r.isTablet ? 128 : 96, height: r.isTablet ? 128 : 96, marginBottom: r.sp.xl, transform: [{ scale: iconScale }] }]}>
          <Ionicons name="checkmark" size={r.isTablet ? 64 : 48} color={colors.primaryForeground} />
        </Animated.View>

        <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }}>
          <Text style={[styles.title, { fontSize: r.fs.xxl, marginBottom: r.sp.sm }]}>預約成功！</Text>
        </Animated.View>
        <Animated.View style={{ opacity: subtitleOpacity, transform: [{ translateY: subtitleTranslateY }] }}>
          <Text style={[styles.subtitle, { fontSize: r.fs.md, marginBottom: r.sp.xl }]}>您的預約已確認</Text>
        </Animated.View>

        {/* Booking Details Card */}
        {loading && (
          <View style={{ marginBottom: r.sp.xl }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
        {booking && (
          <Animated.View style={[styles.card, { padding: r.sp.lg, marginBottom: r.sp.xl, maxWidth: r.isTablet ? 500 : undefined }, { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }]}>
            <View style={[styles.cardRow, { gap: r.sp.md }]}>
              <Ionicons name="calendar-outline" size={r.isTablet ? 24 : 20} color={colors.primary} />
              <Text style={[styles.cardText, { fontSize: r.fs.md }]}>
                {formatDate(booking.booking_date)} {booking.start_time?.slice(0, 5)}
              </Text>
            </View>
            <View style={[styles.cardDivider, { marginVertical: r.sp.md }]} />
            <View style={[styles.cardRow, { gap: r.sp.md }]}>
              <Ionicons name="person-outline" size={r.isTablet ? 24 : 20} color={colors.primary} />
              <Text style={[styles.cardText, { fontSize: r.fs.md }]}>
                設計師：{barber?.display_name || '理髮師'}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Buttons */}
        <View style={[styles.buttons, { gap: r.sp.md, maxWidth: r.isTablet ? 500 : undefined }]}>
          <PressableButton
            style={[styles.primaryButton, { paddingVertical: r.sp.md }]}
            onPress={handleViewBookings}
          >
            <Text style={[styles.primaryButtonText, { fontSize: r.fs.md }]}>查看我的預約</Text>
          </PressableButton>

          <PressableButton
            style={[styles.secondaryButton, { paddingVertical: r.sp.md }]}
            onPress={handleGoHome}
          >
            <Text style={[styles.secondaryButtonText, { fontSize: r.fs.md }]}>返回首頁</Text>
          </PressableButton>
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
