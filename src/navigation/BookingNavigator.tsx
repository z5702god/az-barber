import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BookingStackParamList } from './types';

import { SelectServicesScreen } from '../screens/booking/SelectServicesScreen';
import { SelectTimeScreen } from '../screens/booking/SelectTimeScreen';
import { ConfirmBookingScreen } from '../screens/booking/ConfirmBookingScreen';
import { BookingSuccessScreen } from '../screens/booking/BookingSuccessScreen';

const Stack = createNativeStackNavigator<BookingStackParamList>();

export const BookingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: '返回',
      }}
    >
      <Stack.Screen
        name="SelectServices"
        component={SelectServicesScreen}
        options={{ title: '選擇服務' }}
      />
      <Stack.Screen
        name="SelectDateTime"
        component={SelectTimeScreen}
        options={{ title: '選擇時段' }}
      />
      <Stack.Screen
        name="ConfirmBooking"
        component={ConfirmBookingScreen}
        options={{ title: '確認預約' }}
      />
      <Stack.Screen
        name="BookingSuccess"
        component={BookingSuccessScreen}
        options={{ title: '預約成功', headerShown: false }}
      />
    </Stack.Navigator>
  );
};
