import { NavigatorScreenParams } from '@react-navigation/native';
import { Service } from '../types';

// Root navigation params
export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  BarberMain: NavigatorScreenParams<BarberTabParamList>;
  BookingFlow: NavigatorScreenParams<BookingStackParamList>;
  BookingDetail: { bookingId: string };
  Notifications: undefined;
  PrivacyPolicy: undefined;
  Terms: undefined;
};

// Customer tab navigation params
export type MainTabParamList = {
  Home: undefined;
  AIChat: undefined;
  MyBookings: undefined;
  Profile: undefined;
};

// Barber tab navigation params
export type BarberTabParamList = {
  BarberHome: undefined;
  BookingCalendar: undefined;
  Availability: undefined;
  Stats: undefined;
  BarberProfile: undefined;
};

// Booking flow navigation params
export type BookingStackParamList = {
  SelectServices: { barberId: string };
  SelectDateTime: {
    barberId: string;
    selectedServices: Service[];
    totalDuration: number;
    totalPrice: number;
  };
  ConfirmBooking: {
    barberId: string;
    selectedServices: Service[];
    date: string;
    startTime: string;
    endTime: string;
    totalDuration: number;
    totalPrice: number;
  };
  BookingSuccess: { bookingId: string };
};

// Profile stack navigation params (Customer)
export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  NotificationSettings: undefined;
  AboutUs: undefined;
  PrivacyPolicy: undefined;
  Terms: undefined;
};

// Barber profile stack navigation params
export type BarberProfileStackParamList = {
  BarberProfileMain: undefined;
  EditProfile: undefined;
  NotificationSettings: undefined;
  AboutUs: undefined;
  PrivacyPolicy: undefined;
  Terms: undefined;
};
