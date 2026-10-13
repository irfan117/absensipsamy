import React, { createContext, useContext, useState, useEffect } from 'react';
import { DailyReport } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface DailyReportContextType {
  dailyReports: DailyReport[];
  refreshDailyReports: () => Promise<void>;
  submitDailyReport: (data: {
    date: string;
    description: string;
    photoUrl?: string;
    photoName?: string;
    submissionLink?: string;
  }) => Promise<{ success: boolean; message: string }>;
  reviewDailyReport: (
    reportId: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string
  ) => Promise<{ success: boolean; message: string }>;
}

const DailyReportContext = createContext<DailyReportContextType | undefined>(undefined);

export const DailyReportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { jwtToken, currentUser } = useAuth();
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);

  const refreshDailyReports = async () => {
    if (!jwtToken) return;
    try {
      const res = await api.getDailyReports();
      if (res.success && Array.isArray(res.dailyReports)) {
        setDailyReports(res.dailyReports);
      }
    } catch (err) {
      console.warn('API getDailyReports failed:', err);
    }
  };

  useEffect(() => {
    if (jwtToken) {
      void refreshDailyReports();
    }
  }, [jwtToken]);

  const submitDailyReport = async (data: {
    date: string;
    description: string;
    photoUrl?: string;
    photoName?: string;
    submissionLink?: string;
  }) => {
    if (!currentUser) return { success: false, message: 'User belum login.' };
    try {
      const res = await api.submitDailyReport(data);
      if (res.success) {
        await refreshDailyReports();
      }
      return res;
    } catch {
      return { success: false, message: 'Gagal mengajukan laporan harian.' };
    }
  };

  const reviewDailyReport = async (
    reportId: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string
  ) => {
    try {
      const res = await api.reviewDailyReport(reportId, status, reviewNotes);
      if (res.success) {
        await refreshDailyReports();
      }
      return res;
    } catch {
      return { success: false, message: 'Gagal mereview laporan harian.' };
    }
  };

  return (
    <DailyReportContext.Provider
      value={{
        dailyReports,
        refreshDailyReports,
        submitDailyReport,
        reviewDailyReport,
      }}
    >
      {children}
    </DailyReportContext.Provider>
  );
};

export const useDailyReports = () => {
  const ctx = useContext(DailyReportContext);
  if (!ctx) throw new Error('useDailyReports harus digunakan di dalam DailyReportProvider');
  return ctx;
};

export default DailyReportContext;