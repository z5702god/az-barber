import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Button, Chip, Divider } from 'react-native-paper';
import { format, parseISO, isAfter } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Booking } from '../../types';

export const MyBookingsScreen: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
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
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

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
      console.error('Error cancelling booking:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#4CAF50';
      case 'cancelled':
        return '#f44336';
      case 'completed':
        return '#9E9E9E';
      default:
        return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '已確認';
      case 'cancelled':
        return '已取消';
      case 'completed':
        return '已完成';
      default:
        return status;
    }
  };

  const upcomingBookings = bookings.filter(
    (b) => b.status === 'confirmed' && isAfter(parseISO(b.booking_date), new Date())
  );

  const pastBookings = bookings.filter(
    (b) => b.status !== 'confirmed' || !isAfter(parseISO(b.booking_date), new Date())
  );

  const renderBookingCard = (booking: Booking, showCancelButton: boolean) => (
    <Card key={booking.id} style={styles.bookingCard}>
      <Card.Content>
        <View style={styles.bookingHeader}>
          <Text variant="titleMedium">
            {format(parseISO(booking.booking_date), 'M月d日 (EEEE)', { locale: zhTW })}
          </Text>
          <Chip
            style={[styles.statusChip, { backgroundColor: getStatusColor(booking.status) }]}
            textStyle={styles.statusText}
          >
            {getStatusText(booking.status)}
          </Chip>
        </View>

        <Text variant="bodyLarge" style={styles.timeText}>
          {booking.start_time} - {booking.end_time}
        </Text>

        <Divider style={styles.divider} />

        <Text variant="bodyMedium" style={styles.barberText}>
          理髮師：{booking.barber?.display_name || '未指定'}
        </Text>

        <Text variant="bodyMedium" style={styles.priceText}>
          總金額：NT$ {booking.total_price}
        </Text>

        {showCancelButton && booking.status === 'confirmed' && (
          <Button
            mode="outlined"
            onPress={() => handleCancel(booking.id)}
            style={styles.cancelButton}
            textColor="#f44336"
          >
            取消預約
          </Button>
        )}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>載入中...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text variant="titleLarge" style={styles.sectionTitle}>
        即將到來
      </Text>

      {upcomingBookings.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>沒有即將到來的預約</Text>
          </Card.Content>
        </Card>
      ) : (
        upcomingBookings.map((booking) => renderBookingCard(booking, true))
      )}

      <Text variant="titleLarge" style={styles.sectionTitle}>
        歷史記錄
      </Text>

      {pastBookings.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>沒有歷史預約記錄</Text>
          </Card.Content>
        </Card>
      ) : (
        pastBookings.map((booking) => renderBookingCard(booking, false))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
    fontWeight: 'bold',
  },
  bookingCard: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusChip: {
    height: 28,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
  },
  timeText: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  barberText: {
    marginBottom: 4,
  },
  priceText: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  cancelButton: {
    marginTop: 16,
    borderColor: '#f44336',
  },
  emptyCard: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
});
