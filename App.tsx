import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import {
  NotoSerifTC_400Regular,
  NotoSerifTC_500Medium,
  NotoSerifTC_600SemiBold,
  NotoSerifTC_700Bold,
} from '@expo-google-fonts/noto-serif-tc';

import { AuthProvider } from './src/hooks/useAuth';
import { NotificationProvider } from './src/providers/NotificationProvider';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AppNavigator } from './src/navigation/AppNavigator';
import { paperTheme, colors } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    // JetBrains Mono - Monospace font
    'JetBrainsMono-Regular': JetBrainsMono_400Regular,
    'JetBrainsMono-Medium': JetBrainsMono_500Medium,
    'JetBrainsMono-SemiBold': JetBrainsMono_600SemiBold,
    'JetBrainsMono-Bold': JetBrainsMono_700Bold,
    // Inter - UI font
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    // Playfair Display - Brand/Display font (for logos, headings)
    'PlayfairDisplay-Regular': PlayfairDisplay_400Regular,
    'PlayfairDisplay-Medium': PlayfairDisplay_500Medium,
    'PlayfairDisplay-SemiBold': PlayfairDisplay_600SemiBold,
    'PlayfairDisplay-Bold': PlayfairDisplay_700Bold,
    // Manrope - Body text font
    'Manrope-Regular': Manrope_400Regular,
    'Manrope-Medium': Manrope_500Medium,
    'Manrope-SemiBold': Manrope_600SemiBold,
    'Manrope-Bold': Manrope_700Bold,
    // Noto Serif TC - Chinese text font (elegant serif)
    'NotoSerifTC-Regular': NotoSerifTC_400Regular,
    'NotoSerifTC-Medium': NotoSerifTC_500Medium,
    'NotoSerifTC-SemiBold': NotoSerifTC_600SemiBold,
    'NotoSerifTC-Bold': NotoSerifTC_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Custom dark theme for React Native Paper
  // Font hierarchy:
  // - Playfair Display: Brand/Display headings (elegant, premium)
  // - JetBrains Mono: Titles (technical, clean)
  // - Manrope: Body text (readable, modern)
  // - Inter: Labels/UI elements (clean, functional)
  const theme = {
    ...MD3DarkTheme,
    ...paperTheme,
    fonts: {
      ...MD3DarkTheme.fonts,
      // Body text - Manrope for readability
      bodyLarge: { ...MD3DarkTheme.fonts.bodyLarge, fontFamily: 'Manrope-Regular' },
      bodyMedium: { ...MD3DarkTheme.fonts.bodyMedium, fontFamily: 'Manrope-Regular' },
      bodySmall: { ...MD3DarkTheme.fonts.bodySmall, fontFamily: 'Manrope-Regular' },
      // Labels - Inter for UI elements
      labelLarge: { ...MD3DarkTheme.fonts.labelLarge, fontFamily: 'Inter-SemiBold' },
      labelMedium: { ...MD3DarkTheme.fonts.labelMedium, fontFamily: 'Inter-Medium' },
      labelSmall: { ...MD3DarkTheme.fonts.labelSmall, fontFamily: 'Inter-Medium' },
      // Titles - JetBrains Mono for technical feel
      titleLarge: { ...MD3DarkTheme.fonts.titleLarge, fontFamily: 'JetBrainsMono-SemiBold' },
      titleMedium: { ...MD3DarkTheme.fonts.titleMedium, fontFamily: 'JetBrainsMono-Medium' },
      titleSmall: { ...MD3DarkTheme.fonts.titleSmall, fontFamily: 'JetBrainsMono-Medium' },
      // Headlines - Playfair Display for elegance
      headlineLarge: { ...MD3DarkTheme.fonts.headlineLarge, fontFamily: 'PlayfairDisplay-Bold' },
      headlineMedium: { ...MD3DarkTheme.fonts.headlineMedium, fontFamily: 'PlayfairDisplay-SemiBold' },
      headlineSmall: { ...MD3DarkTheme.fonts.headlineSmall, fontFamily: 'PlayfairDisplay-Medium' },
      // Display - Playfair Display for brand presence
      displayLarge: { ...MD3DarkTheme.fonts.displayLarge, fontFamily: 'PlayfairDisplay-Bold' },
      displayMedium: { ...MD3DarkTheme.fonts.displayMedium, fontFamily: 'PlayfairDisplay-SemiBold' },
      displaySmall: { ...MD3DarkTheme.fonts.displaySmall, fontFamily: 'PlayfairDisplay-Medium' },
    },
  };

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <ErrorBoundary>
          <AuthProvider>
            <NotificationProvider>
              <AppNavigator />
              <StatusBar style="light" />
            </NotificationProvider>
          </AuthProvider>
        </ErrorBoundary>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
