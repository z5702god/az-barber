import React, { useCallback } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as SplashScreen from 'expo-splash-screen';

import { useAuth } from '../hooks/useAuth';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackParamList, MainTabParamList } from './types';
import { colors, typography } from '../theme';

// Navigators
import { BookingNavigator } from './BookingNavigator';
import { BarberTabNavigator } from './BarberTabNavigator';
import { ProfileStackNavigator } from './ProfileStackNavigator';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { HomeScreen } from '../screens/customer/HomeScreen';
import { MyBookingsScreen } from '../screens/customer/MyBookingsScreen';
import { BookingDetailScreen } from '../screens/customer/BookingDetailScreen';
import { AIChatScreen } from '../screens/customer/AIChatScreen';
import { NotificationsScreen } from '../screens/customer/NotificationsScreen';
import { PrivacyPolicyScreen } from '../screens/shared/PrivacyPolicyScreen';
import { TermsScreen } from '../screens/shared/TermsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const CustomerTabNavigator: React.FC = () => {
  const r = useResponsive();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'AIChat':
              iconName = focused ? 'chat' : 'chat-outline';
              break;
            case 'MyBookings':
              iconName = focused ? 'calendar-check' : 'calendar-check-outline';
              break;
            case 'Profile':
              iconName = focused ? 'account' : 'account-outline';
              break;
            default:
              iconName = 'circle';
          }

          const iconSize = r.isTablet ? size * 1.2 : size;
          return <Icon name={iconName} size={iconSize} color={color} />;
        },
        // Dark theme tab bar styling
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily.secondary,
          fontSize: r.isTablet ? 14 : 12,
        },
        // Dark theme header styling
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.foreground,
        headerTitleStyle: {
          fontFamily: typography.fontFamily.primarySemiBold,
          color: colors.foreground,
        },
        headerShown: true,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '首頁',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="AIChat"
        component={AIChatScreen}
        options={{ title: '小安', headerShown: false }}
      />
      <Tab.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{ title: '預約', headerTitle: '我的預約' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{ title: '個人', headerShown: false }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { session, user, loading } = useAuth();

  // Hide splash screen once auth state is resolved
  // Uses onReady callback for NavigationContainer to ensure
  // the first meaningful frame is fully rendered before hiding
  const onNavigationReady = useCallback(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  // Return null while loading — native splash screen stays visible
  if (loading) {
    return null;
  }

  // Select navigator based on role
  const isBarber = user?.role === 'barber' || user?.role === 'owner';

  // Authenticated: has a valid session
  const isAuthenticated = !!session;

  // Dark navigation theme
  const navigationTheme = {
    ...DefaultTheme,
    dark: true,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.foreground,
      border: colors.border,
      notification: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme} onReady={onNavigationReady}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen
              name="Main"
              component={isBarber ? BarberTabNavigator : CustomerTabNavigator}
            />
            <Stack.Screen
              name="BookingFlow"
              component={BookingNavigator}
              options={{
                headerShown: false,
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="BookingDetail"
              component={BookingDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={LoginScreen} />
        )}
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="Terms"
          component={TermsScreen}
          options={{ headerShown: false, presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
