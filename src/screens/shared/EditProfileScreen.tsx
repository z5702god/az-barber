import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import {
  Text,
  Switch,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useProfileEdit, ProfileFormErrors } from '../../hooks/useProfileEdit';
import { Gender } from '../../types';
import { colors, spacing, typography } from '../../theme';

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: '其他' },
  { value: 'prefer_not_to_say', label: '不願透露' },
];

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { formData, setFormData, loading, error, validate, save } = useProfileEdit();
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const success = await save();
    if (success) {
      navigation.goBack();
    }
  };

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({
        ...formData,
        birthday: selectedDate.toISOString().split('T')[0],
      });
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '未設定';
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={colors.destructive} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>姓名 *</Text>
          <TextInput
            testID="name-input"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            style={[styles.input, errors.name && styles.inputError]}
            placeholderTextColor={colors.mutedForeground}
            placeholder="請輸入姓名"
          />
          {errors.name && <Text style={styles.errorHelper}>{errors.name}</Text>}
        </View>

        {/* Phone Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>電話號碼</Text>
          <TextInput
            testID="phone-input"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            style={[styles.input, errors.phone && styles.inputError]}
            keyboardType="phone-pad"
            placeholderTextColor={colors.mutedForeground}
            placeholder="請輸入電話號碼"
          />
          {errors.phone && <Text style={styles.errorHelper}>{errors.phone}</Text>}
        </View>

        {/* Birthday Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>生日</Text>
          <TouchableOpacity
            style={[styles.input, styles.dateInput]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[
              styles.dateText,
              !formData.birthday && styles.datePlaceholder
            ]}>
              {formatDisplayDate(formData.birthday)}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          {errors.birthday && <Text style={styles.errorHelper}>{errors.birthday}</Text>}
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={formData.birthday ? new Date(formData.birthday) : new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Gender Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>性別</Text>
          <View style={styles.genderGrid}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.genderOption,
                  formData.gender === option.value && styles.genderOptionSelected,
                ]}
                onPress={() => setFormData({ ...formData, gender: option.value })}
              >
                <Text style={[
                  styles.genderText,
                  formData.gender === option.value && styles.genderTextSelected,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Notification Settings */}
        <Text style={styles.sectionTitle}>通知設定</Text>

        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Ionicons name="notifications-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.switchText}>預約提醒</Text>
          </View>
          <Switch
            value={formData.preferences.booking_reminder}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                preferences: { ...formData.preferences, booking_reminder: value },
              })
            }
            color={colors.primary}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Ionicons name="pricetag-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.switchText}>促銷通知</Text>
          </View>
          <Switch
            value={formData.preferences.promo_notifications}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                preferences: { ...formData.preferences, promo_notifications: value },
              })
            }
            color={colors.primary}
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          testID="save-button"
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={styles.saveButtonText}>儲存變更</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 92, 51, 0.1)',
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: 0,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.destructive,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0, // 直角風格
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
  },
  inputError: {
    borderColor: colors.destructive,
  },
  errorHelper: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.body,
    color: colors.destructive,
    marginTop: spacing.xs,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
  },
  datePlaceholder: {
    color: colors.mutedForeground,
  },
  genderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  genderOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0, // 直角風格
    backgroundColor: colors.card,
  },
  genderOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(201, 169, 110, 0.15)',
  },
  genderText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
  },
  genderTextSelected: {
    color: colors.primary,
    fontFamily: typography.fontFamily.bodyMedium,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.primaryMedium,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 0, // 直角風格
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.secondarySemiBold,
    color: colors.primaryForeground,
  },
});
