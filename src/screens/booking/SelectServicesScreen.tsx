import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Checkbox,
  Button,
  Card,
  Divider,
  ActivityIndicator
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../services/supabase';
import { Service } from '../../types';
import { BookingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<BookingStackParamList, 'SelectServices'>;

export const SelectServicesScreen: React.FC<Props> = ({ navigation, route }) => {
  const { barberId } = route.params;
  const [services, setServices] = useState<Service[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectedServices = services.filter(s => selectedIds.has(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  const handleNext = () => {
    navigation.navigate('SelectDateTime', {
      barberId,
      selectedServices,
      totalDuration,
      totalPrice,
    });
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
        {services.map((service) => (
          <Card
            key={service.id}
            style={styles.serviceCard}
            onPress={() => toggleService(service.id)}
          >
            <Card.Content style={styles.serviceContent}>
              <Checkbox
                status={selectedIds.has(service.id) ? 'checked' : 'unchecked'}
                onPress={() => toggleService(service.id)}
              />
              <View style={styles.serviceInfo}>
                <Text variant="titleMedium">{service.name}</Text>
                <Text variant="bodySmall" style={styles.serviceDetail}>
                  {service.duration_minutes} 分鐘
                </Text>
              </View>
              <Text variant="titleMedium" style={styles.price}>
                ${service.price}
              </Text>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <View style={styles.summaryBar}>
        <Divider />
        <View style={styles.summaryContent}>
          <View>
            <Text variant="bodyMedium">
              已選 {selectedIds.size} 項服務
            </Text>
            <Text variant="bodySmall" style={styles.summaryDetail}>
              總時間：{totalDuration} 分鐘 ｜ 總價格：${totalPrice.toLocaleString()}
            </Text>
          </View>
          <Button
            mode="contained"
            onPress={handleNext}
            disabled={selectedIds.size === 0}
          >
            下一步
          </Button>
        </View>
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
  serviceCard: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  serviceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 8,
  },
  serviceDetail: {
    color: '#666',
    marginTop: 2,
  },
  price: {
    fontWeight: 'bold',
  },
  summaryBar: {
    backgroundColor: '#fff',
    paddingBottom: 24,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  summaryDetail: {
    color: '#666',
    marginTop: 4,
  },
});
