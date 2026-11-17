import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { settingsService } from '../services/dataService';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [settings, setSettings] = useState(null);
  const { user } = useAuth();

  const refreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!user) {
      setSettings(null);
      return;
    }

    const fetchSettings = async () => {
      try {
        const s = await settingsService.get();
        setSettings(s);
      } catch (err) {
        console.error('Failed to load settings', err);
      }
    };
    fetchSettings();
  }, [refreshTrigger, user]);

  const updateSettings = async (updates) => {
    const updated = await settingsService.update(updates);
    setSettings(updated);
    refreshData();
    return updated;
  };

  return (
    <DataContext.Provider
      value={{
        refreshTrigger,
        refreshData,
        settings,
        updateSettings
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
