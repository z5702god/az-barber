# 個人資料編輯 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 為使用者提供個人資料編輯功能（姓名、電話、生日、性別、偏好）

**Architecture:** 建立 EditProfileScreen 和 useProfileEdit hook，透過 ProfileStack 從 ProfileScreen 導航

**Tech Stack:** React Native, TypeScript, React Native Paper, Supabase, Jest

---

## Task 1: 更新類型定義

**Files:**
- Modify: `src/types/index.ts`
- Test: `src/types/__tests__/index.test.ts`

**Step 1: 建立測試檔案**

```typescript
// src/types/__tests__/index.test.ts
import { User, Gender, UserPreferences } from '../index';

describe('User types', () => {
  it('should accept valid Gender values', () => {
    const genders: Gender[] = ['male', 'female', 'other', 'prefer_not_to_say'];
    expect(genders).toHaveLength(4);
  });

  it('should have correct UserPreferences structure', () => {
    const prefs: UserPreferences = {
      booking_reminder: true,
      promo_notifications: false,
    };
    expect(prefs.booking_reminder).toBe(true);
    expect(prefs.promo_notifications).toBe(false);
  });

  it('should allow User with new optional fields', () => {
    const user: User = {
      id: '1',
      name: 'Test',
      role: 'customer',
      created_at: '2026-01-01',
      birthday: '1990-01-01',
      gender: 'male',
      preferences: { booking_reminder: true, promo_notifications: false },
    };
    expect(user.birthday).toBe('1990-01-01');
  });
});
```

**Step 2: 執行測試確認失敗**

Run: `npm test -- src/types/__tests__/index.test.ts`
Expected: FAIL - Gender, UserPreferences 未定義

**Step 3: 更新類型定義**

```typescript
// src/types/index.ts - 在檔案末尾新增

// 性別選項
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

// 使用者偏好設定
export interface UserPreferences {
  booking_reminder: boolean;
  promo_notifications: boolean;
}
```

**Step 4: 更新 User 介面**

```typescript
// src/types/index.ts - 修改 User 介面
export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: UserRole;
  avatar_url?: string;
  birthday?: string;           // 新增
  gender?: Gender;             // 新增
  preferences?: UserPreferences; // 新增
  created_at: string;
}
```

**Step 5: 執行測試確認通過**

Run: `npm test -- src/types/__tests__/index.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/types/
git commit -m "feat(types): add Gender, UserPreferences types and update User interface"
```

---

## Task 2: 更新導航類型

**Files:**
- Modify: `src/navigation/types.ts`

**Step 1: 新增 ProfileStackParamList**

```typescript
// src/navigation/types.ts - 新增

// 個人資料 Stack 導航參數
export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
};
```

**Step 2: Commit**

```bash
git add src/navigation/types.ts
git commit -m "feat(nav): add ProfileStackParamList for profile editing"
```

---

## Task 3: 建立 useProfileEdit hook

**Files:**
- Create: `src/hooks/useProfileEdit.ts`
- Test: `src/hooks/__tests__/useProfileEdit.test.ts`

**Step 1: 建立測試檔案**

```typescript
// src/hooks/__tests__/useProfileEdit.test.ts
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useProfileEdit } from '../useProfileEdit';

// Mock Supabase
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { id: '1', name: 'Updated' },
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}));

// Mock useAuth
jest.mock('../useAuth', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      name: 'Test User',
      phone: '0912345678',
      role: 'customer',
      created_at: '2026-01-01',
    },
    refreshUser: jest.fn(),
  }),
}));

describe('useProfileEdit', () => {
  it('should initialize with user data', () => {
    const { result } = renderHook(() => useProfileEdit());

    expect(result.current.formData.name).toBe('Test User');
    expect(result.current.formData.phone).toBe('0912345678');
  });

  it('should validate name is required', () => {
    const { result } = renderHook(() => useProfileEdit());

    act(() => {
      result.current.setFormData({ ...result.current.formData, name: '' });
    });

    const errors = result.current.validate();
    expect(errors.name).toBe('姓名為必填');
  });

  it('should validate phone format', () => {
    const { result } = renderHook(() => useProfileEdit());

    act(() => {
      result.current.setFormData({ ...result.current.formData, phone: '123' });
    });

    const errors = result.current.validate();
    expect(errors.phone).toBe('請輸入有效的手機號碼');
  });

  it('should validate birthday not in future', () => {
    const { result } = renderHook(() => useProfileEdit());

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    act(() => {
      result.current.setFormData({
        ...result.current.formData,
        birthday: futureDate.toISOString().split('T')[0],
      });
    });

    const errors = result.current.validate();
    expect(errors.birthday).toBe('生日不可為未來日期');
  });
});
```

**Step 2: 執行測試確認失敗**

Run: `npm test -- src/hooks/__tests__/useProfileEdit.test.ts`
Expected: FAIL - useProfileEdit 未定義

**Step 3: 實作 hook**

```typescript
// src/hooks/useProfileEdit.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { Gender, UserPreferences } from '../types';

export interface ProfileFormData {
  name: string;
  phone: string;
  birthday: string;
  gender: Gender | '';
  preferences: UserPreferences;
}

export interface ProfileFormErrors {
  name?: string;
  phone?: string;
  birthday?: string;
}

const defaultPreferences: UserPreferences = {
  booking_reminder: true,
  promo_notifications: false,
};

export function useProfileEdit() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    phone: '',
    birthday: '',
    gender: '',
    preferences: defaultPreferences,
  });

  // 初始化表單資料
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        birthday: user.birthday || '',
        gender: user.gender || '',
        preferences: user.preferences || defaultPreferences,
      });
    }
  }, [user]);

  // 驗證表單
  const validate = useCallback((): ProfileFormErrors => {
    const errors: ProfileFormErrors = {};

    // 姓名必填，2-50 字元
    if (!formData.name.trim()) {
      errors.name = '姓名為必填';
    } else if (formData.name.length < 2 || formData.name.length > 50) {
      errors.name = '姓名長度需在 2-50 字元之間';
    }

    // 電話格式（選填）
    if (formData.phone && !/^09\d{8}$/.test(formData.phone)) {
      errors.phone = '請輸入有效的手機號碼';
    }

    // 生日不可為未來日期（選填）
    if (formData.birthday) {
      const birthday = new Date(formData.birthday);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (birthday > today) {
        errors.birthday = '生日不可為未來日期';
      }
    }

    return errors;
  }, [formData]);

  // 儲存資料
  const save = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const updateData: Record<string, unknown> = {
        name: formData.name.trim(),
        phone: formData.phone || null,
        birthday: formData.birthday || null,
        gender: formData.gender || null,
        preferences: formData.preferences,
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshUser();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, formData, validate, refreshUser]);

  return {
    formData,
    setFormData,
    loading,
    error,
    validate,
    save,
  };
}
```

**Step 4: 執行測試確認通過**

Run: `npm test -- src/hooks/__tests__/useProfileEdit.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useProfileEdit.ts src/hooks/__tests__/useProfileEdit.test.ts
git commit -m "feat(hooks): add useProfileEdit hook with validation"
```

---

## Task 4: 建立 EditProfileScreen

**Files:**
- Create: `src/screens/shared/EditProfileScreen.tsx`
- Test: `src/screens/shared/__tests__/EditProfileScreen.test.tsx`

**Step 1: 建立測試檔案**

```typescript
// src/screens/shared/__tests__/EditProfileScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { EditProfileScreen } from '../EditProfileScreen';

// Mock navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

// Mock useProfileEdit
const mockSave = jest.fn();
jest.mock('../../../hooks/useProfileEdit', () => ({
  useProfileEdit: () => ({
    formData: {
      name: 'Test User',
      phone: '0912345678',
      birthday: '',
      gender: '',
      preferences: { booking_reminder: true, promo_notifications: false },
    },
    setFormData: jest.fn(),
    loading: false,
    error: null,
    validate: () => ({}),
    save: mockSave,
  }),
}));

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form fields', () => {
    const { getByTestId } = render(<EditProfileScreen />);

    expect(getByTestId('name-input')).toBeTruthy();
    expect(getByTestId('phone-input')).toBeTruthy();
  });

  it('should call save on submit', async () => {
    mockSave.mockResolvedValue(true);
    const { getByTestId } = render(<EditProfileScreen />);

    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalled();
    });
  });

  it('should go back after successful save', async () => {
    mockSave.mockResolvedValue(true);
    const { getByTestId } = render(<EditProfileScreen />);

    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
```

**Step 2: 執行測試確認失敗**

Run: `npm test -- src/screens/shared/__tests__/EditProfileScreen.test.tsx`
Expected: FAIL - EditProfileScreen 未定義

**Step 3: 實作畫面**

```typescript
// src/screens/shared/EditProfileScreen.tsx
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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({
        ...formData,
        birthday: selectedDate.toISOString().split('T')[0],
      });
    }
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
          value={formData.birthday}
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
```

**Step 4: 建立 index.ts**

```typescript
// src/screens/shared/index.ts
export { EditProfileScreen } from './EditProfileScreen';
```

**Step 5: 執行測試確認通過**

Run: `npm test -- src/screens/shared/__tests__/EditProfileScreen.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add src/screens/shared/
git commit -m "feat(screens): add EditProfileScreen with form validation"
```

---

## Task 5: 建立 ProfileStackNavigator

**Files:**
- Create: `src/navigation/ProfileStackNavigator.tsx`

**Step 1: 建立 Stack Navigator**

```typescript
// src/navigation/ProfileStackNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileStackParamList } from './types';
import { ProfileScreen } from '../screens/customer/ProfileScreen';
import { EditProfileScreen } from '../screens/shared/EditProfileScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: '編輯個人資料' }}
      />
    </Stack.Navigator>
  );
};
```

**Step 2: Commit**

```bash
git add src/navigation/ProfileStackNavigator.tsx
git commit -m "feat(nav): add ProfileStackNavigator"
```

---

## Task 6: 更新 ProfileScreen

**Files:**
- Modify: `src/screens/customer/ProfileScreen.tsx`

**Step 1: 讀取現有檔案並新增編輯按鈕**

在 ProfileScreen 中新增編輯按鈕，導航到 EditProfile：

```typescript
// 在 ProfileScreen 中新增
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/types';

// 在元件內
const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();

// 新增編輯按鈕
<Button
  mode="outlined"
  onPress={() => navigation.navigate('EditProfile')}
  style={styles.editButton}
>
  編輯個人資料
</Button>
```

**Step 2: Commit**

```bash
git add src/screens/customer/ProfileScreen.tsx
git commit -m "feat(profile): add edit button to navigate to EditProfileScreen"
```

---

## Task 7: 更新 AppNavigator

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`

**Step 1: 將 Profile Tab 改為使用 ProfileStackNavigator**

```typescript
// 在 AppNavigator.tsx 的 CustomerTabNavigator 中
// 將 Profile Tab 改為使用 ProfileStackNavigator

import { ProfileStackNavigator } from './ProfileStackNavigator';

// 在 Tab.Screen 中
<Tab.Screen
  name="Profile"
  component={ProfileStackNavigator}
  options={{ title: '個人', headerShown: false }}
/>
```

**Step 2: Commit**

```bash
git add src/navigation/AppNavigator.tsx
git commit -m "feat(nav): integrate ProfileStackNavigator in CustomerTabNavigator"
```

---

## Task 8: 更新 useAuth hook

**Files:**
- Modify: `src/hooks/useAuth.ts`

**Step 1: 新增 refreshUser 方法**

確保 useAuth hook 有 refreshUser 方法可以重新載入使用者資料：

```typescript
// 在 useAuth hook 中新增
const refreshUser = useCallback(async () => {
  if (session?.user?.id) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (data) {
      setUser(data);
    }
  }
}, [session]);

// 回傳值加入 refreshUser
return { session, user, loading, signOut, refreshUser };
```

**Step 2: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat(auth): add refreshUser method to useAuth hook"
```

---

## Task 9: 資料庫 Migration

**Files:**
- Create: `supabase/migrations/20260129_add_user_profile_fields.sql`

**Step 1: 建立 migration 檔案**

```sql
-- supabase/migrations/20260129_add_user_profile_fields.sql

-- 新增使用者個人資料欄位
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- 為新欄位建立索引（如需要）
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);
```

**Step 2: 執行 migration（需手動操作）**

Run: `npx supabase db push` 或在 Supabase Dashboard 執行

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add birthday, gender, preferences columns to users table"
```

---

## Task 10: 整合測試

**Step 1: 執行所有測試**

Run: `npm test`
Expected: All tests PASS

**Step 2: 手動測試流程**

1. 登入 App
2. 進入個人頁面
3. 點擊「編輯個人資料」
4. 修改各欄位
5. 點擊儲存
6. 確認資料已更新

**Step 3: Final Commit**

```bash
git add .
git commit -m "feat(profile): complete profile editing feature"
```

---

## 完成檢查清單

- [ ] 類型定義已更新（Gender, UserPreferences）
- [ ] 導航類型已更新（ProfileStackParamList）
- [ ] useProfileEdit hook 已建立並測試
- [ ] EditProfileScreen 已建立並測試
- [ ] ProfileStackNavigator 已建立
- [ ] ProfileScreen 已新增編輯按鈕
- [ ] AppNavigator 已整合 ProfileStackNavigator
- [ ] useAuth 已新增 refreshUser
- [ ] 資料庫 migration 已建立
- [ ] 所有測試通過
