import React, { useState, useEffect } from 'react';
import { Kejuruan, Mission, MissionDifficulty } from '../../../types';
import { Modal } from '../../common/Modal';
import { Target, Award, Plus, Sparkles } from 'lucide-react';

interface UpsertMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingMission: Mission | null;
  kejuruanList: Kejuruan[];
  isMentor: boolean;
  mentorKejuruanIds: string[];
  onSubmit: (data: Omit<Mission, 'id' | 'createdAt'>, editingId?: string) => Promise<void>;
}

export const UpsertMissionModal: React.FC<UpsertMissionModalProps> = ({
  isOpen,
  onClose,
  editingMission,
  kejuruanList,
  isMentor,
  mentorKejuruanIds,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(100);
  const [difficulty, setDifficulty] = useState<MissionDifficulty>('Sedang');
  const [dueDate, setDueDate] = useState('');
  const [submissionGuide, setSubmissionGuide] = useState('');
  const [kejuruanId, setKejuruanId] = useState('');
  const [kejuruanName, setKejuruanName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingMission) {
      setTitle(editingMission.title);
      setDescription(editingMission.description);
      setPoints(editingMission.points);
      setDifficulty(editingMission.difficulty);
      setDueDate(editingMission.dueDate || '');
      setSubmissionGuide(editingMission.submissionGuide || '');
      setKejuruanId(editingMission.kejuruanId || '');
      setKejuruanName(editingMission.kejuruanName || '');
    } else {
      setTitle('');
      setDescription('');
      setPoints(100);
      setDifficulty('Sedang');
      setDueDate('');
      setSubmissionGuide('Sertakan tautan repositori GitHub / Figma / Google Drive beserta catatan ringkasan pengerjaan.');
      const defaultId = isMentor ? mentorKejuruanIds[0] || kejuruanList[0]?.id : kejuruanList[0]?.id;
      const targetKj = kejuruanList.find((k) => k.id === defaultId);
      setKejuruanId(defaultId || '');
      setKejuruanName(targetKj?.name || '');
    }
  }, [editingMission, isOpen, isMentor, mentorKejuruanIds, kejuruanList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    const selectedProgram = kejuruanList.find((k) => k.id === kejuruanId);

    await onSubmit(
      {
        title: title.trim(),
        description: description.trim(),
        points: Number(points) || 100,
        difficulty,
        dueDate: dueDate || '',
        submissionGuide: submissionGuide.trim() || undefined,
        kejuruanId,
        kejuruanName: selectedProgram?.name || kejuruanName,
        mentorId: '',
        mentorName: '',
        status: 'active',
        category: selectedProgram?.category || 'Teknologi',
      },
      editingMission?.id
    );

    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingMission ? 'Perbarui Tugas Misi' : 'Buat Misi Baru untuk Peserta'}
      description="Tugas misi yang diselesaikan akan memberikan poin akumulasi di Hall of Fame."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">
            Judul Misi <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Selesaikan Desain Wireframe Landing Page"
            className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#123B59] mb-1">
              Reward Poin
            </label>
            <input
              type="number"
              min={10}
              step={10}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none focus:border-[#4C83B5]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#123B59] mb-1">
              Tingkat Kesulitan
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as MissionDifficulty)}
              className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none focus:border-[#4C83B5]"
            >
              <option value="Mudah">Mudah</option>
              <option value="Sedang">Sedang</option>
              <option value="Tantangan">Tantangan</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#123B59] mb-1">
              Batas Waktu (Opsional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none focus:border-[#4C83B5]"
            />
          </div>
        </div>

        {!isMentor && (
          <div>
            <label className="block text-xs font-bold text-[#123B59] mb-1">
              Program Kejuruan Target
            </label>
            <select
              value={kejuruanId}
              onChange={(e) => {
                setKejuruanId(e.target.value);
                const target = kejuruanList.find((k) => k.id === e.target.value);
                if (target) setKejuruanName(target.name);
              }}
              className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none focus:border-[#4C83B5]"
            >
              {kejuruanList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">
            Deskripsi & Rincian Tugas <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan instruksi pengerjaan misi secara lengkap..."
            className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">
            Petunjuk Pengumpulan Hasil
          </label>
          <input
            type="text"
            value={submissionGuide}
            onChange={(e) => setSubmissionGuide(e.target.value)}
            placeholder="Contoh: Lampirkan link Google Drive / Figma / GitHub"
            className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
          />
        </div>

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
            className="px-5 py-2.5 rounded-xl bg-[#123B59] hover:bg-[#0E2E46] text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : editingMission ? 'Simpan Perubahan' : 'Buat Misi'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
