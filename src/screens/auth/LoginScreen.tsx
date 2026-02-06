import React from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ImageBackground,
  Image,
  Dimensions,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../services/supabase';
import { signInWithLine } from '../../services/lineAuth';
import { RootStackParamList } from '../../navigation/types';
import { colors, spacing, borderRadius, typography } from '../../theme';

WebBrowser.maybeCompleteAuthSession();

// Google Sign-In (native module - not available in Expo Go)
let GoogleSignin: any = null;
let statusCodes: any = null;
let googleSigninAvailable = false;

try {
  const googleSigninModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSigninModule.GoogleSignin;
  statusCodes = googleSigninModule.statusCodes;
  googleSigninAvailable = true;

  // Configure Google Sign-In
  GoogleSignin.configure({
    iosClientId: '920374542314-3j883codjk3ujvdpk34t3mji3a0sbivn.apps.googleusercontent.com',
    webClientId: '920374542314-7jc9d7c2kmsu486j3n2tgfd7fhqph562.apps.googleusercontent.com',
  });
} catch (e) {
  // Google Sign-In not available (e.g. Expo Go)
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Barber shop images from Unsplash (same as Pencil design)
const BARBER_IMAGES = [
  'https://images.unsplash.com/photo-1617655719462-c643bc54914c?w=400&q=80',
  'https://images.unsplash.com/photo-1693591936914-14645081663a?w=400&q=80',
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&q=80',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80',
  'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&q=80',
  'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&q=80',
];

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [showEmailForm, setShowEmailForm] = React.useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('錯誤', '請輸入電子郵件和密碼');
      return;
    }

    // P2: Password strength validation on sign up
    if (isSignUp && password.length < 8) {
      Alert.alert('密碼太短', '密碼需要至少 8 個字元');
      return;
    }

    try {
      setLoading(true);

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        Alert.alert('成功', '註冊成功！請查收驗證信，或直接登入。');
        setIsSignUp(false);
      } else {
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

      if (!googleSigninAvailable || !GoogleSignin) {
        Alert.alert('不支援', 'Google 登入在此環境不可用。請使用其他登入方式。');
        return;
      }

      // Check if Google Play Services are available (Android only)
      await GoogleSignin.hasPlayServices();

      // Sign in with Google natively
      const signInResult = await GoogleSignin.signIn();

      // Get the ID token
      const idToken = signInResult.data?.idToken;
      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      // Sign in to Supabase with the Google ID token
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw error;
    } catch (error: any) {
      // Handle specific Google Sign-In errors
      if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the sign-in
      } else if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('請稍候', '登入正在進行中');
      } else if (statusCodes && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('錯誤', 'Google Play 服務不可用');
      } else {
        Alert.alert('登入失敗', error.message || 'Google 登入發生錯誤');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setLoading(true);

      // Use native Apple Sign In
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Sign in to Supabase with the Apple identity token
      if (credential.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) throw error;
      } else {
        throw new Error('No identity token received from Apple');
      }
    } catch (error: any) {
      // Handle specific Apple Sign-In errors
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled the sign-in
      } else {
        Alert.alert('登入失敗', error.message || 'Apple 登入發生錯誤');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLineLogin = async () => {
    try {
      setLoading(true);

      // LINE login is handled via the Edge Function magiclink flow.
      // signInWithLine() opens the LINE OAuth browser, exchanges code for a magiclink,
      // and verifies the OTP with Supabase. The AuthProvider picks up the session change.
      const lineResult = await signInWithLine();

      if (!lineResult.success) {
        if (lineResult.error) {
          Alert.alert('登入失敗', lineResult.error);
        }
        return;
      }

      // Auth state change will be handled by AuthProvider
    } catch (error: any) {
      Alert.alert('登入失敗', error.message || 'LINE 登入發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  // Render image collage background
  const renderImageCollage = () => {
    const imageSize = 180;
    const gap = 8;
    const rotation = -15;

    return (
      <View style={styles.collageContainer}>
        {/* Row 1 */}
        <View style={[styles.imageRow, { transform: [{ rotate: `${rotation}deg` }], top: -20, left: -50 }]}>
          {BARBER_IMAGES.slice(0, 3).map((uri, index) => (
            <Image
              key={`row1-${index}`}
              source={{ uri }}
              style={[styles.collageImage, { width: imageSize, height: 240 }]}
            />
          ))}
        </View>
        {/* Row 2 */}
        <View style={[styles.imageRow, { transform: [{ rotate: `${rotation}deg` }], top: 210, left: -100 }]}>
          {BARBER_IMAGES.slice(3, 6).map((uri, index) => (
            <Image
              key={`row2-${index}`}
              source={{ uri }}
              style={[styles.collageImage, { width: imageSize, height: 240 }]}
            />
          ))}
        </View>
        {/* Row 3 */}
        <View style={[styles.imageRow, { transform: [{ rotate: `${rotation}deg` }], top: 440, left: -50 }]}>
          {BARBER_IMAGES.slice(0, 3).map((uri, index) => (
            <Image
              key={`row3-${index}`}
              source={{ uri }}
              style={[styles.collageImage, { width: imageSize, height: 240 }]}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background Image Collage */}
      {renderImageCollage()}

      {/* Gradient Overlay */}
      <LinearGradient
        colors={[
          'rgba(17, 17, 17, 0)',
          'rgba(17, 17, 17, 0.25)',
          'rgba(17, 17, 17, 0.5)',
          'rgba(17, 17, 17, 0.7)',
          'rgba(17, 17, 17, 0.85)',
        ]}
        locations={[0, 0.3, 0.5, 0.75, 1]}
        style={styles.overlay}
      />

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Text style={styles.brandName}>AZ BARBERSHOP</Text>
            <Text style={styles.tagline}>專業髮型設計</Text>
          </View>

          <View style={styles.bottomSection}>
            {showEmailForm ? (
              /* Email/Password Form */
              <View style={styles.emailContainer}>
                <TextInput
                  label="電子郵件"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.foreground}
                  theme={{
                    colors: {
                      onSurfaceVariant: colors.mutedForeground,
                      surface: colors.card,
                    },
                  }}
                />
                <TextInput
                  label="密碼"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  secureTextEntry
                  style={styles.input}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.foreground}
                  theme={{
                    colors: {
                      onSurfaceVariant: colors.mutedForeground,
                      surface: colors.card,
                    },
                  }}
                />
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleEmailLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>
                    {isSignUp ? '註冊' : '登入'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsSignUp(!isSignUp)}
                  disabled={loading}
                  style={styles.switchAuthMode}
                >
                  <Text style={styles.switchAuthText}>
                    {isSignUp ? '已有帳號？登入' : '還沒有帳號？註冊'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowEmailForm(false)}
                  style={styles.backButton}
                >
                  <Text style={styles.backButtonText}>返回</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Social Login Buttons - Order: Apple, LINE, Google */
              <View style={styles.buttonContainer}>
                {Platform.OS === 'ios' && (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                    cornerRadius={0}
                    style={styles.appleButton}
                    onPress={handleAppleLogin}
                  />
                )}

                <TouchableOpacity
                  style={styles.lineButton}
                  onPress={handleLineLogin}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble" size={22} color="#FFFFFF" />
                  <Text style={styles.lineButtonText}>使用 LINE 登入</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.googleButton}
                  onPress={handleGoogleLogin}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-google" size={22} color="#4285F4" />
                  <Text style={styles.googleButtonText}>使用 Google 登入</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.emailLoginLink}
                  onPress={() => setShowEmailForm(true)}
                >
                  <Text style={styles.emailLoginText}>使用電子郵件登入</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.terms}>
                繼續即表示您同意我們的
              </Text>
              <View style={styles.termsLinksRow}>
                <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
                  <Text style={styles.termsLink}>服務條款</Text>
                </TouchableOpacity>
                <Text style={styles.termsLinkSeparator}>{' 與 '}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                  <Text style={styles.termsLink}>隱私政策</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
  collageContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  imageRow: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 8,
  },
  collageImage: {
    borderRadius: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 48,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandName: {
    fontSize: 38,
    fontFamily: typography.fontFamily.display,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    letterSpacing: 1,
    opacity: 0.7,
  },
  bottomSection: {
    width: '100%',
    gap: 24,
  },
  buttonContainer: {
    gap: 12,
  },
  appleButton: {
    width: '100%',
    height: 56,
  },
  lineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06C755',
    borderRadius: 0,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  lineButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseSemiBold,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  googleButtonText: {
    color: '#1F1F1F',
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseSemiBold,
  },
  emailLoginLink: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  emailLoginText: {
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    textDecorationLine: 'underline',
  },
  emailContainer: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.card,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 0,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    color: colors.primaryForeground,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseSemiBold,
  },
  switchAuthMode: {
    alignItems: 'center',
  },
  switchAuthText: {
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
  },
  backButton: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
  },
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 24,
  },
  terms: {
    textAlign: 'center',
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chinese,
  },
  termsLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsLinkSeparator: {
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chinese,
  },
  termsLink: {
    color: colors.primary,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chinese,
    textDecorationLine: 'underline',
  },
});
