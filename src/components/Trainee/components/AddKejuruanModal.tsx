import React, { useState } from 'react';
import { Kejuruan } from '../../../types';
import { Modal } from '../../common/Modal';
import { Plus } from 'lucide-react';

interface AddKejuruanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (kjData: Omit<Kejuruan, 'id'>) => void | Promise<void>;
}

export const AddKejuruanModal: React.FC<AddKejuruanModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [mentorName, setMentorName] = useState('');
  const [desc, setDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setCode('');
    setCategory('');
    setColor('#2563eb');
    setMentorName('');
    setDesc('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    await onSubmit({
      name: name.trim(),
      code: code.trim() || name.substring(0, 3).toUpperCase(),
      category: category.trim() || 'Teknologi',
      color,
      mentorName: mentorName.trim(),
      description: desc.trim(),
    });
    setIsSubmitting(false);
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Tambah Program Kejuruan Baru"
      description="Tambahkan bidang keahlian baru ke dalam master data aplikasi."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">
            Nama Program Kejuruan <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Digital Marketing"
            className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#123B59] mb-1">
              Kode Singkatan
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Contoh: DM"
              className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#123B59] mb-1">
              Kategori
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Contoh: Bisnis Digital"
              className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">
            Warna Label
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 rounded-xl cursor-pointer border border-[#E4EAF0] p-1 bg-white"
            />
            <span className="text-xs font-mono font-bold text-[#123B59]">{color}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">
            Nama Instruktur Mentor Default (Opsional)
          </label>
          <input
            type="text"
            value={mentorName}
            onChange={(e) => setMentorName(e.target.value)}
            placeholder="Contoh: Budi Santoso, S.Kom"
            className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">
            Deskripsi (Opsional)
          </label>
          <textarea
            rows={2}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Keterangan singkat program kejuruan..."
            className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl border border-[#E4EAF0] text-xs font-bold text-[#6F7F8D] hover:bg-slate-50 transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-[#123B59] hover:bg-[#0E2E46] text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Tambah Kejuruan'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
