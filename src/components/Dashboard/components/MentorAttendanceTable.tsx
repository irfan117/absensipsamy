import React from 'react';
import { User, AttendanceRecord, AttendanceStatus, VerificationStatus } from '../../../types';
import { Check, Clock, AlertTriangle } from 'lucide-react';

interface MentorAttendanceTableProps {
  mentorRecords: {
    mentor: User;
    record?: AttendanceRecord;
  }[];
  onVerify: (recordId: string, status: 'verified' | 'rejected') => void;
  onMarkStatus: (recordId: string, status: AttendanceStatus, verificationStatus?: VerificationStatus) => void;
  onManualAdd: (userId: string, date: string, status: AttendanceStatus, checkInTime?: string) => void;
  todayDate: string;
}

export const MentorAttendanceTable: React.FC<MentorAttendanceTableProps> = ({
  mentorRecords,
  onVerify,
  onMarkStatus,
  onManualAdd,
  todayDate,
}) => {
  return (
    <div className="surface rounded-2xl border border-[#E4EAF0] overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#F8FAFB] border-b border-[#E4EAF0] text-[#6F7F8D] text-[10px] font-bold tracking-wide uppercase">
              <th className="py-3 px-3.5 w-10 text-center">No</th>
              <th className="py-3 px-3 min-w-[180px]">Nama Instruktur Mentor</th>
              <th className="py-3 px-3 min-w-[150px]">Kejuruan / Program</th>
              <th className="py-3 px-3 w-28">Jam Masuk</th>
              <th className="py-3 px-3 w-32">Status Absen</th>
              <th className="py-3 px-3 w-36">Verifikasi Admin</th>
              <th className="py-3 px-3 w-40 text-right">Aksi Verifikasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4EAF0]">
            {mentorRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#6F7F8D]">
                  <p className="text-sm font-semibold">Belum ada akun instruktur mentor tersimpan.</p>
                </td>
              </tr>
            ) : (
              mentorRecords.map(({ mentor, record }, idx) => {
                const hasCheckedIn = Boolean(record && record.checkInTime);
                const isPending = record?.verificationStatus === 'pending';
                const isVerified = record?.verificationStatus === 'verified';
                const isRejected = record?.verificationStatus === 'rejected';

                return (
                  <tr key={mentor.id} className="hover:bg-[#F8FAFB] transition-colors">
                    <td className="py-3 px-3.5 text-center text-[#6F7F8D] font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#123B59]">{mentor.name}</div>
                      <div className="text-[10px] text-[#6F7F8D]">
                        NIM/NIP: {mentor.nim || mentor.loginCode || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[#123B59] font-medium">
                      {mentor.kejuruanName || '-'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#123B59]">
                      {record?.checkInTime || '-'}
                    </td>
                    <td className="py-3 px-3">
                      {hasCheckedIn ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Hadir
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Belum Absen
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                          <Check className="w-3 h-3 text-sky-600" /> Verified
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> Ditolak
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" /> Menunggu
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {hasCheckedIn && record ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {!isVerified && (
                            <button
                              type="button"
                              onClick={() => onVerify(record.id, 'verified')}
                              className="px-2.5 py-1 rounded-lg bg-[#2E7D32] hover:bg-[#256628] text-white text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
                            >
                              <Check className="w-3 h-3" /> Setujui
                            </button>
                          )}
                          {!isRejected && (
                            <button
                              type="button"
                              onClick={() => onVerify(record.id, 'rejected')}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition"
                            >
                              Tolak
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            onManualAdd(mentor.id, todayDate, 'hadir', '08:00')
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
                        >
                          + Tandai Hadir
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
