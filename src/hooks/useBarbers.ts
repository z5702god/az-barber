import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Barber } from '../types';

const FETCH_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

/**
 * Hook to fetch active barbers from the database
 * Includes timeout and retry logic to prevent indefinite loading
 */
export function useBarbers() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef(0);

  const fetchBarbers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Race between fetch and timeout
      const result = await Promise.race([
        supabase
          .from('barbers')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: true }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('請求逾時')), FETCH_TIMEOUT_MS)
        ),
      ]);

      const { data, error: fetchError } = result as any;

      if (fetchError) throw fetchError;

      setBarbers(data || []);
      retryCount.current = 0;
    } catch (err: any) {
      if (__DEV__) console.error('Error fetching barbers:', err);

      // Auto-retry
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current += 1;
        setTimeout(() => fetchBarbers(), 1500);
        return;
      }

      setError(err.message || '無法載入設計師資料');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBarbers();
  }, [fetchBarbers]);

  return { barbers, loading, error, refetch: fetchBarbers };
}
