import React, { useState } from 'react';
import { Kejuruan } from '../../../types';
import { Modal } from '../../common/Modal';
import { Plus } from 'lucide-react';

interface AddKejuruanModalProps {
  isOpen: boolean;
  onClose: () => void;
  kejuruanList: Kejuruan[];
  onSubmit: (kjData: Omit<Kejuruan, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdate: (id: string, kjData: Omit<Kejuruan, 'id'>) => Promise<{ success: boolean; message: string }>;
}

export const AddKejuruanModal: React.FC<AddKejuruanModalProps> = ({
  isOpen,
  onClose,
  kejuruanList,
  onSubmit,
  onUpdate,
}) => {
  const [editingId, setEditingId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [desc, setDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setEditingId('');
    setName('');
    setCode('');
    setCategory('');
    setColor('#2563eb');
    setDesc('');
  };

  const selectProgramToEdit = (id: string) => {
    setEditingId(id);
    const program = kejuruanList.find(item => item.id === id);
    if (!program) return;
    setName(program.name);
    setCode(program.code || '');
    setCategory(program.category || '');
    setColor(program.color || '#2563eb');
    setDesc(program.description || '');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const existingProgram = kejuruanList.find((item) => item.id === editingId);
      const programData = {
        name: name.trim(),
        code: code.trim() || name.substring(0, 3).toUpperCase(),
        category: category.trim() || 'Teknologi',
        color,
        // Keep an existing verified assignment when editing metadata. New
        // mentors receive assignments only through the approval workflow.
        mentorId: existingProgram?.mentorId,
        mentorName: existingProgram?.mentorName,
        description: desc.trim(),
      };
      const result = editingId ? await onUpdate(editingId, programData) : await onSubmit(programData);
      if (result.success) handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingId ? 'Ubah Program Kejuruan' : 'Tambah Program Kejuruan Baru'}
      description="Tambah program atau ubah rincian program yang ada. ID program tetap dipertahankan agar referensi akun dan presensi tidak terputus."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">Ubah program yang sudah ada (opsional)</label>
          <select
            value={editingId}
            onChange={event => event.target.value ? selectProgramToEdit(event.target.value) : resetForm()}
            className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
          >
            <option value="">Tambah program baru</option>
            {kejuruanList.map(program => <option key={program.id} value={program.id}>{program.name} ({program.code})</option>)}
          </select>
        </div>
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

        {!editingId && <p className="rounded-xl bg-sky-50 p-3 text-[11px] leading-relaxed text-sky-800">Kejuruan baru akan tersedia di katalog. Mentor mengajukan pilihan dari profil dan admin memverifikasinya.</p>}

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
            <span>{isSubmitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Kejuruan'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
