import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
const generateId = (): string =>
  Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10);
import { TipEntry, Goal, AppData, UserProfile, Workplace, WageRate } from '../types';

const STORAGE_KEY = '@tiptracker_data';

const DEFAULT_PROFILE: UserProfile = {
  onboardingCompleted: false,
};

interface AppContextType {
  entries: TipEntry[];
  goals: Goal[];
  profile: UserProfile;
  daysOff: string[];
  workplaces: Workplace[];
  addEntry: (entry: Omit<TipEntry, 'id'>) => void;
  updateEntry: (id: string, entry: Partial<TipEntry>) => void;
  deleteEntry: (id: string) => void;
  setGoal: (type: 'weekly' | 'monthly', amount: number) => void;
  addCustomGoal: (name: string, amount: number, contributionPerShift: number) => void;
  deleteGoal: (id: string) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  toggleDayOff: (date: string) => void;
  addWorkplace: (name: string, wage: number, role?: string, overtimeRate?: number) => string;
  updateWorkplace: (id: string, updates: Partial<Pick<Workplace, 'name' | 'role'>>) => void;
  deleteWorkplace: (id: string) => void;
  addWageRate: (workplaceId: string, effectiveDate: string, hourlyWage: number, overtimeRate?: number) => void;
  deleteWageRate: (workplaceId: string, rateId: string) => void;
  bulkImport: (newEntries: Omit<TipEntry, 'id'>[], newDaysOff: string[], newWorkplaces?: Workplace[]) => void;
  completeOnboarding: (profileData: Partial<UserProfile>) => void;
  resetOnboarding: () => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<TipEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [daysOff, setDaysOff] = useState<string[]>([]);
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const saveData = useCallback(async (data: AppData) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save data', e);
    }
  }, []);

  const loadData = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: AppData = JSON.parse(raw);
        setEntries(data.entries || []);
        setGoals(data.goals || []);
        setProfile(data.profile || DEFAULT_PROFILE);
        setDaysOff(data.daysOff || []);
        setWorkplaces(data.workplaces || []);
      }
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const addEntry = useCallback((entry: Omit<TipEntry, 'id'>) => {
    const newEntry: TipEntry = { ...entry, id: generateId() };
    setEntries(prev => {
      const updated = [...prev, newEntry];
      saveData({ entries: updated, goals, profile, daysOff, workplaces });
      return updated;
    });
  }, [goals, profile, daysOff, workplaces, saveData]);

  const updateEntry = useCallback((id: string, updates: Partial<TipEntry>) => {
    setEntries(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      saveData({ entries: updated, goals, profile, daysOff, workplaces });
      return updated;
    });
  }, [goals, profile, daysOff, workplaces, saveData]);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      saveData({ entries: updated, goals, profile, daysOff, workplaces });
      return updated;
    });
  }, [goals, profile, daysOff, workplaces, saveData]);

  const setGoal = useCallback((type: 'weekly' | 'monthly', amount: number) => {
    setGoals(prev => {
      const filtered = prev.filter(g => g.type !== type);
      const newGoal: Goal = { id: generateId(), type, amount, createdAt: new Date().toISOString() };
      const updated = [...filtered, newGoal];
      saveData({ entries, goals: updated, profile, daysOff, workplaces });
      return updated;
    });
  }, [entries, profile, daysOff, workplaces, saveData]);

  const addCustomGoal = useCallback((name: string, amount: number, contributionPerShift: number) => {
    setGoals(prev => {
      const newGoal: Goal = {
        id: generateId(),
        type: 'custom',
        name,
        amount,
        contributionPerShift,
        totalContributed: 0,
        createdAt: new Date().toISOString(),
      };
      const updated = [...prev, newGoal];
      saveData({ entries, goals: updated, profile, daysOff, workplaces });
      return updated;
    });
  }, [entries, profile, daysOff, workplaces, saveData]);

  const deleteGoal = useCallback((id: string) => {
    setGoals(prev => {
      const updated = prev.filter(g => g.id !== id);
      saveData({ entries, goals: updated, profile, daysOff, workplaces });
      return updated;
    });
  }, [entries, profile, daysOff, workplaces, saveData]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const updated = { ...prev, ...updates };
      saveData({ entries, goals, profile: updated, daysOff, workplaces });
      return updated;
    });
  }, [entries, goals, daysOff, workplaces, saveData]);

  const toggleDayOff = useCallback((date: string) => {
    setDaysOff(prev => {
      const updated = prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date];
      saveData({ entries, goals, profile, daysOff: updated, workplaces });
      return updated;
    });
  }, [entries, goals, profile, workplaces, saveData]);

  const addWorkplace = useCallback((name: string, wage: number, role?: string, overtimeRate?: number): string => {
    const id = generateId();
    const wageRate: WageRate = {
      id: generateId(),
      effectiveDate: '2000-01-01',
      hourlyWage: wage,
      overtimeRate,
    };
    const wp: Workplace = { id, name, role, wageHistory: [wageRate] };
    setWorkplaces(prev => {
      const updated = [...prev, wp];
      saveData({ entries, goals, profile, daysOff, workplaces: updated });
      return updated;
    });
    return id;
  }, [entries, goals, profile, daysOff, saveData]);

  const updateWorkplace = useCallback((id: string, updates: Partial<Pick<Workplace, 'name' | 'role'>>) => {
    setWorkplaces(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, ...updates } : w);
      saveData({ entries, goals, profile, daysOff, workplaces: updated });
      return updated;
    });
  }, [entries, goals, profile, daysOff, saveData]);

  const deleteWorkplace = useCallback((id: string) => {
    setWorkplaces(prev => {
      const updated = prev.filter(w => w.id !== id);
      saveData({ entries, goals, profile, daysOff, workplaces: updated });
      return updated;
    });
  }, [entries, goals, profile, daysOff, saveData]);

  const addWageRate = useCallback((workplaceId: string, effectiveDate: string, hourlyWage: number, overtimeRate?: number) => {
    const rate: WageRate = { id: generateId(), effectiveDate, hourlyWage, overtimeRate };
    setWorkplaces(prev => {
      const updated = prev.map(w => {
        if (w.id !== workplaceId) return w;
        return { ...w, wageHistory: [...w.wageHistory, rate] };
      });
      saveData({ entries, goals, profile, daysOff, workplaces: updated });
      return updated;
    });
  }, [entries, goals, profile, daysOff, saveData]);

  const deleteWageRate = useCallback((workplaceId: string, rateId: string) => {
    setWorkplaces(prev => {
      const updated = prev.map(w => {
        if (w.id !== workplaceId) return w;
        return { ...w, wageHistory: w.wageHistory.filter(r => r.id !== rateId) };
      });
      saveData({ entries, goals, profile, daysOff, workplaces: updated });
      return updated;
    });
  }, [entries, goals, profile, daysOff, saveData]);

  const bulkImport = useCallback((newEntries: Omit<TipEntry, 'id'>[], newDaysOff: string[], newWorkplaces?: Workplace[]) => {
    const entriesWithIds: TipEntry[] = newEntries.map(e => ({ ...e, id: generateId() }));
    setEntries(prev => {
      const updated = [...prev, ...entriesWithIds];
      const mergedDaysOff = [...new Set([...daysOff, ...newDaysOff])];
      const mergedWorkplaces = newWorkplaces ? [...workplaces, ...newWorkplaces] : workplaces;
      setDaysOff(mergedDaysOff);
      if (newWorkplaces) setWorkplaces(mergedWorkplaces);
      saveData({ entries: updated, goals, profile, daysOff: mergedDaysOff, workplaces: mergedWorkplaces });
      return updated;
    });
  }, [goals, profile, daysOff, workplaces, saveData]);

  const completeOnboarding = useCallback((profileData: Partial<UserProfile>) => {
    const updated: UserProfile = { ...profile, ...profileData, onboardingCompleted: true };
    setProfile(updated);

    // Create a Workplace from onboarding data
    let newWorkplaces = workplaces;
    if (profileData.workplace && profileData.workplace.trim()) {
      const wage = profileData.hourlyWage || 0;
      const wageRate: WageRate = {
        id: generateId(),
        effectiveDate: '2000-01-01',
        hourlyWage: wage,
      };
      const wp: Workplace = {
        id: generateId(),
        name: profileData.workplace.trim(),
        role: profileData.role,
        wageHistory: [wageRate],
      };
      newWorkplaces = [...workplaces, wp];
      setWorkplaces(newWorkplaces);
    }

    // Create Goal objects from onboarding goal amounts
    let newGoals = goals;
    if (profileData.monthlyGoal && profileData.monthlyGoal > 0) {
      const monthlyGoalObj: Goal = {
        id: generateId(),
        type: 'monthly',
        amount: profileData.monthlyGoal,
        createdAt: new Date().toISOString(),
      };
      newGoals = [...newGoals.filter(g => g.type !== 'monthly'), monthlyGoalObj];
    }
    if (profileData.dailyGoal && profileData.dailyGoal > 0) {
      // Convert daily goal to weekly (daily × 7)
      const weeklyGoalObj: Goal = {
        id: generateId(),
        type: 'weekly',
        amount: profileData.dailyGoal * 7,
        createdAt: new Date().toISOString(),
      };
      newGoals = [...newGoals.filter(g => g.type !== 'weekly'), weeklyGoalObj];
    }
    if (newGoals !== goals) {
      setGoals(newGoals);
    }

    saveData({ entries, goals: newGoals, profile: updated, daysOff, workplaces: newWorkplaces });
  }, [entries, goals, profile, daysOff, workplaces, saveData]);

  const resetOnboarding = useCallback(() => {
    const updated: UserProfile = { ...profile, onboardingCompleted: false };
    setProfile(updated);
    saveData({ entries, goals, profile: updated, daysOff, workplaces });
  }, [entries, goals, profile, daysOff, workplaces, saveData]);

  return (
    <AppContext.Provider value={{
      entries, goals, profile, daysOff, workplaces,
      addEntry, updateEntry, deleteEntry, setGoal, addCustomGoal, deleteGoal,
      updateProfile, toggleDayOff,
      addWorkplace, updateWorkplace, deleteWorkplace, addWageRate, deleteWageRate,
      bulkImport,
      completeOnboarding, resetOnboarding,
      isLoading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
