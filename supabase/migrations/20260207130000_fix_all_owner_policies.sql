-- Fix cross-table RLS circular dependency
-- Problem: Owner policies on barbers/services/bookings/availability all query
-- the users table directly. When users table has policies that query bookings,
-- and bookings has policies that query users, this creates infinite recursion.
-- Solution: Replace ALL direct users table queries with get_my_role() function
-- which uses SECURITY DEFINER to bypass RLS.

-- Ensure get_my_role() function exists
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- Fix barbers owner policy
DROP POLICY IF EXISTS "Owners can manage barbers" ON barbers;
CREATE POLICY "Owners can manage barbers"
  ON barbers FOR ALL
  USING (public.get_my_role() = 'owner');

-- Fix services owner policy
DROP POLICY IF EXISTS "Owners can manage services" ON services;
CREATE POLICY "Owners can manage services"
  ON services FOR ALL
  USING (public.get_my_role() = 'owner');

-- Fix availability owner policy
DROP POLICY IF EXISTS "Owners can manage all availability" ON availability;
CREATE POLICY "Owners can manage all availability"
  ON availability FOR ALL
  USING (public.get_my_role() = 'owner');

-- Fix bookings owner policy
DROP POLICY IF EXISTS "Owners can manage all bookings" ON bookings;
CREATE POLICY "Owners can manage all bookings"
  ON bookings FOR ALL
  USING (public.get_my_role() = 'owner');
