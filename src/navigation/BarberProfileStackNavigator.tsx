import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BarberProfileStackParamList } from './types';
import { BarberProfileScreen } from '../screens/barber/BarberProfileScreen';
import { EditProfileScreen } from '../screens/shared/EditProfileScreen';
import { NotificationSettingsScreen } from '../screens/barber/NotificationSettingsScreen';
import { AboutUsScreen } from '../screens/shared/AboutUsScreen';
import { PrivacyPolicyScreen } from '../screens/shared/PrivacyPolicyScreen';
import { TermsScreen } from '../screens/shared/TermsScreen';
import { colors, typography } from '../theme';

const Stack = createNativeStackNavigator<BarberProfileStackParamList>();

export const BarberProfileStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        // Header 深色主題樣式
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.foreground,
        headerTitleStyle: {
          fontFamily: typography.fontFamily.primarySemiBold,
          color: colors.foreground,
        },
      }}
    >
      <Stack.Screen
        name="BarberProfileMain"
        component={BarberProfileScreen}
        options={{ title: '個人資料' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: '編輯個人資料' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AboutUs"
        component={AboutUsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Terms"
        component={TermsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};
