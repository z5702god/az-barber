import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { Text, Switch, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useResponsive';
import { supabase } from '../../services/supabase';
import { colors, spacing, typography } from '../../theme';

interface NotificationPreferences {
  push_enabled: boolean;
  booking_confirmed: boolean;
  booking_reminder: boolean;
  booking_changes: boolean;
  promo_notifications: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  push_enabled: true,
  booking_confirmed: true,
  booking_reminder: true,
  booking_changes: true,
  promo_notifications: true,
};

export const CustomerNotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const r = useResponsive();
  const { user, refreshUser } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      if (user?.preferences) {
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...user.preferences,
        });
      }
    } catch (error) {
      // Error loading preferences
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    setSaving(true);
    try {
      if (!user?.id) return;
      const { data: userData } = await supabase.from('users').select('preferences').eq('id', user.id).single();
      const existingPrefs = (userData?.preferences as Record<string, any>) || {};
      const mergedPrefs = { ...existingPrefs, ...newPreferences };

      const { error } = await supabase
        .from('users')
        .update({ preferences: mergedPrefs })
        .eq('id', user.id);

      if (error) throw error;

      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      setPreferences(preferences);
      Alert.alert('錯誤', '更新失敗');
    } finally {
      setSaving(false);
    }
  };

  const SwitchRow = ({
    icon,
    title,
    description,
    value,
    onValueChange,
    disabled = false,
  }: {
    icon: string;
    title: string;
    description?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <View style={[styles.switchRow, { padding: r.sp.md }, disabled && styles.switchRowDisabled]}>
      <View style={[styles.switchLeft, { gap: r.sp.md }]}>
        <Ionicons
          name={icon as any}
          size={r.scale(22, 26)}
          color={disabled ? colors.border : colors.mutedForeground}
        />
        <View style={styles.switchTextContainer}>
          <Text style={[styles.switchTitle, { fontSize: r.fs.md }, disabled && styles.textDisabled]}>
            {title}
          </Text>
          {description && (
            <Text style={[styles.switchDescription, { fontSize: r.fs.xs }, disabled && styles.textDisabled]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || saving}
        color={colors.primary}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Custom Header */}
      <View style={[styles.header, { paddingHorizontal: r.sp.md, paddingVertical: r.sp.md }]}>
        <TouchableOpacity
          style={[styles.backButton, { padding: r.sp.sm }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={r.scale(24, 28)} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: r.fs.lg }]}>通知設定</Text>
        <View style={styles.headerRight}>
          {saving && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { padding: r.sp.lg, paddingBottom: r.sp.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Push Notification Master Toggle */}
        <Text style={[styles.sectionTitle, { fontSize: r.fs.xs, marginBottom: r.sp.md, marginTop: r.sp.md }]}>PUSH NOTIFICATIONS</Text>
        <View style={styles.card}>
          <SwitchRow
            icon="notifications"
            title="啟用推播通知"
            description="關閉後將不會收到任何推播通知"
            value={preferences.push_enabled}
            onValueChange={(value) => updatePreference('push_enabled', value)}
          />
        </View>

        {/* Booking Notifications */}
        <Text style={[styles.sectionTitle, { fontSize: r.fs.xs, marginBottom: r.sp.md, marginTop: r.sp.md }]}>BOOKING NOTIFICATIONS</Text>
        <View style={styles.card}>
          <SwitchRow
            icon="checkmark-circle"
            title="預約確認通知"
            description="預約成功時通知我"
            value={preferences.booking_confirmed}
            onValueChange={(value) => updatePreference('booking_confirmed', value)}
            disabled={!preferences.push_enabled}
          />
          <View style={styles.divider} />
          <SwitchRow
            icon="alarm"
            title="預約提醒"
            description="預約時間前 30 分鐘提醒"
            value={preferences.booking_reminder}
            onValueChange={(value) => updatePreference('booking_reminder', value)}
            disabled={!preferences.push_enabled}
          />
          <View style={styles.divider} />
          <SwitchRow
            icon="sync"
            title="預約變更通知"
            description="預約被取消或修改時通知我"
            value={preferences.booking_changes}
            onValueChange={(value) => updatePreference('booking_changes', value)}
            disabled={!preferences.push_enabled}
          />
        </View>

        {/* Other Notifications */}
        <Text style={[styles.sectionTitle, { fontSize: r.fs.xs, marginBottom: r.sp.md, marginTop: r.sp.md }]}>OTHER</Text>
        <View style={styles.card}>
          <SwitchRow
            icon="pricetag"
            title="促銷活動通知"
            description="接收優惠和活動相關訊息"
            value={preferences.promo_notifications}
            onValueChange={(value) => updatePreference('promo_notifications', value)}
            disabled={!preferences.push_enabled}
          />
        </View>

        {/* Info Note */}
        <View style={[styles.infoNote, { gap: r.sp.sm, marginTop: r.sp.xl, paddingHorizontal: r.sp.sm }]}>
          <Ionicons name="information-circle-outline" size={r.scale(16, 20)} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { fontSize: r.fs.xs, lineHeight: r.scale(18, 22) }]}>
            通知設定會即時儲存。如果您未收到通知，請檢查裝置的通知權限設定。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.chineseSemiBold,
    color: colors.foreground,
  },
  headerRight: {
    width: 32,
    alignItems: 'flex-end',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.primaryMedium,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  switchRowDisabled: {
    opacity: 0.5,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  switchDescription: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  textDisabled: {
    color: colors.mutedForeground,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
});
