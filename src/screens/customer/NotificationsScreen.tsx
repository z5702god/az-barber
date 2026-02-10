import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';
import { NotificationType, Notification as AppNotification } from '../../types/notification';
import { useNotificationContext } from '../../providers/NotificationProvider';

// 圖示對應
const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  booking_confirmed: 'checkmark-circle',
  booking_reminder: 'alarm',
  booking_cancelled: 'close-circle',
  booking_modified: 'create',
  promotion: 'pricetag',
  announcement: 'megaphone',
};

// 圖示顏色對應
const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  booking_confirmed: colors.success,
  booking_reminder: colors.primary,
  booking_cancelled: colors.destructive,
  booking_modified: colors.warning,
  promotion: colors.primary,
  announcement: colors.mutedForeground,
};

// 時間格式化
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return '剛剛';
  if (diffMins < 60) return `${diffMins} 分鐘前`;
  if (diffHours < 24) return `${diffHours} 小時前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-TW');
};

interface NotificationItemProps {
  notification: AppNotification;
  onPress: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
}) => {
  const iconName = NOTIFICATION_ICONS[notification.type] || 'notifications-outline';
  const iconColor = NOTIFICATION_COLORS[notification.type] || colors.mutedForeground;

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.isRead && styles.unreadItem,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* 未讀指示器 */}
      {!notification.isRead && <View style={styles.unreadDot} />}

      {/* 圖示 */}
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={iconName as any} size={20} color={iconColor} />
      </View>

      {/* 內容 */}
      <View style={styles.contentContainer}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.notificationTitle,
              !notification.isRead && styles.unreadText,
            ]}
          >
            {notification.title}
          </Text>
          <Text style={styles.timeText}>
            {formatRelativeTime(notification.createdAt)}
          </Text>
        </View>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {notification.message}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // 使用 Context 管理通知狀態，這樣離開畫面後狀態仍會保持
  const {
    inAppNotifications: notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotificationContext();

  const handleNotificationPress = (notification: { id: string; bookingId?: string }) => {
    // 標記為已讀（使用 Context，狀態會持久化）
    markAsRead(notification.id);

    // 直接導航到預約詳情頁面
    if (notification.bookingId) {
      (navigation as any).navigate('BookingDetail', { bookingId: notification.bookingId });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>通知</Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markReadButton} onPress={markAllAsRead}>
            <Text style={styles.markReadText}>全部已讀</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="notifications-outline"
            size={56}
            color={colors.mutedForeground}
          />
          <Text style={styles.emptyTitle}>暫無通知</Text>
          <Text style={styles.emptyText}>預約確認及變更通知會顯示在這裡</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 未讀通知 */}
          {unreadCount > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>未讀 ({unreadCount})</Text>
              {notifications
                .filter((n) => !n.isRead)
                .map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onPress={() => handleNotificationPress(notification)}
                  />
                ))}
            </View>
          )}

          {/* 已讀通知 */}
          {notifications.some((n) => n.isRead) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {unreadCount > 0 ? '較早' : '所有通知'}
              </Text>
              {notifications
                .filter((n) => n.isRead)
                .map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onPress={() => handleNotificationPress(notification)}
                  />
                ))}
            </View>
          )}

          {/* Bottom spacer */}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  markReadButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  markReadText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.primary,
  },
  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.md,
  },
  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  // Notification Item
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
  },
  unreadItem: {
    backgroundColor: 'rgba(201, 169, 110, 0.05)',
  },
  unreadDot: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.lg + 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  notificationTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chinese,
    color: colors.foreground,
  },
  unreadText: {
    fontFamily: typography.fontFamily.chineseMedium,
  },
  timeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
  },
  notificationMessage: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
});
