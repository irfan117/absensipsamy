import React, { useState, useEffect } from 'react';
import { Mission, MissionSubmission } from '../../../types';
import { Modal } from '../../common/Modal';
import { Check, X, Award, ExternalLink, Loader2 } from 'lucide-react';

interface ReviewSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: MissionSubmission | null;
  missions: Mission[];
  onReview: (
    submissionId: string,
    status: 'approved' | 'rejected',
    feedback?: string,
    awardedPoints?: number
  ) => Promise<void>;
}

export const ReviewSubmissionModal: React.FC<ReviewSubmissionModalProps> = ({
  isOpen,
  onClose,
  submission,
  missions,
  onReview,
}) => {
  const [feedback, setFeedback] = useState('');
  const [awardedPoints, setAwardedPoints] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mission = missions.find((m) => m.id === submission?.missionId);

  useEffect(() => {
    if (submission && mission) {
      setFeedback(submission.feedback || '');
      setAwardedPoints(submission.awardedPoints ?? mission.points);
    }
  }, [submission, mission, isOpen]);

  if (!submission || !mission) return null;

  const handleAction = async (status: 'approved' | 'rejected') => {
    setIsSubmitting(true);
    await onReview(
      submission.id,
      status,
      feedback.trim() || undefined,
      status === 'approved' ? Number(awardedPoints) || mission.points : 0
    );
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Periksa Pengumpulan Tugas Misi"
      description={`Peserta: ${submission.traineeName} · Misi: ${mission.title}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {submission.submissionLink && (
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-xs">
            <span className="font-bold text-sky-900">Tautan Tugas: </span>
            <a
              href={submission.submissionLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 underline font-mono inline-flex items-center gap-1"
            >
              <span>{submission.submissionLink}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {submission.notes && (
          <div className="bg-[#F8FAFB] p-3 rounded-xl border border-[#E4EAF0]">
            <p className="text-[11px] font-bold text-[#6F7F8D] uppercase tracking-wide mb-1">
              Catatan Peserta
            </p>
            <p className="text-xs text-[#123B59] leading-relaxed whitespace-pre-wrap">
              {submission.notes}
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">
            Poin yang Diberikan (Maksimal {mission.points} Poin)
          </label>
          <div className="relative">
            <Award className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="number"
              min={0}
              max={mission.points * 2}
              value={awardedPoints}
              onChange={(e) => setAwardedPoints(Number(e.target.value))}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none focus:border-[#4C83B5]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">
            Umpan Balik / Catatan untuk Peserta:
          </label>
          <textarea
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tuliskan apresiasi, masukan, atau alasan jika meminta perbaikan..."
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
            <span>Tolak / Minta Revisi</span>
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleAction('approved')}
            className="px-4 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Setujui & Beri Poin</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
