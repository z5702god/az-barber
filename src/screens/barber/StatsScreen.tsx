import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, SegmentedButtons } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useBarberStats } from '../../hooks/useBarberStats';
import { BarberTabParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<BarberTabParamList, 'Stats'>;

type Period = 'week' | 'month' | 'quarter';

export const StatsScreen: React.FC<Props> = () => {
  const { user } = useAuth();
  const barberId = user?.id || '';
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
    <ScrollView style={styles.container}>
      <View style={styles.periodSelector}>
        <SegmentedButtons
          value={period}
          onValueChange={(value) => setPeriod(value as Period)}
          buttons={[
            { value: 'week', label: '本週' },
            { value: 'month', label: '本月' },
            { value: 'quarter', label: '本季' },
          ]}
        />
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>收入統計</Text>
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium">${stats.totalRevenue.toLocaleString()}</Text>
            <Text variant="bodySmall">總收入</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium">{stats.completedCount}</Text>
            <Text variant="bodySmall">完成預約</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium">${stats.avgPrice}</Text>
            <Text variant="bodySmall">平均單價</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium">{stats.cancelledCount}</Text>
            <Text variant="bodySmall">取消預約</Text>
          </Card.Content>
        </Card>
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>熱門服務 TOP 3</Text>
      <Card style={styles.card}>
        {topServices.length === 0 ? (
          <Card.Content>
            <Text style={styles.emptyText}>尚無資料</Text>
          </Card.Content>
        ) : (
          <Card.Content>
            {topServices.map((service, index) => (
              <View key={service.name} style={styles.rankItem}>
                <Text variant="bodyLarge">
                  {index + 1}. {service.name}
                </Text>
                <Text variant="bodySmall" style={styles.rankDetail}>
                  {service.count} 次 · ${service.revenue.toLocaleString()}
                </Text>
              </View>
            ))}
          </Card.Content>
        )}
      </Card>

      <Text variant="titleMedium" style={styles.sectionTitle}>近期顧客</Text>
      <Card style={styles.card}>
        {recentCustomers.length === 0 ? (
          <Card.Content>
            <Text style={styles.emptyText}>尚無資料</Text>
          </Card.Content>
        ) : (
          <Card.Content>
            {recentCustomers.map((customer) => (
              <View key={customer.id} style={styles.customerItem}>
                <View>
                  <Text variant="bodyLarge">{customer.name}</Text>
                  <Text variant="bodySmall" style={styles.customerDetail}>
                    來店 {customer.visitCount} 次 · 消費 ${customer.totalSpent.toLocaleString()}
                  </Text>
                </View>
                <Text variant="bodySmall">{customer.lastVisit}</Text>
              </View>
            ))}
          </Card.Content>
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  periodSelector: {
    padding: 16,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  statCard: {
    width: '46%',
    margin: 4,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  rankItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  rankDetail: {
    color: '#666',
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  customerDetail: {
    color: '#666',
  },
});
