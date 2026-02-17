export interface TipEntry {
  id: string;
  date: string; // YYYY-MM-DD
  hoursWorked: number;
  startTime?: string; // HH:MM AM/PM format
  endTime?: string; // HH:MM AM/PM format
  cashTips: number;
  cardTips: number;
  tipOut: number;
  totalSales?: number;
  shiftType: 'lunch' | 'dinner' | 'double' | 'other';
  notes?: string;
  workplaceId?: string;
}

export interface Goal {
  id: string;
  type: 'weekly' | 'monthly' | 'custom';
  amount: number;
  name?: string; // Only for custom goals
  contributionPerShift?: number; // Only for custom goals
  totalContributed?: number; // Only for custom goals
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  contributionPerShift: number;
  totalContributed: number;
  createdAt: string;
}

export interface WageRate {
  id: string;
  effectiveDate: string; // YYYY-MM-DD
  hourlyWage: number;
  overtimeRate?: number;
}

export interface Workplace {
  id: string;
  name: string;
  role?: string;
  wageHistory: WageRate[];
}

export interface UserProfile {
  name?: string;
  workplace?: string;
  role?: string;
  hourlyWage?: number;
  tipMethod?: 'cash' | 'card' | 'both' | 'pooled';
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun, 1=Mon, ..., 6=Sat
  dailyGoal?: number;
  monthlyGoal?: number;
  yearlyGoal?: number;
  savingsGoal?: SavingsGoal;
  onboardingCompleted: boolean;
}

export interface AppData {
  entries: TipEntry[];
  goals: Goal[];
  profile: UserProfile;
  daysOff?: string[];
  workplaces?: Workplace[];
}

export type ShiftType = TipEntry['shiftType'];
