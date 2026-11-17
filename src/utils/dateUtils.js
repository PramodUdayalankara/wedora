import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  isYesterday,
  isPast,
  isFuture,
  startOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear
} from 'date-fns';

/**
 * Format date for business documents & tables
 * Example: 2026-11-16 -> 16 Nov 2026
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(date, 'dd MMM yyyy');
  } catch (err) {
    return String(dateStr);
  }
};

/**
 * Format datetime with timestamp
 * Example: 16 Nov 2026, 02:45 PM
 */
export const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '-';
  try {
    const date = typeof dateTimeStr === 'string' ? parseISO(dateTimeStr) : dateTimeStr;
    return format(date, 'dd MMM yyyy, hh:mm a');
  } catch (err) {
    return String(dateTimeStr);
  }
};

/**
 * Human friendly relative delivery date
 */
export const getDeliveryRelativeLabel = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return formatDate(date);
  } catch (err) {
    return dateStr;
  }
};

/**
 * Check delivery urgency state: 'overdue' | 'today' | 'upcoming' | 'completed'
 */
export const getDeliveryUrgency = (deliveryDateStr, orderStatus) => {
  if (!deliveryDateStr) return 'normal';
  if (orderStatus === 'Delivered' || orderStatus === 'Cancelled') {
    return 'completed';
  }

  try {
    const deliveryDate = startOfDay(parseISO(deliveryDateStr));
    const today = startOfDay(new Date());

    if (deliveryDate < today) {
      return 'overdue';
    } else if (deliveryDate.getTime() === today.getTime()) {
      return 'today';
    } else {
      return 'upcoming';
    }
  } catch (err) {
    return 'normal';
  }
};

/**
 * Get date range bounds based on filter keyword
 */
export const getDateRangeBounds = (rangeType) => {
  const now = new Date();
  switch (rangeType) {
    case 'today':
      return { start: startOfDay(now), end: now };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
    default:
      return null;
  }
};
