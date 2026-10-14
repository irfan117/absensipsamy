import React from 'react';
import { User, AttendanceRecord, AttendanceStatus, Kejuruan } from '../../../types';
import { Check, CheckCircle2, AlertTriangle } from 'lucide-react';

interface MentorTraineeTableProps {
  mentorKejuruan: Kejuruan;
  classTrainees: User[];
  classTodayRecords: AttendanceRecord[];
  pendingCount: number;
  onVerifyTrainee: (recordId: string, traineeName: string) => void;
  onApproveAllPending: () => void;
  onQuickMark: (traineeId: string, status: AttendanceStatus) => void;
}

export const MentorTraineeTable: React.FC<MentorTraineeTableProps> = ({
  mentorKejuruan,
  classTrainees,
  classTodayRecords,
  pendingCount,
  onVerifyTrainee,
  onApproveAllPending,
  onQuickMark,
}) => {
  return (
    <div className="surface rounded-2xl border border-[#E4EAF0] overflow-hidden shadow-sm">
      <div className="p-4 sm:p-5 border-b border-[#E4EAF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[.13em] text-[#4C83B5] uppercase">
            VALIDASI KELAS BINAAN
          </p>
          <h2 className="text-base font-bold text-[#123B59]">
            Verifikasi Presensi Peserta Kelas {mentorKejuruan?.name || 'Binaan'}
          </h2>
          <p className="text-xs text-[#6F7F8D] mt-0.5">
            Validasi catatan presensi peserta magang untuk hari ini.
          </p>
        </div>

        {pendingCount > 0 && (
          <button
            type="button"
            onClick={onApproveAllPending}
            className="px-4 py-2 rounded-xl bg-[#123B59] hover:bg-[#0D2F47] text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Check className="w-3.5 h-3.5 text-[#A9C7DE]" />
            <span>Verifikasi Semua Pending ({pendingCount})</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E4EAF0] text-[#6F7F8D] text-[10px] font-bold tracking-wide uppercase bg-[#F8FAFB]">
              <th className="py-3 px-4">Nama Peserta</th>
              <th className="py-3 px-3">Jam Masuk</th>
              <th className="py-3 px-3">Status Absensi</th>
              <th className="py-3 px-3">Status Verifikasi Mentor</th>
              <th className="py-3 px-3">Agenda / Catatan</th>
              <th className="py-3 px-4 text-right">Aksi Mentor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4EAF0]">
            {classTrainees.map((trainee) => {
              const record = classTodayRecords.find((r) => r.userId === trainee.id);
              const isPending = record && record.verificationStatus === 'pending';
              const isVerified = record && record.verificationStatus === 'verified';
              const notCheckedIn = !record || !record.checkInTime;

              return (
                <tr key={trainee.id} className="hover:bg-[#F8FAFB]/60 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={trainee.avatar || undefined}
                        alt={trainee.name}
                        className="w-8 h-8 rounded-xl object-cover border border-[#E4EAF0]"
                      />
                      <div>
                        <div className="font-bold text-[#123B59]">{trainee.name}</div>
                        <div className="text-[10px] text-[#6F7F8D] font-mono">
                          NIM: {trainee.nim}
                        </div>
                        {record && (
                          <div className="mt-1 flex flex-wrap gap-x-2 text-[10px]">
                            <span className="font-bold text-[#28618F]">
                              {record.workMode || 'WFO'}
                            </span>
                            {(record.checkInCoordinates || record.coordinates) && (
                              <a
                                className="text-[#28618F] hover:underline"
                                target="_blank"
                                rel="noreferrer"
                                href={`https://www.google.com/maps?q=${
                                  (record.checkInCoordinates || record.coordinates)!.lat
                                },${(record.checkInCoordinates || record.coordinates)!.lng}`}
                              >
                                Check-in Maps
                              </a>
                            )}
                            {record.checkOutCoordinates && (
                              <a
                                className="text-[#28618F] hover:underline"
                                target="_blank"
                                rel="noreferrer"
                                href={`https://www.google.com/maps?q=${record.checkOutCoordinates.lat},${record.checkOutCoordinates.lng}`}
                              >
                                Check-out Maps
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3 font-mono text-[#123B59] tabular-nums">
                    {record?.checkInTime ? (
                      `${record.checkInTime} WIB`
                    ) : (
                      <span className="text-[#6F7F8D] italic">Belum hadir</span>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    {record ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${
                          record.status === 'hadir'
                            ? 'bg-[#EAF2F8] text-[#28618F]'
                            : record.status === 'terlambat'
                            ? 'bg-[#FFF5E6] text-[#C05621]'
                            : record.status === 'izin' || record.status === 'sakit'
                            ? 'bg-[#EEF5FA] text-[#4C83B5]'
                            : 'bg-[#FCF3F6] text-[#B84469]'
                        }`}
                      >
                        {record.status}
                      </span>
                    ) : (
                      <span className="inline-flex whitespace-nowrap rounded-lg px-2 py-1 text-[10px] font-bold bg-[#F4F6F8] text-[#6F7F8D]">
                        Belum Absen
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    {notCheckedIn ? (
                      <span className="text-[#6F7F8D] text-[11px]">Menunggu Check-In</span>
                    ) : isPending ? (
                      <span className="inline-flex items-center gap-1 font-bold text-[10px] bg-[#FFF5E6] text-[#C05621] px-2.5 py-1 rounded-full border border-amber-200">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Menunggu Verifikasi</span>
                      </span>
                    ) : isVerified ? (
                      <span className="inline-flex items-center gap-1 text-[#28618F] bg-[#EAF2F8] font-bold text-[10px] px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#4C83B5]" />
                        <span>Terverifikasi Mentor</span>
                      </span>
                    ) : (
                      <span className="text-[#B84469] font-bold text-[11px]">Ditolak</span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-[#6F7F8D] text-[11px] truncate max-w-[180px]">
                    {record?.notes || '-'}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {isPending && record && (
                        <button
                          type="button"
                          onClick={() => onVerifyTrainee(record.id, trainee.name)}
                          className="px-3 py-1.5 rounded-xl bg-[#123B59] hover:bg-[#0D2F47] text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-xs"
                          title="Setujui Kehadiran Peserta"
                        >
                          <Check className="w-3 h-3" />
                          <span>Verifikasi</span>
                        </button>
                      )}

                      {/* Quick Mark buttons */}
                      <button
                        type="button"
                        onClick={() => onQuickMark(trainee.id, 'hadir')}
                        className={`w-6 h-6 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center ${
                          record?.status === 'hadir' && isVerified
                            ? 'bg-[#EAF2F8] text-[#28618F] ring-1 ring-[#4C83B5]'
                            : 'text-[#6F7F8D] hover:bg-[#F4F6F8]'
                        }`}
                        title="Tandai Hadir Tepat Waktu"
                      >
                        H
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickMark(trainee.id, 'terlambat')}
                        className={`w-6 h-6 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center ${
                          record?.status === 'terlambat' && isVerified
                            ? 'bg-[#FFF5E6] text-[#C05621] ring-1 ring-amber-400'
                            : 'text-[#6F7F8D] hover:bg-[#F4F6F8]'
                        }`}
                        title="Tandai Terlambat"
                      >
                        T
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickMark(trainee.id, 'izin')}
                        className={`w-6 h-6 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center ${
                          record?.status === 'izin' && isVerified
                            ? 'bg-[#EEF5FA] text-[#4C83B5] ring-1 ring-[#4C83B5]'
                            : 'text-[#6F7F8D] hover:bg-[#F4F6F8]'
                        }`}
                        title="Tandai Izin"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickMark(trainee.id, 'sakit')}
                        className={`w-6 h-6 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center ${
                          record?.status === 'sakit' && isVerified
                            ? 'bg-[#EEF5FA] text-[#4C83B5] ring-1 ring-[#4C83B5]'
                            : 'text-[#6F7F8D] hover:bg-[#F4F6F8]'
                        }`}
                        title="Tandai Sakit"
                      >
                        S
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickMark(trainee.id, 'alpha')}
                        className={`w-6 h-6 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center ${
                          record?.status === 'alpha' && isVerified
                            ? 'bg-[#FCF3F6] text-[#B84469] ring-1 ring-[#D95B83]'
                            : 'text-[#6F7F8D] hover:bg-[#F4F6F8]'
                        }`}
                        title="Tandai Alpha"
                      >
                        A
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
