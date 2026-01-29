import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Availability } from '../types';

const DAY_NAMES = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

export function useWeeklyAvailability(barberId: string) {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAvailability = useCallback(async () => {
    if (!barberId) return;

    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('barber_id', barberId)
      .is('specific_date', null)
      .order('day_of_week');

    if (!error) {
      setAvailability(data || []);
    }
    setLoading(false);
  }, [barberId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const updateDayAvailability = async (
    dayOfWeek: number,
    startTime: string | null,
    endTime: string | null
  ) => {
    const existing = availability.find(a => a.day_of_week === dayOfWeek);

    if (startTime === null || endTime === null) {
      // 設為休息 - 刪除該紀錄
      if (existing) {
        await supabase.from('availability').delete().eq('id', existing.id);
      }
    } else if (existing) {
      // 更新現有紀錄
      await supabase
        .from('availability')
        .update({ start_time: startTime, end_time: endTime })
        .eq('id', existing.id);
    } else {
      // 新增紀錄
      await supabase.from('availability').insert({
        barber_id: barberId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_exception: false,
      });
    }

    fetchAvailability();
  };

  return { availability, loading, refetch: fetchAvailability, updateDayAvailability, DAY_NAMES };
}

export function useExceptionDates(barberId: string) {
  const [exceptions, setExceptions] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExceptions = useCallback(async () => {
    if (!barberId) return;

    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('barber_id', barberId)
      .not('specific_date', 'is', null)
      .eq('is_exception', true)
      .gte('specific_date', new Date().toISOString().split('T')[0])
      .order('specific_date');

    if (!error) {
      setExceptions(data || []);
    }
    setLoading(false);
  }, [barberId]);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  const addException = async (startDate: string, endDate: string, note?: string) => {
    const dates: string[] = [];
    let current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    const records = dates.map(date => ({
      barber_id: barberId,
      specific_date: date,
      start_time: '00:00',
      end_time: '00:00',
      is_exception: true,
    }));

    await supabase.from('availability').insert(records);
    fetchExceptions();
  };

  const removeException = async (id: string) => {
    await supabase.from('availability').delete().eq('id', id);
    fetchExceptions();
  };

  return { exceptions, loading, addException, removeException, refetch: fetchExceptions };
}
