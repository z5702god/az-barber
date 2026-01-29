import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAuth } from '../hooks/useAuth';
import { RootStackParamList, MainTabParamList } from './types';

// Navigators
import { BookingNavigator } from './BookingNavigator';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { HomeScreen } from '../screens/customer/HomeScreen';
import { MyBookingsScreen } from '../screens/customer/MyBookingsScreen';
import { ProfileScreen } from '../screens/customer/ProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Booking':
              iconName = focused ? 'calendar-plus' : 'calendar-plus';
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

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: '首頁', headerTitle: 'AZ Barber' }}
      />
      <Tab.Screen
        name="Booking"
        component={HomeScreen}
        options={{ title: '預約', headerTitle: '預約服務' }}
      />
      <Tab.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{ title: '我的預約', headerTitle: '我的預約' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: '個人', headerTitle: '個人資料' }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return null; // 或顯示 loading 畫面
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen
              name="BookingFlow"
              component={BookingNavigator}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
