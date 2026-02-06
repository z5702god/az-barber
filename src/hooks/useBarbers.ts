import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Barber } from '../types';

/**
 * Hook to fetch active barbers from the database
 */
export function useBarbers() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBarbers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('barbers')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setBarbers(data || []);
    } catch (err: any) {
      if (__DEV__) console.error('Error fetching barbers:', err);
      setError(err.message || 'Failed to fetch barbers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBarbers();
  }, [fetchBarbers]);

  return { barbers, loading, error, refetch: fetchBarbers };
}
