import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
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
          customer:users!bookings_customer_id_fkey(id, name, email, phone),
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
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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

// 取得理髮師特定月份的預約日期（用於行事曆標記）
export function useBarberMonthlyBookingDates(barberId: string, yearMonth: string) {
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonthlyDates = useCallback(async () => {
    if (!barberId || !yearMonth) return;

    setLoading(true);
    try {
      // yearMonth format: "2024-01"
      const [year, month] = yearMonth.split('-').map(Number);
      const startDate = `${yearMonth}-01`;
      // 計算該月最後一天（下個月的第 0 天 = 這個月最後一天）
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select('booking_date')
        .eq('barber_id', barberId)
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .neq('status', 'cancelled');

      if (fetchError) throw fetchError;

      // Get unique dates
      const uniqueDates = [...new Set(data?.map(b => b.booking_date) || [])];
      setBookedDates(uniqueDates);
    } catch (err: any) {
      if (__DEV__) console.error('Error fetching monthly dates:', err);
    } finally {
      setLoading(false);
    }
  }, [barberId, yearMonth]);

  useEffect(() => {
    fetchMonthlyDates();
  }, [fetchMonthlyDates]);

  return { bookedDates, loading, refetch: fetchMonthlyDates };
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

  // 取消預約並附帶原因（會觸發推播通知）
  const cancelBooking = async (bookingId: string, reason: string, barberName: string) => {
    setUpdating(true);
    try {
      // 1. 更新預約狀態和取消原因
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_by: 'barber',
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      // 2. 嘗試發送推播通知（如果 push_token 存在）
      try {
        const { data: booking } = await supabase
          .from('bookings')
          .select(`
            booking_date,
            start_time,
            customer:users!bookings_customer_id_fkey(id, name)
          `)
          .eq('id', bookingId)
          .single();

        const customer = booking?.customer as any as { id: string; name: string } | null;
        if (customer?.id) {
          // 從 push_tokens 表取得 token
          const { data: pushTokenData } = await supabase
            .from('push_tokens')
            .select('token')
            .eq('user_id', customer.id)
            .single();

          if (pushTokenData?.token) {
            const formattedDate = new Date(booking!.booking_date).toLocaleDateString('zh-TW', {
              month: 'long',
              day: 'numeric',
            });
            const formattedTime = booking!.start_time?.slice(0, 5) || '';

            await supabase.functions.invoke('send-cancellation-notification', {
              body: {
                pushToken: pushTokenData.token,
                customerName: customer.name,
                barberName,
                bookingDate: formattedDate,
                bookingTime: formattedTime,
                cancellationReason: reason,
              },
            });
          }
        }
      } catch (notifyError) {
        // 推播失敗不影響取消結果，只記錄錯誤
        if (__DEV__) console.error('Push notification skipped or failed:', notifyError);
      }

      return { success: true };
    } catch (err: any) {
      if (__DEV__) console.error('Cancel booking error:', err);
      return { success: false, error: err.message };
    } finally {
      setUpdating(false);
    }
  };

  return { updateStatus, cancelBooking, updating };
}
