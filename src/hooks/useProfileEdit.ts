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
