import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import { Text, Portal } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAuth } from '../../hooks/useAuth';
import { useWeeklyAvailability, useExceptionDates } from '../../hooks/useAvailability';
import { BarberTabParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<BarberTabParamList, 'Availability'>;

export const AvailabilityScreen: React.FC<Props> = () => {
  const { user } = useAuth();
  // 使用 barber_id（barbers 表的 ID），而非 user.id（users 表的 ID）
  const barberId = user?.barber_id || '';

  const { availability, loading: weeklyLoading, updateDayAvailability, DAY_NAMES } = useWeeklyAvailability(barberId);
  const { exceptions, loading: exceptionsLoading, addException, removeException } = useExceptionDates(barberId);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  // Time picker 狀態
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingTimeType, setEditingTimeType] = useState<'start' | 'end'>('start');

  const [addExceptionModal, setAddExceptionModal] = useState(false);
  const [exceptionDate, setExceptionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 將時間字串轉換為 Date 物件
  const timeStringToDate = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // 將 Date 物件轉換為時間字串
  const dateToTimeString = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // 將 Date 物件轉換為日期字串
  const dateToDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const getDaySchedule = (dayOfWeek: number) => {
    const schedule = availability.find(a => a.day_of_week === dayOfWeek);
    if (schedule) {
      return `${schedule.start_time?.slice(0, 5)} - ${schedule.end_time?.slice(0, 5)}`;
    }
    return '公休';
  };

  const handleEditDay = (dayOfWeek: number) => {
    const schedule = availability.find(a => a.day_of_week === dayOfWeek);
    if (schedule) {
      setStartTime(schedule.start_time?.slice(0, 5) || '09:00');
      setEndTime(schedule.end_time?.slice(0, 5) || '18:00');
    } else {
      setStartTime('09:00');
      setEndTime('18:00');
    }
    setEditingDay(dayOfWeek);
    setEditModalVisible(true);
  };

  const handleSaveDay = async () => {
    if (editingDay === null) return;
    if (startTime >= endTime) {
      Alert.alert('錯誤', '結束時間必須晚於開始時間');
      return;
    }
    await updateDayAvailability(editingDay, startTime, endTime);
    setEditModalVisible(false);
  };

  const handleSetDayOff = async () => {
    if (editingDay === null) return;
    await updateDayAvailability(editingDay, null, null);
    setEditModalVisible(false);
  };

  // 開啟時間選擇器
  const openTimePicker = (type: 'start' | 'end') => {
    setEditingTimeType(type);
    setShowTimePicker(true);
  };

  // 處理時間選擇
  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      const timeStr = dateToTimeString(selectedDate);
      if (editingTimeType === 'start') {
        setStartTime(timeStr);
      } else {
        setEndTime(timeStr);
      }
    }

    if (Platform.OS === 'ios' && selectedDate) {
      const timeStr = dateToTimeString(selectedDate);
      if (editingTimeType === 'start') {
        setStartTime(timeStr);
      } else {
        setEndTime(timeStr);
      }
    }
  };

  // 處理日期選擇
  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setExceptionDate(selectedDate);
    }
  };

  const handleAddException = async () => {
    const dateStr = dateToDateString(exceptionDate);
    await addException(dateStr, dateStr);
    setAddExceptionModal(false);
    setExceptionDate(new Date());
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Weekly Schedule */}
      <Text style={styles.sectionTitle}>每週排班</Text>
      <View style={styles.card}>
        {DAY_NAMES.map((name, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayItem,
              index < DAY_NAMES.length - 1 && styles.dayItemBorder
            ]}
            onPress={() => handleEditDay(index)}
            activeOpacity={0.7}
          >
            <Text style={styles.dayName}>{name}</Text>
            <View style={styles.daySchedule}>
              <Text style={[
                styles.scheduleText,
                getDaySchedule(index) === '公休' && styles.dayOffText
              ]}>
                {getDaySchedule(index)}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.border} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Exceptions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>特殊休假</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setAddExceptionModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color={colors.primaryForeground} />
          <Text style={styles.addButtonText}>新增</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.card, styles.lastCard]}>
        {exceptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={32} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>目前無特殊休假</Text>
          </View>
        ) : (
          exceptions.map((exc, index) => (
            <View
              key={exc.id}
              style={[
                styles.exceptionItem,
                index < exceptions.length - 1 && styles.exceptionItemBorder
              ]}
            >
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={styles.exceptionDate}>{exc.specific_date}</Text>
              <TouchableOpacity
                onPress={() => removeException(exc.id)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={18} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Edit Day Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              編輯{editingDay !== null ? DAY_NAMES[editingDay] : ''}排班
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>開始時間</Text>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => openTimePicker('start')}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={styles.timePickerText}>{startTime}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>結束時間</Text>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => openTimePicker('end')}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={styles.timePickerText}>{endTime}</Text>
              </TouchableOpacity>
            </View>

            {/* iOS: 顯示內嵌的時間選擇器 */}
            {showTimePicker && Platform.OS === 'ios' && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={timeStringToDate(editingTimeType === 'start' ? startTime : endTime)}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  minuteInterval={30}
                  themeVariant="dark"
                />
                <TouchableOpacity
                  style={styles.pickerDoneButton}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.pickerDoneText}>完成</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.dayOffButton}
                onPress={handleSetDayOff}
              >
                <Text style={styles.dayOffButtonText}>設為公休</Text>
              </TouchableOpacity>
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveDay}
                >
                  <Text style={styles.saveButtonText}>儲存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Android: 顯示對話框形式的時間選擇器 */}
        {showTimePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={timeStringToDate(editingTimeType === 'start' ? startTime : endTime)}
            mode="time"
            display="default"
            onChange={handleTimeChange}
            minuteInterval={30}
          />
        )}
      </Modal>

      {/* Add Exception Modal */}
      <Modal
        visible={addExceptionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setAddExceptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>新增休假</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>選擇日期</Text>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={styles.timePickerText}>{dateToDateString(exceptionDate)}</Text>
              </TouchableOpacity>
            </View>

            {/* iOS: 顯示內嵌的日期選擇器 */}
            {showDatePicker && Platform.OS === 'ios' && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={exceptionDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  themeVariant="dark"
                />
                <TouchableOpacity
                  style={styles.pickerDoneButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.pickerDoneText}>完成</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAddExceptionModal(false)}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddException}
              >
                <Text style={styles.saveButtonText}>新增</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Android: 顯示對話框形式的日期選擇器 */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={exceptionDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.primaryMedium,
    color: colors.primary,
    letterSpacing: 2,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: spacing.lg,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0,
  },
  lastCard: {
    marginBottom: spacing.xxl,
  },
  dayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  dayItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
  },
  daySchedule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scheduleText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
  },
  dayOffText: {
    color: colors.mutedForeground,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.secondaryMedium,
    color: colors.primaryForeground,
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
  exceptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  exceptionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exceptionDate: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.displayMedium,
    color: colors.foreground,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  timePickerText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.displayMedium,
    color: colors.foreground,
  },
  pickerContainer: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  pickerDoneButton: {
    alignItems: 'center',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pickerDoneText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.secondaryMedium,
    color: colors.primary,
  },
  modalActions: {
    marginTop: spacing.md,
  },
  dayOffButton: {
    borderWidth: 1,
    borderColor: colors.destructive,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dayOffButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.secondaryMedium,
    color: colors.destructive,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.secondaryMedium,
    color: colors.foreground,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.secondaryMedium,
    color: colors.primaryForeground,
  },
});
