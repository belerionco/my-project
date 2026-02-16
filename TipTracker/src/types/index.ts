export interface TipEntry {
  id: string;
  date: string; // YYYY-MM-DD
  hoursWorked: number;
  startTime?: string; // HH:MM AM/PM format
  endTime?: string; // HH:MM AM/PM format
  cashTips: number;
  cardTips: number;
  tipOut: number;
  shiftType: 'lunch' | 'dinner' | 'double' | 'other';
  notes?: string;
}

export interface Goal {
  id: string;
  type: 'weekly' | 'monthly';
  amount: number;
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

export interface UserProfile {
  name?: string;
  workplace?: string;
  role?: string;
  hourlyWage?: number;
  tipMethod?: 'cash' | 'card' | 'both' | 'pooled';
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
  daysOff?: string[]; // YYYY-MM-DD dates marked as days off
}

export type ShiftType = TipEntry['shiftType'];
