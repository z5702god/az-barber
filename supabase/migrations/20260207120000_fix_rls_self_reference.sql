-- Fix RLS policies on users table
-- The previous "Owners can read all user profiles" policy had a self-referencing
-- query that caused circular RLS evaluation errors.

-- Drop both policies (may or may not exist from previous migration)
DROP POLICY IF EXISTS "Barbers can read customer profiles for their bookings" ON users;
DROP POLICY IF EXISTS "Owners can read all user profiles" ON users;

-- Allow barbers to read customer profiles for their bookings
-- Without this, barbers see "顧客" instead of actual customer names
CREATE POLICY "Barbers can read customer profiles for their bookings"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN barbers ON barbers.id = bookings.barber_id
      WHERE bookings.customer_id = users.id
        AND barbers.user_id = auth.uid()
    )
  );

-- Create SECURITY DEFINER function to safely check user role
-- This bypasses RLS to prevent circular evaluation when used in users table policies
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- Allow owners to read all user profiles (uses function to avoid self-reference)
CREATE POLICY "Owners can read all user profiles"
  ON users FOR SELECT
  USING (public.get_my_role() = 'owner');
