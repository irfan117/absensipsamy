import React, { createContext, useContext, useState, useEffect } from 'react';
import { LeaveRequest } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface LeaveContextType {
  leaveRequests: LeaveRequest[];
  refreshLeaveRequests: () => Promise<void>;
  submitLeaveRequest: (req: {
    type: 'izin' | 'sakit';
    startDate: string;
    endDate: string;
    reason: string;
    attachmentUrl: string;
  }) => Promise<{ success: boolean; message: string }>;
  reviewLeaveRequest: (
    id: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string
  ) => Promise<{ success: boolean; message: string }>;
}

const LeaveContext = createContext<LeaveContextType | undefined>(undefined);

export const LeaveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { jwtToken, currentUser } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  const refreshLeaveRequests = async () => {
    if (!jwtToken) return;
    try {
      const res = await api.getLeaveRequests();
      if (res.success && Array.isArray(res.leaveRequests)) {
        setLeaveRequests(res.leaveRequests);
      }
    } catch (err) {
      console.warn('API getLeaveRequests failed:', err);
    }
  };

  useEffect(() => {
    if (jwtToken) {
      void refreshLeaveRequests();
    }
  }, [jwtToken]);

  const submitLeaveRequest = async (req: {
    type: 'izin' | 'sakit';
    startDate: string;
    endDate: string;
    reason: string;
    attachmentUrl: string;
  }) => {
    if (!currentUser) return { success: false, message: 'User belum login.' };
    try {
      const res = await api.submitLeaveRequest(req);
      if (res.success) {
        await refreshLeaveRequests();
      }
      return res;
    } catch {
      return { success: false, message: 'Gagal mengajukan izin.' };
    }
  };

  const reviewLeaveRequest = async (
    id: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string
  ) => {
    try {
      const res = await api.reviewLeaveRequest(id, status, reviewNotes);
      if (res.success) {
        await refreshLeaveRequests();
      }
      return res;
    } catch {
      return { success: false, message: 'Gagal mereview pengajuan izin.' };
    }
  };

  return (
    <LeaveContext.Provider
      value={{
        leaveRequests,
        refreshLeaveRequests,
        submitLeaveRequest,
        reviewLeaveRequest,
      }}
    >
      {children}
    </LeaveContext.Provider>
  );
};

export const useLeave = () => {
  const ctx = useContext(LeaveContext);
  if (!ctx) throw new Error('useLeave harus digunakan di dalam LeaveProvider');
  return ctx;
};

export default LeaveContext;