import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { Booking, Barber } from '../../types';
import { BookingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<BookingStackParamList, 'BookingSuccess'>;

export const BookingSuccessScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [barber, setBarber] = useState<Barber | null>(null);

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
      console.error('Error fetching booking:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${dateStr}（${weekDays[d.getDay()]}）`;
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
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.checkmark}>✓</Text>
        <Text variant="headlineMedium" style={styles.title}>
          預約成功！
        </Text>

        {booking && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyLarge" style={styles.info}>
                {formatDate(booking.booking_date)} {booking.start_time}
              </Text>
              <Text variant="bodyLarge" style={styles.info}>
                理髮師：{barber?.display_name || '未知'}
              </Text>
            </Card.Content>
          </Card>
        )}

        <View style={styles.buttons}>
          <Button
            mode="contained"
            onPress={handleViewBookings}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            查看我的預約
          </Button>
          <Button
            mode="outlined"
            onPress={handleGoHome}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            返回首頁
          </Button>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  checkmark: {
    fontSize: 64,
    marginBottom: 16,
    color: '#4CAF50',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 24,
  },
  card: {
    width: '100%',
    marginBottom: 32,
  },
  info: {
    textAlign: 'center',
    marginVertical: 4,
  },
  buttons: {
    width: '100%',
  },
  button: {
    marginVertical: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
