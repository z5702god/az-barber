import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme';

interface SkeletonProps {
  width: number | string;
  height: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width, height, style }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, opacity },
        style,
      ]}
    />
  );
};

// Pre-built skeleton patterns
export const BarberCardSkeleton: React.FC = () => (
  <View style={skeletonStyles.barberCard}>
    <Skeleton width={56} height={56} style={{ marginRight: 12 }} />
    <View style={{ flex: 1 }}>
      <Skeleton width={80} height={16} style={{ marginBottom: 8 }} />
      <Skeleton width={120} height={12} />
    </View>
    <Skeleton width={60} height={36} />
  </View>
);

export const BookingCardSkeleton: React.FC = () => (
  <View style={skeletonStyles.bookingCard}>
    <View style={{ alignItems: 'center', marginRight: 12, width: 44 }}>
      <Skeleton width={32} height={24} style={{ marginBottom: 4 }} />
      <Skeleton width={28} height={12} />
    </View>
    <View style={{ flex: 1 }}>
      <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
      <Skeleton width="50%" height={12} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.border,
    borderRadius: 0,
  },
});

const skeletonStyles = StyleSheet.create({
  barberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
});
