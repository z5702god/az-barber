import { renderHook, waitFor } from '@testing-library/react-native';
import { useBarberBookings } from '../../hooks/useBarberData';

// Mock data
const mockBookings = [
  {
    id: '1',
    customer_id: 'c1',
    barber_id: 'b1',
    booking_date: '2026-01-29',
    start_time: '14:00',
    end_time: '14:30',
    total_price: 350,
    status: 'confirmed',
    customer: { id: 'c1', name: '王小明', phone: '0912345678' },
  },
];

jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockBookings, error: null }),
    })),
  },
}));

describe('useBarberBookings', () => {
  it('should fetch bookings for a barber on a specific date', async () => {
    const { result } = renderHook(() => useBarberBookings('b1', '2026-01-29'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bookings).toHaveLength(1);
    expect(result.current.bookings[0].customer?.name).toBe('王小明');
  });
});
