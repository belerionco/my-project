import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { TipEntry, Goal, AppData } from '../types';

const STORAGE_KEY = '@tiptracker_data';

interface AppContextType {
  entries: TipEntry[];
  goals: Goal[];
  addEntry: (entry: Omit<TipEntry, 'id'>) => void;
  updateEntry: (id: string, entry: Partial<TipEntry>) => void;
  deleteEntry: (id: string) => void;
  setGoal: (type: 'weekly' | 'monthly', amount: number) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<TipEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
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
      }
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const addEntry = useCallback((entry: Omit<TipEntry, 'id'>) => {
    const newEntry: TipEntry = { ...entry, id: uuidv4() };
    setEntries(prev => {
      const updated = [...prev, newEntry];
      saveData({ entries: updated, goals });
      return updated;
    });
  }, [goals, saveData]);

  const updateEntry = useCallback((id: string, updates: Partial<TipEntry>) => {
    setEntries(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      saveData({ entries: updated, goals });
      return updated;
    });
  }, [goals, saveData]);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      saveData({ entries: updated, goals });
      return updated;
    });
  }, [goals, saveData]);

  const setGoal = useCallback((type: 'weekly' | 'monthly', amount: number) => {
    setGoals(prev => {
      const filtered = prev.filter(g => g.type !== type);
      const newGoal: Goal = { id: uuidv4(), type, amount, createdAt: new Date().toISOString() };
      const updated = [...filtered, newGoal];
      saveData({ entries, goals: updated });
      return updated;
    });
  }, [entries, saveData]);

  return (
    <AppContext.Provider value={{ entries, goals, addEntry, updateEntry, deleteEntry, setGoal, isLoading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
