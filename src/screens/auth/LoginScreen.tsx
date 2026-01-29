import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Surface } from 'react-native-paper';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../../services/supabase';

WebBrowser.maybeCompleteAuthSession();

export const LoginScreen: React.FC = () => {
  const [loading, setLoading] = React.useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'az-barber-app',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success') {
          const url = new URL(result.url);
          const code = url.searchParams.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          }
        }
      }
    } catch (error) {
      console.error('Google login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setLoading(true);
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'az-barber-app',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success') {
          const url = new URL(result.url);
          const code = url.searchParams.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          }
        }
      }
    } catch (error) {
      console.error('Apple login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLineLogin = async () => {
    // LINE 登入需要額外設定，這裡先用 placeholder
    // 需要在 Supabase 設定 LINE provider
    try {
      setLoading(true);
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'az-barber-app',
      });

      // LINE OAuth 需要自訂實作
      // 參考：https://developers.line.biz/en/docs/line-login/integrate-line-login/
      console.log('LINE login - needs custom implementation');
      console.log('Redirect URL:', redirectUrl);

    } catch (error) {
      console.error('LINE login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.logoContainer}>
        <Text variant="headlineLarge" style={styles.title}>
          AZ Barber
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          輕鬆預約，專業服務
        </Text>
      </Surface>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleLineLogin}
          loading={loading}
          disabled={loading}
          style={[styles.button, styles.lineButton]}
          contentStyle={styles.buttonContent}
          icon="chat"
        >
          使用 LINE 登入
        </Button>

        <Button
          mode="contained"
          onPress={handleGoogleLogin}
          loading={loading}
          disabled={loading}
          style={[styles.button, styles.googleButton]}
          contentStyle={styles.buttonContent}
          icon="google"
        >
          使用 Google 登入
        </Button>

        <Button
          mode="contained"
          onPress={handleAppleLogin}
          loading={loading}
          disabled={loading}
          style={[styles.button, styles.appleButton]}
          contentStyle={styles.buttonContent}
          icon="apple"
        >
          使用 Apple 登入
        </Button>
      </View>

      <Text variant="bodySmall" style={styles.terms}>
        登入即表示您同意我們的服務條款和隱私政策
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
    padding: 20,
    borderRadius: 16,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
  },
  button: {
    marginVertical: 8,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  lineButton: {
    backgroundColor: '#00B900',
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  terms: {
    marginTop: 40,
    textAlign: 'center',
    color: '#999',
  },
});
