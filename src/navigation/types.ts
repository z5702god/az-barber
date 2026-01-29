import { NavigatorScreenParams } from '@react-navigation/native';
import { Service } from '../types';

// 根導航參數
export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  BookingFlow: { barberId: string };
};

// 主要 Tab 導航參數
export type MainTabParamList = {
  Home: undefined;
  Booking: undefined;
  MyBookings: undefined;
  Profile: undefined;
};

// 預約流程導航參數
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

// 管理端導航參數
export type ManageStackParamList = {
  Dashboard: undefined;
  MySchedule: undefined;
  Availability: undefined;
  // 店長專用
  StaffManagement: undefined;
  ServiceManagement: undefined;
  Reports: undefined;
  CustomerManagement: undefined;
};
