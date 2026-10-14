import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Kejuruan,
  AttendanceRecord,
  LeaveRequest,
  AttendanceSettings,
  Mission,
  MissionSubmission,
  DailyReport,
} from '../types';
import { api } from '../services/api';
import { INITIAL_KEJURUAN, INITIAL_SETTINGS } from '../data/mockData';
import { INITIAL_MISSIONS } from '../data/missionsData';
import { getCurrentTimeWIB, getTodayDateString } from '../utils/dateUtils';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  kejuruanList: Kejuruan[];
  missions: Mission[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  missionSubmissions: MissionSubmission[];
  dailyReports: DailyReport[];
  settings: AttendanceSettings;
  tidbStatus: 'connected' | 'connecting' | 'error' | 'offline';
  isAuthenticated: boolean;
  authReady: boolean;
  jwtToken: string | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  loginWithCode: (code: string, password?: string) => Promise<{ success: boolean; message: string; user?: User }>;
  loginWithAdmin: (identifier: string, password?: string) => Promise<{ success: boolean; message: string; user?: User }>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  updateMyAvatar: (avatar: string) => Promise<{ success: boolean; message: string }>;
  updateMyKejuruan: (kejuruanId: string) => Promise<{ success: boolean; message: string }>;
  refreshUsers: () => Promise<void>;
  refreshLeaveRequests: () => Promise<void>;
  refreshMissions: () => Promise<void>;
  refreshDailyReports: () => Promise<void>;
  refreshAttendanceRecords: () => Promise<void>;
  clockIn: (notes?: string, photoUrl?: string, coordinates?: { lat: number; lng: number }, workMode?: 'WFO' | 'WFH') => Promise<{ success: boolean; message: string }>;
  clockOut: (notes?: string, coordinates?: { lat: number; lng: number }) => Promise<{ success: boolean; message: string }>;
  getTodayRecordForUser: (userId: string) => AttendanceRecord | undefined;
  getLatePenaltyPoints: (userId: string) => number;
  getAbsentPenaltyPoints: (userId: string) => number;
  verifyAttendance: (recordId: string, status: 'verified' | 'rejected', reason?: string) => void;
  markAttendanceStatus: (recordId: string, newStatus: 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpha', newVerification?: 'pending' | 'verified' | 'rejected') => void;
  manualAddOrUpdateAttendance: (userId: string, date: string, status: 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpha', checkInTime?: string, notes?: string) => void;
  resetAttendanceRecords: () => Promise<{ success: boolean; count: number; message: string }>;
  submitLeaveRequest: (req: { type: 'izin' | 'sakit'; startDate: string; endDate: string; reason: string; attachmentUrl: string; }) => Promise<{ success: boolean; message: string }>;
  reviewLeaveRequest: (id: string, status: 'approved' | 'rejected', reviewNotes?: string) => Promise<{ success: boolean; message: string }>;
  addMission: (missionData: Omit<Mission, 'id' | 'createdAt'>) => Promise<void>;
  updateMission: (id: string, updates: Partial<Mission>) => Promise<void>;
  deleteMission: (id: string) => Promise<void>;
  submitMissionWork: (submissionData: { missionId: string; submissionLink?: string; notes: string; }) => Promise<{ success: boolean; message: string }>;
  reviewMissionSubmission: (submissionId: string, status: 'approved' | 'rejected', feedback?: string, awardedPoints?: number) => Promise<void>;
  resetMentorMissionData: () => Promise<{ success: boolean; missions: number; submissions: number; message: string }>;
  resetTraineeHallOfFamePoints: () => Promise<{ success: boolean; count: number; message: string }>;
  updateSettings: (newSettings: Partial<AttendanceSettings>) => Promise<{ success: boolean; message: string }>;
  resetToDefaultData: () => Promise<{ success: boolean; count: number; message: string }>;
  reviewDailyReport: (reportId: string, status: 'approved' | 'rejected', reviewNotes?: string) => Promise<{ success: boolean; message: string }>;
  getUserPoints: (userId: string) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [kejuruanList, setKejuruanList] = useState<Kejuruan[]>(INITIAL_KEJURUAN);
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [missionSubmissions, setMissionSubmissions] = useState<MissionSubmission[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [settings, setSettings] = useState<AttendanceSettings>(INITIAL_SETTINGS);
  const [tidbStatus, setTidbStatus] = useState<'connected' | 'connecting' | 'error' | 'offline'>('connected');
  const [jwtToken, setJwtToken] = useState<string | null>(() => api.getToken());
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'presensi' | 'misi' | 'laporan-harian' | 'hall-of-fame' | 'rekap' | 'izin' | 'peserta' | 'pengaturan' | 'profil'>('dashboard');

  const refreshUsers = async () => {
    if (!jwtToken) return;
    try {
      const res = await api.getUsers();
      if (res.success && Array.isArray(res.users)) {
        setUsers(res.users);
      }
    } catch {
      setTidbStatus('error');
    }
  };

  const refreshKejuruan = async () => {
    if (!jwtToken) return;
    try {
      const res = await api.getKejuruan();
      if (res.success && Array.isArray(res.kejuruanList)) setKejuruanList(res.kejuruanList);
    } catch {
      setTidbStatus('error');
    }
  };

  const refreshAttendanceRecords = async () => {
    if (!jwtToken) return;
    try {
      const res = await (api as any).getAttendanceRecords?.();
      if (res?.success && Array.isArray(res.records)) {
        setAttendanceRecords(res.records);
      } else if (res?.success && Array.isArray(res.attendanceRecords)) {
        setAttendanceRecords(res.attendanceRecords);
      } else {
        setAttendanceRecords([]);
      }
      if (res?.settings) setSettings(res.settings);
    } catch {
      setTidbStatus('error');
    }
  };

  const refreshLeaveRequests = async () => {
    if (!jwtToken) return;
    try {
      const res = await api.getLeaveRequests();
      if (res.success && Array.isArray(res.requests)) {
        setLeaveRequests(res.requests);
      }
    } catch {
      setTidbStatus('error');
    }
  };

  const refreshMissions = async () => {
    if (!jwtToken) return;
    try {
      const res = await api.getMissions();
      if (res.success) {
        if (Array.isArray((res as any).missions)) setMissions((res as any).missions);
        if (Array.isArray((res as any).submissions)) setMissionSubmissions((res as any).submissions);
      }
    } catch {
      setTidbStatus('error');
    }
  };

  const refreshDailyReports = async () => {
    if (!jwtToken) return;
    try {
      const res = await (api as any).getDailyReports?.();
      if (res?.success && Array.isArray(res.dailyReports)) {
        setDailyReports(res.dailyReports);
      }
    } catch {
      setTidbStatus('error');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      const savedToken = api.getToken();
      if (!savedToken) {
        setAuthReady(true);
        return;
      }
      try {
        const res = await api.getMe();
        if (!cancelled && res.success && res.user) {
          setCurrentUser(res.user as User);
          setJwtToken(savedToken);
          await Promise.allSettled([refreshUsers(), refreshKejuruan(), refreshAttendanceRecords(), refreshLeaveRequests(), refreshMissions(), refreshDailyReports()]);
          return;
        }
        if (!cancelled) {
          api.setToken(null);
          setJwtToken(null);
          setCurrentUser(null);
        }
      } catch {
        if (!cancelled) {
          api.setToken(null);
          setJwtToken(null);
          setCurrentUser(null);
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    };
    void restoreSession();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!jwtToken) return;
    void Promise.allSettled([refreshUsers(), refreshKejuruan(), refreshAttendanceRecords(), refreshLeaveRequests(), refreshMissions(), refreshDailyReports()]);
  }, [jwtToken]);

  const loginWithCode = async (code: string, password?: string) => {
    try {
      const res = await api.loginWithCode(code, password);
      if (res.success && res.user) {
        setCurrentUser(res.user as User);
        setJwtToken(res.token || api.getToken());
        if (res.token) api.setToken(res.token);
        await Promise.allSettled([refreshUsers(), refreshKejuruan(), refreshAttendanceRecords(), refreshLeaveRequests(), refreshMissions(), refreshDailyReports()]);
      }
      return res;
    } catch (error: any) {
      return { success: false, message: error?.message || 'Gagal login.' };
    }
  };

  const loginWithAdmin = async (identifier: string, password?: string) => {
    try {
      const res = await api.loginWithAdmin(identifier, password);
      if (res.success && res.user) {
        setCurrentUser(res.user as User);
        setJwtToken(res.token || api.getToken());
        if (res.token) api.setToken(res.token);
        await Promise.allSettled([refreshUsers(), refreshKejuruan(), refreshAttendanceRecords(), refreshLeaveRequests(), refreshMissions(), refreshDailyReports()]);
      }
      return res;
    } catch (error: any) {
      return { success: false, message: error?.message || 'Gagal login admin.' };
    }
  };

  const logout = () => {
    api.setToken(null);
    setJwtToken(null);
    setCurrentUser(null);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      return await api.changePassword(currentPassword, newPassword);
    } catch {
      return { success: false, message: 'Gagal.' };
    }
  };

  const updateMyAvatar = async (avatar: string) => {
    try {
      return await api.updateMyAvatar(avatar);
    } catch {
      return { success: false, message: 'Gagal memperbarui avatar.' };
    }
  };

  const updateMyKejuruan = async (kejuruanId: string) => {
    try {
      const res = await api.updateMyKejuruan(kejuruanId);
      if (res.success && currentUser?.role === 'mentor') {
        setCurrentUser({ ...currentUser, kejuruanId: res.kejuruanId, kejuruanName: res.kejuruanName });
        setUsers((prev) => prev.map((user) => user.id === currentUser.id
          ? { ...user, kejuruanId: res.kejuruanId, kejuruanName: res.kejuruanName }
          : user));
      }
      return { success: res.success, message: res.message };
    } catch {
      return { success: false, message: 'Gagal memperbarui kejuruan profil.' };
    }
  };

  const resetAttendanceRecords = async () => {
    try {
      const res = await (api as any).resetAttendanceRecords?.();
      if (res?.success) setAttendanceRecords([]);
      return res ?? { success: false, count: 0, message: 'Reset presensi tidak tersedia.' };
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
      .reduce((sum, r) => sum + (r.latePenaltyPoints ?? 0), 0);
  };

  const getAbsentPenaltyPoints = (userId: string) => {
    return attendanceRecords.filter((r) => r.userId === userId && (!r.checkInTime || r.status === 'alpha')).length;
  };

  const verifyAttendance = (recordId: string, status: 'verified' | 'rejected', reason?: string) => {
    const record = attendanceRecords.find((item) => item.id === recordId);
    if (!record) return;
    const updated = {
      ...record,
      verificationStatus: status,
      rejectionReason: reason || record.rejectionReason,
      verifiedBy: currentUser?.name,
      verifiedAt: new Date().toISOString(),
      canWriteReview: true,
    } as AttendanceRecord;
    setAttendanceRecords((prev) => prev.map((r) => r.id === recordId ? updated : r));
    void api.saveAttendanceRecord(updated).catch(() => { void refreshAttendanceRecords(); });
  };

  const markAttendanceStatus = (
    recordId: string,
    newStatus: 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpha',
    newVerification?: 'pending' | 'verified' | 'rejected'
  ) => {
    const record = attendanceRecords.find((item) => item.id === recordId);
    if (!record) return;
    const updated = {
      ...record,
      status: newStatus,
      verificationStatus: newVerification ?? record.verificationStatus,
      verifiedBy: currentUser?.name,
      verifiedAt: new Date().toISOString(),
      canWriteReview: true,
    } as AttendanceRecord;
    setAttendanceRecords((prev) => prev.map((r) => r.id === recordId ? updated : r));
    void api.saveAttendanceRecord(updated).catch(() => { void refreshAttendanceRecords(); });
  };

  const manualAddOrUpdateAttendance = (
    userId: string,
    date: string,
    status: 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpha',
    checkInTime?: string,
    notes?: string
  ) => {
    const existing = attendanceRecords.find((r) => r.userId === userId && r.date === date);
    const newRec: AttendanceRecord = existing ? {
      ...existing,
      status,
      checkInTime: checkInTime || existing.checkInTime,
      notes: notes || existing.notes,
      verificationStatus: 'verified',
      verifiedBy: currentUser?.name,
      verifiedAt: new Date().toISOString(),
    } : {
        id: `att-man-${Date.now()}`,
        userId,
        userName: users.find((u) => u.id === userId)?.name || 'Manual User',
        userNim: users.find((u) => u.id === userId)?.nim || '',
        userRole: users.find((u) => u.id === userId)?.role,
        kejuruanId: users.find((u) => u.id === userId)?.kejuruanId || '',
        kejuruanName: users.find((u) => u.id === userId)?.kejuruanName || '',
        date,
        checkInTime: checkInTime || '08:00',
        status,
        verificationStatus: 'verified',
        notes: notes || 'Manual oleh admin',
      };
    setAttendanceRecords((prev) => existing
      ? prev.map((record) => record.id === existing.id ? newRec : record)
      : [newRec, ...prev]);
    void api.saveAttendanceRecord({ ...newRec, canWriteReview: true } as AttendanceRecord).catch(() => { void refreshAttendanceRecords(); });
  };

  const submitLeaveRequest = async (req: { type: 'izin' | 'sakit'; startDate: string; endDate: string; reason: string; attachmentUrl: string; }) => {
    try {
      const res = await api.createLeaveRequest(req);
      if (res.success) setLeaveRequests((prev) => [res.request, ...prev]);
      return { success: res.success, message: res.message || 'Permintaan izin berhasil dikirim.' };
    } catch {
      return { success: false, message: 'Gagal mengajukan izin.' };
    }
  };

  const reviewLeaveRequest = async (id: string, status: 'approved' | 'rejected', reviewNotes?: string) => {
    try {
      const res = await api.reviewLeaveRequest(id, status, reviewNotes);
      if (res.success) {
        setLeaveRequests((prev) => prev.map((item) => item.id === id ? { ...item, status: status === 'approved' ? 'approved' : 'rejected', reviewNotes: reviewNotes || item.reviewNotes } : item));
      }
      return { success: res.success, message: res.message || 'Status izin diperbarui.' };
    } catch {
      return { success: false, message: 'Gagal merespon izin.' };
    }
  };

  const addMission = async (missionData: Omit<Mission, 'id' | 'createdAt'>) => {
    try {
      const response = await api.createMission(missionData as Mission);
      if (response.success && response.mission) {
        setMissions((prev) => [response.mission, ...prev.filter((mission) => mission.id !== response.mission.id)]);
      }
    } catch (error) {
      setTidbStatus('error');
      throw error;
    }
  };

  const updateMission = async (id: string, updates: Partial<Mission>) => {
    const response = await api.updateMission(id, updates);
    if (!response.success) throw new Error(response.message || 'Misi gagal diperbarui.');
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const deleteMission = async (id: string) => {
    const response = await api.deleteMission(id);
    if (!response.success) throw new Error(response.message || 'Misi gagal dihapus.');
    setMissions((prev) => prev.filter((m) => m.id !== id));
  };

  const submitMissionWork = async (submissionData: { missionId: string; submissionLink?: string; notes: string; }) => {
    if (!currentUser) return { success: false, message: 'User tidak ditemukan.' };
    const targetMission = missions.find((m) => m.id === submissionData.missionId);
    if (!targetMission) return { success: false, message: 'Misi tidak ditemukan.' };
    try {
      const response = await api.submitMissionWork(submissionData);
      if (!response.success) return { success: false, message: response.message || 'Pengumpulan misi gagal.' };
      setMissionSubmissions((prev) => [response.submission, ...prev.filter((item) => item.id !== response.submission.id)]);
      return { success: true, message: response.message || 'Tugas misi berhasil dikumpulkan!' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Pengumpulan misi gagal.' };
    }
  };

  const reviewMissionSubmission = async (
    submissionId: string,
    status: 'approved' | 'rejected',
    feedback?: string,
    awardedPoints?: number
  ) => {
    const response = await api.reviewMissionSubmission(submissionId, { status, feedback: feedback || '', points: awardedPoints ?? 0 });
    if (!response.success) throw new Error(response.message || 'Review submission gagal.');
    setMissionSubmissions((prev) => prev.map((s) => s.id === submissionId ? {
      ...s,
      status,
      feedback,
      awardedPoints: status === 'approved' ? awardedPoints ?? s.points : 0,
      reviewedBy: currentUser?.name,
      reviewedAt: new Date().toISOString(),
    } : s));
  };

  const resetMentorMissionData = async () => {
    try {
      const res = await (api as any).resetMentorMissionData?.();
      if (res?.success) await refreshMissions();
      return res ?? { success: false, missions: 0, submissions: 0, message: 'Fitur reset misi mentor tidak tersedia.' };
    } catch {
      return { success: false, missions: 0, submissions: 0, message: 'Gagal mereset data misi mentor.' };
    }
  };

  const resetTraineeHallOfFamePoints = async () => {
    try {
      const res = await (api as any).resetTraineeHallOfFamePoints?.();
      if (res?.success) setMissionSubmissions([]);
      return res ?? { success: false, count: 0, message: 'Fitur reset Hall of Fame tidak tersedia.' };
    } catch {
      return { success: false, count: 0, message: 'Gagal mereset poin Hall of Fame.' };
    }
  };

  const updateSettings = async (newSettings: Partial<AttendanceSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    try {
      const res = await (api as any).updateSettings?.(newSettings);
      return res ?? { success: true, message: 'Pengaturan berhasil disimpan.' };
    } catch {
      return { success: false, message: 'Gagal memperbarui pengaturan.' };
    }
  };

  const resetToDefaultData = async () => {
    setSettings(INITIAL_SETTINGS);
    try {
      const res = await (api as any).resetToDefaultData?.();
      return res ?? { success: true, count: 0, message: 'Pengaturan default berhasil direset.' };
    } catch {
      return { success: false, count: 0, message: 'Gagal mereset pengaturan.' };
    }
  };

  const reviewDailyReport = async (reportId: string, status: 'approved' | 'rejected', reviewNotes?: string) => {
    try {
      const res = await (api as any).reviewDailyReport?.(reportId, status, reviewNotes);
      if (res?.success) {
        setDailyReports((prev) => prev.map((item) => item.id === reportId ? { ...item, status: status === 'approved' ? 'approved' : 'rejected', reviewNotes: reviewNotes || item.reviewNotes } : item));
      }
      return { success: !!res?.success, message: res?.message || 'Laporan diperbarui.' };
    } catch {
      return { success: false, message: 'Gagal mereview laporan harian.' };
    }
  };

  const getUserPoints = (userId: string) => missionSubmissions.filter((s) => s.traineeId === userId && s.status === 'approved').reduce((sum, s) => sum + (s.awardedPoints ?? s.points ?? 0), 0);

  const clockIn = async (notes?: string, photoUrl?: string, coordinates?: { lat: number; lng: number }, workMode: 'WFO' | 'WFH' = 'WFO') => {
    if (!currentUser) return { success: false, message: 'User tidak ditemukan.' };
    try {
      const today = getTodayDateString();
      const time = getCurrentTimeWIB();
      const existing = attendanceRecords.find((record) => record.userId === currentUser.id && record.date === today);
      if (existing?.checkInTime) return { success: false, message: `Anda sudah presensi masuk pukul ${existing.checkInTime}.` };
      const status = time.slice(0, 5) > settings.lateLimitTime ? 'terlambat' : 'hadir';
      const record: AttendanceRecord = {
        ...(existing || {} as AttendanceRecord),
        id: existing?.id || `att-${currentUser.id}-${today}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userNim: currentUser.nim || '',
        userRole: currentUser.role,
        kejuruanId: currentUser.kejuruanId || '',
        kejuruanName: currentUser.kejuruanName || '',
        date: today,
        checkInTime: time,
        status,
        verificationStatus: 'pending',
        notes,
        photoUrl,
        coordinates,
        workMode,
      };
      const res = await api.saveAttendanceRecord(record);
      if (res.success) {
        setAttendanceRecords((prev) => [res.attendanceRecord, ...prev.filter((item) => item.id !== res.attendanceRecord.id)]);
        setTidbStatus('connected');
      }
      return { success: res.success, message: res.message || 'Presensi masuk berhasil.' };
    } catch {
      return { success: false, message: 'Gagal melakukan presensi masuk.' };
    }
  };

  const clockOut = async (notes?: string, coordinates?: { lat: number; lng: number }) => {
    if (!currentUser) return { success: false, message: 'User tidak ditemukan.' };
    try {
      const existing = getTodayRecordForUser(currentUser.id);
      if (!existing?.checkInTime) return { success: false, message: 'Anda belum melakukan presensi masuk hari ini.' };
      if (existing.checkOutTime) return { success: false, message: `Anda sudah presensi keluar pukul ${existing.checkOutTime}.` };
      const updated = { ...existing, checkOutTime: getCurrentTimeWIB(), notes: notes || existing.notes, checkOutCoordinates: coordinates, canWriteReview: true } as AttendanceRecord;
      const res = await api.saveAttendanceRecord(updated);
      if (res.success) setAttendanceRecords((prev) => prev.map((item) => item.id === updated.id ? res.attendanceRecord : item));
      return { success: res.success, message: res.message || 'Presensi keluar berhasil.' };
    } catch {
      return { success: false, message: 'Gagal melakukan presensi keluar.' };
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        kejuruanList,
        missions,
        attendanceRecords,
        leaveRequests,
        missionSubmissions,
        dailyReports,
        settings,
        tidbStatus,
        isAuthenticated: !!currentUser,
        authReady,
        jwtToken,
        activeTab,
        setActiveTab,
        loginWithCode,
        loginWithAdmin,
        logout,
        changePassword,
        updateMyAvatar,
        updateMyKejuruan,
        refreshUsers,
        refreshLeaveRequests,
        refreshMissions,
        refreshDailyReports,
        refreshAttendanceRecords,
        clockIn,
        clockOut,
        getTodayRecordForUser,
        getLatePenaltyPoints,
        getAbsentPenaltyPoints,
        verifyAttendance,
        markAttendanceStatus,
        manualAddOrUpdateAttendance,
        resetAttendanceRecords,
        submitLeaveRequest,
        reviewLeaveRequest,
        addMission,
        updateMission,
        deleteMission,
        submitMissionWork,
        reviewMissionSubmission,
        resetMentorMissionData,
        resetTraineeHallOfFamePoints,
        updateSettings,
        resetToDefaultData,
        reviewDailyReport,
        getUserPoints,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp harus digunakan di dalam AppProvider');
  return ctx;
};

export default AppContext;
