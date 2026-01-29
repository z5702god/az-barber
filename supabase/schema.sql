-- AZ Barber App - Supabase Schema
-- 在 Supabase Dashboard > SQL Editor 執行此腳本

-- 啟用必要的擴充
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- 1. 使用者資料表
-- =====================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'barber', 'owner')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 建立更新時間觸發器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================
-- 2. 理髮師資料表
-- =====================
CREATE TABLE barbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TRIGGER barbers_updated_at
  BEFORE UPDATE ON barbers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================
-- 3. 服務項目資料表
-- =====================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  price INTEGER NOT NULL CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================
-- 4. 可預約時段資料表
-- =====================
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
  specific_date DATE, -- 用於特定日期的例外設定
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_exception BOOLEAN NOT NULL DEFAULT FALSE, -- true = 請假或特別營業
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (start_time < end_time),
  CHECK ((day_of_week IS NOT NULL AND specific_date IS NULL) OR (day_of_week IS NULL AND specific_date IS NOT NULL))
);

-- =====================
-- 5. 預約資料表
-- =====================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration INTEGER NOT NULL CHECK (total_duration > 0), -- 分鐘
  total_price INTEGER NOT NULL CHECK (total_price >= 0),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (start_time < end_time)
);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================
-- 6. 預約服務項目關聯表（多對多）
-- =====================
CREATE TABLE booking_services (
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (booking_id, service_id)
);

-- =====================
-- 索引
-- =====================
CREATE INDEX idx_barbers_user_id ON barbers(user_id);
CREATE INDEX idx_barbers_status ON barbers(status);
CREATE INDEX idx_availability_barber_id ON availability(barber_id);
CREATE INDEX idx_availability_day_of_week ON availability(day_of_week);
CREATE INDEX idx_availability_specific_date ON availability(specific_date);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_barber_id ON bookings(barber_id);
CREATE INDEX idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);

-- =====================
-- Row Level Security (RLS)
-- =====================

-- 啟用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;

-- Users 政策
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Barbers 政策（所有人可讀取活躍理髮師）
CREATE POLICY "Anyone can read active barbers"
  ON barbers FOR SELECT
  USING (status = 'active');

CREATE POLICY "Owners can manage barbers"
  ON barbers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'owner'
    )
  );

-- Services 政策（所有人可讀取活躍服務）
CREATE POLICY "Anyone can read active services"
  ON services FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Owners can manage services"
  ON services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'owner'
    )
  );

-- Availability 政策
CREATE POLICY "Anyone can read availability"
  ON availability FOR SELECT
  USING (TRUE);

CREATE POLICY "Barbers can manage own availability"
  ON availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM barbers
      WHERE barbers.id = availability.barber_id
        AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage all availability"
  ON availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'owner'
    )
  );

-- Bookings 政策
CREATE POLICY "Customers can read own bookings"
  ON bookings FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update own bookings"
  ON bookings FOR UPDATE
  USING (customer_id = auth.uid());

CREATE POLICY "Barbers can read their bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM barbers
      WHERE barbers.id = bookings.barber_id
        AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Barbers can update their bookings"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM barbers
      WHERE barbers.id = bookings.barber_id
        AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage all bookings"
  ON bookings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'owner'
    )
  );

-- Booking Services 政策（跟隨 bookings 權限）
CREATE POLICY "Users can read booking_services for their bookings"
  ON booking_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_services.booking_id
        AND (
          bookings.customer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM barbers
            WHERE barbers.id = bookings.barber_id
              AND barbers.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.role = 'owner'
          )
        )
    )
  );

CREATE POLICY "Users can insert booking_services for their bookings"
  ON booking_services FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_services.booking_id
        AND bookings.customer_id = auth.uid()
    )
  );
