import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase, SUPABASE_URL } from './supabase';

const LINE_AUTH_FUNCTION = `${SUPABASE_URL}/functions/v1/line-auth`;

// Module-level state for CSRF validation
let pendingCsrfState: string | null = null;

export interface LineAuthResult {
  success: boolean;
  error?: string;
}

/**
 * Initiate LINE Login flow using Supabase Edge Function
 */
export async function signInWithLine(): Promise<LineAuthResult> {
  try {
    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    pendingCsrfState = state;

    // LINE OAuth URL with Edge Function callback
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: '2009044609',
      redirect_uri: `${LINE_AUTH_FUNCTION}/callback`,
      state,
      scope: 'profile openid email',
    });

    const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;

    // Open LINE login in browser
    const result = await WebBrowser.openAuthSessionAsync(
      lineAuthUrl,
      'az-barber-app://auth/callback'
    );

    if (result.type !== 'success') {
      pendingCsrfState = null;
      return {
        success: false,
        error: result.type === 'cancel' ? '使用者取消登入' : '登入失敗',
      };
    }

    // Parse the callback URL
    const url = Linking.parse(result.url);

    if (url.queryParams?.error) {
      pendingCsrfState = null;
      return {
        success: false,
        error: String(url.queryParams.error),
      };
    }

    // Validate CSRF state
    const returnedState = url.queryParams?.state as string;
    if (returnedState !== pendingCsrfState) {
      pendingCsrfState = null;
      return {
        success: false,
        error: '安全驗證失敗，請重試',
      };
    }
    pendingCsrfState = null;

    // Get token from callback
    const token = url.queryParams?.token as string;
    const type = url.queryParams?.type as string;

    if (!token) {
      return {
        success: false,
        error: '未收到認證 token',
      };
    }

    // Verify the magic link token with Supabase
    if (type === 'magiclink') {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'magiclink',
      });

      if (error) {
        if (__DEV__) console.error('Failed to verify token:', error);
        return {
          success: false,
          error: '驗證失敗，請重試',
        };
      }
    }

    return { success: true };
  } catch (error: any) {
    if (__DEV__) console.error('LINE login error:', error);
    return {
      success: false,
      error: error.message || 'LINE 登入發生錯誤',
    };
  }
}
