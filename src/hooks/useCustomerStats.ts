import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { Booking } from '../types';
import { parseISO, differenceInHours, differenceInDays, isAfter, isSameDay } from 'date-fns';

export type CustomerState =
  | 'upcoming'       // 有即將到來的預約
  | 'just_completed' // 剛完成預約（48hr 內）
  | 'regular'        // 常客（3+ 次，21 天內有預約）
  | 'long_absence';  // 久未到訪（>21 天）

export interface CustomerStats {
  state: CustomerState;
  nextBooking: Booking | null;
  lastCompletedBooking: Booking | null;
  lastBooking: Booking | null;
  totalBookings: number;
  daysSinceLastVisit: number | null;
  loading: boolean;
}

export const useCustomerStats = (): CustomerStats => {
  const { user } = useAuth();
  const [stats, setStats] = useState<CustomerStats>({
    state: 'long_absence',
    nextBooking: null,
    lastCompletedBooking: null,
    lastBooking: null,
    totalBookings: 0,
    daysSinceLastVisit: null,
    loading: true,
  });

  const fetchStats = useCallback(async () => {
    if (!user) {
      setStats(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          barber:barbers(*),
          services:booking_services(service:services(*))
        `)
        .eq('customer_id', user.id)
        .order('booking_date', { ascending: false });

      if (error) throw error;

      const bookings = (data || []) as Booking[];
      const now = new Date();

      // Find next upcoming booking (confirmed, future date or today with future time)
      const upcomingBookings = bookings.filter(b => {
        if (b.status !== 'confirmed') return false;
        const bookingDate = parseISO(b.booking_date);
        if (isAfter(bookingDate, now)) return true;
        if (isSameDay(bookingDate, now)) {
          // Check if the booking time hasn't passed yet
          const [hours, minutes] = b.start_time.split(':').map(Number);
          const bookingTime = new Date(now);
          bookingTime.setHours(hours, minutes, 0, 0);
          return isAfter(bookingTime, now);
        }
        return false;
      });
      // Sort ascending to get the nearest upcoming
      upcomingBookings.sort((a, b) => {
        const dateA = parseISO(a.booking_date).getTime();
        const dateB = parseISO(b.booking_date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.start_time.localeCompare(b.start_time);
      });
      const nextBooking = upcomingBookings[0] || null;

      // Find last completed booking
      const completedBookings = bookings.filter(b => b.status === 'completed');
      const lastCompletedBooking = completedBookings[0] || null; // Already sorted desc

      // Find last booking of any non-cancelled status
      const activeBookings = bookings.filter(b => b.status !== 'cancelled');
      const lastBooking = activeBookings[0] || null;

      // Total non-cancelled bookings
      const totalBookings = activeBookings.length;

      // Days since last completed visit
      let daysSinceLastVisit: number | null = null;
      if (lastCompletedBooking) {
        daysSinceLastVisit = differenceInDays(now, parseISO(lastCompletedBooking.booking_date));
      }

      // Determine state (priority order)
      let state: CustomerState;

      if (nextBooking) {
        state = 'upcoming';
      } else if (lastCompletedBooking && differenceInHours(now, parseISO(lastCompletedBooking.booking_date)) <= 48) {
        state = 'just_completed';
      } else if (totalBookings >= 3 && daysSinceLastVisit !== null && daysSinceLastVisit <= 21) {
        state = 'regular';
      } else {
        state = 'long_absence';
      }

      setStats({
        state,
        nextBooking,
        lastCompletedBooking,
        lastBooking,
        totalBookings,
        daysSinceLastVisit,
        loading: false,
      });
    } catch (_e) {
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  return stats;
};
