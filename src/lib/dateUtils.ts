import dayjs from 'dayjs';

export const eachDayOfInterval = ({ start, end }: { start: Date; end: Date }): Date[] => {
  const days: Date[] = [];
  let current = dayjs(start).startOf('day');
  const last = dayjs(end).startOf('day');

  while (current.isBefore(last) || current.isSame(last, 'day')) {
    days.push(current.toDate());
    current = current.add(1, 'day');
  }

  return days;
};

export const addMonths = (date: Date, amount: number): Date => {
  return dayjs(date).add(amount, 'month').toDate();
};

export const isSameMonth = (date1: Date, date2: Date): boolean => {
  return dayjs(date1).isSame(dayjs(date2), 'month');
};

export const isToday = (date: Date | string): boolean => {
  return dayjs(date).isSame(dayjs(), 'day');
};
