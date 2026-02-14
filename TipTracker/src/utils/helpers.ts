import { TipEntry } from '../types';

export function totalTips(entry: TipEntry): number {
  return entry.cashTips + entry.cardTips - entry.tipOut;
}

export function hourlyRate(entry: TipEntry): number {
  if (entry.hoursWorked === 0) return 0;
  return totalTips(entry) / entry.hoursWorked;
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatCurrencyShort(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${Math.round(amount)}`;
}

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getEntriesForMonth(entries: TipEntry[], year: number, month: number): TipEntry[] {
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  return entries.filter(e => e.date.startsWith(key));
}

export function getEntriesForWeek(entries: TipEntry[], date: Date): TipEntry[] {
  const start = getWeekStart(date);
  const end = getWeekEnd(date);
  return entries.filter(e => {
    const d = parseDate(e.date);
    return d >= start && d <= end;
  });
}

export function averageTipsPerShift(entries: TipEntry[]): number {
  if (entries.length === 0) return 0;
  const total = entries.reduce((sum, e) => sum + totalTips(e), 0);
  return total / entries.length;
}

export function averageHourlyRate(entries: TipEntry[]): number {
  if (entries.length === 0) return 0;
  const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked, 0);
  if (totalHours === 0) return 0;
  const totalEarnings = entries.reduce((sum, e) => sum + totalTips(e), 0);
  return totalEarnings / totalHours;
}

export function totalEarnings(entries: TipEntry[]): number {
  return entries.reduce((sum, e) => sum + totalTips(e), 0);
}

export function totalHours(entries: TipEntry[]): number {
  return entries.reduce((sum, e) => sum + e.hoursWorked, 0);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export { MONTH_NAMES, MONTH_SHORT, DAY_NAMES };
