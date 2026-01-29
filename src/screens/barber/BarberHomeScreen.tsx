import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useBarberTodayStats, useBarberBookings, useUpdateBookingStatus } from '../../hooks/useBarberData';
import { BarberTabParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<BarberTabParamList, 'BarberHome'>;

export const BarberHomeScreen: React.FC<Props> = () => {
  const { user } = useAuth();
  const barberId = user?.id || '';
  const today = new Date().toISOString().split('T')[0];

  const { stats, loading: statsLoading } = useBarberTodayStats(barberId);
  const { bookings, loading: bookingsLoading, refetch } = useBarberBookings(barberId, today);
  const { updateStatus, updating } = useUpdateBookingStatus();

  const todayString = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const handleComplete = async (bookingId: string) => {
    await updateStatus(bookingId, 'completed');
    refetch();
  };

  const handleCancel = async (bookingId: string) => {
    await updateStatus(bookingId, 'cancelled');
    refetch();
  };

  const upcomingBookings = bookings
    .filter(b => b.status === 'confirmed')
    .slice(0, 5);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall">早安，{user?.name}</Text>
        <Text variant="bodyMedium" style={styles.dateText}>{todayString}</Text>
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>今日摘要</Text>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium">{stats.bookingCount}</Text>
            <Text variant="bodySmall">個預約</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium">${stats.estimatedRevenue.toLocaleString()}</Text>
            <Text variant="bodySmall">預估收入</Text>
          </Card.Content>
        </Card>
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>接下來的預約</Text>
      {upcomingBookings.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>今天沒有更多預約了</Text>
          </Card.Content>
        </Card>
      ) : (
        upcomingBookings.map((booking) => (
          <Card key={booking.id} style={styles.bookingCard}>
            <Card.Content>
              <View style={styles.bookingHeader}>
                <Text variant="titleMedium">{booking.start_time}</Text>
                <Text variant="bodyLarge">{booking.customer?.name}</Text>
              </View>
              <Text variant="bodySmall" style={styles.serviceText}>
                {booking.services?.map((s: any) => s.service?.name).join(', ')}
              </Text>
              <Text variant="bodyMedium">${booking.total_price}</Text>
              <Divider style={styles.divider} />
              <View style={styles.actionRow}>
                <Button
                  mode="contained"
                  onPress={() => handleComplete(booking.id)}
                  disabled={updating}
                  compact
                >
                  完成
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => handleCancel(booking.id)}
                  disabled={updating}
                  compact
                >
                  取消
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  dateText: {
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    padding: 16,
    paddingBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: 'center',
  },
  bookingCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceText: {
    color: '#666',
    marginVertical: 4,
  },
  divider: {
    marginVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyCard: {
    marginHorizontal: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
});
