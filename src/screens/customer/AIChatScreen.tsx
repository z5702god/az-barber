import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
  StatusBar,
  Keyboard,
  Animated,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAIChat } from '../../hooks/useAIChat';
import { useBarbers } from '../../hooks/useBarbers';
import { useResponsive } from '../../hooks/useResponsive';
import { ChatMessage as ChatMessageType } from '../../types/chat';
import { colors, spacing, typography } from '../../theme';

// Typing indicator component
const TypingIndicator: React.FC = () => {
  const r = useResponsive();
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.typingContainer, { paddingVertical: r.sp.xs }]}>
      <Text style={[styles.typingText, { fontSize: r.fs.sm }]}>正在輸入{dots}</Text>
    </View>
  );
};

// Booking card component
const BookingCard: React.FC<{ booking: ChatMessageType['booking'] }> = ({ booking }) => {
  const r = useResponsive();
  if (!booking) return null;

  return (
    <View style={[styles.bookingCard, { maxWidth: r.isTablet ? '70%' : '85%', padding: r.sp.md }]}>
      <View style={[styles.bookingHeader, { marginBottom: r.sp.sm }]}>
        <Ionicons name="checkmark-circle" size={r.scale(20, 26)} color={colors.primary} />
        <Text style={[styles.bookingTitle, { fontSize: r.fs.md, marginLeft: r.sp.xs }]}>預約成功</Text>
      </View>
      <View style={[styles.bookingDetails, { gap: r.sp.xs }]}>
        <View style={[styles.bookingRow, { gap: r.sp.sm }]}>
          <Ionicons name="person-outline" size={r.scale(16, 20)} color={colors.mutedForeground} />
          <Text style={[styles.bookingText, { fontSize: r.fs.sm }]}>{booking.barber}</Text>
        </View>
        <View style={[styles.bookingRow, { gap: r.sp.sm }]}>
          <Ionicons name="calendar-outline" size={r.scale(16, 20)} color={colors.mutedForeground} />
          <Text style={[styles.bookingText, { fontSize: r.fs.sm }]}>{booking.date}</Text>
        </View>
        <View style={[styles.bookingRow, { gap: r.sp.sm }]}>
          <Ionicons name="time-outline" size={r.scale(16, 20)} color={colors.mutedForeground} />
          <Text style={[styles.bookingText, { fontSize: r.fs.sm }]}>{booking.time}</Text>
        </View>
        <View style={[styles.bookingRow, { gap: r.sp.sm }]}>
          <Ionicons name="cut-outline" size={r.scale(16, 20)} color={colors.mutedForeground} />
          <Text style={[styles.bookingText, { fontSize: r.fs.sm }]}>{booking.services.join(', ')}</Text>
        </View>
        <View style={[styles.bookingDivider, { marginVertical: r.sp.sm }]} />
        <View style={[styles.bookingRow, { gap: r.sp.sm }]}>
          <Text style={[styles.bookingLabel, { fontSize: r.fs.sm }]}>總金額</Text>
          <Text style={[styles.bookingPrice, { fontSize: r.fs.md }]}>{booking.total_price}</Text>
        </View>
      </View>
    </View>
  );
};

// Message bubble component
const MessageBubble: React.FC<{ message: ChatMessageType }> = ({ message }) => {
  const r = useResponsive();
  const isUser = message.role === 'user';

  if (message.isLoading) {
    return (
      <View style={[styles.messageBubble, styles.assistantBubble, { maxWidth: r.isTablet ? '70%' : '85%', padding: r.sp.md }]}>
        <TypingIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.messageContainer, { marginBottom: r.sp.md }]}>
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          { maxWidth: r.isTablet ? '70%' : '85%', padding: r.sp.md },
        ]}
      >
        <Text style={[styles.messageText, isUser && styles.userMessageText, { fontSize: r.fs.md }]}>
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
  const r = useResponsive();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  // Use first barber name for quick action
  const firstBarberName = barbers.length > 0 ? barbers[0].display_name : null;

  // Inverted FlatList: data is reversed so newest message is first item
  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Manual keyboard padding for both platforms
  // Android API 35+ enforces edge-to-edge, so adjustResize alone doesn't work
  // iOS has no adjustResize at all
  const bottomPadding = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const isIOS = Platform.OS === 'ios';
    const showEvent = isIOS ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = isIOS ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      // On Android with edge-to-edge, add bottom inset to cover navigation bar area
      const extra = isIOS ? 0 : insets.bottom;
      Animated.timing(bottomPadding, {
        toValue: e.endCoordinates.height + extra,
        duration: isIOS ? (e.duration || 250) : 150,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(bottomPadding, {
        toValue: 0,
        duration: isIOS ? (e.duration || 250) : 150,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = () => {
    if (inputText.trim() && !isLoading) {
      sendMessage(inputText);
      setInputText('');
    }
  };

  const renderQuickAction = (text: string) => (
    <TouchableOpacity
      style={[styles.quickAction, { paddingVertical: r.sp.sm, paddingHorizontal: r.sp.md }]}
      onPress={() => sendMessage(text)}
      disabled={isLoading}
    >
      <Text style={[styles.quickActionText, { fontSize: r.fs.sm }]}>{text}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: r.sp.md, paddingVertical: r.sp.md }]}>
        <View style={[styles.headerIcon, { width: r.iconSmall, height: r.iconSmall, marginRight: r.sp.md }]}>
          <Ionicons name="sparkles" size={r.scale(20, 26)} color={colors.primary} />
        </View>
        <View>
          <Text style={[styles.headerTitle, { fontSize: r.fs.lg }]}>小安</Text>
          <Text style={[styles.headerSubtitle, { fontSize: r.fs.xs }]}>你的預約好夥伴 ✨</Text>
        </View>
      </View>

      {/* AI Disclosure */}
      <View style={[styles.disclosureBanner, { paddingHorizontal: r.sp.lg, paddingVertical: r.sp.sm, gap: r.sp.xs }]}>
        <Ionicons name="information-circle-outline" size={r.scale(14, 18)} color={colors.mutedForeground} />
        <Text style={[styles.disclosureText, { fontSize: r.fs.xs }]}>
          此為 AI 助理（由 OpenAI 技術驅動），非真人客服。回覆僅供參考。
        </Text>
      </View>

      {/* Chat area — Animated.View for smooth keyboard-driven padding */}
      <Animated.View style={[styles.chatContainer, { paddingBottom: bottomPadding }]}>
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={invertedMessages}
          inverted
          keyExtractor={item => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={[styles.messagesList, { padding: r.sp.md }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          ListHeaderComponent={
            messages.length === 1 && firstBarberName ? (
              <View style={styles.initialSpacer}>
                <View style={[styles.quickActions, { gap: r.sp.sm, marginTop: r.sp.md }]}>
                  {renderQuickAction(`${firstBarberName} 明天有空嗎？`)}
                  {renderQuickAction('有哪些服務？')}
                  {renderQuickAction('洗剪多少錢？')}
                </View>
              </View>
            ) : null
          }
        />

        {/* Input */}
        <View style={[styles.inputContainer, { padding: r.sp.md, gap: r.sp.sm }]}>
          <TextInput
            style={[styles.input, { paddingHorizontal: r.sp.md, paddingVertical: r.sp.sm, fontSize: r.fs.md, maxHeight: r.isTablet ? 140 : 100 }]}
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
              { width: r.isTablet ? 56 : 44, height: r.isTablet ? 56 : 44 },
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons
              name="send"
              size={r.scale(20, 26)}
              color={
                !inputText.trim() || isLoading
                  ? colors.mutedForeground
                  : colors.primaryForeground
              }
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(201, 169, 110, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  disclosureText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  initialSpacer: {
    flex: 1,
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
