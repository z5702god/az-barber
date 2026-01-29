import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

interface Stats {
  totalRevenue: number;
  completedCount: number;
  cancelledCount: number;
  avgPrice: number;
}

interface ServiceRank {
  name: string;
  count: number;
  revenue: number;
}

interface CustomerHistory {
  id: string;
  name: string;
  visitCount: number;
  totalSpent: number;
  lastVisit: string;
}

export function useBarberStats(barberId: string, startDate: string, endDate: string) {
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    completedCount: 0,
    cancelledCount: 0,
    avgPrice: 0,
  });
  const [topServices, setTopServices] = useState<ServiceRank[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<CustomerHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!barberId) return;
    setLoading(true);

    // 取得預約統計
    const { data: bookings } = await supabase
      .from('bookings')
      .select('total_price, status')
      .eq('barber_id', barberId)
      .gte('booking_date', startDate)
      .lte('booking_date', endDate);

    if (bookings) {
      const completed = bookings.filter(b => b.status === 'completed');
      const cancelled = bookings.filter(b => b.status === 'cancelled');
      const revenue = completed.reduce((sum, b) => sum + (b.total_price || 0), 0);

      setStats({
        totalRevenue: revenue,
        completedCount: completed.length,
        cancelledCount: cancelled.length,
        avgPrice: completed.length > 0 ? Math.round(revenue / completed.length) : 0,
      });
    }

    // 取得熱門服務（簡化版）
    const { data: serviceData } = await supabase
      .from('booking_services')
      .select(`
        service:services(name, price),
        booking:bookings!inner(barber_id, status, booking_date)
      `)
      .eq('booking.barber_id', barberId)
      .eq('booking.status', 'completed')
      .gte('booking.booking_date', startDate)
      .lte('booking.booking_date', endDate);

    if (serviceData) {
      const serviceMap = new Map<string, { count: number; revenue: number }>();
      serviceData.forEach((item: any) => {
        const name = item.service?.name || 'Unknown';
        const price = item.service?.price || 0;
        const existing = serviceMap.get(name) || { count: 0, revenue: 0 };
        serviceMap.set(name, {
          count: existing.count + 1,
          revenue: existing.revenue + price,
        });
      });

      const ranked = Array.from(serviceMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      setTopServices(ranked);
    }

    // 取得近期顧客
    const { data: customerData } = await supabase
      .from('bookings')
      .select(`
        customer_id,
        total_price,
        booking_date,
        customer:users!bookings_customer_id_fkey(id, name)
      `)
      .eq('barber_id', barberId)
      .eq('status', 'completed')
      .order('booking_date', { ascending: false })
      .limit(50);

    if (customerData) {
      const customerMap = new Map<string, CustomerHistory>();
      customerData.forEach((item: any) => {
        const customerId = item.customer_id;
        const existing = customerMap.get(customerId);
        if (existing) {
          existing.visitCount += 1;
          existing.totalSpent += item.total_price || 0;
        } else {
          customerMap.set(customerId, {
            id: customerId,
            name: item.customer?.name || 'Unknown',
            visitCount: 1,
            totalSpent: item.total_price || 0,
            lastVisit: item.booking_date,
          });
        }
      });

      const sorted = Array.from(customerMap.values())
        .sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime())
        .slice(0, 10);

      setRecentCustomers(sorted);
    }

    setLoading(false);
  }, [barberId, startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, topServices, recentCustomers, loading };
}
