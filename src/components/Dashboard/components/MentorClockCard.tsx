import React from 'react';
import { CalendarCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AttendanceRecord } from '../../../types';

interface MentorClockCardProps {
  isMentorCheckedIn: boolean;
  isMentorCheckedOut: boolean;
  myMentorRecord?: AttendanceRecord;
  mentorNote: string;
  setMentorNote: (note: string) => void;
  onClockIn: () => void;
  onClockOut: () => void;
}

export const MentorClockCard: React.FC<MentorClockCardProps> = ({
  isMentorCheckedIn,
  isMentorCheckedOut,
  myMentorRecord,
  mentorNote,
  setMentorNote,
  onClockIn,
  onClockOut,
}) => {
  return (
    <section className="surface soft-hover rounded-2xl p-5 border border-[#E4EAF0] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4EAF0] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-[#EAF2F8] text-[#4C83B5] flex items-center justify-center font-bold">
            <CalendarCheck className="w-4 h-4" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-[.13em] text-[#4C83B5] uppercase">
              PRESENSI MANDIRI
            </p>
            <h2 className="text-sm font-bold text-[#123B59]">
              Kehadiran Instruktur Mentor Hari Ini
            </h2>
          </div>
        </div>

        {/* Verification Status by Admin Badge */}
        <div>
          {!isMentorCheckedIn ? (
            <span className="text-xs text-[#6F7F8D] font-bold bg-[#F4F6F8] px-3 py-1 rounded-full">
              Belum Check-In Hari Ini
            </span>
          ) : myMentorRecord?.verificationStatus === 'pending' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF5E6] text-[#C05621] border border-amber-200 text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Menunggu Verifikasi Admin</span>
            </span>
          ) : myMentorRecord?.verificationStatus === 'verified' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF2F8] text-[#28618F] border border-[#C8DCEB] text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#4C83B5]" />
              <span>Diverifikasi oleh Admin {myMentorRecord?.verifiedBy ? `(${myMentorRecord.verifiedBy})` : ''}</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Mentor Action Terminal */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {!isMentorCheckedIn ? (
          <div className="flex-1 w-full space-y-3">
            <input
              type="text"
              value={mentorNote}
              onChange={(e) => setMentorNote(e.target.value)}
              placeholder="Rencana materi & topik pengajaran hari ini (opsional)..."
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
            />
            <button
              type="button"
              onClick={onClockIn}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#123B59] hover:bg-[#0D2F47] text-white text-xs font-bold transition cursor-pointer shadow-sm hover:-translate-y-0.5"
            >
              Catat Kehadiran Mentor (Check-In)
            </button>
          </div>
        ) : (
          <div className="flex-1 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-[#F8FAFB] p-3.5 rounded-xl border border-[#E4EAF0]">
            <div className="space-y-1">
              <div className="font-mono text-[#123B59] font-bold">
                Masuk: <strong>{myMentorRecord?.checkInTime} WIB</strong>
                {myMentorRecord?.checkOutTime && (
                  <span> &middot; Pulang: <strong>{myMentorRecord.checkOutTime} WIB</strong></span>
                )}
              </div>
              <div className="text-[#6F7F8D] text-[11px]">
                Agenda: {myMentorRecord?.notes || 'Hadir mengajar onsite'}
              </div>
            </div>

            {!isMentorCheckedOut && (
              <button
                type="button"
                onClick={onClockOut}
                className="px-4 py-2.5 rounded-xl bg-[#123B59] hover:bg-[#0D2F47] text-white text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Check-Out Selesai Mengajar
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
