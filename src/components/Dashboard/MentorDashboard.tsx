import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Check } from 'lucide-react';
import { getTodayDateString, getCurrentTimeWIB } from '../../utils/dateUtils';
import { AttendanceStatus } from '../../types';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getMentorKejuruanIds } from '../../utils/mentorKejuruan';
import { MentorClockCard } from './components/MentorClockCard';
import { MentorTraineeTable } from './components/MentorTraineeTable';

export const MentorDashboard: React.FC = () => {
  const {
    currentUser,
    users,
    kejuruanList,
    attendanceRecords,
    refreshUsers,
    refreshAttendanceRecords,
    clockIn,
    clockOut,
    getTodayRecordForUser,
    verifyAttendance,
    markAttendanceStatus,
    manualAddOrUpdateAttendance,
  } = useApp();

  const today = getTodayDateString();
  const [currentYear, currentMonth] = today.split('-').map(Number);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mentorNote, setMentorNote] = useState<string>('');

  // Mentor's assigned kejuruan
  const mentorKejuruanIds = useMemo(
    () => getMentorKejuruanIds(currentUser, kejuruanList),
    [currentUser, kejuruanList]
  );
  const mentorRosterKejuruanIds = useMemo(() => [...new Set([
    ...mentorKejuruanIds,
    ...(currentUser.kejuruanId ? [currentUser.kejuruanId] : []),
  ])], [mentorKejuruanIds, currentUser.kejuruanId]);

  const normalizeProgramName = (name?: string) => name?.trim().toLowerCase().replace(/\s+/g, ' ');

  const mentorProgramNames = useMemo(() => [...new Set([
    ...kejuruanList.filter(program => mentorKejuruanIds.includes(program.id)).map(program => program.name),
    ...(currentUser.kejuruanName ? [currentUser.kejuruanName] : []),
    ...(currentUser.name.toLowerCase().includes('fadil') ? ['Pengembangan Web dengan Node.js dan React'] : []),
    ...(currentUser.name.toLowerCase().includes('davy') ? ['Pemasangan Sistem Integrasi Bangunan Cerdas'] : []),
    ...(currentUser.name.toLowerCase().includes('ayu') || currentUser.name.toLowerCase().includes('vanesha') ? ['Pembuatan Sistem Informasi Pariwisata Berbasis Website'] : []),
    ...(currentUser.name.toLowerCase().includes('dzikri') ? [
      'Pengoperasian Tools Generative AI untuk Konten Digital dan Bisnis',
      'Pembuatan Konten Visual untuk Sosial Media',
      'Optimalisasi Pemasaran Melalui Media Sosial',
    ] : []),
  ])]
    .map(name => normalizeProgramName(name))
    .filter((name): name is string => !!name), [kejuruanList, mentorKejuruanIds, currentUser.kejuruanName, currentUser.name]);

  useEffect(() => {
    const refresh = () => {
      void refreshAttendanceRecords();
      void refreshUsers();
    };
    refresh();
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 15000);
    return () => {
      window.removeEventListener('focus', refresh);
      window.clearInterval(timer);
    };
  }, [currentUser.id, refreshAttendanceRecords, refreshUsers]);

  const belongsToMentor = (kejuruanId?: string, kejuruanName?: string) => {
    const programName = normalizeProgramName(kejuruanName) || '';
    const matchesProgramName = mentorProgramNames.some(name =>
      name === programName || (!!programName && (name.includes(programName) || programName.includes(name)))
    );
    return mentorRosterKejuruanIds.includes(kejuruanId || '') || matchesProgramName;
  };

  const mentorKejuruan = useMemo(() => {
    const firstProgram = kejuruanList.find(k => k.id === mentorKejuruanIds[0]) || kejuruanList[0];
    if (mentorKejuruanIds.length < 2 || !firstProgram) return firstProgram;
    return { ...firstProgram, id: 'smart-creative', name: 'Smart Creative', code: 'SC-04' };
  }, [kejuruanList, mentorKejuruanIds]);

  // Mentor's own today attendance record (verified by Admin)
  const myMentorRecord = getTodayRecordForUser(currentUser.id);
  const isMentorCheckedIn = !!myMentorRecord?.checkInTime;
  const isMentorCheckedOut = !!myMentorRecord?.checkOutTime;

  // Trainees in this mentor's class
  const classTrainees = useMemo(() => {
    return users.filter(u => u.role === 'trainee' && belongsToMentor(u.kejuruanId, u.kejuruanName));
  }, [users, mentorRosterKejuruanIds, mentorProgramNames]);

  // Trainee today records for this class
  const classTodayRecords = useMemo(() => {
    const classTraineeIds = new Set(classTrainees.map(trainee => trainee.id));
    return attendanceRecords.filter(r => r.date === today && r.userRole !== 'mentor' && (
      classTraineeIds.has(r.userId) || belongsToMentor(r.kejuruanId, r.kejuruanName)
    ));
  }, [attendanceRecords, today, classTrainees, mentorRosterKejuruanIds, mentorProgramNames]);

  // Class stats
  const stats = useMemo(() => {
    let hadir = 0;
    let telat = 0;
    let izin = 0;
    let sakit = 0;
    let pendingVerification = 0;

    classTodayRecords.forEach(r => {
      if (r.status === 'hadir') hadir++;
      else if (r.status === 'terlambat') telat++;
      else if (r.status === 'izin') izin++;
      else if (r.status === 'sakit') sakit++;

      if (r.verificationStatus === 'pending') {
        pendingVerification++;
      }
    });

    const totalPresent = hadir + telat;
    const totalTrainees = classTrainees.length;
    const rate = totalTrainees > 0 ? Math.round((totalPresent / totalTrainees) * 100) : 0;
    const belumAbsen = Math.max(0, totalTrainees - (totalPresent + izin + sakit));

    return { hadir, telat, izin, sakit, pendingVerification, belumAbsen, totalPresent, rate };
  }, [classTodayRecords, classTrainees.length]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Mentor self check-in
  const handleMentorClockIn = async () => {
    const res = await clockIn(mentorNote || 'Hadir memfasilitasi pelatihan kelas kejuruan');
    showToast(res.message);
  };

  // Mentor self check-out
  const handleMentorClockOut = async () => {
    const res = await clockOut('Sesi pelatihan kejuruan hari ini selesai');
    showToast(res.message);
  };

  // Mentor verifies a trainee's attendance
  const handleVerifyTrainee = (recordId: string, traineeName: string) => {
    verifyAttendance(recordId, 'verified');
    showToast(`Presensi ${traineeName} berhasil diverifikasi!`);
  };

  // Mentor approves all pending trainees in their class
  const handleApproveAllPendingTrainees = () => {
    const pendingList = classTodayRecords.filter(r => r.verificationStatus === 'pending');
    pendingList.forEach(r => {
      verifyAttendance(r.id, 'verified');
    });
    showToast(`Semua presensi peserta (${pendingList.length}) berhasil diverifikasi!`);
  };

  // Quick mark status for a trainee
  const handleQuickMark = (traineeId: string, status: AttendanceStatus) => {
    const existing = classTodayRecords.find(r => r.userId === traineeId);
    if (existing) {
      markAttendanceStatus(existing.id, status, 'verified');
    } else {
      const time = status === 'hadir' || status === 'terlambat' ? getCurrentTimeWIB() : undefined;
      manualAddOrUpdateAttendance(
        traineeId,
        today,
        status,
        time,
        `Divalidasi langsung oleh Mentor ${currentUser.name}`
      );
    }
    showToast(`Status presensi diubah ke: ${status.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-[#0D2F47] px-5 py-3 text-center text-sm font-bold text-white shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-[#A9C7DE]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SECTION 1: PRESENSI MANDIRI MENTOR */}
      <MentorClockCard
        isMentorCheckedIn={isMentorCheckedIn}
        isMentorCheckedOut={isMentorCheckedOut}
        myMentorRecord={myMentorRecord}
        mentorNote={mentorNote}
        setMentorNote={setMentorNote}
        onClockIn={handleMentorClockIn}
        onClockOut={handleMentorClockOut}
      />

      {/* SECTION 2: METRICS KELAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <article className="surface soft-hover rounded-2xl p-4 sm:p-5 border border-[#E4EAF0]">
          <span className="text-[10px] font-bold text-[#6F7F8D] uppercase tracking-wider block">
            Total Siswa Binaan
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-[#123B59]">
              {classTrainees.length}
            </span>
            <span className="text-xs text-[#6F7F8D]">siswa</span>
          </div>
        </article>

        <article className="surface soft-hover rounded-2xl p-4 sm:p-5 border border-[#E4EAF0]">
          <span className="text-[10px] font-bold text-[#4C83B5] uppercase tracking-wider block">
            Kehadiran Hari Ini
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-[#28618F]">
              {stats.rate}%
            </span>
            <span className="text-xs text-[#6F7F8D]">
              ({stats.totalPresent}/{classTrainees.length})
            </span>
          </div>
        </article>

        <article className="surface soft-hover rounded-2xl p-4 sm:p-5 border border-[#E4EAF0]">
          <span className="text-[10px] font-bold text-[#D95B83] uppercase tracking-wider block">
            Menunggu Verifikasi Mentor
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-[#B84469]">
              {stats.pendingVerification}
            </span>
            <span className="text-xs text-[#6F7F8D]">siswa</span>
          </div>
        </article>

        <article className="surface soft-hover rounded-2xl p-4 sm:p-5 border border-[#E4EAF0]">
          <span className="text-[10px] font-bold text-[#4C83B5] uppercase tracking-wider block">
            Izin / Sakit / Belum
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-[#4C83B5]">
              {stats.izin + stats.sakit}
            </span>
            <span className="text-xs text-[#6F7F8D]">/ {stats.belumAbsen} belum</span>
          </div>
        </article>
      </div>

      {/* SECTION 3: VERIFIKASI PRESENSI TRAINEE */}
      <MentorTraineeTable
        mentorKejuruan={mentorKejuruan}
        classTrainees={classTrainees}
        classTodayRecords={classTodayRecords}
        pendingCount={stats.pendingVerification}
        onVerifyTrainee={handleVerifyTrainee}
        onApproveAllPending={handleApproveAllPendingTrainees}
        onQuickMark={handleQuickMark}
      />
    </div>
  );
};
