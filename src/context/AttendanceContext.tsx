import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AttendanceRecord, AttendanceSettings, AttendanceStatus, VerificationStatus } from '../types';
import { INITIAL_SETTINGS } from '../data/mockData';
import { computeLatePenalty, computeAbsentPenalty } from '../utils/latePenalty';
import { getCurrentTimeWIB, getTodayDateString } from '../utils/dateUtils';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface AttendanceContextType {
  attendanceRecords: AttendanceRecord[];
  settings: AttendanceSettings;
  tidbStatus: 'connected' | 'connecting' | 'error' | 'offline';
  refreshAttendanceRecords: () => Promise<void>;
  resetAttendanceRecords: () => Promise<{ success: boolean; count: number; message: string }>;
  clockIn: (notes?: string, photoUrl?: string, coordinates?: { lat: number; lng: number }, workMode?: 'WFO' | 'WFH') => Promise<{ success: boolean; message: string }>;
  clockOut: (notes?: string, coordinates?: { lat: number; lng: number }) => Promise<{ success: boolean; message: string }>;
  getTodayRecordForUser: (userId: string) => AttendanceRecord | undefined;
  getLatePenaltyPoints: (userId: string) => number;
  getAbsentPenaltyPoints: (userId: string) => number;
  verifyAttendance: (recordId: string, status: 'verified' | 'rejected', reason?: string) => void;
  markAttendanceStatus: (recordId: string, newStatus: AttendanceStatus, newVerification?: VerificationStatus) => void;
  manualAddOrUpdateAttendance: (userId: string, date: string, status: AttendanceStatus, checkInTime?: string, notes?: string) => void;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { jwtToken, currentUser } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<AttendanceSettings>(INITIAL_SETTINGS);
  const [tidbStatus, setTidbStatus] = useState<'connected' | 'connecting' | 'error' | 'offline'>('connected');

  const refreshAttendanceRecords = useCallback(async () => {
    if (!jwtToken) return;
    try {
      const res = await api.getAttendanceRecords();
      if (res.success && Array.isArray(res.records)) {
        setAttendanceRecords(res.records);
        setTidbStatus('connected');
      }
      if (res.settings) {
        setSettings(res.settings);
      }
    } catch {
      setTidbStatus('error');
    }
  }, [jwtToken]);

  useEffect(() => {
    if (jwtToken) {
      void refreshAttendanceRecords();
    }
  }, [jwtToken, refreshAttendanceRecords]);

  const clockIn = async (notes?: string, photoUrl?: string, coordinates?: { lat: number; lng: number }, workMode: 'WFO' | 'WFH' = 'WFO') => {
    if (!currentUser) return { success: false, message: 'User tidak ditemukan.' };
    if (currentUser.role !== 'trainee') return { success: false, message: 'Aksi ini hanya tersedia untuk peserta.' };
    try {
      const date = getTodayDateString();
      const existing = getTodayRecordForUser(currentUser.id);
      if (existing?.checkInTime) return { success: false, message: `Anda sudah presensi masuk pukul ${existing.checkInTime}.` };
      const checkInTime = getCurrentTimeWIB();
      const record: AttendanceRecord = {
        ...(existing || {} as AttendanceRecord),
        id: existing?.id || `att-${currentUser.id}-${date}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userNim: currentUser.nim || '',
        userRole: currentUser.role,
        kejuruanId: currentUser.kejuruanId || '',
        kejuruanName: currentUser.kejuruanName || '',
        date,
        checkInTime,
        status: checkInTime.slice(0, 5) > (settings.lateLimitTime || '09:00') ? 'terlambat' : 'hadir',
        verificationStatus: 'pending',
        notes,
        photoUrl,
        coordinates,
        checkInCoordinates: coordinates,
        workMode,
      };
      const res = await api.clockIn(record);
      if (res.success) {
        await refreshAttendanceRecords();
      }
      return res;
    } catch {
      return { success: false, message: 'Gagal melakukan presensi masuk.' };
    }
  };

  const clockOut = async (notes?: string, coordinates?: { lat: number; lng: number }) => {
    if (!currentUser) return { success: false, message: 'User tidak ditemukan.' };
    const existing = getTodayRecordForUser(currentUser.id);
    if (!existing?.checkInTime) return { success: false, message: 'Anda belum melakukan presensi masuk hari ini.' };
    if (existing.checkOutTime) return { success: false, message: `Anda sudah presensi keluar pukul ${existing.checkOutTime}.` };
    try {
      const res = await api.clockOut({
        ...existing,
        checkOutTime: getCurrentTimeWIB(),
        notes: notes || existing.notes,
        checkOutCoordinates: coordinates,
      });
      if (res.success) {
        await refreshAttendanceRecords();
      }
      return res;
    } catch {
      return { success: false, message: 'Gagal melakukan presensi keluar.' };
    }
  };

  const resetAttendanceRecords = async () => {
    try {
      const res = await api.resetAttendanceRecords();
      if (res.success) {
        setAttendanceRecords([]);
      }
      return res;
    } catch {
      return { success: false, count: 0, message: 'Gagal mereset presensi.' };
    }
  };

  const getTodayRecordForUser = (userId: string) => {
    const today = getTodayDateString();
    return attendanceRecords.find((r) => r.userId === userId && r.date === today);
  };

  const getLatePenaltyPoints = (userId: string) => {
    return attendanceRecords
      .filter((r) => r.userId === userId)
      .reduce((sum, r) => sum + computeLatePenalty(settings, r).latePenaltyPoints, 0);
  };

  const getAbsentPenaltyPoints = (userId: string) => {
    const today = getTodayDateString();
    const userDates = attendanceRecords
      .filter(record => record.userId === userId && (record.checkInTime || ['izin', 'sakit'].includes(record.status)))
      .map(record => record.date);
    return computeAbsentPenalty({
      workDays: settings.workDays,
      absentPointPenaltyPerDay: settings.absentPointPenaltyPerDay,
      today,
      attendedOrLeaveDates: userDates,
    }).absentPenaltyPoints;
  };

  const verifyAttendance = (recordId: string, status: 'verified' | 'rejected', reason?: string) => {
    void api.verifyAttendance(recordId, status, reason);
    setAttendanceRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? { ...r, verificationStatus: status, rejectionReason: reason || r.rejectionReason }
          : r
      )
    );
  };

  const markAttendanceStatus = (
    recordId: string,
    newStatus: AttendanceStatus,
    newVerification?: VerificationStatus
  ) => {
    setAttendanceRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              status: newStatus,
              verificationStatus: newVerification ?? r.verificationStatus,
            }
          : r
      )
    );
  };

  const manualAddOrUpdateAttendance = (
    userId: string,
    date: string,
    status: AttendanceStatus,
    checkInTime?: string,
    notes?: string
  ) => {
    const todayRecord = attendanceRecords.find((r) => r.userId === userId && r.date === date);
    if (todayRecord) {
      setAttendanceRecords((prev) =>
        prev.map((r) =>
          r.id === todayRecord.id
            ? { ...r, status, checkInTime: checkInTime || r.checkInTime, notes: notes || r.notes }
            : r
        )
      );
    } else {
      const newRec: AttendanceRecord = {
        id: `att-man-${Date.now()}`,
        userId,
        userName: 'Manual User',
        userNim: '',
        userRole: 'trainee',
        kejuruanId: '',
        kejuruanName: '',
        date,
        checkInTime: checkInTime || '08:00',
        status,
        verificationStatus: 'verified',
        notes: notes || 'Manual oleh admin',
      };
      setAttendanceRecords((prev) => [newRec, ...prev]);
    }
  };

  return (
    <AttendanceContext.Provider
      value={{
        attendanceRecords,
        settings,
        tidbStatus,
        refreshAttendanceRecords,
        resetAttendanceRecords,
        clockIn,
        clockOut,
        getTodayRecordForUser,
        getLatePenaltyPoints,
        getAbsentPenaltyPoints,
        verifyAttendance,
        markAttendanceStatus,
        manualAddOrUpdateAttendance,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error('useAttendance harus digunakan di dalam AttendanceProvider');
  return ctx;
};

export default AttendanceContext;
