import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, List, Portal, Modal, TextInput } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useWeeklyAvailability, useExceptionDates } from '../../hooks/useAvailability';
import { BarberTabParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<BarberTabParamList, 'Availability'>;

export const AvailabilityScreen: React.FC<Props> = () => {
  const { user } = useAuth();
  const barberId = user?.id || '';

  const { availability, loading: weeklyLoading, updateDayAvailability, DAY_NAMES } = useWeeklyAvailability(barberId);
  const { exceptions, loading: exceptionsLoading, addException, removeException } = useExceptionDates(barberId);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  const [addExceptionModal, setAddExceptionModal] = useState(false);
  const [exceptionStartDate, setExceptionStartDate] = useState('');
  const [exceptionEndDate, setExceptionEndDate] = useState('');

  const getDaySchedule = (dayOfWeek: number) => {
    const schedule = availability.find(a => a.day_of_week === dayOfWeek);
    if (schedule) {
      return `${schedule.start_time} - ${schedule.end_time}`;
    }
    return '休息';
  };

  const handleEditDay = (dayOfWeek: number) => {
    const schedule = availability.find(a => a.day_of_week === dayOfWeek);
    if (schedule) {
      setStartTime(schedule.start_time);
      setEndTime(schedule.end_time);
    } else {
      setStartTime('09:00');
      setEndTime('18:00');
    }
    setEditingDay(dayOfWeek);
    setEditModalVisible(true);
  };

  const handleSaveDay = async () => {
    if (editingDay === null) return;
    await updateDayAvailability(editingDay, startTime, endTime);
    setEditModalVisible(false);
  };

  const handleSetDayOff = async () => {
    if (editingDay === null) return;
    await updateDayAvailability(editingDay, null, null);
    setEditModalVisible(false);
  };

  const handleAddException = async () => {
    if (!exceptionStartDate) {
      Alert.alert('錯誤', '請輸入開始日期');
      return;
    }
    await addException(exceptionStartDate, exceptionEndDate || exceptionStartDate);
    setAddExceptionModal(false);
    setExceptionStartDate('');
    setExceptionEndDate('');
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="titleMedium" style={styles.sectionTitle}>每週固定時段</Text>
      <Card style={styles.card}>
        {DAY_NAMES.map((name, index) => (
          <List.Item
            key={index}
            title={name}
            description={getDaySchedule(index)}
            right={() => (
              <Button mode="text" onPress={() => handleEditDay(index)}>
                編輯
              </Button>
            )}
          />
        ))}
      </Card>

      <View style={styles.sectionHeader}>
        <Text variant="titleMedium">特殊休假</Text>
        <Button mode="contained" onPress={() => setAddExceptionModal(true)} compact>
          新增
        </Button>
      </View>
      <Card style={styles.card}>
        {exceptions.length === 0 ? (
          <Card.Content>
            <Text style={styles.emptyText}>沒有設定特殊休假</Text>
          </Card.Content>
        ) : (
          exceptions.map((exc) => (
            <List.Item
              key={exc.id}
              title={exc.specific_date}
              right={() => (
                <Button mode="text" onPress={() => removeException(exc.id)}>
                  刪除
                </Button>
              )}
            />
          ))
        )}
      </Card>

      {/* Edit Day Modal */}
      <Portal>
        <Modal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            編輯 {editingDay !== null ? DAY_NAMES[editingDay] : ''} 時段
          </Text>
          <TextInput
            label="開始時間"
            value={startTime}
            onChangeText={setStartTime}
            placeholder="09:00"
            style={styles.input}
          />
          <TextInput
            label="結束時間"
            value={endTime}
            onChangeText={setEndTime}
            placeholder="18:00"
            style={styles.input}
          />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={handleSetDayOff}>
              設為休息
            </Button>
            <Button mode="contained" onPress={handleSaveDay}>
              儲存
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Add Exception Modal */}
      <Portal>
        <Modal
          visible={addExceptionModal}
          onDismiss={() => setAddExceptionModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>新增休假</Text>
          <TextInput
            label="開始日期 (YYYY-MM-DD)"
            value={exceptionStartDate}
            onChangeText={setExceptionStartDate}
            placeholder="2026-02-10"
            style={styles.input}
          />
          <TextInput
            label="結束日期 (可選，留空為單日)"
            value={exceptionEndDate}
            onChangeText={setExceptionEndDate}
            placeholder="2026-02-12"
            style={styles.input}
          />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setAddExceptionModal(false)}>
              取消
            </Button>
            <Button mode="contained" onPress={handleAddException}>
              新增
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    padding: 16,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});
