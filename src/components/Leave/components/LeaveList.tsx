import React, { useState } from 'react';
import { User, LeaveRequest } from '../../../types';
import { formatIndonesianDate } from '../../../utils/dateUtils';
import { Paperclip } from 'lucide-react';

interface LeaveListProps {
  visibleRequests: LeaveRequest[];
  isTrainee: boolean;
  currentUser: User;
  onReview: (id: string, status: 'approved' | 'rejected', notes?: string) => Promise<void>;
}

export const LeaveList: React.FC<LeaveListProps> = ({
  visibleRequests,
  isTrainee,
  currentUser,
  onReview,
}) => {
  const [notesByRequest, setNotesByRequest] = useState<Record<string, string>>({});
  const [busyRequest, setBusyRequest] = useState<string | null>(null);
  const submitReview = async (id: string, status: 'approved' | 'rejected') => {
    setBusyRequest(id);
    try { await onReview(id, status, notesByRequest[id]); }
    finally { setBusyRequest(null); }
  };
  return (
    <div>
      <div className="flex items-center justify-between pb-3">
        <h2 className="font-bold text-xl text-[#123B59]">
          {isTrainee ? 'Pengajuan Saya' : 'Daftar Pengajuan Masuk'}
        </h2>
        <span className="rounded-full bg-[#EAF2F8] px-3 py-1 text-[10px] font-bold text-[#4C83B5]">
          {visibleRequests.length} PENGAJUAN
        </span>
      </div>

      <div className="space-y-3 mt-3">
        {visibleRequests.length === 0 ? (
          <div className="surface rounded-2xl p-10 text-center text-sm text-[#6F7F8D] italic">
            Belum ada pengajuan izin atau sakit.
          </div>
        ) : (
          visibleRequests.map((leave) => {
            const isPending = leave.status === 'pending';
            const isApproved = leave.status === 'approved';
            const isRejected = leave.status === 'rejected';

            let badgeStyle = 'bg-[#EEF5FA] text-[#4C83B5]';
            let badgeLabel = 'Menunggu';
            if (isApproved) {
              badgeStyle = 'bg-[#EAF2F8] text-[#28618F]';
              badgeLabel = 'Disetujui';
            } else if (isRejected) {
              badgeStyle = 'bg-[#FCF3F6] text-[#B84469]';
              badgeLabel = 'Ditolak';
            }

            return (
              <article key={leave.id} className="surface soft-hover rounded-xl p-4 border border-[#E4EAF0]">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-[#123B59]">
                        {formatIndonesianDate(leave.startDate)} {leave.startDate !== leave.endDate && `s/d ${formatIndonesianDate(leave.endDate)}`}
                      </p>
                      <span className="text-xs font-bold text-[#4C83B5] capitalize">
                        ({leave.type} - {leave.daysCount} hari)
                      </span>
                    </div>
                    <p className="text-xs text-[#6F7F8D] mt-0.5">
                      Oleh: <strong className="text-[#123B59]">{leave.userName}</strong> &middot; NIM: {leave.userNim}
                    </p>
                    <p className="mt-2 text-sm text-[#123B59] bg-[#F8FAFB] p-2.5 rounded-xl border border-[#E4EAF0]">
                      "{leave.reason}"
                    </p>
                    {(leave.attachmentUrl || leave.attachmentName) && (
                      <p className="mt-2 text-xs text-[#4C83B5] flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />
                        <span>Lampiran: </span>
                        {leave.attachmentUrl ? <a href={leave.attachmentUrl} target="_blank" rel="noreferrer" className="font-semibold hover:underline">Buka tautan lampiran</a> : <span>{leave.attachmentName}</span>}
                      </p>
                    )}
                    {leave.reviewedBy && (
                      <p className="mt-2 text-[11px] text-[#6F7F8D]">
                        Ditinjau oleh {leave.reviewedBy} ({leave.reviewedAt}) {leave.reviewNotes && `· Catatan: ${leave.reviewNotes}`}
                      </p>
                    )}
                  </div>

                  <span className={`h-fit self-start rounded-full px-2.5 py-1 text-[10px] font-bold shrink-0 ${badgeStyle}`}>
                    {badgeLabel}
                  </span>
                </div>

                {/* Review actions for mentors only; admins have read access. */}
                {currentUser.role === 'mentor' && isPending && (
                  <div className="mt-3 pt-3 border-t border-[#E4EAF0] flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                    <input
                      type="text"
                      placeholder="Catatan verifikasi (opsional)..."
                      value={notesByRequest[leave.id] || ''}
                      onChange={(event) => setNotesByRequest(previous => ({ ...previous, [leave.id]: event.target.value }))}
                      className="text-xs px-3 py-2 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] flex-1 outline-none focus:border-[#4C83B5]"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busyRequest === leave.id}
                        onClick={() => void submitReview(leave.id, 'approved')}
                        className="rounded-xl px-4 py-2 bg-[#123B59] hover:bg-[#0D2F47] text-white text-xs font-bold transition cursor-pointer disabled:opacity-60"
                      >
                        Setujui
                      </button>
                      <button
                        type="button"
                        disabled={busyRequest === leave.id}
                        onClick={() => void submitReview(leave.id, 'rejected')}
                        className="rounded-xl border border-[#E3C4D0] bg-[#FCF3F6] hover:bg-[#f9e7ee] text-[#B84469] px-4 py-2 text-xs font-bold transition cursor-pointer disabled:opacity-60"
                      >
                        Tolak
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
