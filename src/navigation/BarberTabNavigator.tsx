import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { BarberTabParamList } from './types';
import {
  BarberHomeScreen,
  BookingCalendarScreen,
  AvailabilityScreen,
  StatsScreen,
} from '../screens/barber';
import { BarberProfileStackNavigator } from './BarberProfileStackNavigator';
import { useResponsive } from '../hooks/useResponsive';
import { colors, typography } from '../theme';

const Tab = createBottomTabNavigator<BarberTabParamList>();

export const BarberTabNavigator: React.FC = () => {
  const r = useResponsive();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'BarberHome':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'BookingCalendar':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Availability':
              iconName = focused ? 'clock' : 'clock-outline';
              break;
            case 'Stats':
              iconName = focused ? 'chart-bar' : 'chart-bar';
              break;
            case 'BarberProfile':
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
        name="BarberHome"
        component={BarberHomeScreen}
        options={{ title: '首頁', headerTitle: 'AZ Barber' }}
      />
      <Tab.Screen
        name="BookingCalendar"
        component={BookingCalendarScreen}
        options={{ title: '預約', headerTitle: '預約行事曆' }}
      />
      <Tab.Screen
        name="Availability"
        component={AvailabilityScreen}
        options={{ title: '時段', headerTitle: '營業時段設定' }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{ title: '統計', headerTitle: '營業統計' }}
      />
      <Tab.Screen
        name="BarberProfile"
        component={BarberProfileStackNavigator}
        options={{ title: '個人', headerShown: false }}
      />
    </Tab.Navigator>
  );
};
