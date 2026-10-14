import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { MobileHeaderStatus } from '../MobileHeaderStatus';
import { Mission, MissionDifficulty, MissionSubmission } from '../../types';
import {
  Target,
  Plus,
  Sparkles,
  Search,
  RotateCcw,
  Award,
  Flame,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { matchesKejuruanFilter } from '../../utils/kejuruanCodes';

import { MissionCard } from './components/MissionCard';
import { UpsertMissionModal } from './components/UpsertMissionModal';
import { SubmitWorkModal } from './components/SubmitWorkModal';
import { ReviewSubmissionModal } from './components/ReviewSubmissionModal';
import { SubmissionList } from './components/SubmissionList';

export const MissionManagementView: React.FC = () => {
  const {
    currentUser,
    kejuruanList,
    missions,
    missionSubmissions,
    attendanceRecords,
    addMission,
    updateMission,
    deleteMission,
    submitMissionWork,
    reviewMissionSubmission,
    resetMentorMissionData,
    getUserPoints,
    getLatePenaltyPoints,
    getAbsentPenaltyPoints,
    refreshMissions,
    jwtToken,
  } = useApp();

  const isMentor = currentUser.role === 'mentor';
  const isAdmin = currentUser.role === 'admin';
  const isTrainee = currentUser.role === 'trainee';
  const normalizeProgramName = (name?: string) => name?.trim().toLowerCase().replace(/\s+/g, ' ');

  // Auto-refresh timer for mission real-time updates
  useEffect(() => {
    if (isAdmin || !jwtToken) return;
    const refresh = () => void refreshMissions();
    refresh();
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 15000);
    return () => {
      window.removeEventListener('focus', refresh);
      window.clearInterval(timer);
    };
  // Context methods are recreated on render; depending on refreshMissions
  // restarts polling after every response and can saturate the API.
  }, [isAdmin, currentUser.id, jwtToken]);

  const profileProgramName = normalizeProgramName(currentUser.kejuruanName);
  const matchesProfileProgram = useCallback((id?: string, name?: string) =>
    (!!id && id === currentUser.kejuruanId) ||
    (!!name && normalizeProgramName(name) === profileProgramName) ||
    (!!currentUser.kejuruanId && matchesKejuruanFilter(currentUser.kejuruanId, kejuruanList, id, name)),
  [currentUser.kejuruanId, profileProgramName, kejuruanList]);

  const [activeTab, setActiveTab] = useState<'missions' | 'submissions'>(
    isAdmin ? 'submissions' : 'missions'
  );

  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isUpsertModalOpen, setIsUpsertModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [targetMissionForSubmit, setTargetMissionForSubmit] = useState<Mission | null>(null);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedSubmissionForReview, setSelectedSubmissionForReview] =
    useState<MissionSubmission | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter missions
  const filteredMissions = useMemo(() => {
    return missions.filter((m) => {
      if ((isMentor || isTrainee) && !matchesProfileProgram(m.kejuruanId, m.kejuruanName)) {
        return false;
      }
      if (selectedDifficulty !== 'all' && m.difficulty !== selectedDifficulty) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchDesc = m.description.toLowerCase().includes(q);
        const matchCat = m.category?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [
    missions,
    isMentor,
    isTrainee,
    currentUser.kejuruanId,
    currentUser.kejuruanName,
    kejuruanList,
    matchesProfileProgram,
    selectedDifficulty,
    searchQuery,
  ]);

  // Submissions filtered for Mentor / Admin
  const relevantSubmissions = useMemo(() => {
    return missionSubmissions.filter((sub) => {
      const mission = missions.find((item) => item.id === sub.missionId);
      const programId = sub.kejuruanId || mission?.kejuruanId;
      if (isMentor && !matchesProfileProgram(programId, sub.kejuruanName || mission?.kejuruanName)) {
        return false;
      }
      return true;
    });
  }, [
    missionSubmissions,
    missions,
    isMentor,
    kejuruanList,
    currentUser.kejuruanId,
    currentUser.kejuruanName,
    matchesProfileProgram,
  ]);

  const pendingSubmissionsCount = useMemo(() => {
    return relevantSubmissions.filter((s) => s.status === 'pending').length;
  }, [relevantSubmissions]);

  // Trainee stats
  const traineePoints = useMemo(() => {
    if (!isTrainee) return 0;
    return getUserPoints(currentUser.id);
  }, [isTrainee, currentUser.id, getUserPoints, missionSubmissions]);

  const traineeCompletedMissions = useMemo(() => {
    return missionSubmissions.filter(
      (s) => s.traineeId === currentUser.id && s.status === 'approved'
    ).length;
  }, [missionSubmissions, currentUser.id]);

  const traineeLatePenalty = useMemo(() => {
    if (!isTrainee) return 0;
    return getLatePenaltyPoints(currentUser.id) + getAbsentPenaltyPoints(currentUser.id);
  }, [isTrainee, currentUser.id, getLatePenaltyPoints, getAbsentPenaltyPoints, attendanceRecords]);

  const handleOpenEdit = (mission: Mission) => {
    setEditingMission(mission);
    setIsUpsertModalOpen(true);
  };

  const handleDeleteMission = async (mission: Mission) => {
    if (!window.confirm(`Hapus misi "${mission.title}"? Seluruh data tugas yang terkumpul akan hilang.`)) {
      return;
    }
    await deleteMission(mission.id);
    showToast('Misi berhasil dihapus');
  };

  const handleResetData = async () => {
    if (!window.confirm('Reset semua misi dan pengumpulan tugas untuk program ini?')) return;
    const res = await resetMentorMissionData();
    showToast(res.message);
  };

  return (
    <div className="space-y-6 pb-12 lg:pt-20">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#123B59] text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-bold border border-white/20 animate-in fade-in slide-in-from-top-4 duration-300">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E4EAF0]">
        <div>
          <h1 className="text-xl font-bold text-[#123B59] flex items-center gap-2">
            <span>Manajemen Misi & Gamifikasi</span>
            <span className="text-xs py-0.5 px-2 bg-amber-100 text-amber-800 rounded-full font-bold">
              {missions.length} Misi Aktif
            </span>
          </h1>
          <p className="text-xs text-[#6F7F8D] mt-1">
            {isTrainee
              ? 'Selesaikan misi harian & proyek untuk mendongkrak peringkatmu di Hall of Fame.'
              : 'Rancang tantangan berhadiah poin dan evaluasi pengumpulan tugas peserta.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isMentor && (
            <button
              type="button"
              onClick={handleResetData}
              className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Misi Saya</span>
            </button>
          )}

          {(isMentor || isAdmin) && (
            <button
              type="button"
              onClick={() => {
                setEditingMission(null);
                setIsUpsertModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#123B59] hover:bg-[#0E2E46] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Misi Baru</span>
            </button>
          )}
        </div>
      </div>

      <MobileHeaderStatus />

      {/* Trainee Gamification Banner */}
      {isTrainee && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="surface p-4 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-amber-800">Total Poin Saya</p>
              <p className="text-lg font-bold text-[#123B59]">{traineePoints} Poin</p>
            </div>
          </div>

          <div className="surface p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-emerald-800">Misi Selesai</p>
              <p className="text-lg font-bold text-[#123B59]">{traineeCompletedMissions} Tugas</p>
            </div>
          </div>

          <div className="surface p-4 rounded-2xl border border-rose-200 bg-rose-50/40 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-rose-800">Penalti Presensi</p>
              <p className="text-lg font-bold text-rose-600">-{traineeLatePenalty} Poin</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Switcher for Mentor/Admin */}
      {(isMentor || isAdmin) && (
        <div className="flex items-center gap-1 bg-[#F4F6F8] p-1 rounded-xl border border-[#E4EAF0] w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('missions')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'missions'
                ? 'bg-[#123B59] text-white shadow-xs'
                : 'text-[#6F7F8D] hover:text-[#123B59]'
            }`}
          >
            Daftar Misi ({filteredMissions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'submissions'
                ? 'bg-[#123B59] text-white shadow-xs'
                : 'text-[#6F7F8D] hover:text-[#123B59]'
            }`}
          >
            <span>Pengumpulan Tugas</span>
            {pendingSubmissionsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white">
                {pendingSubmissionsCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="surface p-4 rounded-2xl border border-[#E4EAF0] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'missions' && (
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none"
            >
              <option value="all">Semua Kesulitan</option>
              <option value="Mudah">Mudah</option>
              <option value="Sedang">Sedang</option>
              <option value="Tantangan">Tantangan</option>
            </select>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#6F7F8D] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul atau topik..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'missions' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMissions.length === 0 ? (
            <div className="col-span-full py-12 text-center text-[#6F7F8D] surface rounded-2xl border border-[#E4EAF0]">
              <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold">Tidak ada misi yang sesuai filter.</p>
            </div>
          ) : (
            filteredMissions.map((mission) => {
              const mySub = missionSubmissions.find(
                (s) => s.missionId === mission.id && s.traineeId === currentUser.id
              );
              return (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  isMentor={isMentor}
                  isAdmin={isAdmin}
                  isTrainee={isTrainee}
                  userSubmission={mySub}
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteMission}
                  onSubmitWork={(m) => {
                    setTargetMissionForSubmit(m);
                    setIsSubmitModalOpen(true);
                  }}
                />
              );
            })
          )}
        </div>
      ) : (
        <SubmissionList
          submissions={relevantSubmissions}
          missions={missions}
          onOpenReview={(sub) => {
            setSelectedSubmissionForReview(sub);
            setIsReviewModalOpen(true);
          }}
        />
      )}

      {/* Modals */}
      <UpsertMissionModal
        isOpen={isUpsertModalOpen}
        onClose={() => setIsUpsertModalOpen(false)}
        editingMission={editingMission}
        kejuruanList={kejuruanList}
        isMentor={isMentor}
        mentorKejuruanIds={currentUser.kejuruanId ? [currentUser.kejuruanId] : []}
        onSubmit={async (data, editingId) => {
          if (editingId) {
            await updateMission(editingId, data);
            showToast('Misi berhasil diperbarui');
          } else {
            await addMission(data);
            showToast('Misi baru berhasil dibuat');
          }
        }}
      />

      <SubmitWorkModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        mission={targetMissionForSubmit}
        onSubmit={async (subData) => {
          const res = await submitMissionWork(subData);
          if (res.success) {
            showToast(res.message);
          }
          return res;
        }}
      />

      <ReviewSubmissionModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        submission={selectedSubmissionForReview}
        missions={missions}
        onReview={async (subId, status, feedback, points) => {
          await reviewMissionSubmission(subId, status, feedback, points);
          showToast('Penilaian submission berhasil disimpan');
        }}
      />
    </div>
  );
};
