import { Availability, Booking, TimeSlot } from '../types';

/**
 * Generate 30-minute time slots for a given availability window
 */
export const generateTimeSlots = (
  startTime: string,
  endTime: string,
  intervalMinutes: number = 30
): string[] => {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  while (currentMinutes < endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
    currentMinutes += intervalMinutes;
  }

  return slots;
};

/**
 * Check if a time slot has enough consecutive time for the service duration
 */
export const isSlotAvailable = (
  slotStart: string,
  requiredDuration: number,
  availabilityEnd: string,
  existingBookings: Booking[]
): boolean => {
  const [slotHour, slotMin] = slotStart.split(':').map(Number);
  const slotStartMinutes = slotHour * 60 + slotMin;
  const slotEndMinutes = slotStartMinutes + requiredDuration;

  // Check if slot fits within availability window
  const [endHour, endMin] = availabilityEnd.split(':').map(Number);
  const availEndMinutes = endHour * 60 + endMin;

  if (slotEndMinutes > availEndMinutes) {
    return false;
  }

  // Check for conflicts with existing bookings
  for (const booking of existingBookings) {
    if (booking.status === 'cancelled') continue;

    const [bookStartHour, bookStartMin] = booking.start_time.split(':').map(Number);
    const [bookEndHour, bookEndMin] = booking.end_time.split(':').map(Number);
    const bookStartMinutes = bookStartHour * 60 + bookStartMin;
    const bookEndMinutes = bookEndHour * 60 + bookEndMin;

    // Check for overlap
    if (slotStartMinutes < bookEndMinutes && slotEndMinutes > bookStartMinutes) {
      return false;
    }
  }

  return true;
};

/**
 * Check if a time slot is in the past (for today's date)
 */
export const isSlotInPast = (slotTime: string, selectedDate: string): boolean => {
  const today = formatDate(new Date());
  if (selectedDate !== today) {
    return false;
  }

  const now = new Date();
  const [slotHour, slotMin] = slotTime.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const slotMinutes = slotHour * 60 + slotMin;

  return slotMinutes <= currentMinutes;
};

/**
 * Get available time slots for a specific date
 */
export const getAvailableSlots = (
  availability: Availability | null,
  existingBookings: Booking[],
  requiredDuration: number,
  selectedDate?: string
): TimeSlot[] => {
  if (!availability) {
    return [];
  }

  const allSlots = generateTimeSlots(availability.start_time, availability.end_time);
  const dateToCheck = selectedDate || formatDate(new Date());

  return allSlots.map(slot => ({
    start_time: slot,
    end_time: addMinutesToTime(slot, requiredDuration),
    available: !isSlotInPast(slot, dateToCheck) &&
               isSlotAvailable(slot, requiredDuration, availability.end_time, existingBookings),
  }));
};

/**
 * Add minutes to a time string
 */
export const addMinutesToTime = (time: string, minutes: number): string => {
  const [hour, min] = time.split(':').map(Number);
  const totalMinutes = hour * 60 + min + minutes;
  const newHour = Math.floor(totalMinutes / 60);
  const newMin = totalMinutes % 60;
  return `${newHour.toString().padStart(2, '0')}:${newMin.toString().padStart(2, '0')}`;
};

/**
 * Format date to YYYY-MM-DD
 */
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Get day of week (0 = Sunday, 6 = Saturday)
 */
export const getDayOfWeek = (date: Date): number => {
  return date.getDay();
};
