import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Check,
  GraduationCap,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { getTodayDateString } from '../../utils/dateUtils';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getKejuruanFilterOptions, matchesKejuruanFilter } from '../../utils/kejuruanCodes';

import { AdminStatCards } from './components/AdminStatCards';
import { MentorAttendanceTable } from './components/MentorAttendanceTable';

export const AdminDashboard: React.FC = () => {
  const {
    users,
    kejuruanList,
    attendanceRecords,
    refreshAttendanceRecords,
    verifyAttendance,
    markAttendanceStatus,
    manualAddOrUpdateAttendance,
  } = useApp();

  const today = getTodayDateString();
  const [currentYear, currentMonth] = today.split('-').map(Number);
  const [selectedKejuruanFilter, setSelectedKejuruanFilter] = useState<string>('all');
  const [activeAdminView, setActiveAdminView] = useState<'mentors' | 'trainees'>('mentors');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let inFlight: Promise<void> | null = null;
    const refresh = () => {
      if (inFlight) return;
      inFlight = refreshAttendanceRecords().finally(() => {
        inFlight = null;
      });
    };
    refresh();
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => {
      window.removeEventListener('focus', refresh);
      window.clearInterval(timer);
    };
  }, [refreshAttendanceRecords]);

  const mentors = useMemo(() => users.filter((u) => u.role === 'mentor'), [users]);
  const trainees = useMemo(() => users.filter((u) => u.role === 'trainee'), [users]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const mentorTodayRecords = useMemo(() => {
    return mentors.map((mentor) => {
      const record = attendanceRecords.find((r) => r.userId === mentor.id && r.date === today);
      return { mentor, record };
    });
  }, [mentors, attendanceRecords, today]);

  const mentorStats = useMemo(() => {
    let hadir = 0;
    let pendingVerification = 0;
    let verified = 0;
    let belumAbsen = 0;

    mentorTodayRecords.forEach(({ record }) => {
      if (!record || !record.checkInTime) {
        belumAbsen++;
      } else {
        hadir++;
        if (record.verificationStatus === 'pending') {
          pendingVerification++;
        } else if (record.verificationStatus === 'verified') {
          verified++;
        }
      }
    });

    return {
      total: mentors.length,
      hadir,
      pendingVerification,
      verified,
      belumAbsen,
    };
  }, [mentorTodayRecords, mentors.length]);

  const traineeTodayRecords = useMemo(() => {
    return attendanceRecords.filter((r) => r.date === today && r.userRole !== 'mentor');
  }, [attendanceRecords, today]);

  const traineeMetrics = useMemo(() => {
    const totalTrainees = trainees.length;
    let hadirTepat = 0;
    let hadirTerlambat = 0;
    let izin = 0;
    let sakit = 0;

    traineeTodayRecords.forEach((r) => {
      if (r.status === 'hadir') hadirTepat++;
      else if (r.status === 'terlambat') hadirTerlambat++;
      else if (r.status === 'izin') izin++;
      else if (r.status === 'sakit') sakit++;
    });

    const totalMasuk = hadirTepat + hadirTerlambat;
    const belumAbsen = Math.max(0, totalTrainees - (totalMasuk + izin + sakit));

    return {
      totalTrainees,
      totalMasuk,
      hadirTepat,
      hadirTerlambat,
      izin,
      sakit,
      belumAbsen,
    };
  }, [trainees.length, traineeTodayRecords]);

  const handleApproveAllPendingMentors = () => {
    let count = 0;
    mentorTodayRecords.forEach(({ record }) => {
      if (record && record.verificationStatus === 'pending') {
        verifyAttendance(record.id, 'verified');
        count++;
      }
    });
    showToast(`Berhasil menyetujui ${count} presensi mentor!`);
  };

  const handleExportExcel = () => {
    exportToExcel({
      year: currentYear,
      month: currentMonth,
      selectedKejuruanId: selectedKejuruanFilter,
      kejuruanList,
      trainees,
      records: attendanceRecords,
    });
  };

  const handleExportPDF = () => {
    exportToPDF({
      year: currentYear,
      month: currentMonth,
      selectedKejuruanId: selectedKejuruanFilter,
      kejuruanList,
      trainees,
      records: attendanceRecords,
    });
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-[#0D2F47] px-5 py-3 text-center text-sm font-bold text-white shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-[#A9C7DE]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Switcher: Verifikasi Mentor vs Monitoring Peserta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4EAF0] pb-3">
        <div className="flex flex-wrap items-center gap-1 bg-[#F4F6F8] p-1 rounded-xl border border-[#E4EAF0]">
          <button
            type="button"
            onClick={() => setActiveAdminView('mentors')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeAdminView === 'mentors'
                ? 'bg-[#123B59] text-white shadow-xs'
                : 'text-[#6F7F8D] hover:text-[#123B59]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-[#A9C7DE]" />
            <span>Verifikasi Mentor ({mentorStats.total})</span>
            {mentorStats.pendingVerification > 0 && (
              <span className="px-2 py-0.2 rounded-full bg-[#D95B83] text-white font-bold text-[10px]">
                {mentorStats.pendingVerification}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminView('trainees')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeAdminView === 'trainees'
                ? 'bg-[#123B59] text-white shadow-xs'
                : 'text-[#6F7F8D] hover:text-[#123B59]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#A9C7DE]" />
            <span>Monitoring Peserta ({traineeMetrics.totalTrainees})</span>
          </button>
        </div>

        {activeAdminView === 'mentors' && mentorStats.pendingVerification > 0 && (
          <button
            type="button"
            onClick={handleApproveAllPendingMentors}
            className="px-4 py-2 rounded-xl bg-[#123B59] hover:bg-[#0D2F47] text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Check className="w-3.5 h-3.5 text-[#A9C7DE]" />
            <span>Setujui Semua Pending ({mentorStats.pendingVerification})</span>
          </button>
        )}
      </div>

      {activeAdminView === 'mentors' ? (
        <div className="space-y-6">
          <AdminStatCards
            mentorTotal={mentorStats.total}
            mentorHadir={mentorStats.hadir}
            mentorPending={mentorStats.pendingVerification}
            mentorVerified={mentorStats.verified}
          />

          <MentorAttendanceTable
            mentorRecords={mentorTodayRecords}
            onVerify={(recordId, status) => {
              verifyAttendance(recordId, status);
              showToast(`Status presensi berhasil diubah menjadi ${status}`);
            }}
            onMarkStatus={markAttendanceStatus}
            onManualAdd={manualAddOrUpdateAttendance}
            todayDate={today}
          />
        </div>
      ) : (
        /* Trainee Monitoring */
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <article className="surface soft-hover rounded-2xl p-4 sm:p-5 border border-[#E4EAF0]">
              <span className="text-[10px] font-bold text-[#6F7F8D] uppercase tracking-wider block">
                Total Peserta Terdaftar
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums text-[#123B59]">
                  {traineeMetrics.totalTrainees}
                </span>
                <span className="text-xs text-[#6F7F8D]">siswa</span>
              </div>
            </article>

            <article className="surface soft-hover rounded-2xl p-4 sm:p-5 border border-[#E4EAF0]">
              <span className="text-[10px] font-bold text-[#2E7D32] uppercase tracking-wider block">
                Peserta Masuk Hari Ini
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums text-[#2E7D32]">
                  {traineeMetrics.totalMasuk}
                </span>
                <span className="text-xs text-[#6F7F8D]">hadir</span>
              </div>
            </article>

            <article className="surface soft-hover rounded-2xl p-4 sm:p-5 border border-[#E4EAF0]">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                Izin / Sakit
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums text-amber-600">
                  {traineeMetrics.izin + traineeMetrics.sakit}
                </span>
                <span className="text-xs text-[#6F7F8D]">orang</span>
              </div>
            </article>

            <article className="surface soft-hover rounded-2xl p-4 sm:p-5 border border-[#E4EAF0]">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Belum Mengisi Presensi
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums text-slate-700">
                  {traineeMetrics.belumAbsen}
                </span>
                <span className="text-xs text-[#6F7F8D]">peserta</span>
              </div>
            </article>
          </div>

          <div className="surface p-4 rounded-2xl border border-[#E4EAF0] flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#123B59]">Program:</span>
              <select
                value={selectedKejuruanFilter}
                onChange={(e) => setSelectedKejuruanFilter(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none"
              >
                <option value="all">Semua Program Kejuruan</option>
                {getKejuruanFilterOptions(kejuruanList).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3.5 py-2 rounded-xl border border-[#E4EAF0] bg-white hover:bg-[#F8FAFB] text-[#123B59] text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span>Unduh Excel</span>
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="px-3.5 py-2 rounded-xl border border-[#E4EAF0] bg-white hover:bg-[#F8FAFB] text-[#123B59] text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>Unduh PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
