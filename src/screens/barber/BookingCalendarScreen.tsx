import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Chip } from 'react-native-paper';
import { Calendar, DateData } from 'react-native-calendars';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useBarberBookings, useUpdateBookingStatus } from '../../hooks/useBarberData';
import { BarberTabParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<BarberTabParamList, 'BookingCalendar'>;

export const BookingCalendarScreen: React.FC<Props> = () => {
  const { user } = useAuth();
  const barberId = user?.id || '';
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { bookings, loading, refetch } = useBarberBookings(barberId, selectedDate);
  const { updateStatus, updating } = useUpdateBookingStatus();

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const handleComplete = async (bookingId: string) => {
    await updateStatus(bookingId, 'completed');
    refetch();
  };

  const handleCancel = async (bookingId: string) => {
    await updateStatus(bookingId, 'cancelled');
    refetch();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#9E9E9E';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return '已確認';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const formattedDate = new Date(selectedDate).toLocaleDateString('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={handleDayPress}
        markedDates={{
          [selectedDate]: { selected: true, selectedColor: '#2196F3' },
        }}
        theme={{
          todayTextColor: '#2196F3',
          selectedDayBackgroundColor: '#2196F3',
        }}
      />

      <View style={styles.dateHeader}>
        <Text variant="titleMedium">{formattedDate}</Text>
        <Text variant="bodySmall">{bookings.length} 個預約</Text>
      </View>

      <ScrollView style={styles.bookingList}>
        {bookings.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>這天沒有預約</Text>
            </Card.Content>
          </Card>
        ) : (
          bookings.map((booking) => (
            <Card key={booking.id} style={styles.bookingCard}>
              <Card.Content>
                <View style={styles.bookingHeader}>
                  <Chip
                    style={{ backgroundColor: getStatusColor(booking.status) }}
                    textStyle={{ color: '#fff', fontSize: 12 }}
                  >
                    {getStatusLabel(booking.status)}
                  </Chip>
                  <Text variant="titleMedium">
                    {booking.start_time} - {booking.end_time}
                  </Text>
                </View>
                <Text variant="bodyLarge" style={styles.customerName}>
                  {booking.customer?.name}
                </Text>
                <Text variant="bodySmall" style={styles.serviceText}>
                  {booking.services?.map((s: any) => s.service?.name).join(', ')}
                </Text>
                <Text variant="bodyMedium">${booking.total_price}</Text>

                {booking.status === 'confirmed' && (
                  <>
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
                  </>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  bookingList: {
    flex: 1,
    padding: 16,
  },
  bookingCard: {
    marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    marginVertical: 4,
  },
  serviceText: {
    color: '#666',
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  emptyCard: {},
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
});
