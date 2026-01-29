import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Button, Avatar, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { Barber } from '../../types';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('*, user:users(*)')
        .eq('status', 'active');

      if (error) throw error;
      setBarbers(data || []);
    } catch (error) {
      console.error('Error fetching barbers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBarbers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBarbers();
  };

  const handleBooking = (barberId: string) => {
    // @ts-ignore - navigating to parent stack
    navigation.getParent()?.navigate('BookingFlow', {
      screen: 'SelectServices',
      params: { barberId }
    });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 店家資訊 */}
      <Card style={styles.shopCard}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.shopName}>
            AZ Barber Shop
          </Text>
          <Text variant="bodyMedium" style={styles.shopInfo}>
            營業時間：週二至週日 10:00 - 20:00
          </Text>
          <Text variant="bodyMedium" style={styles.shopInfo}>
            地址：台北市信義區...
          </Text>
          <Text variant="bodyMedium" style={styles.shopInfo}>
            電話：02-1234-5678
          </Text>
        </Card.Content>
      </Card>

      {/* 理髮師列表 */}
      <Text variant="titleLarge" style={styles.sectionTitle}>
        選擇理髮師
      </Text>

      {barbers.length === 0 && !loading ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.emptyText}>
              目前沒有可預約的理髮師
            </Text>
          </Card.Content>
        </Card>
      ) : (
        barbers.map((barber) => (
          <Card key={barber.id} style={styles.barberCard}>
            <Card.Content style={styles.barberContent}>
              <Avatar.Image
                size={64}
                source={
                  barber.photo_url
                    ? { uri: barber.photo_url }
                    : require('../../../assets/icon.png')
                }
              />
              <View style={styles.barberInfo}>
                <Text variant="titleMedium">{barber.display_name}</Text>
                <Chip icon="check-circle" style={styles.statusChip}>
                  可預約
                </Chip>
              </View>
              <Button
                mode="contained"
                onPress={() => handleBooking(barber.id)}
                style={styles.bookButton}
              >
                預約
              </Button>
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
  shopCard: {
    margin: 16,
    marginBottom: 8,
  },
  shopName: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  shopInfo: {
    color: '#666',
    marginVertical: 2,
  },
  sectionTitle: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    fontWeight: 'bold',
  },
  barberCard: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  barberContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barberInfo: {
    flex: 1,
    marginLeft: 16,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  bookButton: {
    marginLeft: 8,
  },
  emptyCard: {
    margin: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
});
