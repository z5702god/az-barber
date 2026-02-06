import React from 'react';
import { StyleSheet, ScrollView, Alert, View, TouchableOpacity, StatusBar } from 'react-native';
import { Text, Avatar, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../services/supabase';
import { ProfileStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';

type ProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

export const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  const handleSignOut = () => {
    Alert.alert(
      '登出',
      '確定要登出嗎？',
      [
        { text: '取消', style: 'cancel' },
        { text: '登出', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '刪除帳號',
      '確定要刪除您的帳號嗎？此操作無法復原，所有預約紀錄將被清除。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確定刪除',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user?.id) return;
              // Call Edge Function to completely delete account (including auth)
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
              // Sign out locally
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

  const getRoleText = (role: string) => {
    switch (role) {
      case 'customer':
        return '顧客';
      case 'barber':
        return '理髮師';
      case 'owner':
        return '店長';
      default:
        return role;
    }
  };

  // 根據登入方式顯示適當的 email 文字
  const getEmailDisplay = (email?: string) => {
    if (!email) return '尚未設定';
    if (email.endsWith('@line.local')) return '透過 LINE 登入';
    if (email.includes('privaterelay.appleid.com')) return '透過 Apple 登入';
    return email;
  };

  // 判斷是否為社交登入（用於顯示圖示）
  const getLoginProvider = (email?: string): 'line' | 'apple' | 'email' | null => {
    if (!email) return null;
    if (email.endsWith('@line.local')) return 'line';
    if (email.includes('privaterelay.appleid.com')) return 'apple';
    return 'email';
  };

  const loginProvider = getLoginProvider(user?.email);

  const MenuItem = ({
    icon,
    title,
    subtitle,
    onPress
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon as any} size={22} color={colors.mutedForeground} />
      <View style={styles.menuItemContent}>
        <Text style={styles.menuItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.border} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          {user?.avatar_url ? (
            <Avatar.Image size={88} source={{ uri: user.avatar_url }} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {(user?.name || user?.email || 'U').slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.userName}>{user?.name || '尚未設定姓名'}</Text>
        <Text style={styles.userRole}>{getRoleText(user?.role || 'customer')}</Text>
      </View>

      {/* Contact Info */}
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Ionicons
            name={loginProvider === 'line' ? 'chatbubble-ellipses-outline' :
                  loginProvider === 'apple' ? 'logo-apple' : 'mail-outline'}
            size={20}
            color={colors.mutedForeground}
          />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>
              {loginProvider === 'line' ? '登入方式' :
               loginProvider === 'apple' ? '登入方式' : '電子郵件'}
            </Text>
            <Text style={styles.infoValue}>{getEmailDisplay(user?.email)}</Text>
          </View>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={20} color={colors.mutedForeground} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>電話</Text>
            <Text style={styles.infoValue}>{user?.phone || '尚未設定'}</Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.card}>
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
        style={styles.signOutButton}
        onPress={handleSignOut}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.primary} />
        <Text style={styles.signOutText}>登出</Text>
      </TouchableOpacity>

      {/* Delete Account Button */}
      <TouchableOpacity
        style={styles.deleteAccountButton}
        onPress={handleDeleteAccount}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={20} color={colors.destructive} />
        <Text style={styles.deleteAccountText}>刪除帳號</Text>
      </TouchableOpacity>

      <Text style={styles.version}>版本 1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 0,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily.displayBold,
    color: colors.primaryForeground,
  },
  userName: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  userRole: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  divider: {
    backgroundColor: colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  menuItemSubtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    marginTop: 2,
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
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: 0,
  },
  deleteAccountText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.destructive,
  },
  version: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
});
