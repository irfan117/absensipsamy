import React, { createContext, useContext, useState, useEffect } from 'react';
import { AttendanceSettings } from '../types';
import { api } from '../services/api';
import { INITIAL_SETTINGS } from '../data/mockData';
import { useAuth } from './AuthContext';

interface SettingsContextType {
  settings: AttendanceSettings;
  tidbStatus: 'connected' | 'connecting' | 'error' | 'offline';
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<AttendanceSettings>) => Promise<{ success: boolean; message: string }>;
  resetToDefaultData: () => Promise<{ success: boolean; count: number; message: string }>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { jwtToken } = useAuth();
  const [settings, setSettings] = useState<AttendanceSettings>(INITIAL_SETTINGS);
  const [tidbStatus, setTidbStatus] = useState<'connected' | 'connecting' | 'error' | 'offline'>('connected');

  const refreshSettings = async () => {
    if (!jwtToken) return;
    try {
      const res = await api.getSettings();
      if (res.success && res.settings) {
        setSettings(res.settings);
      }
    } catch (err) {
      setTidbStatus('error');
      console.warn('API getSettings failed:', err);
    }
  };

  useEffect(() => {
    if (jwtToken) {
      void refreshSettings();
    }
  }, [jwtToken]);

  const updateSettings = async (newSettings: Partial<AttendanceSettings>) => {
    if (!jwtToken) return { success: false, message: 'User tidak terautentikasi.' };
    try {
      const merged = { ...settings, ...newSettings } as AttendanceSettings;
      const res = await api.saveAttendanceSettings(merged);
      if (res.success) {
        setSettings(merged);
      }
      return res;
    } catch (err) {
      return { success: false, message: 'Gagal memperbarui pengaturan.' };
    }
  };

  const resetToDefaultData = async () => {
    if (!jwtToken) return { success: false, count: 0, message: 'User tidak terautentikasi.' };
    try {
      const res = await api.resetToDefaultData(INITIAL_SETTINGS);
      if (res.success) {
        setSettings(INITIAL_SETTINGS);
      }
      return res;
    } catch (err) {
      return { success: false, count: 0, message: 'Gagal mereset pengaturan.' };
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        tidbStatus,
        refreshSettings,
        updateSettings,
        resetToDefaultData,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings harus digunakan di dalam SettingsProvider');
  return ctx;
};

export default SettingsContext;