import React from 'react';
import { Mission, MissionSubmission } from '../../../types';
import { formatSubmissionDateTime } from '../missionHelpers';
import { CheckCircle2, Clock, AlertCircle, ExternalLink, MessageSquare } from 'lucide-react';

interface SubmissionListProps {
  submissions: MissionSubmission[];
  missions: Mission[];
  onOpenReview: (submission: MissionSubmission) => void;
}

export const SubmissionList: React.FC<SubmissionListProps> = ({
  submissions,
  missions,
  onOpenReview,
}) => {
  return (
    <div className="surface rounded-2xl border border-[#E4EAF0] overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#F8FAFB] border-b border-[#E4EAF0] text-[#6F7F8D] text-[10px] font-bold tracking-wide uppercase">
              <th className="py-3 px-3.5 w-10 text-center">No</th>
              <th className="py-3 px-3 min-w-[180px]">Peserta</th>
              <th className="py-3 px-3 min-w-[200px]">Misi</th>
              <th className="py-3 px-3 w-36">Waktu Pengumpulan</th>
              <th className="py-3 px-3 w-32">Status</th>
              <th className="py-3 px-3 w-28 text-center">Poin</th>
              <th className="py-3 px-3 w-28 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4EAF0]">
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#6F7F8D]">
                  <p className="text-sm font-semibold">Belum ada pengumpulan tugas.</p>
                </td>
              </tr>
            ) : (
              submissions.map((sub, idx) => {
                const mission = missions.find((m) => m.id === sub.missionId);
                return (
                  <tr key={sub.id} className="hover:bg-[#F8FAFB] transition-colors">
                    <td className="py-3 px-3.5 text-center text-[#6F7F8D] font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#123B59]">{sub.traineeName}</div>
                      <div className="text-[10px] text-[#6F7F8D]">{sub.kejuruanName || '-'}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#123B59]">{mission?.title || '-'}</div>
                      {sub.submissionLink && (
                        <a
                          href={sub.submissionLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:underline font-mono mt-0.5"
                        >
                          <span>Tautan Lampiran</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#6F7F8D] text-[11px]">
                      {sub.submittedAt ? formatSubmissionDateTime(sub.submittedAt) : '-'}
                    </td>
                    <td className="py-3 px-3">
                      {sub.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Disetujui
                        </span>
                      ) : sub.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="w-3 h-3" /> Revisi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" /> Menunggu
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-amber-600">
                      {sub.status === 'approved' ? `+${sub.awardedPoints ?? mission?.points ?? 0}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenReview(sub)}
                        className="px-2.5 py-1 rounded-lg bg-[#123B59] hover:bg-[#0E2E46] text-white text-xs font-bold transition shadow-2xs"
                      >
                        Periksa
                      </button>
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
