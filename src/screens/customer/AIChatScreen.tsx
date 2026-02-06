import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAIChat } from '../../hooks/useAIChat';
import { useBarbers } from '../../hooks/useBarbers';
import { ChatMessage as ChatMessageType } from '../../types/chat';
import { colors, spacing, typography } from '../../theme';

// Typing indicator component
const TypingIndicator: React.FC = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.typingContainer}>
      <Text style={styles.typingText}>正在輸入{dots}</Text>
    </View>
  );
};

// Booking card component
const BookingCard: React.FC<{ booking: ChatMessageType['booking'] }> = ({ booking }) => {
  if (!booking) return null;

  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        <Text style={styles.bookingTitle}>預約成功</Text>
      </View>
      <View style={styles.bookingDetails}>
        <View style={styles.bookingRow}>
          <Ionicons name="person-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.bookingText}>{booking.barber}</Text>
        </View>
        <View style={styles.bookingRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.bookingText}>{booking.date}</Text>
        </View>
        <View style={styles.bookingRow}>
          <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.bookingText}>{booking.time}</Text>
        </View>
        <View style={styles.bookingRow}>
          <Ionicons name="cut-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.bookingText}>{booking.services.join(', ')}</Text>
        </View>
        <View style={styles.bookingDivider} />
        <View style={styles.bookingRow}>
          <Text style={styles.bookingLabel}>總金額</Text>
          <Text style={styles.bookingPrice}>{booking.total_price}</Text>
        </View>
      </View>
    </View>
  );
};

// Message bubble component
const MessageBubble: React.FC<{ message: ChatMessageType }> = ({ message }) => {
  const isUser = message.role === 'user';

  if (message.isLoading) {
    return (
      <View style={[styles.messageBubble, styles.assistantBubble]}>
        <TypingIndicator />
      </View>
    );
  }

  return (
    <View style={styles.messageContainer}>
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {message.content}
        </Text>
      </View>
      {message.booking && <BookingCard booking={message.booking} />}
    </View>
  );
};

export const AIChatScreen: React.FC = () => {
  const { messages, isLoading, sendMessage } = useAIChat();
  const { barbers } = useBarbers();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Use first barber name for quick action, fallback to generic
  const firstBarberName = barbers.length > 0 ? barbers[0].display_name : '設計師';

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim() && !isLoading) {
      sendMessage(inputText);
      setInputText('');
    }
  };

  const renderQuickAction = (text: string) => (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={() => sendMessage(text)}
      disabled={isLoading}
    >
      <Text style={styles.quickActionText}>{text}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={20} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.headerTitle}>小安</Text>
          <Text style={styles.headerSubtitle}>你的預約好夥伴 ✨</Text>
        </View>
      </View>

      {/* AI Disclosure */}
      <View style={styles.disclosureBanner}>
        <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} style={{ marginRight: 4 }} />
        <Text style={styles.disclosureText}>
          此為 AI 助理（由 OpenAI 技術驅動），非真人客服。回覆僅供參考。
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            messages.length === 1 ? (
              <View style={styles.quickActions}>
                {renderQuickAction(`${firstBarberName} 明天有空嗎？`)}
                {renderQuickAction('有哪些服務？')}
                {renderQuickAction('洗剪多少錢？')}
              </View>
            ) : null
          }
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="輸入訊息..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={500}
            editable={!isLoading}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons
              name="send"
              size={20}
              color={
                !inputText.trim() || isLoading
                  ? colors.mutedForeground
                  : colors.primaryForeground
              }
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: 'rgba(201, 169, 110, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.chineseSemiBold,
    color: colors.foreground,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
  disclosureBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(201, 169, 110, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  disclosureText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  messageContainer: {
    marginBottom: spacing.md,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: 0,
  },
  userBubble: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: colors.card,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chinese,
    color: colors.foreground,
    lineHeight: 22,
  },
  userMessageText: {
    color: colors.primaryForeground,
  },
  typingContainer: {
    paddingVertical: spacing.xs,
  },
  typingText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
  bookingCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 0,
    padding: spacing.md,
    maxWidth: '85%',
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bookingTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseSemiBold,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  bookingDetails: {
    gap: spacing.xs,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bookingText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.foreground,
  },
  bookingDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  bookingLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    flex: 1,
  },
  bookingPrice: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.displaySemiBold,
    color: colors.primary,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickAction: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 0,
  },
  quickActionText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.foreground,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 0,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.secondary,
  },
});
