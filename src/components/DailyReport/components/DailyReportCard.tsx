import React from 'react';
import { DailyReport } from '../../../types';
import { formatDateID, formatTimeShort, getStatusBadge } from '../dailyReportHelpers';
import { Eye, Pencil, MessageSquare, ExternalLink, CalendarDays } from 'lucide-react';

interface DailyReportCardProps {
  report: DailyReport;
  isTrainee: boolean;
  onViewPhoto: (report: DailyReport) => void;
  onEditReport?: (report: DailyReport) => void;
  onOpenReview?: (report: DailyReport) => void;
}

export const DailyReportCard: React.FC<DailyReportCardProps> = ({
  report,
  isTrainee,
  onViewPhoto,
  onEditReport,
  onOpenReview,
}) => {
  return (
    <div className="surface p-4 rounded-xl border border-[#E4EAF0] hover:border-[#4C83B5]/40 transition space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#4C83B5]" />
          <span className="text-xs font-bold text-[#123B59]">
            {formatDateID(report.date)}
          </span>
          {!isTrainee && (
            <span className="text-xs text-[#6F7F8D] font-medium">
              · {report.traineeName} ({report.kejuruanName || '-'})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(report.status)}
          {report.photoUrl && (
            <button
              type="button"
              onClick={() => onViewPhoto(report)}
              className="text-[#4C83B5] hover:text-[#123B59] p-1 rounded-md hover:bg-[#F4F6F8] transition"
              title="Lihat Bukti Foto"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-[#123B59] leading-relaxed line-clamp-3">
        {report.description}
      </p>

      {report.submissionLink && (
        <a
          href={report.submissionLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700"
        >
          <ExternalLink className="w-3 h-3" />
          <span>Buka Tautan Lampiran / Dokumen</span>
        </a>
      )}

      {report.reviewNotes && (
        <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/60 text-xs text-amber-800 flex items-start gap-2">
          <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
          <div className="flex-1">
            <span className="font-bold">Catatan Mentor:</span> {report.reviewNotes}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[#E4EAF0]/60 text-[10px] text-[#6F7F8D]">
        <span>Dikirim: {report.submittedAt ? formatTimeShort(report.submittedAt) : '-'}</span>
        <div className="flex items-center gap-2">
          {isTrainee && report.status === 'rejected' && onEditReport && (
            <button
              type="button"
              onClick={() => onEditReport(report)}
              className="inline-flex items-center gap-1 text-[#B84469] hover:underline font-bold"
            >
              <Pencil className="w-3 h-3" /> Edit Laporan
            </button>
          )}
          {!isTrainee && onOpenReview && (
            <button
              type="button"
              onClick={() => onOpenReview(report)}
              className="px-2.5 py-1 bg-[#123B59] hover:bg-[#0E2E46] text-white rounded-lg font-bold text-[11px] transition"
            >
              Review Laporan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
