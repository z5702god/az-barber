import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BookingStackParamList } from './types';
import { colors, spacing, typography } from '../theme';

import { SelectServicesScreen } from '../screens/booking/SelectServicesScreen';
import { SelectTimeScreen } from '../screens/booking/SelectTimeScreen';
import { ConfirmBookingScreen } from '../screens/booking/ConfirmBookingScreen';
import { BookingSuccessScreen } from '../screens/booking/BookingSuccessScreen';

const Stack = createNativeStackNavigator<BookingStackParamList>();

// Custom header component
const CustomHeader = ({ title, showClose = false }: { title: string; showClose?: boolean }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        {showClose ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerButton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
});

export const BookingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="SelectServices"
        component={SelectServicesScreen}
        options={{
          header: () => <CustomHeader title="選擇服務" showClose />,
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="SelectDateTime"
        component={SelectTimeScreen}
        options={{
          header: () => <CustomHeader title="選擇時間" />,
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="ConfirmBooking"
        component={ConfirmBookingScreen}
        options={{
          header: () => <CustomHeader title="確認預約" />,
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="BookingSuccess"
        component={BookingSuccessScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};
