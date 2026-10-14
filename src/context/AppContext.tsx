import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
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
import { INITIAL_SETTINGS } from '../data/mockData';
import { getTodayDateString } from '../utils/dateUtils';

interface AppContextType {
  // Authenticated application pages are rendered only after the session gate.
  currentUser: User;
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
  activeTab: 'dashboard' | 'verifikasi-mentor' | 'presensi' | 'misi' | 'laporan-harian' | 'hall-of-fame' | 'rekap' | 'izin' | 'peserta' | 'pengaturan' | 'profil';
  setActiveTab: React.Dispatch<React.SetStateAction<'dashboard' | 'verifikasi-mentor' | 'presensi' | 'misi' | 'laporan-harian' | 'hall-of-fame' | 'rekap' | 'izin' | 'peserta' | 'pengaturan' | 'profil'>>;
  loginWithCode: (code: string, password?: string) => Promise<{ success: boolean; message: string; user?: User }>;
  loginWithAdmin: (identifier: string, password?: string) => Promise<{ success: boolean; message: string; user?: User }>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  updateMyAvatar: (avatar: string) => Promise<{ success: boolean; message: string }>;
  addUser: (userData: Omit<User, 'id'>) => Promise<{ success: boolean; message: string; user?: User }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; message: string }>;
  deleteUsersByRole: (role: 'trainee' | 'mentor' | 'all') => Promise<{ success: boolean; message: string }>;
  deleteTraineesByIds: (ids: string[]) => Promise<{ success: boolean; message: string }>;
  importUsers: (users: Partial<User>[]) => Promise<{ success: boolean; count?: number; message: string }>;
  regenerateUserCredentials: (userId: string) => Promise<{ success: boolean; loginCode: string; password: string; message?: string }>;
  updateMyKejuruan: (kejuruanId: string) => Promise<{ success: boolean; message: string }>;
  refreshUsers: () => Promise<void>;
  refreshKejuruan: () => Promise<void>;
  addKejuruan: (kjData: Omit<Kejuruan, 'id'>) => Promise<{ success: boolean; message: string }>;
  updateKejuruan: (id: string, kjData: Omit<Kejuruan, 'id'>) => Promise<{ success: boolean; message: string }>;
  refreshLeaveRequests: () => Promise<void>;
  refreshMissions: () => Promise<void>;
  refreshDailyReports: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshAttendanceRecords: () => Promise<void>;
  refreshAttendanceRecordsForDate: (date: string) => Promise<void>;
  clockIn: (notes?: string, photoUrl?: string, coordinates?: { lat: number; lng: number }, workMode?: 'WFO' | 'WFH') => Promise<{ success: boolean; message: string }>;
  clockOut: (notes?: string, coordinates?: { lat: number; lng: number }) => Promise<{ success: boolean; message: string }>;
  getTodayRecordForUser: (userId: string) => AttendanceRecord | undefined;
  getLatePenaltyPoints: (userId: string) => number;
  getAbsentPenaltyPoints: (userId: string) => number;
  verifyAttendance: (recordId: string, status: 'verified' | 'rejected', reason?: string) => Promise<{ success: boolean; message: string }>;
  approvePendingMentorAttendance: () => Promise<{ success: boolean; count: number; message: string }>;
  markAttendanceStatus: (recordId: string, newStatus: 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpha', newVerification?: 'pending' | 'verified' | 'rejected') => Promise<{ success: boolean; message: string }>;
  manualAddOrUpdateAttendance: (userId: string, date: string, status: 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpha', checkInTime?: string, notes?: string) => Promise<{ success: boolean; message: string }>;
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
  submitDailyReport: (data: { date: string; description: string; photoUrl?: string; photoName?: string; submissionLink?: string }) => Promise<{ success: boolean; message: string }>;
  getUserPoints: (userId: string) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [kejuruanList, setKejuruanList] = useState<Kejuruan[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [missionSubmissions, setMissionSubmissions] = useState<MissionSubmission[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [settings, setSettings] = useState<AttendanceSettings>(INITIAL_SETTINGS);
  const [tidbStatus, setTidbStatus] = useState<'connected' | 'connecting' | 'error' | 'offline'>('connecting');
  const [jwtToken, setJwtToken] = useState<string | null>(() => api.getToken());
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'verifikasi-mentor' | 'presensi' | 'misi' | 'laporan-harian' | 'hall-of-fame' | 'rekap' | 'izin' | 'peserta' | 'pengaturan' | 'profil'>('dashboard');

  const refreshUsers = useCallback(async () => {
    if (!jwtToken) return;
    try {
      const res = await api.getUsers();
      if (res.success && Array.isArray(res.users)) {
        setUsers(res.users);
        setTidbStatus('connected');
      }
    } catch {
      setTidbStatus('error');
    }
  }, [jwtToken]);

  const refreshKejuruan = useCallback(async () => {
    if (!jwtToken) return;
    try {
      const res = await api.getKejuruan();
      if (res.success && Array.isArray(res.kejuruanList)) {
        setKejuruanList(res.kejuruanList);
        setTidbStatus('connected');
      }
    } catch {
      setTidbStatus('error');
    }
  }, [jwtToken]);

  const refreshAttendanceRecords = useCallback(async () => {
    if (!jwtToken) return;
    try {
      const res = await api.getAttendanceRecords();
      if (res.success && Array.isArray(res.records)) {
        setAttendanceRecords(res.records);
        setTidbStatus('connected');
      }
      if (res?.settings) setSettings(res.settings);
    } catch {
      setTidbStatus('error');
    }
  }, [jwtToken]);

  const refreshAttendanceRecordsForDate = useCallback(async (date: string) => {
    if (!jwtToken) return;
    try {
      const res = await api.getAttendanceRecords(date);
      if (res.success && Array.isArray(res.records)) {
        setAttendanceRecords(previous => [...previous.filter(record => record.date !== date), ...res.records]);
        setTidbStatus('connected');
      }
    } catch {
      setTidbStatus('error');
    }
  }, [jwtToken]);

  const refreshLeaveRequests = useCallback(async () => {
    if (!jwtToken) return;
    try {
      const res = await api.getLeaveRequests();
      if (res.success && Array.isArray(res.requests)) {
        setLeaveRequests(res.requests);
        setTidbStatus('connected');
      }
    } catch {
      setTidbStatus('error');
    }
  }, [jwtToken]);

  const refreshMissions = useCallback(async () => {
    if (!jwtToken) return;
    try {
      const res = await api.getMissions();
      if (res.success) {
        if (Array.isArray((res as any).missions)) setMissions((res as any).missions);
        if (Array.isArray((res as any).submissions)) setMissionSubmissions((res as any).submissions);
        setTidbStatus('connected');
      }
    } catch {
      setTidbStatus('error');
    }
  }, [jwtToken]);

  const refreshDailyReports = useCallback(async () => {
    if (!jwtToken) return;
    try {
      const res = await api.getDailyReports();
      if (res.success && Array.isArray(res.dailyReports)) {
        setDailyReports(res.dailyReports);
        setTidbStatus('connected');
      }
    } catch {
      setTidbStatus('error');
    }
  }, [jwtToken]);

  const refreshSettings = useCallback(async () => {
    if (!jwtToken) return;
    try {
      const res = await api.getSettings();
      if (res.success && res.settings) { setSettings(res.settings); setTidbStatus('connected'); }
    } catch {
      setTidbStatus('error');
    }
  }, [jwtToken]);

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
    if (!jwtToken || !currentUser) return;

    const isStaff = currentUser.role === 'admin' || currentUser.role === 'mentor';
    const refreshTasks: Promise<void>[] = [];
    const refreshRoster = () => {
      if (isStaff) refreshTasks.push(refreshUsers());
      refreshTasks.push(refreshKejuruan());
    };

    switch (activeTab) {
      case 'dashboard':
      case 'presensi':
      case 'verifikasi-mentor':
        refreshRoster();
        refreshTasks.push(refreshAttendanceRecords());
        break;
      case 'peserta':
        refreshRoster();
        break;
      case 'izin':
        refreshRoster();
        refreshTasks.push(refreshLeaveRequests());
        break;
      case 'misi':
        refreshRoster();
        refreshTasks.push(refreshMissions());
        break;
      case 'laporan-harian':
        refreshRoster();
        refreshTasks.push(refreshDailyReports());
        break;
      case 'rekap':
        refreshRoster();
        refreshTasks.push(refreshAttendanceRecords(), refreshDailyReports());
        break;
      case 'hall-of-fame':
        refreshRoster();
        refreshTasks.push(refreshAttendanceRecords(), refreshMissions());
        break;
      case 'pengaturan':
        refreshTasks.push(refreshSettings());
        break;
      default:
        break;
    }

    void Promise.allSettled(refreshTasks);
  }, [
    jwtToken,
    currentUser,
    activeTab,
    refreshUsers,
    refreshKejuruan,
    refreshAttendanceRecords,
    refreshLeaveRequests,
    refreshMissions,
    refreshDailyReports,
    refreshSettings,
  ]);

  const loginWithCode = async (code: string, password?: string) => {
    try {
      const res = await api.loginWithCode(code, password);
      if (res.success && res.user) {
        setCurrentUser(res.user as User);
        setJwtToken(res.token || api.getToken());
        if (res.token) api.setToken(res.token);
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
      }
      return res;
    } catch (error: any) {
      return { success: false, message: error?.message || 'Gagal login admin.' };
    }
  };

  const logout = () => {
    void api.logoutSession();
    setJwtToken(null);
    setCurrentUser(null);
    setUsers([]);
    setAttendanceRecords([]);
    setLeaveRequests([]);
    setMissions([]);
    setMissionSubmissions([]);
    setDailyReports([]);
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

  const addUser = async (userData: Omit<User, 'id'>) => {
    try {
      const res = await api.createUser(userData);
      if (res.success && res.user) {
        const createdUser = res.user;
        setUsers((prev) => [createdUser, ...prev.filter((user) => user.id !== createdUser.id)]);
      }
      return res;
    } catch (error: any) {
      return { success: false, message: error?.message || 'Gagal menambah pengguna baru.' };
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const res = await api.deleteUser(userId);
      if (res.success) setUsers(prev => prev.filter(user => user.id !== userId));
      return res;
    } catch (error: any) {
      return { success: false, message: error?.message || 'Gagal menghapus akun.' };
    }
  };

  const deleteUsersByRole = async (role: 'trainee' | 'mentor' | 'all') => {
    try {
      const res = await api.deleteUsersByRole(role);
      if (res.success) await refreshUsers();
      return res;
    } catch (error: any) {
      return { success: false, message: error?.message || 'Gagal menghapus akun.' };
    }
  };

  const deleteTraineesByIds = async (ids: string[]) => {
    try {
      const res = await api.deleteTraineesByIds(ids);
      if (res.success) setUsers(prev => prev.filter(user => !ids.includes(user.id)));
      return res;
    } catch (error: any) {
      return { success: false, message: error?.message || 'Gagal menghapus peserta.' };
    }
  };

  const importUsers = async (incoming: Partial<User>[]) => {
    try {
      const res = await api.importUsers(incoming);
      if (res.success) await Promise.all([refreshUsers(), refreshKejuruan()]);
      return res;
    } catch (error: any) {
      return { success: false, message: error?.message || 'Gagal mengimpor pengguna.' };
    }
  };

  const regenerateUserCredentials = async (userId: string) => {
    try {
      const res = await api.regenerateUserCredentials(userId);
      if (res.success) {
        setUsers(prev => prev.map(user => user.id === userId
          ? { ...user, loginCode: res.loginCode, password: res.password, plainPassword: res.password }
          : user));
      }
      return res;
    } catch (error: any) {
      return { success: false, loginCode: '', password: '', message: error?.message || 'Gagal memperbarui kredensial.' };
    }
  };

  const addKejuruan = async (kjData: Omit<Kejuruan, 'id'>) => {
    try {
      const res = await api.createKejuruan(kjData);
      if (res.success) {
        await refreshKejuruan();
        return { success: true, message: 'Kejuruan berhasil ditambahkan.' };
      }
      return { success: false, message: res.message || 'Gagal menambahkan kejuruan.' };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Gagal menambahkan kejuruan.' };
    }
  };

  const updateKejuruan = async (id: string, kjData: Omit<Kejuruan, 'id'>) => {
    try {
      const res = await api.updateKejuruan(id, kjData);
      if (!res.success) return { success: false, message: res.message || 'Gagal memperbarui kejuruan.' };
      await Promise.all([refreshKejuruan(), refreshUsers()]);
      return { success: true, message: 'Program kejuruan berhasil diperbarui.' };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Gagal memperbarui kejuruan.' };
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
    } catch (error: any) {
      return { success: false, message: error?.message || 'Gagal memperbarui kejuruan profil.' };
    }
  };

  const resetAttendanceRecords = async () => {
    try {
      const res = await api.resetAttendanceRecords();
      if (res.success) await refreshAttendanceRecords();
      return res;
    } catch (error: any) {
      return { success: false, count: 0, message: error?.message || 'Gagal mereset presensi.' };
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

  const verifyAttendance = async (recordId: string, status: 'verified' | 'rejected', reason?: string) => {
    const record = attendanceRecords.find(item => item.id === recordId);
    if (!record) return { success: false, message: 'Record presensi tidak ditemukan.' };
    try {
      const res = await api.updateAttendanceRecord({ ...record, verificationStatus: status, rejectionReason: status === 'rejected' ? reason || 'Presensi ditolak' : undefined });
      if (res.success) await refreshAttendanceRecordsForDate(record.date);
      return { success: res.success, message: res.message };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Presensi gagal diverifikasi.' };
    }
  };

  const approvePendingMentorAttendance = async () => {
    try {
      const result = await api.approvePendingMentorAttendance();
      if (result.success) await refreshAttendanceRecordsForDate(getTodayDateString());
      return result;
    } catch (error: any) {
      return { success: false, count: 0, message: error?.message || 'Gagal menyetujui presensi mentor.' };
    }
  };

  const markAttendanceStatus = async (
    recordId: string,
    newStatus: 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpha',
    newVerification?: 'pending' | 'verified' | 'rejected'
  ) => {
    const record = attendanceRecords.find(item => item.id === recordId);
    if (!record) return { success: false, message: 'Record presensi tidak ditemukan.' };
    try {
      const res = await api.updateAttendanceRecord({ ...record, status: newStatus, verificationStatus: newVerification ?? record.verificationStatus });
      if (res.success) await refreshAttendanceRecordsForDate(record.date);
      return { success: res.success, message: res.message };
    } catch (error: any) {
      setTidbStatus('error');
      return { success: false, message: error?.message || 'Gagal memperbarui presensi.' };
    }
  };

  const manualAddOrUpdateAttendance = (
    userId: string,
    date: string,
    status: 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpha',
    checkInTime?: string,
    notes?: string
  ) => {
    const user = users.find(item => item.id === userId);
    if (!user) return Promise.resolve({ success: false, message: 'Pengguna presensi tidak ditemukan.' });
    const existing = attendanceRecords.find(record => record.userId === userId && record.date === date);
    const hasCheckIn = status === 'hadir' || status === 'terlambat';
    const newRecord: AttendanceRecord = {
      ...(existing || {} as AttendanceRecord),
      id: existing?.id || `att-man-${Date.now()}`,
      userId,
      userName: user.name,
      userNim: user.nim,
      userRole: user.role,
      kejuruanId: user.kejuruanId || '',
      kejuruanName: user.kejuruanName || '',
      date,
      checkInTime: checkInTime || existing?.checkInTime || (hasCheckIn ? status === 'terlambat' ? '08:25' : '08:00' : undefined),
      status,
      verificationStatus: 'verified',
      verifiedBy: currentUser?.name,
      verifiedAt: new Date().toISOString(),
      notes: notes || existing?.notes || 'Manual oleh admin',
    };
    return api.updateAttendanceRecord(newRecord)
      .then(async res => {
        if (res.success) await refreshAttendanceRecordsForDate(date);
        return { success: res.success, message: res.message };
      })
      .catch((error: any) => {
        setTidbStatus('error');
        return { success: false, message: error?.message || 'Gagal menyimpan presensi manual.' };
      });
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
        await Promise.all([refreshLeaveRequests(), status === 'approved' ? refreshAttendanceRecords() : Promise.resolve()]);
      }
      return { success: res.success, message: res.message || 'Status izin diperbarui.' };
    } catch {
      return { success: false, message: 'Gagal merespon izin.' };
    }
  };

  const addMission = async (missionData: Omit<Mission, 'id' | 'createdAt'>) => {
    try {
      const res = await api.createMission(missionData);
      if (!res.success || !res.mission) throw new Error('Server tidak mengembalikan data misi yang tersimpan.');
      setMissions(prev => [res.mission, ...prev.filter(item => item.id !== res.mission.id)]);
    } catch (error: any) {
      throw new Error(error?.message || 'Gagal menyimpan misi ke server.');
    }
  };

  const updateMission = async (id: string, updates: Partial<Mission>) => {
    const res = await api.updateMission(id, updates);
    if (!res.success) throw new Error(res.message || 'Gagal memperbarui misi.');
    await refreshMissions();
  };

  const deleteMission = async (id: string) => {
    const res = await api.deleteMission(id);
    if (!res.success) throw new Error(res.message || 'Gagal menghapus misi.');
    setMissions(prev => prev.filter(mission => mission.id !== id));
    setMissionSubmissions(prev => prev.filter(submission => submission.missionId !== id));
  };

  const submitMissionWork = async (submissionData: { missionId: string; submissionLink?: string; notes: string; }) => {
    if (!currentUser) return { success: false, message: 'User tidak ditemukan.' };
    const targetMission = missions.find((m) => m.id === submissionData.missionId);
    if (!targetMission) return { success: false, message: 'Misi tidak ditemukan.' };
    try {
      const res = await api.submitMissionWork(submissionData);
      const submission = res.submission;
      if (res.success && submission) {
        setMissionSubmissions(prev => [submission, ...prev.filter(item => item.id !== submission.id)]);
        return { success: true, message: res.message || 'Tugas misi berhasil dikumpulkan.' };
      }
      return { success: false, message: res.message || 'Gagal mengumpulkan tugas misi.' };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Gagal mengumpulkan tugas misi.' };
    }
  };

  const reviewMissionSubmission = async (
    submissionId: string,
    status: 'approved' | 'rejected',
    feedback?: string,
    awardedPoints?: number
  ) => {
    const res = await api.reviewMissionSubmission(submissionId, { status, feedback: feedback || '', awardedPoints });
    if (!res.success) throw new Error(res.message || 'Review submission gagal disimpan.');
    await refreshMissions();
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
    const merged = { ...settings, ...newSettings };
    try {
      const res = await api.saveAttendanceSettings(merged);
      if (res.success) setSettings(merged);
      return res;
    } catch (error: any) {
      return { success: false, message: error?.message || 'Gagal memperbarui pengaturan.' };
    }
  };

  const resetToDefaultData = async () => {
    try {
      const res = await api.getAppData();
      if (!res.success) return { success: false, count: 0, message: 'Gagal memuat ulang data TiDB.' };
      setKejuruanList(res.kejuruanList || []);
      setAttendanceRecords(res.attendanceRecords || []);
      setLeaveRequests(res.leaveRequests || []);
      setMissions(res.missions || []);
      setMissionSubmissions(res.missionSubmissions || []);
      setDailyReports(res.dailyReports || []);
      if (res.settings) setSettings(res.settings);
      await refreshUsers();
      return { success: true, count: 1, message: 'Data berhasil dimuat ulang dari TiDB.' };
    } catch (error: any) {
      return { success: false, count: 0, message: error?.message || 'Gagal memuat ulang data TiDB.' };
    }
  };

  const submitDailyReport = async (data: { date: string; description: string; photoUrl?: string; photoName?: string; submissionLink?: string }) => {
    try {
      const res = await api.submitDailyReport(data);
      if (res.success && res.report) {
        setDailyReports(prev => [res.report, ...prev.filter(report => report.id !== res.report.id)]);
      }
      return { success: res.success, message: res.message || 'Laporan harian berhasil dikirim.' };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Gagal mengirim laporan harian.' };
    }
  };

  const reviewDailyReport = async (reportId: string, status: 'approved' | 'rejected', reviewNotes?: string) => {
    try {
      const res = await (api as any).reviewDailyReport?.(reportId, status, reviewNotes);
      if (res?.success) {
        await refreshDailyReports();
      }
      return { success: !!res?.success, message: res?.message || 'Laporan diperbarui.' };
    } catch {
      return { success: false, message: 'Gagal mereview laporan harian.' };
    }
  };

  const getUserPoints = (userId: string) => missionSubmissions.filter((s) => s.traineeId === userId && s.status === 'approved').reduce((sum, s) => sum + (s.awardedPoints ?? s.points ?? 0), 0);

  const clockIn = async (notes?: string, photoUrl?: string, coordinates?: { lat: number; lng: number }, workMode: 'WFO' | 'WFH' = 'WFO') => {
    if (!currentUser) return { success: false, message: 'User tidak ditemukan.' };
    if (currentUser.role !== 'trainee') return { success: false, message: 'Aksi ini hanya tersedia untuk peserta.' };
    if (attendanceRecords.some((record) => record.userId === currentUser.id && record.date === getTodayDateString() && record.checkInTime)) return { success: false, message: 'Anda sudah melakukan Check-In hari ini.' };
    if (!coordinates || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) return { success: false, message: 'Lokasi GPS diperlukan untuk melakukan presensi.' };
    if (workMode === 'WFO') {
      const { lat, lng, radiusMeters } = settings.officeLocation;
      const rad = (n: number) => n * Math.PI / 180;
      const a = Math.sin(rad(coordinates.lat - lat) / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(coordinates.lat)) * Math.sin(rad(coordinates.lng - lng) / 2) ** 2;
      if (6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) > radiusMeters) return { success: false, message: `Anda berada di luar radius kantor (${radiusMeters} m).` };
    }
    try {
      const date = getTodayDateString();
      const existing = attendanceRecords.find(record => record.userId === currentUser.id && record.date === date);
      const now = new Date();
      const checkInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const lateLimit = settings.lateLimitTime || '09:00';
      const status = checkInTime.slice(0, 5) > lateLimit ? 'terlambat' : 'hadir';
      const record: AttendanceRecord = {
        ...(existing || {} as AttendanceRecord),
        id: existing?.id || `att-${crypto.randomUUID()}`,
        userId: currentUser.id, userName: currentUser.name, userNim: currentUser.nim,
        userRole: currentUser.role, kejuruanId: currentUser.kejuruanId || '',
        kejuruanName: currentUser.kejuruanName || '', date, checkInTime,
        status, verificationStatus: 'pending',
        workMode, coordinates, photoUrl, notes,
      };
      const res = await api.saveAttendanceRecord(record);
      if (res.success) {
        setTidbStatus('connected');
        await refreshAttendanceRecords();
      }
      return { success: res.success, message: res.message };
    } catch (error: any) {
      setTidbStatus('error');
      return { success: false, message: error?.message || 'Gagal melakukan presensi masuk.' };
    }
  };

  const clockOut = async (notes?: string, coordinates?: { lat: number; lng: number }) => {
    if (!currentUser) return { success: false, message: 'User tidak ditemukan.' };
    const record = attendanceRecords.find((item) => item.userId === currentUser.id && item.date === getTodayDateString());
    if (!record?.checkInTime) return { success: false, message: 'Anda belum melakukan Check-In hari ini.' };
    if (record.checkOutTime) return { success: false, message: 'Anda sudah melakukan Check-Out hari ini.' };
    if (!coordinates) return { success: false, message: 'Lokasi GPS diperlukan untuk melakukan presensi keluar.' };
    if (record.workMode !== 'WFH') {
      const { lat, lng, radiusMeters } = settings.officeLocation;
      const rad = (n: number) => n * Math.PI / 180;
      const a = Math.sin(rad(coordinates.lat - lat) / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(coordinates.lat)) * Math.sin(rad(coordinates.lng - lng) / 2) ** 2;
      if (6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) > radiusMeters) return { success: false, message: `Anda berada di luar radius kantor (${radiusMeters} m).` };
    }
    try {
      const date = getTodayDateString();
      const existing = attendanceRecords.find(record => record.userId === currentUser.id && record.date === date);
      if (!existing?.checkInTime) return { success: false, message: 'Presensi masuk belum tercatat.' };
      const now = new Date();
      const checkOutTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const res = await api.saveAttendanceRecord({ ...existing, checkOutTime, checkOutCoordinates: coordinates, coordinates: existing.coordinates, notes: notes || existing.notes });
      if (res.success) await refreshAttendanceRecords();
      return { success: res.success, message: res.message };
    } catch (error: any) {
      setTidbStatus('error');
      return { success: false, message: error?.message || 'Gagal melakukan presensi keluar.' };
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser: currentUser as User,
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
        addUser,
        deleteUser,
        deleteUsersByRole,
        deleteTraineesByIds,
        importUsers,
        regenerateUserCredentials,
        updateMyKejuruan,
        refreshUsers,
        refreshKejuruan,
        addKejuruan,
        updateKejuruan,
        refreshLeaveRequests,
        refreshMissions,
        refreshDailyReports,
        refreshSettings,
        refreshAttendanceRecords,
        refreshAttendanceRecordsForDate,
        clockIn,
        clockOut,
        getTodayRecordForUser,
        getLatePenaltyPoints,
        getAbsentPenaltyPoints,
        verifyAttendance,
        approvePendingMentorAttendance,
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
        submitDailyReport,
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
