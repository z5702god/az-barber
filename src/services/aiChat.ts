// AI Chat service - communicates with Supabase Edge Function

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import { AIChatResponse, ConversationMessage } from '../types/chat';

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ai-chat`;
const TIMEOUT_MS = 30000; // 30 second timeout

export async function sendChatMessage(
  message: string,
  conversationHistory: ConversationMessage[] = [],
  accessToken: string
): Promise<AIChatResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message,
        conversation_history: conversationHistory,
      }),
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle both Edge Function errors ({ error: "..." }) and Supabase Gateway errors ({ message: "..." })
      const errorMsg = data.error || data.message || '發生錯誤，請稍後再試';
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('請求逾時，請稍後再試');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
