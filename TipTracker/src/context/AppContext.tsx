import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Simple unique ID generator (no crypto dependency)
const generateId = (): string =>
  Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10);
import { TipEntry, Goal, AppData, UserProfile, SavingsGoal } from '../types';

const STORAGE_KEY = '@tiptracker_data';

const DEFAULT_PROFILE: UserProfile = {
  onboardingCompleted: false,
};

interface AppContextType {
  entries: TipEntry[];
  goals: Goal[];
  profile: UserProfile;
  daysOff: string[];
  addEntry: (entry: Omit<TipEntry, 'id'>) => void;
  updateEntry: (id: string, entry: Partial<TipEntry>) => void;
  deleteEntry: (id: string) => void;
  setGoal: (type: 'weekly' | 'monthly', amount: number) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  toggleDayOff: (date: string) => void;
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
      saveData({ entries: updated, goals, profile, daysOff });
      return updated;
    });
  }, [goals, profile, daysOff, saveData]);

  const updateEntry = useCallback((id: string, updates: Partial<TipEntry>) => {
    setEntries(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      saveData({ entries: updated, goals, profile, daysOff });
      return updated;
    });
  }, [goals, profile, daysOff, saveData]);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      saveData({ entries: updated, goals, profile, daysOff });
      return updated;
    });
  }, [goals, profile, daysOff, saveData]);

  const setGoal = useCallback((type: 'weekly' | 'monthly', amount: number) => {
    setGoals(prev => {
      const filtered = prev.filter(g => g.type !== type);
      const newGoal: Goal = { id: generateId(), type, amount, createdAt: new Date().toISOString() };
      const updated = [...filtered, newGoal];
      saveData({ entries, goals: updated, profile, daysOff });
      return updated;
    });
  }, [entries, profile, daysOff, saveData]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const updated = { ...prev, ...updates };
      saveData({ entries, goals, profile: updated, daysOff });
      return updated;
    });
  }, [entries, goals, daysOff, saveData]);

  const toggleDayOff = useCallback((date: string) => {
    setDaysOff(prev => {
      const updated = prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date];
      saveData({ entries, goals, profile, daysOff: updated });
      return updated;
    });
  }, [entries, goals, profile, saveData]);

  const completeOnboarding = useCallback((profileData: Partial<UserProfile>) => {
    const updated: UserProfile = { ...profile, ...profileData, onboardingCompleted: true };
    setProfile(updated);
    saveData({ entries, goals, profile: updated, daysOff });
  }, [entries, goals, profile, daysOff, saveData]);

  const resetOnboarding = useCallback(() => {
    const updated: UserProfile = { ...profile, onboardingCompleted: false };
    setProfile(updated);
    saveData({ entries, goals, profile: updated, daysOff });
  }, [entries, goals, profile, daysOff, saveData]);

  return (
    <AppContext.Provider value={{
      entries, goals, profile, daysOff,
      addEntry, updateEntry, deleteEntry, setGoal,
      updateProfile, toggleDayOff, completeOnboarding, resetOnboarding,
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
