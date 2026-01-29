import { NavigatorScreenParams } from '@react-navigation/native';
import { Service } from '../types';

// 根導航參數
export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  BarberMain: NavigatorScreenParams<BarberTabParamList>; // 新增
  BookingFlow: NavigatorScreenParams<BookingStackParamList>;
};

// 顧客 Tab 導航參數
export type MainTabParamList = {
  Home: undefined;
  Booking: undefined;
  MyBookings: undefined;
  Profile: undefined;
};

// 理髮師 Tab 導航參數 (新增)
export type BarberTabParamList = {
  BarberHome: undefined;
  BookingCalendar: undefined;
  Availability: undefined;
  Stats: undefined;
  BarberProfile: undefined;
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

// 管理端導航參數（保留給未來店主使用）
export type ManageStackParamList = {
  Dashboard: undefined;
  MySchedule: undefined;
  Availability: undefined;
  StaffManagement: undefined;
  ServiceManagement: undefined;
  Reports: undefined;
  CustomerManagement: undefined;
};
