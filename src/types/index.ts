// 使用者角色
export type UserRole = 'customer' | 'barber' | 'owner';

// 性別選項
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

// 使用者偏好設定
export interface UserPreferences {
  booking_reminder: boolean;
  promo_notifications: boolean;
}

// 使用者
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
}

// 理髮師
export interface Barber {
  id: string;
  user_id: string;
  display_name: string;
  photo_url?: string;
  status: 'active' | 'inactive';
  created_at: string;
  user?: User;
}

// 服務項目
export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

// 可預約時段
export interface Availability {
  id: string;
  barber_id: string;
  day_of_week?: number; // 0-6, 0 = Sunday
  specific_date?: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  is_exception: boolean; // true = 請假或特別營業
}

// 預約狀態
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed';

// 預約
export interface Booking {
  id: string;
  customer_id: string;
  barber_id: string;
  booking_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  total_duration: number; // 分鐘
  total_price: number;
  status: BookingStatus;
  created_at: string;
  customer?: User;
  barber?: Barber;
  services?: Service[];
}

// 預約服務項目（多對多關聯）
export interface BookingService {
  booking_id: string;
  service_id: string;
}

// 時段選項
export interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
}
