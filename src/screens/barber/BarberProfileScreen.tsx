import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useResponsive';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../services/supabase';
import { BarberProfileStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<BarberProfileStackParamList, 'BarberProfileMain'>;

export const BarberProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const r = useResponsive();

  const handleSignOut = () => {
    Alert.alert('登出', '確定要登出嗎？', [
      { text: '取消', style: 'cancel' },
      { text: '登出', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '刪除帳號',
      '確定要刪除您的帳號嗎？此操作無法復原，所有預約紀錄和排班資料將被清除。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確定刪除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session: currentSession } } = await supabase.auth.getSession();
              if (!currentSession?.access_token) {
                Alert.alert('錯誤', '請重新登入後再試。');
                return;
              }
              const response = await fetch(
                `${SUPABASE_URL}/functions/v1/delete-account`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${currentSession.access_token}`,
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                  },
                }
              );
              const result = await response.json();
              if (!response.ok) {
                throw new Error(result.error || '刪除帳號失敗');
              }
              await signOut();
              Alert.alert('帳號已刪除', '您的帳號已成功刪除。');
            } catch (error) {
              Alert.alert('錯誤', '刪除帳號失敗，請稍後再試。');
            }
          },
        },
      ]
    );
  };

  const MenuItem = ({
    icon,
    title,
    onPress
  }: {
    icon: string;
    title: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.menuItem, { padding: r.sp.md, gap: r.sp.md }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon as any} size={r.isTablet ? 26 : 22} color={colors.mutedForeground} />
      <Text style={[styles.menuItemText, { fontSize: r.fs.md }]}>{title}</Text>
      <Ionicons name="chevron-forward" size={r.isTablet ? 24 : 20} color={colors.border} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Profile Header */}
      <View style={[styles.profileHeader, { paddingVertical: r.sp.xl, paddingHorizontal: r.sp.lg }]}>
        <View style={[styles.avatarContainer, { width: r.avatarLarge, height: r.avatarLarge, marginBottom: r.sp.md }]}>
          <Text style={[styles.avatarText, { fontSize: r.fs.xxl }]}>
            {(user?.name || 'B').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { fontSize: r.fs.xl, marginBottom: r.sp.xs }]}>{user?.name || 'Barber'}</Text>
        <Text style={[styles.email, { fontSize: r.fs.sm, marginBottom: r.sp.md }]}>{user?.email}</Text>
        <View style={[styles.roleTag, { paddingVertical: r.sp.xs, paddingHorizontal: r.sp.md }]}>
          <Text style={[styles.roleText, { fontSize: r.fs.xs }]}>理髮師</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={[styles.menuCard, { marginHorizontal: r.sp.lg, marginTop: r.sp.lg }]}>
        <MenuItem
          icon="person-outline"
          title="編輯個人資料"
          onPress={() => navigation.navigate('EditProfile')}
        />
        <Divider style={styles.divider} />
        <MenuItem
          icon="notifications-outline"
          title="通知設定"
          onPress={() => navigation.navigate('NotificationSettings')}
        />
        <Divider style={styles.divider} />
        <MenuItem
          icon="information-circle-outline"
          title="關於我們"
          onPress={() => navigation.navigate('AboutUs')}
        />
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={[styles.signOutButton, { marginHorizontal: r.sp.lg, marginTop: r.sp.xl, paddingVertical: r.sp.md, gap: r.sp.sm }]}
        onPress={handleSignOut}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={r.isTablet ? 24 : 20} color={colors.primary} />
        <Text style={[styles.signOutText, { fontSize: r.fs.md }]}>登出</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { fontSize: r.fs.xs, marginTop: r.sp.xl }]}>版本 1.0.0</Text>

      {/* Delete Account — low-profile text link, Apple requires it to be findable but not prominent */}
      <TouchableOpacity
        style={[styles.deleteAccountLink, { paddingVertical: r.sp.md, marginBottom: r.sp.xxl }]}
        onPress={handleDeleteAccount}
        activeOpacity={0.5}
      >
        <Text style={[styles.deleteAccountText, { fontSize: r.fs.xs }]}>刪除帳號</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 0,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily.displayBold,
    color: colors.primary,
  },
  name: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.displayMedium,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  roleTag: {
    backgroundColor: 'rgba(201, 169, 110, 0.2)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  roleText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.primaryMedium,
    color: colors.primary,
    letterSpacing: 1,
  },
  menuCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0, // 直角風格
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  menuItemText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
  },
  divider: {
    backgroundColor: colors.border,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 0,
  },
  signOutText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.primary,
  },
  version: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    marginTop: spacing.xl,
  },
  deleteAccountLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.xxl,
  },
  deleteAccountText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    textDecorationLine: 'underline',
  },
});
