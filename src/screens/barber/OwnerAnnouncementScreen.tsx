import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../../hooks/useResponsive';
import { supabase } from '../../services/supabase';
import { colors, spacing, typography } from '../../theme';

interface Props {
  navigation: any;
}

export const OwnerAnnouncementScreen: React.FC<Props> = ({ navigation }) => {
  const r = useResponsive();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('請填寫完整', '標題和內容都是必填的');
      return;
    }

    Alert.alert(
      '確認發送',
      '將會通知所有設計師，確定要發送嗎？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '發送',
          onPress: async () => {
            setSending(true);
            try {
              // 取得所有理髮師的 user_id
              const { data: barberUsers, error: fetchError } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'barber');

              if (fetchError) throw fetchError;
              if (!barberUsers || barberUsers.length === 0) {
                Alert.alert('提示', '目前沒有設計師可以通知');
                setSending(false);
                return;
              }

              // 批次建立通知
              const notifications = barberUsers.map(u => ({
                user_id: u.id,
                type: 'announcement',
                title: title.trim(),
                message: message.trim(),
                is_read: false,
              }));

              const { error: insertError } = await supabase
                .from('notifications')
                .insert(notifications);

              if (insertError) throw insertError;

              Alert.alert('發送成功', `已通知 ${barberUsers.length} 位設計師`, [
                { text: '確定', onPress: () => navigation.goBack() },
              ]);
            } catch (err: any) {
              Alert.alert('發送失敗', err.message || '請稍後再試');
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, paddingHorizontal: r.sp.lg, paddingBottom: r.sp.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="close" size={r.isTablet ? 28 : 24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: r.fs.lg }]}>發佈通知</Text>
        <View style={{ width: r.isTablet ? 28 : 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { padding: r.sp.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.inputGroup, { marginBottom: r.sp.lg }]}>
            <Text style={[styles.inputLabel, { fontSize: r.fs.sm, marginBottom: r.sp.xs }]}>標題</Text>
            <TextInput
              style={[styles.input, { padding: r.sp.md, fontSize: r.fs.md }]}
              value={title}
              onChangeText={setTitle}
              placeholder="通知標題"
              placeholderTextColor={colors.mutedForeground}
              maxLength={50}
            />
          </View>

          <View style={[styles.inputGroup, { marginBottom: r.sp.lg }]}>
            <Text style={[styles.inputLabel, { fontSize: r.fs.sm, marginBottom: r.sp.xs }]}>內容</Text>
            <TextInput
              style={[styles.input, styles.textArea, { padding: r.sp.md, fontSize: r.fs.md }]}
              value={message}
              onChangeText={setMessage}
              placeholder="輸入通知內容..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              { paddingVertical: r.sp.md, gap: r.sp.sm },
              (!title.trim() || !message.trim()) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!title.trim() || !message.trim() || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <>
                <Ionicons name="megaphone-outline" size={r.isTablet ? 24 : 20} color={colors.primaryForeground} />
                <Text style={[styles.sendButtonText, { fontSize: r.fs.md }]}>發送給所有設計師</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  content: {
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chinese,
    color: colors.foreground,
  },
  textArea: {
    minHeight: 150,
  },
  sendButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primaryForeground,
  },
});
