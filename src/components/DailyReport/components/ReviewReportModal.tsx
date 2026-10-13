import React, { useState } from 'react';
import { DailyReport } from '../../../types';
import { Modal } from '../../common/Modal';
import { formatDateID } from '../dailyReportHelpers';
import { Check, X, Loader2 } from 'lucide-react';

interface ReviewReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DailyReport | null;
  onReview: (
    reportId: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string
  ) => Promise<{ success: boolean; message: string }>;
}

export const ReviewReportModal: React.FC<ReviewReportModalProps> = ({
  isOpen,
  onClose,
  report,
  onReview,
}) => {
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!report) return null;

  const handleAction = async (status: 'approved' | 'rejected') => {
    setIsSubmitting(true);
    await onReview(report.id, status, reviewNotes.trim() || undefined);
    setIsSubmitting(false);
    setReviewNotes('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review Laporan Harian"
      description={`Peserta: ${report.traineeName} (${report.kejuruanName || '-'}) · Tanggal: ${formatDateID(report.date)}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {report.photoUrl && (
          <div className="rounded-xl overflow-hidden border border-[#E4EAF0] max-h-56 bg-slate-50 flex items-center justify-center">
            <img
              src={report.photoUrl}
              alt="Bukti kegiatan"
              className="w-full h-full object-contain max-h-56"
            />
          </div>
        )}

        <div className="bg-[#F8FAFB] p-3 rounded-xl border border-[#E4EAF0]">
          <p className="text-[11px] font-bold text-[#6F7F8D] uppercase tracking-wide mb-1">
            Uraian Kegiatan
          </p>
          <p className="text-xs text-[#123B59] leading-relaxed whitespace-pre-wrap">
            {report.description}
          </p>
        </div>

        {report.submissionLink && (
          <div className="text-xs">
            <span className="font-semibold text-[#123B59]">Tautan: </span>
            <a
              href={report.submissionLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 underline font-mono"
            >
              {report.submissionLink}
            </a>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">
            Catatan / Masukan untuk Peserta (Wajib jika revisi):
          </label>
          <textarea
            rows={3}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Tuliskan apresiasi, masukan, atau alasan penolakan jika meminta revisi..."
            className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-white text-[#123B59] outline-none focus:ring-1 focus:ring-[#4C83B5]"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-[#E4EAF0] text-xs font-bold text-[#6F7F8D] hover:bg-slate-50 transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleAction('rejected')}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
            <span>Minta Revisi</span>
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleAction('approved')}
            className="px-4 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Setujui Laporan</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
