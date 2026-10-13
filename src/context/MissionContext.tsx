import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Mission, MissionSubmission } from '../types';
import { INITIAL_MISSIONS } from '../data/missionsData';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import confetti from 'canvas-confetti';

interface MissionContextType {
  missions: Mission[];
  missionSubmissions: MissionSubmission[];
  refreshMissions: () => Promise<void>;
  resetTraineeHallOfFamePoints: () => Promise<{ success: boolean; count: number; message: string }>;
  resetMentorMissionData: () => Promise<{ success: boolean; missions: number; submissions: number; message: string }>;
  addMission: (missionData: Omit<Mission, 'id' | 'createdAt'>) => Promise<void>;
  updateMission: (id: string, updates: Partial<Mission>) => void;
  deleteMission: (id: string) => Promise<void>;
  submitMissionWork: (submissionData: {
    missionId: string;
    submissionLink?: string;
    notes: string;
  }) => { success: boolean; message: string };
  reviewMissionSubmission: (
    submissionId: string,
    status: 'approved' | 'rejected',
    feedback?: string,
    awardedPoints?: number
  ) => Promise<void>;
  getUserPoints: (userId: string) => number;
}

const MissionContext = createContext<MissionContextType | undefined>(undefined);

export const MissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { jwtToken, currentUser } = useAuth();
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);
  const [missionSubmissions, setMissionSubmissions] = useState<MissionSubmission[]>([]);

  const refreshMissions = useCallback(async () => {
    if (!jwtToken) return;
    try {
      const res = await api.getMissions();
      if (res.success) {
        if (Array.isArray(res.missions)) setMissions(res.missions);
        if (Array.isArray(res.submissions)) setMissionSubmissions(res.submissions);
      }
    } catch (err) {
      console.warn('API getMissions failed:', err);
    }
  }, [jwtToken]);

  useEffect(() => {
    if (jwtToken) {
      void refreshMissions();
    }
  }, [jwtToken, refreshMissions]);

  const addMission = async (missionData: Omit<Mission, 'id' | 'createdAt'>) => {
    try {
      const res = await api.createMission(missionData);
      if (res.success && res.mission) {
        setMissions((prev) => [res.mission!, ...prev]);
      }
    } catch {
      const newMission: Mission = { ...missionData, id: `mis-loc-${Date.now()}`, createdAt: new Date().toISOString(), status: 'active' };
      setMissions((prev) => [newMission, ...prev]);
    }
  };

  const updateMission = (id: string, updates: Partial<Mission>) => {
    void api.updateMission(id, updates);
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const deleteMission = async (id: string) => {
    void api.deleteMission(id);
    setMissions((prev) => prev.filter((m) => m.id !== id));
  };

  const submitMissionWork = (submissionData: {
    missionId: string;
    submissionLink?: string;
    notes: string;
  }) => {
    if (!currentUser) return { success: false, message: 'User tidak ditemukan.' };
    const targetMission = missions.find((m) => m.id === submissionData.missionId);
    if (!targetMission) return { success: false, message: 'Misi tidak ditemukan.' };

    const newSub: MissionSubmission = {
      id: `sub-${Date.now()}`,
      missionId: targetMission.id,
      missionTitle: targetMission.title,
      traineeId: currentUser.id,
      traineeName: currentUser.name,
      traineeNim: currentUser.nim || '',
      traineeAvatar: currentUser.avatar || '',
      kejuruanId: currentUser.kejuruanId || '',
      kejuruanName: currentUser.kejuruanName || '',
      submissionLink: submissionData.submissionLink,
      notes: submissionData.notes,
      points: targetMission.points,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    void api.submitMissionWork(submissionData);
    setMissionSubmissions((prev) => [newSub, ...prev.filter((s) => s.missionId !== targetMission.id || s.traineeId !== currentUser.id)]);

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch {}

    return { success: true, message: 'Tugas misi berhasil dikumpulkan!' };
  };

  const reviewMissionSubmission = async (
    submissionId: string,
    status: 'approved' | 'rejected',
    feedback?: string,
    awardedPoints?: number
  ) => {
    void api.reviewMissionSubmission(submissionId, { status, feedback, awardedPoints });
    setMissionSubmissions((prev =>
      prev.map((s) =>
        s.id === submissionId
          ? { ...s, status, feedback, awardedPoints: status === 'approved' ? awardedPoints ?? s.points : 0 }
          : s
      ))
    );
  };

  const getUserPoints = (userId: string) => {
    return missionSubmissions
      .filter((s) => s.traineeId === userId && s.status === 'approved')
      .reduce((sum, s) => sum + (s.awardedPoints ?? s.points ?? 0), 0);
  };

  const resetTraineeHallOfFamePoints = async () => {
    try {
      const res = await api.resetTraineeHallOfFamePoints();
      if (res.success) {
        setMissionSubmissions([]);
      }
      return res;
    } catch {
      return { success: false, count: 0, message: 'Gagal mereset poin Hall of Fame.' };
    }
  };

  const resetMentorMissionData = async () => {
    try {
      const res = await api.resetMentorMissionData();
      if (res.success) {
        await refreshMissions();
      }
      return res;
    } catch {
      return { success: false, missions: 0, submissions: 0, message: 'Gagal mereset data misi mentor.' };
    }
  };

  return (
    <MissionContext.Provider
      value={{
        missions,
        missionSubmissions,
        refreshMissions,
        resetTraineeHallOfFamePoints,
        resetMentorMissionData,
        addMission,
        updateMission,
        deleteMission,
        submitMissionWork,
        reviewMissionSubmission,
        getUserPoints,
      }}
    >
      {children}
    </MissionContext.Provider>
  );
};

export const useMissions = () => {
  const ctx = useContext(MissionContext);
  if (!ctx) throw new Error('useMissions harus digunakan di dalam MissionProvider');
  return ctx;
};

export default MissionContext;