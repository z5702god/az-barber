import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useBarbers } from '../../hooks/useBarbers';
import { useNotificationContext } from '../../providers/NotificationProvider';
import { supabase } from '../../services/supabase';
import { Service } from '../../types';
import { colors, spacing, typography } from '../../theme';
import { BarberCardSkeleton } from '../../components/Skeleton';
import { useResponsive } from '../../hooks/useResponsive';

// Shop background image
const SHOP_IMAGE = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { barbers, loading: barbersLoading } = useBarbers();
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const [popularServices, setPopularServices] = useState<Service[]>([]);

  // 使用 Context 取得未讀通知數量（這樣標記已讀後會即時更新）
  const { unreadCount } = useNotificationContext();

  useEffect(() => {
    const fetchPopularServices = async () => {
      try {
        const { data } = await supabase
          .from('services')
          .select('*')
          .eq('is_active', true)
          .order('sort_order')
          .limit(3);
        if (data) setPopularServices(data);
      } catch (_e) {
        // Silently fail - decorative section
      }
    };
    fetchPopularServices();
  }, []);

  const handleBooking = (barberId: string) => {
    (navigation.getParent() as any)?.navigate('BookingFlow', {
      screen: 'SelectServices',
      params: { barberId }
    });
  };

  const navigateToAIChat = () => {
    (navigation as any).navigate('AIChat');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早安';
    if (hour < 18) return '午安';
    return '晚安';
  };

  const isShopOpen = () => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    if (day === 1) return false; // Monday closed
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return currentMinutes >= 720 && currentMinutes < 1260; // 12:00-21:00
  };

  const getUserName = () => {
    if (user?.name) {
      return user.name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return '訪客';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + r.sp.md }]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        overScrollMode="never"
      >
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: r.sp.lg, paddingBottom: r.sp.md }]}>
          <View>
            <Text style={[styles.greeting, { fontSize: r.fs.sm }]}>{getGreeting()}</Text>
            <Text style={[styles.welcomeText, { fontSize: r.fs.xl }]}>歡迎回來，{getUserName()}</Text>
          </View>
          <TouchableOpacity
            style={[styles.notificationButton, { width: r.iconSize, height: r.iconSize }]}
            onPress={() => {
              // @ts-ignore
              navigation.getParent()?.navigate('Notifications');
            }}
          >
            <Ionicons name="notifications-outline" size={r.isTablet ? 28 : 24} color={colors.primary} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Featured Shop Card */}
        <TouchableOpacity
          style={[styles.featuredCard, { marginHorizontal: r.sp.lg, height: r.featuredHeight }]}
          activeOpacity={0.9}
          onPress={() => barbers.length > 0 && handleBooking(barbers[0].id)}
        >
          <ImageBackground
            source={{ uri: SHOP_IMAGE }}
            style={styles.featuredImage}
            imageStyle={styles.featuredImageStyle}
          >
            <LinearGradient
              colors={['transparent', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.9)']}
              locations={[0, 0.4, 1]}
              style={styles.featuredGradient}
            >
              <Text style={[styles.featuredTitle, { fontSize: r.fs.xl }]}>AZ Barbershop</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="location" size={r.isTablet ? 18 : 14} color={colors.mutedForeground} />
                <Text style={[styles.ratingLocation, { fontSize: r.fs.sm }]}>台北市中山區民權西路9巷22號</Text>
              </View>
            </LinearGradient>
          </ImageBackground>
        </TouchableOpacity>

        {/* Quick Actions - AI 助理入口 */}
        <View style={[styles.quickActionsContainer, { paddingHorizontal: r.sp.lg, marginTop: r.sp.lg }]}>
          <TouchableOpacity style={[styles.quickActionCard, { padding: r.sp.md }]} onPress={navigateToAIChat} activeOpacity={0.7}>
            <View style={[styles.quickActionIcon, { width: r.iconSize, height: r.iconSize, marginRight: r.sp.md }]}>
              <Ionicons name="sparkles" size={r.isTablet ? 28 : 24} color={colors.primary} />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={[styles.quickActionTitle, { fontSize: r.fs.md }]}>小安</Text>
              <Text style={[styles.quickActionSubtitle, { fontSize: r.fs.sm }]}>用說的就能預約</Text>
            </View>
            <Ionicons name="chevron-forward" size={r.isTablet ? 24 : 20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Our Barbers Section */}
        <View style={[styles.section, { marginTop: r.sp.xl, paddingHorizontal: r.sp.lg }]}>
          <View style={[styles.sectionHeader, { marginBottom: r.sp.md }]}>
            <Text style={[styles.sectionTitle, { fontSize: r.fs.xs }]}>我們的設計師</Text>
          </View>

          {barbersLoading ? (
            <View style={[styles.barbersContainer, { gap: r.sp.md }]}>
              <BarberCardSkeleton />
              <BarberCardSkeleton />
            </View>
          ) : barbers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { fontSize: r.fs.sm }]}>目前沒有可預約的設計師</Text>
            </View>
          ) : (
            <View style={[styles.barbersContainer, { gap: r.sp.md, ...(r.isTablet && { flexWrap: 'wrap' as const }) }]}>
              {barbers.map((barber) => (
                <TouchableOpacity
                  key={barber.id}
                  style={[styles.barberCard, {
                    ...(r.isTablet && {
                      flex: 0,
                      width: `${Math.floor(100 / r.gridColumns(2, 3)) - 2}%` as any,
                    }),
                    paddingVertical: r.sp.lg,
                    paddingHorizontal: r.sp.md,
                  }]}
                  onPress={() => handleBooking(barber.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.barberAvatarBox, { width: r.avatarSize, height: r.avatarSize }]}>
                    <Text style={[styles.barberInitials, { fontSize: r.fs.lg }]} numberOfLines={1} adjustsFontSizeToFit>
                      {barber.display_name}
                    </Text>
                  </View>
                  <Text style={[styles.barberRole, { fontSize: r.fs.sm }]}>設計師</Text>
                  <View style={[styles.bookButton, { paddingVertical: r.sp.sm + 2, paddingHorizontal: r.sp.lg }]}>
                    <Text style={[styles.bookButtonText, { fontSize: r.fs.sm }]}>預約</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Popular Services Section */}
        <View style={[styles.section, { marginTop: r.sp.xl, paddingHorizontal: r.sp.lg }]}>
          <View style={[styles.sectionHeader, { marginBottom: r.sp.md }]}>
            <Text style={[styles.sectionTitle, { fontSize: r.fs.xs }]}>熱門服務</Text>
          </View>

          <View style={styles.servicesContainer}>
            {popularServices.map((service, index) => {
              const duration = service.duration_minutes >= 60
                ? `${Math.floor(service.duration_minutes / 60)}h${service.duration_minutes % 60 > 0 ? ` ${service.duration_minutes % 60}m` : ''}`
                : `${service.duration_minutes}m`;
              return (
                <View key={service.id} style={[styles.serviceRow, { padding: r.sp.md }]}>
                  <View style={styles.serviceInfo}>
                    <Text style={[styles.serviceName, { fontSize: r.fs.md }]}>{service.name}</Text>
                    <View style={styles.serviceMeta}>
                      <Ionicons name="time-outline" size={r.isTablet ? 14 : 12} color={colors.mutedForeground} />
                      <Text style={[styles.serviceMetaText, { fontSize: r.fs.sm }]}>{duration}</Text>
                    </View>
                  </View>
                  <Text style={[styles.servicePrice, { fontSize: r.fs.md }]}>${service.price.toLocaleString()}</Text>
                  {index < popularServices.length - 1 && <View style={styles.serviceDivider} />}
                </View>
              );
            })}
          </View>
        </View>

        {/* Business Hours */}
        <View style={[styles.section, { marginTop: r.sp.xl, paddingHorizontal: r.sp.lg }]}>
          <View style={[styles.sectionHeader, { marginBottom: r.sp.md }]}>
            <Text style={[styles.sectionTitle, { fontSize: r.fs.xs }]}>營業時間</Text>
            <View style={[styles.openBadge, {
              backgroundColor: isShopOpen() ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 92, 51, 0.15)',
            }]}>
              <View style={[styles.openDot, {
                backgroundColor: isShopOpen() ? colors.success : colors.destructive,
              }]} />
              <Text style={[styles.openText, {
                color: isShopOpen() ? colors.success : colors.destructive,
              }]}>
                {isShopOpen() ? '營業中' : '已打烊'}
              </Text>
            </View>
          </View>

          <View style={[styles.hoursCard, { padding: r.sp.md }]}>
            <View style={styles.hoursRow}>
              <Text style={[styles.hoursDay, { fontSize: r.fs.md }]}>週二 - 週日</Text>
              <Text style={[styles.hoursTime, { fontSize: r.fs.md }]}>12:00 - 21:00</Text>
            </View>
            <View style={[styles.hoursDivider, { marginVertical: r.sp.sm }]} />
            <View style={styles.hoursRow}>
              <Text style={[styles.hoursDay, { fontSize: r.fs.md }]}>週一</Text>
              <Text style={[styles.hoursClosed, { fontSize: r.fs.md }]}>公休</Text>
            </View>
          </View>
        </View>

        {/* Bottom Spacer for tab bar */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
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
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  greeting: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  welcomeText: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 0,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.destructive,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
  },
  // Featured Card
  featuredCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 0,
    overflow: 'hidden',
    height: 180,
  },
  featuredImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  featuredImageStyle: {
    borderRadius: 0,
  },
  featuredGradient: {
    padding: spacing.md,
    paddingTop: spacing.xl,
  },
  featuredTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.displaySemiBold,
    color: colors.primary,
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingLocation: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginLeft: spacing.xs,
    fontFamily: typography.fontFamily.chinese,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Quick Actions
  quickActionsContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 0,
    backgroundColor: 'rgba(201, 169, 110, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
  // Section
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
    letterSpacing: 2,
  },
  viewAllText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
  // Loading & Empty states
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
  // Barber Cards
  barbersContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  barberCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  barberAvatarBox: {
    width: 72,
    height: 72,
    borderRadius: 0,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  barberInitials: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.displayBold,
    color: colors.primary,
  },
  barberName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
    marginBottom: 2,
  },
  barberRole: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  bookButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
  },
  // Services
  servicesContainer: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    position: 'relative',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
    marginBottom: 4,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceMetaText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
  },
  servicePrice: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.displaySemiBold,
    color: colors.primary,
  },
  serviceDivider: {
    position: 'absolute',
    bottom: 0,
    left: spacing.md,
    right: spacing.md,
    height: 1,
    backgroundColor: colors.border,
  },
  // Business Hours
  hoursCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hoursDay: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chinese,
    color: colors.foreground,
  },
  hoursTime: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.primary,
  },
  hoursClosed: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.mutedForeground,
  },
  hoursDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: 6,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  openText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chineseMedium,
  },
});
