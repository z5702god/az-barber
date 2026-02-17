// User role
export type UserRole = 'customer' | 'barber' | 'owner';

// Gender options
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

// User preferences
export interface UserPreferences {
  booking_reminder: boolean;
  promo_notifications: boolean;
}

// User
export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: UserRole;
  avatar_url?: string;
  birthday?: string;
  gender?: Gender;
  preferences?: UserPreferences;
  created_at: string;
  // 只有理髮師才有這個欄位（barbers 表的 id）
  barber_id?: string;
}

// Barber
export interface Barber {
  id: string;
  user_id: string;
  display_name: string;
  photo_url?: string;
  status: 'active' | 'inactive';
  created_at: string;
  user?: User;
}

// Service
export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

// Availability slot
export interface Availability {
  id: string;
  barber_id: string;
  day_of_week?: number; // 0-6, 0 = Sunday
  specific_date?: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  is_exception: boolean; // true = day off or special hours
  description?: string; // 特殊休假說明
}

// Booking status
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed';

// Booking
export interface Booking {
  id: string;
  customer_id: string;
  barber_id: string;
  booking_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  total_duration: number; // minutes
  total_price: number;
  status: BookingStatus;
  created_at: string;
  customer?: User;
  barber?: Barber;
  services?: { service: Service }[];
  // 顧客備註
  customer_note?: string;
  note_updated_at?: string;
  // 取消相關
  cancellation_reason?: string;
  cancelled_by?: 'customer' | 'barber';
}

// Booking service (many-to-many relation)
export interface BookingService {
  booking_id: string;
  service_id: string;
}

// Time slot
export interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
}
