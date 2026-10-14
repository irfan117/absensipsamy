import React, { useState } from 'react';
import { Mission } from '../../../types';
import { Modal } from '../../common/Modal';
import { Send, AlertCircle, ExternalLink } from 'lucide-react';

interface SubmitWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  mission: Mission | null;
  onSubmit: (submissionData: {
    missionId: string;
    submissionLink?: string;
    notes: string;
  }) => Promise<{ success: boolean; message: string }>;
}

export const SubmitWorkModal: React.FC<SubmitWorkModalProps> = ({
  isOpen,
  onClose,
  mission,
  onSubmit,
}) => {
  const [submissionLink, setSubmissionLink] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!mission) return null;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionLink.trim() && !notes.trim()) {
      setError('Harap sertakan tautan hasil kerja atau catatan penyelesaian.');
      return;
    }

    setIsSubmitting(true);
    const res = await onSubmit({
      missionId: mission.id,
      submissionLink: submissionLink.trim() || undefined,
      notes: notes.trim(),
    });

    if (res.success) {
      setSubmissionLink('');
      setNotes('');
      setError(null);
      onClose();
    } else {
      setError(res.message);
    }
    setIsSubmitting(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kumpulkan Hasil Kerja Misi"
      description={`Misi: ${mission.title} (+${mission.points} poin)`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {mission.submissionGuide && (
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-800">
            <span className="font-bold">Petunjuk Pengumpulan: </span>
            {mission.submissionGuide}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">
            Tautan Hasil Pengerjaan (GitHub / Google Drive / Figma / dll)
          </label>
          <input
            type="url"
            value={submissionLink}
            onChange={(e) => setSubmissionLink(e.target.value)}
            placeholder="https://github.com/..."
            className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">
            Catatan / Ringkasan Pengerjaan
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Jelaskan ringkasan apa saja yang telah Anda selesaikan..."
            className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
          />
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#E4EAF0] text-xs font-bold text-[#6F7F8D] hover:bg-slate-50 transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Mengirim...' : 'Kirim Tugas'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
