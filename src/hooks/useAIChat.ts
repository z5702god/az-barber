// AI Chat hook - manages chat state and interactions

import { useState, useCallback } from 'react';
import { ChatMessage, ConversationMessage, BookingResult } from '../types/chat';
import { sendChatMessage } from '../services/aiChat';
import { supabase } from '../services/supabase';

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是 AZ Barber 的預約助理 👋\n\n你可以問我：\n• 理髮師的空檔時段\n• 服務項目和價格\n• 或直接說「幫我預約」\n\n有什麼可以幫你的嗎？',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Add loading placeholder
    const loadingId = `loading-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: loadingId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      },
    ]);

    try {
      // Get current session - try local first, refresh if expired
      let { data: { session } } = await supabase.auth.getSession();

      // If token expires within 60 seconds, refresh it
      if (session?.expires_at && session.expires_at * 1000 < Date.now() + 60000) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        session = refreshData.session;
      }

      if (!session?.access_token) {
        throw new Error('請先登入');
      }

      const accessToken = session.access_token;

      // Build conversation history (exclude welcome message and loading)
      const history: ConversationMessage[] = messages
        .filter(m => m.id !== 'welcome' && !m.isLoading)
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      // Send to AI with the user's access token
      const response = await sendChatMessage(content.trim(), history, accessToken);

      // Check for booking in tool results
      let booking: BookingResult | undefined;
      if (response.tool_results) {
        const bookingResult = response.tool_results.find(
          tr => tr.tool === 'create_booking' && (tr.result as any)?.success
        );
        if (bookingResult) {
          booking = (bookingResult.result as any).booking;
        }
      }

      // Replace loading with actual response
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingId
            ? {
                id: Date.now().toString(),
                role: 'assistant',
                content: response.message,
                timestamp: new Date(),
                booking,
              }
            : m
        )
      );
    } catch (error) {
      // Replace loading with error message
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingId
            ? {
                id: Date.now().toString(),
                role: 'assistant',
                content: error instanceof Error
                  ? `抱歉，${error.message}`
                  : '抱歉，發生錯誤，請稍後再試',
                timestamp: new Date(),
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: '你好！我是 AZ Barber 的預約助理 👋\n\n你可以問我：\n• 理髮師的空檔時段\n• 服務項目和價格\n• 或直接說「幫我預約」\n\n有什麼可以幫你的嗎？',
        timestamp: new Date(),
      },
    ]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
  };
}
