import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileStackParamList } from './types';
import { ProfileScreen } from '../screens/customer/ProfileScreen';
import { EditProfileScreen } from '../screens/shared/EditProfileScreen';
import { CustomerNotificationSettingsScreen } from '../screens/customer/NotificationSettingsScreen';
import { AboutUsScreen } from '../screens/shared/AboutUsScreen';
import { PrivacyPolicyScreen } from '../screens/shared/PrivacyPolicyScreen';
import { TermsScreen } from '../screens/shared/TermsScreen';
import { colors, typography } from '../theme';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileStackNavigator: React.FC = () => {
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
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: '個人資料' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: '編輯個人資料' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={CustomerNotificationSettingsScreen}
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
