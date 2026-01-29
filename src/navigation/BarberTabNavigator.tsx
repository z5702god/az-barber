import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { BarberTabParamList } from './types';
import {
  BarberHomeScreen,
  BookingCalendarScreen,
  AvailabilityScreen,
  StatsScreen,
  BarberProfileScreen,
} from '../screens/barber';

const Tab = createBottomTabNavigator<BarberTabParamList>();

export const BarberTabNavigator: React.FC = () => {
  const theme = useTheme();

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

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
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
        options={{ title: '預約', headerTitle: '預約管理' }}
      />
      <Tab.Screen
        name="Availability"
        component={AvailabilityScreen}
        options={{ title: '時段', headerTitle: '營業時段' }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{ title: '統計', headerTitle: '營業統計' }}
      />
      <Tab.Screen
        name="BarberProfile"
        component={BarberProfileScreen}
        options={{ title: '我的', headerTitle: '個人資料' }}
      />
    </Tab.Navigator>
  );
};
