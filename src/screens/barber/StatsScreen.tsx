import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useBarberStats } from '../../hooks/useBarberStats';
import { BarberTabParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<BarberTabParamList, 'Stats'>;

type Period = 'week' | 'month' | 'quarter';

const PERIOD_OPTIONS = [
  { value: 'week' as Period, label: '週' },
  { value: 'month' as Period, label: '月' },
  { value: 'quarter' as Period, label: '季' },
];

export const StatsScreen: React.FC<Props> = () => {
  const { user } = useAuth();
  // 使用 barber_id（barbers 表的 ID），而非 user.id（users 表的 ID）
  const barberId = user?.barber_id || '';
  const [period, setPeriod] = useState<Period>('week');

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start: Date;

    switch (period) {
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start = new Date(now);
        start.setMonth(now.getMonth() - 3);
        break;
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  }, [period]);

  const { stats, topServices, recentCustomers, loading } = useBarberStats(barberId, startDate, endDate);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {PERIOD_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.periodButton,
              period === option.value && styles.periodButtonActive,
            ]}
            onPress={() => setPeriod(option.value)}
          >
            <Text style={[
              styles.periodText,
              period === option.value && styles.periodTextActive,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Revenue Stats */}
      <Text style={styles.sectionTitle}>營收統計</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="cash-outline" size={24} color={colors.primary} />
          <Text style={styles.statValue}>${stats.totalRevenue.toLocaleString()}</Text>
          <Text style={styles.statLabel}>總營收</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
          <Text style={styles.statValue}>{stats.completedCount}</Text>
          <Text style={styles.statLabel}>完成數</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trending-up-outline" size={24} color={colors.primary} />
          <Text style={styles.statValue}>${stats.avgPrice}</Text>
          <Text style={styles.statLabel}>平均單價</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="close-circle-outline" size={24} color={colors.destructive} />
          <Text style={styles.statValue}>{stats.cancelledCount}</Text>
          <Text style={styles.statLabel}>取消數</Text>
        </View>
      </View>

      {/* Top Services */}
      <Text style={styles.sectionTitle}>熱門服務</Text>
      <View style={styles.card}>
        {topServices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={32} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>尚無數據</Text>
          </View>
        ) : (
          topServices.map((service, index) => (
            <View key={service.name} style={[
              styles.rankItem,
              index < topServices.length - 1 && styles.rankItemBorder
            ]}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <View style={styles.rankInfo}>
                <Text style={styles.rankName}>{service.name}</Text>
                <Text style={styles.rankDetail}>
                  {service.count} times • ${service.revenue.toLocaleString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Recent Customers */}
      <Text style={styles.sectionTitle}>近期顧客</Text>
      <View style={[styles.card, styles.lastCard]}>
        {recentCustomers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={32} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>尚無數據</Text>
          </View>
        ) : (
          recentCustomers.map((customer, index) => (
            <View key={customer.id} style={[
              styles.customerItem,
              index < recentCustomers.length - 1 && styles.customerItemBorder
            ]}>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{customer.name}</Text>
                <Text style={styles.customerDetail}>
                  {customer.visitCount} 次 • ${customer.totalSpent.toLocaleString()}
                </Text>
              </View>
              <Text style={styles.lastVisit}>{customer.lastVisit}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0, // 直角風格
    backgroundColor: colors.card,
  },
  periodButtonActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(201, 169, 110, 0.15)',
  },
  periodText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
  },
  periodTextActive: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
    letterSpacing: 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0, // 直角風格
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.displayBold,
    color: colors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0, // 直角風格
    padding: spacing.md,
  },
  lastCard: {
    marginBottom: spacing.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rankItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rankBadge: {
    width: 28,
    height: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.primaryBold,
    color: colors.primaryForeground,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
    marginBottom: 2,
  },
  rankDetail: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  customerItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
    marginBottom: 2,
  },
  customerDetail: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
  },
  lastVisit: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
  },
});
