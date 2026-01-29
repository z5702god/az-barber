import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  HelperText,
  useTheme,
  SegmentedButtons,
  Switch,
  Divider,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useProfileEdit, ProfileFormErrors } from '../../hooks/useProfileEdit';
import { Gender } from '../../types';

const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'other', label: '其他' },
  { value: 'prefer_not_to_say', label: '不透露' },
];

export const EditProfileScreen: React.FC = () => {
  const theme = useTheme();
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
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {error && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
        )}

        {/* 姓名 */}
        <TextInput
          testID="name-input"
          label="姓名 *"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          mode="outlined"
          error={!!errors.name}
          style={styles.input}
        />
        {errors.name && (
          <HelperText type="error" visible={!!errors.name}>
            {errors.name}
          </HelperText>
        )}

        {/* 電話 */}
        <TextInput
          testID="phone-input"
          label="手機號碼"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          mode="outlined"
          keyboardType="phone-pad"
          error={!!errors.phone}
          style={styles.input}
          placeholder="09xxxxxxxx"
        />
        {errors.phone && (
          <HelperText type="error" visible={!!errors.phone}>
            {errors.phone}
          </HelperText>
        )}

        {/* 生日 */}
        <TextInput
          testID="birthday-input"
          label="生日"
          value={formatDisplayDate(formData.birthday)}
          mode="outlined"
          style={styles.input}
          right={<TextInput.Icon icon="calendar" onPress={() => setShowDatePicker(true)} />}
          onPressIn={() => setShowDatePicker(true)}
          editable={false}
          error={!!errors.birthday}
        />
        {errors.birthday && (
          <HelperText type="error" visible={!!errors.birthday}>
            {errors.birthday}
          </HelperText>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={formData.birthday ? new Date(formData.birthday) : new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* 性別 */}
        <Text style={styles.label}>性別</Text>
        <SegmentedButtons
          value={formData.gender}
          onValueChange={(value) =>
            setFormData({ ...formData, gender: value as Gender })
          }
          buttons={GENDER_OPTIONS}
          style={styles.segmented}
        />

        <Divider style={styles.divider} />

        {/* 偏好設定 */}
        <Text style={styles.sectionTitle}>通知設定</Text>

        <View style={styles.switchRow}>
          <Text>預約提醒通知</Text>
          <Switch
            value={formData.preferences.booking_reminder}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                preferences: { ...formData.preferences, booking_reminder: value },
              })
            }
          />
        </View>

        <View style={styles.switchRow}>
          <Text>促銷資訊通知</Text>
          <Switch
            value={formData.preferences.promo_notifications}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                preferences: { ...formData.preferences, promo_notifications: value },
              })
            }
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          testID="save-button"
          mode="contained"
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          style={styles.saveButton}
        >
          儲存
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  input: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 8,
    color: '#666',
  },
  segmented: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    paddingVertical: 4,
  },
  errorText: {
    marginBottom: 16,
    textAlign: 'center',
  },
});
