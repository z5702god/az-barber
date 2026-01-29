import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Booking } from '../types';

// 取得理髮師特定日期的預約
export function useBarberBookings(barberId: string, date: string) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!barberId || !date) return;

    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:users!bookings_customer_id_fkey(id, name, phone),
          services:booking_services(service:services(*))
        `)
        .eq('barber_id', barberId)
        .eq('booking_date', date)
        .order('start_time');

      if (fetchError) throw fetchError;
      setBookings(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [barberId, date]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return { bookings, loading, error, refetch: fetchBookings };
}

// 取得理髮師今日摘要統計
export function useBarberTodayStats(barberId: string) {
  const [stats, setStats] = useState({
    bookingCount: 0,
    estimatedRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!barberId) return;

    const fetchStats = async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('bookings')
        .select('total_price, status')
        .eq('barber_id', barberId)
        .eq('booking_date', today)
        .in('status', ['confirmed', 'completed']);

      if (!error && data) {
        setStats({
          bookingCount: data.length,
          estimatedRevenue: data.reduce((sum, b) => sum + (b.total_price || 0), 0),
        });
      }
      setLoading(false);
    };

    fetchStats();
  }, [barberId]);

  return { stats, loading };
}

// 更新預約狀態
export function useUpdateBookingStatus() {
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (bookingId: string, status: 'completed' | 'cancelled') => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setUpdating(false);
    }
  };

  return { updateStatus, updating };
}
