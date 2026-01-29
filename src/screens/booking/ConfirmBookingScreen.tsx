import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  Button,
  Card,
  TextInput,
  Divider,
  ActivityIndicator
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../services/supabase';
import { Barber } from '../../types';
import { BookingStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';

type Props = NativeStackScreenProps<BookingStackParamList, 'ConfirmBooking'>;

export const ConfirmBookingScreen: React.FC<Props> = ({ navigation, route }) => {
  const {
    barberId,
    selectedServices,
    date,
    startTime,
    endTime,
    totalDuration,
    totalPrice
  } = route.params;

  const { session } = useAuth();
  const [barber, setBarber] = useState<Barber | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBarber();
  }, []);

  const fetchBarber = async () => {
    try {
      const { data } = await supabase
        .from('barbers')
        .select('*')
        .eq('id', barberId)
        .single();
      setBarber(data);
    } catch (error) {
      console.error('Error fetching barber:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!session?.user?.id) {
      Alert.alert('錯誤', '請先登入');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_id: session.user.id,
          barber_id: barberId,
          booking_date: date,
          start_time: startTime,
          end_time: endTime,
          total_duration: totalDuration,
          total_price: totalPrice,
          notes: notes || null,
          status: 'confirmed',
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 2. Create booking_services relations
      const bookingServices = selectedServices.map(service => ({
        booking_id: booking.id,
        service_id: service.id,
      }));

      const { error: servicesError } = await supabase
        .from('booking_services')
        .insert(bookingServices);

      if (servicesError) throw servicesError;

      // Navigate to success screen
      navigation.replace('BookingSuccess', { bookingId: booking.id });
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert('預約失敗', '請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${dateStr}（${weekDays[d.getDay()]}）`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.section}>
              <Text variant="labelLarge" style={styles.label}>理髮師</Text>
              <Text variant="bodyLarge">{barber?.display_name || '未知'}</Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.section}>
              <Text variant="labelLarge" style={styles.label}>預約時間</Text>
              <Text variant="bodyLarge">
                {formatDate(date)} {startTime} - {endTime}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.section}>
              <Text variant="labelLarge" style={styles.label}>服務項目</Text>
              {selectedServices.map(service => (
                <View key={service.id} style={styles.serviceRow}>
                  <Text variant="bodyMedium">• {service.name}</Text>
                  <Text variant="bodyMedium">
                    {service.duration_minutes}分 ${service.price}
                  </Text>
                </View>
              ))}
            </View>

            <Divider style={styles.divider} />

            <View style={styles.totalSection}>
              <Text variant="titleMedium">總時間：{totalDuration} 分鐘</Text>
              <Text variant="titleLarge" style={styles.totalPrice}>
                總價格：${totalPrice.toLocaleString()}
              </Text>
              <Text variant="bodySmall" style={styles.paymentNote}>
                （現場付款）
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.label}>備註（選填）</Text>
            <TextInput
              mode="outlined"
              placeholder="有任何特殊需求可以在這裡說明"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={styles.notesInput}
            />
          </Card.Content>
        </Card>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={submitting}
          disabled={submitting}
          contentStyle={styles.confirmButtonContent}
        >
          確認預約
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  section: {
    marginVertical: 8,
  },
  label: {
    color: '#666',
    marginBottom: 4,
  },
  divider: {
    marginVertical: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  totalSection: {
    marginTop: 8,
    alignItems: 'center',
  },
  totalPrice: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  paymentNote: {
    color: '#666',
    marginTop: 4,
  },
  notesInput: {
    marginTop: 8,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#fff',
  },
  confirmButtonContent: {
    paddingVertical: 8,
  },
});
