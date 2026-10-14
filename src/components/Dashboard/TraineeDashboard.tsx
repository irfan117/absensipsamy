import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Check,
  Calendar,
  GraduationCap,
  FileText
} from 'lucide-react';
import {
  getTodayDateString,
  getCurrentTimeWIB,
  formatIndonesianDate,
  INDONESIAN_MONTHS
} from '../../utils/dateUtils';
import { exportToPDF } from '../../utils/exportUtils';
import { TraineeClockCard } from './components/TraineeClockCard';
import { TraineeRecentHistory } from './components/TraineeRecentHistory';

export const TraineeDashboard: React.FC = () => {
  const {
    currentUser,
    kejuruanList,
    attendanceRecords,
    leaveRequests,
    settings,
    clockIn,
    clockOut,
    getTodayRecordForUser,
  } = useApp();

  const today = getTodayDateString();
  const todayRecord = getTodayRecordForUser(currentUser.id);
  const [currentYear, currentMonth] = today.split('-').map(Number);
  const monthName = INDONESIAN_MONTHS[currentMonth - 1];

  const [liveTime, setLiveTime] = useState<string>('');
  const [dailyNote, setDailyNote] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [workMode, setWorkMode] = useState<'WFO' | 'WFH'>(todayRecord?.workMode || 'WFO');

  const isCheckedIn = !!todayRecord?.checkInTime;
  const isCheckedOut = !!todayRecord?.checkOutTime;

  const [isCurrentlyLate, setIsCurrentlyLate] = useState(false);

  const myKejuruan = kejuruanList.find((k) => k.id === currentUser.kejuruanId);
  const mentorName = myKejuruan?.mentorName || 'Instruktur Kejuruan';

  const todayLeave = leaveRequests.find(
    (l) =>
      l.userId === currentUser.id &&
      l.startDate <= today &&
      l.endDate >= today &&
      l.status === 'approved'
  );

  const myRecords = useMemo(() => {
    return attendanceRecords
      .filter((r) => r.userId === currentUser.id)
      .sort((a, b) => {
        const dateA = Date.parse(`${String(a.date).slice(0, 10)}T00:00:00Z`);
        const dateB = Date.parse(`${String(b.date).slice(0, 10)}T00:00:00Z`);
        const dayDifference = dateB - dateA;
        if (Number.isFinite(dayDifference) && dayDifference !== 0) return dayDifference;
        if (a.date !== b.date) return String(b.date).localeCompare(String(a.date));
        return (b.checkInTime || '').localeCompare(a.checkInTime || '');
      });
  }, [attendanceRecords, currentUser.id]);

  const monthlyStats = useMemo(() => {
    let hadir = 0;
    let telat = 0;
    let izin = 0;
    let sakit = 0;
    let alpha = 0;

    const monthStr = String(currentMonth).padStart(2, '0');
    const prefix = `${currentYear}-${monthStr}`;

    myRecords.forEach((r) => {
      if (r.date.startsWith(prefix)) {
        if (r.status === 'hadir') hadir++;
        else if (r.status === 'terlambat') telat++;
        else if (r.status === 'izin') izin++;
        else if (r.status === 'sakit') sakit++;
        else if (r.status === 'alpha') alpha++;
      }
    });

    const totalPresent = hadir + telat;
    const totalRecorded = totalPresent + izin + sakit + alpha;
    const rate = totalRecorded > 0 ? Math.round((totalPresent / totalRecorded) * 100) : 100;

    return { hadir, telat, izin, sakit, alpha, totalPresent, rate };
  }, [myRecords, currentYear, currentMonth]);

  useEffect(() => {
    const updateTime = () => {
      const time = getCurrentTimeWIB();
      const timeStr = time.replaceAll(':', '.');
      setLiveTime(timeStr);

      const limit = settings?.lateLimitTime || '09:00';
      const currentTimeHM = time.slice(0, 5);
      setIsCurrentlyLate(currentTimeHM > limit);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [settings?.lateLimitTime]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleClockIn = async () => {
    setIsLocating(true);
    setLocationError(null);

    const performClockIn = async (coords?: { lat: number; lng: number }) => {
      if (!coords) {
        setIsLocating(false);
        setLocationError('Izin atau akses lokasi diperlukan untuk melakukan presensi. Aktifkan GPS lalu coba lagi.');
        return;
      }
      const res = await clockIn(dailyNote.trim() || undefined, undefined, coords, workMode);
      setIsLocating(false);
      if (!res.success) setLocationError(res.message);
      else showToast(res.message);
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          performClockIn({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          performClockIn(undefined);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      performClockIn(undefined);
    }
  };

  const handleClockOut = async () => {
    setIsLocating(true);
    setLocationError(null);

    const performClockOut = async (coords?: { lat: number; lng: number }) => {
      if (!coords) {
        setIsLocating(false);
        setLocationError('Izin atau akses lokasi diperlukan untuk melakukan presensi keluar. Aktifkan GPS lalu coba lagi.');
        return;
      }
      const res = await clockOut(dailyNote.trim() || undefined, coords);
      setIsLocating(false);
      if (!res.success) setLocationError(res.message);
      else showToast(res.message);
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          performClockOut({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          performClockOut(undefined);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      performClockOut(undefined);
    }
  };

  const handleExportPDF = () => {
    exportToPDF({
      year: currentYear,
      month: currentMonth,
      selectedKejuruanId: currentUser.kejuruanId || 'all',
      kejuruanList,
      trainees: [currentUser],
      records: attendanceRecords,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {toastMessage && (
        <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-[#0D2F47] px-5 py-3 text-center text-sm font-bold text-white shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-[#A9C7DE]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Profile Card */}
      <div className="surface rounded-3xl p-6 border border-[#E4EAF0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#123B59] text-white flex items-center justify-center font-bold text-xl overflow-hidden shadow-xs shrink-0">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
            ) : (
              currentUser.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#123B59]">{currentUser.name}</h1>
            <p className="text-xs text-[#6F7F8D] mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                NIM: {currentUser.nim || '-'}
              </span>
              <span>•</span>
              <span className="font-semibold text-[#123B59]">
                {currentUser.kejuruanName || 'Program Kejuruan'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl border border-[#E4EAF0] bg-white hover:bg-[#F8FAFB] text-[#123B59] text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>Unduh Laporan PDF</span>
          </button>
        </div>
      </div>

      {/* Clock in/out section */}
      <TraineeClockCard
        liveTime={liveTime}
        isCurrentlyLate={isCurrentlyLate}
        lateLimitTime={settings?.lateLimitTime || '09:00'}
        isCheckedIn={isCheckedIn}
        isCheckedOut={isCheckedOut}
        isLeaveApproved={!!todayLeave}
        checkInTime={todayRecord?.checkInTime}
        checkOutTime={todayRecord?.checkOutTime}
        dailyNote={dailyNote}
        setDailyNote={setDailyNote}
        workMode={workMode}
        setWorkMode={setWorkMode}
        isLocating={isLocating}
        locationError={locationError}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
      />

      {/* Monthly Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <article className="surface soft-hover rounded-2xl p-4 sm:p-5 border border-[#E4EAF0]">
          <span className="text-[10px] font-bold text-[#2E7D32] uppercase tracking-wider block">
            Hadir Tepat Waktu
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-[#2E7D32]">
              {monthlyStats.hadir}
            </span>
            <span className="text-xs text-[#6F7F8D]">hari</span>
          </div>
        </article>

        <article className="surface soft-hover rounded-2xl p-4 sm:p-5 border border-[#E4EAF0]">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
            Terlambat
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-amber-600">
              {monthlyStats.telat}
            </span>
            <span className="text-xs text-[#6F7F8D]">hari</span>
          </div>
        </article>

        <article className="surface soft-hover rounded-2xl p-4 sm:p-5 border border-[#E4EAF0]">
          <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">
            Izin / Sakit
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-sky-600">
              {monthlyStats.izin + monthlyStats.sakit}
            </span>
            <span className="text-xs text-[#6F7F8D]">hari</span>
          </div>
        </article>

        <article className="surface soft-hover rounded-2xl p-4 sm:p-5 border border-[#E4EAF0]">
          <span className="text-[10px] font-bold text-[#123B59] uppercase tracking-wider block">
            Tingkat Kehadiran
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-[#123B59]">
              {monthlyStats.rate}%
            </span>
            <span className="text-xs text-[#6F7F8D]">{monthName}</span>
          </div>
        </article>
      </div>

      {/* Recent History */}
      <TraineeRecentHistory records={myRecords} />
    </div>
  );
};
