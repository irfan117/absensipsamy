import React from 'react';
import { LogIn, LogOut, Clock, AlertTriangle } from 'lucide-react';

interface TraineeClockCardProps {
  liveTime: string;
  isCurrentlyLate: boolean;
  lateLimitTime: string;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  isLeaveApproved?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  dailyNote: string;
  setDailyNote: (note: string) => void;
  workMode: 'WFO' | 'WFH';
  setWorkMode: (mode: 'WFO' | 'WFH') => void;
  isLocating: boolean;
  locationError: string | null;
  onClockIn: () => void;
  onClockOut: () => void;
}

export const TraineeClockCard: React.FC<TraineeClockCardProps> = ({
  liveTime,
  isCurrentlyLate,
  lateLimitTime,
  isCheckedIn,
  isCheckedOut,
  isLeaveApproved = false,
  checkInTime,
  checkOutTime,
  dailyNote,
  setDailyNote,
  workMode,
  setWorkMode,
  isLocating,
  locationError,
  onClockIn,
  onClockOut,
}) => {
  return (
    <div className="surface rounded-3xl border border-[#E4EAF0] p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4EAF0] pb-4">
        <div>
          <span className="text-[10px] font-bold text-[#4C83B5] uppercase tracking-wider block">
            Waktu Realtime WIB
          </span>
          <div className="text-3xl font-mono font-bold text-[#123B59] mt-0.5">
            {liveTime || '00.00.00'} <span className="text-xs text-[#6F7F8D]">WIB</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#F8FAFB] p-1.5 rounded-2xl border border-[#E4EAF0]">
          <button
            type="button"
            onClick={() => !isCheckedIn && setWorkMode('WFO')}
            disabled={isCheckedIn}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition disabled:opacity-60 disabled:cursor-not-allowed ${
              workMode === 'WFO'
                ? 'bg-[#123B59] text-white shadow-2xs'
                : 'text-[#6F7F8D] hover:text-[#123B59]'
            }`}
          >
            WFO (Kantor)
          </button>
          <button
            type="button"
            onClick={() => !isCheckedIn && setWorkMode('WFH')}
            disabled={isCheckedIn}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition disabled:opacity-60 disabled:cursor-not-allowed ${
              workMode === 'WFH'
                ? 'bg-[#123B59] text-white shadow-2xs'
                : 'text-[#6F7F8D] hover:text-[#123B59]'
            }`}
          >
            WFH (Rumah)
          </button>
        </div>
      </div>

      {!isCheckedIn && isCurrentlyLate && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-bold">Perhatian: Sudah Melewati Batas Masuk ({lateLimitTime} WIB)</p>
            <p className="mt-0.5 text-[11px] text-amber-700">
              Absen masuk sekarang akan dicatat sebagai <strong>Terlambat</strong> dan dapat memotong poin presensi.
            </p>
          </div>
        </div>
      )}

      {isLeaveApproved && (
        <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-sky-600" />
          <p>Izin atau sakit Anda telah disetujui untuk hari ini. Presensi dinonaktifkan.</p>
        </div>
      )}

      {locationError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{locationError}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-[#123B59] mb-1.5">
          Catatan / Lokasi Singkat (Opsional)
        </label>
        <input
          type="text"
          value={dailyNote}
          onChange={(e) => setDailyNote(e.target.value)}
          placeholder="Contoh: Bekerja dari Ruang Lab Komputer 2"
          className="w-full text-xs p-3 rounded-2xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          disabled={isCheckedIn || isLocating || isLeaveApproved}
          onClick={onClockIn}
          className={`p-4 rounded-2xl border text-xs font-bold transition flex items-center justify-between ${
            isCheckedIn
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 cursor-default'
              : 'bg-[#2E7D32] hover:bg-[#256628] text-white border-transparent shadow-xs cursor-pointer disabled:opacity-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <LogIn className="w-5 h-5" />
            <div className="text-left">
              <span className="block font-bold">Presensi Masuk</span>
              <span className="text-[10px] font-normal opacity-90">
                {isCheckedIn ? `Sudah Absen (${checkInTime})` : 'Klik untuk Check-in'}
              </span>
            </div>
          </div>
        </button>

        <button
          type="button"
          disabled={!isCheckedIn || isCheckedOut || isLocating || isLeaveApproved}
          onClick={onClockOut}
          className={`p-4 rounded-2xl border text-xs font-bold transition flex items-center justify-between ${
            isCheckedOut
              ? 'bg-sky-50 border-sky-200 text-sky-800 cursor-default'
              : isCheckedIn
              ? 'bg-[#123B59] hover:bg-[#0E2E46] text-white border-transparent shadow-xs cursor-pointer'
              : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <LogOut className="w-5 h-5" />
            <div className="text-left">
              <span className="block font-bold">Presensi Keluar</span>
              <span className="text-[10px] font-normal opacity-90">
                {isCheckedOut
                  ? `Sudah Absen (${checkOutTime})`
                  : isCheckedIn
                  ? 'Klik untuk Check-out'
                  : 'Belum Presensi Masuk'}
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
