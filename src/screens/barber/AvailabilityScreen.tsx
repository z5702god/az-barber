import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  StatusBar,
  Platform,
  TextInput,
} from 'react-native';
import { Text, Portal } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, DateData } from 'react-native-calendars';
import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useResponsive';
import { useWeeklyAvailability, useExceptionDates } from '../../hooks/useAvailability';
import { BarberTabParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<BarberTabParamList, 'Availability'>;

export const AvailabilityScreen: React.FC<Props> = () => {
  const { user } = useAuth();
  const r = useResponsive();
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

  const [exceptionModalVisible, setExceptionModalVisible] = useState(false);
  const [editingGroupIds, setEditingGroupIds] = useState<string[] | null>(null);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);
  const [exceptionDescription, setExceptionDescription] = useState('');

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

  // 將 Date 物件轉換為本地日期字串（避免 UTC 時區偏移）
  const dateToDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
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

  // 日曆日期點擊：第一次點擊設開始日，第二次設結束日
  const handleCalendarDayPress = (day: DateData) => {
    if (!selectedStart || selectedEnd) {
      // 沒有開始日 或 已完成區間選擇 → 重新開始
      setSelectedStart(day.dateString);
      setSelectedEnd(null);
    } else {
      // 已有開始日，設定結束日
      if (day.dateString < selectedStart) {
        // 點的日期比開始日早 → 重設為新的開始日
        setSelectedStart(day.dateString);
        setSelectedEnd(null);
      } else if (day.dateString === selectedStart) {
        // 點同一天 → 單天選擇（清除結束日）
        setSelectedEnd(null);
      } else {
        setSelectedEnd(day.dateString);
      }
    }
  };

  const openExceptionModal = (group?: { ids: string[]; startDate: string; endDate: string; description?: string }) => {
    if (group) {
      setEditingGroupIds(group.ids);
      setSelectedStart(group.startDate);
      setSelectedEnd(group.startDate === group.endDate ? null : group.endDate);
      setExceptionDescription(group.description || '');
    } else {
      setEditingGroupIds(null);
      setSelectedStart(null);
      setSelectedEnd(null);
      setExceptionDescription('');
    }
    setExceptionModalVisible(true);
  };

  const handleSaveException = async () => {
    if (!selectedStart) {
      Alert.alert('請選擇日期', '請在日曆上點選休假日期');
      return;
    }
    // 編輯模式：先刪除舊記錄
    if (editingGroupIds) {
      for (const id of editingGroupIds) {
        await removeException(id);
      }
    }
    const endStr = selectedEnd || selectedStart;
    await addException(selectedStart, endStr, exceptionDescription.trim() || undefined);
    setExceptionModalVisible(false);
  };

  // 產生日曆標記：選取的區間 + 已有的休假
  const calendarMarkedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    // 標記已有的休假（排除正在編輯的群組）
    for (const exc of exceptions) {
      if (editingGroupIds?.includes(exc.id)) continue;
      marks[exc.specific_date!] = {
        marked: true,
        dotColor: colors.destructive,
      };
    }

    // 標記選取的區間
    if (selectedStart) {
      const end = selectedEnd || selectedStart;
      const current = new Date(selectedStart + 'T12:00:00'); // 用正午避免時區偏移
      const endDate = new Date(end + 'T12:00:00');
      while (current <= endDate) {
        const dateStr = dateToDateString(current);
        const isStart = dateStr === selectedStart;
        const isEnd = dateStr === end;
        const isSingle = selectedStart === end;
        marks[dateStr] = {
          ...marks[dateStr],
          color: isSingle ? colors.primary : (isStart || isEnd ? colors.primary : 'rgba(201, 169, 110, 0.3)'),
          textColor: (isStart || isEnd || isSingle) ? colors.primaryForeground : colors.foreground,
          startingDay: isStart,
          endingDay: isEnd,
        };
        current.setDate(current.getDate() + 1);
      }
    }

    return marks;
  }, [selectedStart, selectedEnd, exceptions, editingGroupIds]);

  const todayString = dateToDateString(new Date());

  // 將連續日期且相同說明的休假合併為群組顯示
  const groupedExceptions = (() => {
    if (exceptions.length === 0) return [];
    type ExceptionGroup = { ids: string[]; startDate: string; endDate: string; description?: string };
    const groups: ExceptionGroup[] = [];
    let current: ExceptionGroup = {
      ids: [exceptions[0].id],
      startDate: exceptions[0].specific_date!,
      endDate: exceptions[0].specific_date!,
      description: exceptions[0].description,
    };

    for (let i = 1; i < exceptions.length; i++) {
      const exc = exceptions[i];
      const prevEnd = new Date(current.endDate);
      prevEnd.setDate(prevEnd.getDate() + 1);
      const nextDate = exc.specific_date!;
      const isContinuous = dateToDateString(prevEnd) === nextDate;
      const sameDescription = (current.description || '') === (exc.description || '');

      if (isContinuous && sameDescription) {
        current.ids.push(exc.id);
        current.endDate = nextDate;
      } else {
        groups.push(current);
        current = {
          ids: [exc.id],
          startDate: nextDate,
          endDate: nextDate,
          description: exc.description,
        };
      }
    }
    groups.push(current);
    return groups;
  })();

  const handleRemoveGroup = async (ids: string[]) => {
    for (const id of ids) {
      await removeException(id);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Weekly Schedule */}
      <Text style={[styles.sectionTitle, { fontSize: r.fs.xs, padding: r.sp.lg, paddingBottom: r.sp.md }]}>每週排班</Text>
      <View style={[styles.card, { marginHorizontal: r.sp.lg, marginBottom: r.sp.md }]}>
        {DAY_NAMES.map((name, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayItem,
              { padding: r.sp.md },
              index < DAY_NAMES.length - 1 && styles.dayItemBorder
            ]}
            onPress={() => handleEditDay(index)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayName, { fontSize: r.fs.md }]}>{name}</Text>
            <View style={[styles.daySchedule, { gap: r.sp.sm }]}>
              <Text style={[
                styles.scheduleText,
                { fontSize: r.fs.sm },
                getDaySchedule(index) === '公休' && styles.dayOffText
              ]}>
                {getDaySchedule(index)}
              </Text>
              <Ionicons name="chevron-forward" size={r.isTablet ? 22 : 18} color={colors.border} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Exceptions */}
      <View style={[styles.sectionHeader, { paddingRight: r.sp.lg }]}>
        <Text style={[styles.sectionTitle, { fontSize: r.fs.xs, padding: r.sp.lg, paddingBottom: r.sp.md }]}>特殊休假</Text>
        <TouchableOpacity
          style={[styles.addButton, { paddingVertical: r.sp.xs, paddingHorizontal: r.sp.md, gap: r.sp.xs }]}
          onPress={() => openExceptionModal()}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={r.isTablet ? 22 : 18} color={colors.primaryForeground} />
          <Text style={[styles.addButtonText, { fontSize: r.fs.sm }]}>新增</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.card, styles.lastCard, { marginHorizontal: r.sp.lg }]}>
        {groupedExceptions.length === 0 ? (
          <View style={[styles.emptyContainer, { padding: r.sp.xl, gap: r.sp.sm }]}>
            <Ionicons name="calendar-outline" size={r.isTablet ? 40 : 32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { fontSize: r.fs.sm }]}>目前無特殊休假</Text>
          </View>
        ) : (
          groupedExceptions.map((group, index) => (
            <TouchableOpacity
              key={group.ids[0]}
              style={[
                styles.exceptionItem,
                { padding: r.sp.md, gap: r.sp.md },
                index < groupedExceptions.length - 1 && styles.exceptionItemBorder
              ]}
              onPress={() => openExceptionModal(group)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar" size={r.isTablet ? 24 : 20} color={colors.primary} />
              <View style={styles.exceptionInfo}>
                <Text style={[styles.exceptionDate, { fontSize: r.fs.md }]}>
                  {group.startDate === group.endDate
                    ? group.startDate
                    : `${group.startDate} ~ ${group.endDate}`}
                </Text>
                {group.description ? (
                  <Text style={[styles.exceptionDescription, { fontSize: r.fs.sm }]}>{group.description}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveGroup(group.ids)}
                style={[styles.deleteButton, { padding: r.sp.xs }]}
              >
                <Ionicons name="trash-outline" size={r.isTablet ? 22 : 18} color={colors.destructive} />
              </TouchableOpacity>
            </TouchableOpacity>
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
        <View style={[styles.modalOverlay, { padding: r.sp.lg }]}>
          <View style={[styles.modal, { padding: r.sp.lg, ...(r.isTablet && { maxWidth: r.modalMaxWidth, alignSelf: 'center' as const, width: '100%' }) }]}>
            <Text style={[styles.modalTitle, { fontSize: r.fs.lg, marginBottom: r.sp.lg }]}>
              編輯{editingDay !== null ? DAY_NAMES[editingDay] : ''}排班
            </Text>

            <View style={[styles.inputGroup, { marginBottom: r.sp.md }]}>
              <Text style={[styles.inputLabel, { fontSize: r.fs.sm, marginBottom: r.sp.xs }]}>開始時間</Text>
              <TouchableOpacity
                style={[styles.timePickerButton, { gap: r.sp.md, padding: r.sp.md }]}
                onPress={() => openTimePicker('start')}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={r.isTablet ? 24 : 20} color={colors.primary} />
                <Text style={[styles.timePickerText, { fontSize: r.fs.lg }]}>{startTime}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, { marginBottom: r.sp.md }]}>
              <Text style={[styles.inputLabel, { fontSize: r.fs.sm, marginBottom: r.sp.xs }]}>結束時間</Text>
              <TouchableOpacity
                style={[styles.timePickerButton, { gap: r.sp.md, padding: r.sp.md }]}
                onPress={() => openTimePicker('end')}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={r.isTablet ? 24 : 20} color={colors.primary} />
                <Text style={[styles.timePickerText, { fontSize: r.fs.lg }]}>{endTime}</Text>
              </TouchableOpacity>
            </View>

            {/* iOS: 顯示內嵌的時間選擇器 */}
            {showTimePicker && Platform.OS === 'ios' && (
              <View style={[styles.pickerContainer, { marginBottom: r.sp.md }]}>
                <DateTimePicker
                  value={timeStringToDate(editingTimeType === 'start' ? startTime : endTime)}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  minuteInterval={30}
                  themeVariant="dark"
                />
                <TouchableOpacity
                  style={[styles.pickerDoneButton, { padding: r.sp.sm }]}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={[styles.pickerDoneText, { fontSize: r.fs.md }]}>完成</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.modalActions, { marginTop: r.sp.md }]}>
              <TouchableOpacity
                style={[styles.dayOffButton, { paddingVertical: r.sp.sm, marginBottom: r.sp.md }]}
                onPress={handleSetDayOff}
              >
                <Text style={[styles.dayOffButtonText, { fontSize: r.fs.sm }]}>設為公休</Text>
              </TouchableOpacity>
              <View style={[styles.modalButtonRow, { gap: r.sp.sm }]}>
                <TouchableOpacity
                  style={[styles.cancelButton, { paddingVertical: r.sp.sm }]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={[styles.cancelButtonText, { fontSize: r.fs.sm }]}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { paddingVertical: r.sp.sm }]}
                  onPress={handleSaveDay}
                >
                  <Text style={[styles.saveButtonText, { fontSize: r.fs.sm }]}>儲存</Text>
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

      {/* Add/Edit Exception Modal */}
      <Modal
        visible={exceptionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExceptionModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { padding: r.sp.md }]}>
          <View style={[styles.modal, { padding: r.sp.lg, ...(r.isTablet && { maxWidth: r.modalMaxWidth, alignSelf: 'center' as const, width: '100%' }) }]}>
            <Text style={[styles.modalTitle, { fontSize: r.fs.lg, marginBottom: r.sp.sm }]}>
              {editingGroupIds ? '編輯休假' : '新增休假'}
            </Text>

            {/* 選取提示 */}
            <Text style={[styles.calendarHint, { fontSize: r.fs.sm, marginBottom: r.sp.sm }]}>
              {!selectedStart
                ? '點選開始日期'
                : !selectedEnd
                  ? `${selectedStart}（點選結束日期，或直接新增單天）`
                  : `${selectedStart} ~ ${selectedEnd}`}
            </Text>

            {/* 日曆 */}
            <Calendar
              markingType="period"
              markedDates={calendarMarkedDates}
              onDayPress={handleCalendarDayPress}
              minDate={todayString}
              theme={{
                calendarBackground: colors.background,
                dayTextColor: colors.foreground,
                textDisabledColor: '#3A3A3A',
                monthTextColor: colors.foreground,
                textMonthFontFamily: typography.fontFamily.displayMedium,
                textMonthFontSize: r.fs.md,
                textDayFontFamily: typography.fontFamily.body,
                textDayFontSize: r.fs.sm,
                textDayHeaderFontFamily: typography.fontFamily.bodyMedium,
                textDayHeaderFontSize: r.fs.xs,
                todayTextColor: colors.primary,
                arrowColor: colors.primary,
              }}
              style={styles.calendar}
            />

            <View style={[styles.inputGroup, { marginTop: r.sp.md, marginBottom: r.sp.md }]}>
              <Text style={[styles.inputLabel, { fontSize: r.fs.sm, marginBottom: r.sp.xs }]}>說明（選填）</Text>
              <TextInput
                style={[styles.descriptionInput, { fontSize: r.fs.md, padding: r.sp.md }]}
                value={exceptionDescription}
                onChangeText={setExceptionDescription}
                placeholder="例：出國旅遊、進修課程"
                placeholderTextColor={colors.mutedForeground}
                multiline
              />
            </View>

            <View style={[styles.modalButtonRow, { gap: r.sp.sm }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { paddingVertical: r.sp.sm }]}
                onPress={() => setExceptionModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { fontSize: r.fs.sm }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { paddingVertical: r.sp.sm, opacity: selectedStart ? 1 : 0.5 }]}
                onPress={handleSaveException}
                disabled={!selectedStart}
              >
                <Text style={[styles.saveButtonText, { fontSize: r.fs.sm }]}>
                  {editingGroupIds ? '儲存' : '新增'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  exceptionInfo: {
    flex: 1,
  },
  exceptionDate: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
  },
  exceptionDescription: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  descriptionInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.foreground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.md,
    padding: spacing.md,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  calendar: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarHint: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
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
