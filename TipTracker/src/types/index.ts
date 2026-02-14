export interface TipEntry {
  id: string;
  date: string; // YYYY-MM-DD
  hoursWorked: number;
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

export interface AppData {
  entries: TipEntry[];
  goals: Goal[];
}

export type ShiftType = TipEntry['shiftType'];
