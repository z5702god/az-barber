import React from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, Text, Surface, TextInput, Divider } from 'react-native-paper';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../../services/supabase';

WebBrowser.maybeCompleteAuthSession();

export const LoginScreen: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSignUp, setIsSignUp] = React.useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('錯誤', '請輸入 Email 和密碼');
      return;
    }

    try {
      setLoading(true);

      if (isSignUp) {
        // 註冊新帳號
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        Alert.alert('成功', '註冊成功！請查收驗證信件，或直接登入。');
        setIsSignUp(false);
      } else {
        // 登入
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      Alert.alert('錯誤', error.message || '登入失敗');
    } finally {
      setLoading(false);
    }
  };

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
    try {
      setLoading(true);
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'az-barber-app',
      });

      console.log('LINE login - needs custom implementation');
      console.log('Redirect URL:', redirectUrl);
      Alert.alert('提示', 'LINE 登入尚未設定完成');

    } catch (error) {
      console.error('LINE login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={styles.logoContainer}>
          <Text variant="headlineLarge" style={styles.title}>
            AZ Barber
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            輕鬆預約，專業服務
          </Text>
        </Surface>

        {/* Email/Password 登入 */}
        <View style={styles.emailContainer}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            label="密碼"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={handleEmailLogin}
            loading={loading}
            disabled={loading}
            style={styles.emailButton}
            contentStyle={styles.buttonContent}
          >
            {isSignUp ? '註冊' : '登入'}
          </Button>
          <Button
            mode="text"
            onPress={() => setIsSignUp(!isSignUp)}
            disabled={loading}
          >
            {isSignUp ? '已有帳號？登入' : '沒有帳號？註冊'}
          </Button>
        </View>

        <View style={styles.dividerContainer}>
          <Divider style={styles.divider} />
          <Text style={styles.dividerText}>或</Text>
          <Divider style={styles.divider} />
        </View>

        {/* Social Login */}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
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
  emailContainer: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 20,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  emailButton: {
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#2196F3',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    marginVertical: 16,
  },
  divider: {
    flex: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
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
    marginTop: 30,
    textAlign: 'center',
    color: '#999',
  },
});
