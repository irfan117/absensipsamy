import React, { useEffect, useMemo, useState } from 'react';
import { Kejuruan, User } from '../../../types';
import { Modal } from '../../common/Modal';
import { generateDefaultPassword } from '../../../utils/userExcelUtils';
import { UserPlus, Sparkles, KeyRound } from 'lucide-react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  kejuruanList: Kejuruan[];
  mentors: User[];
  onSubmit: (userData: Omit<User, 'id'>) => Promise<{ success: boolean; message: string; user?: User }>;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  kejuruanList,
  mentors,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [nim, setNim] = useState('');
  const [kejuruanId, setKejuruanId] = useState(kejuruanList[0]?.id || '');
  const [mentorId, setMentorId] = useState('');
  const [role, setRole] = useState<'trainee' | 'mentor'>('trainee');
  const [password, setPassword] = useState(generateDefaultPassword());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizeName = (value: string) => value.trim().toLocaleLowerCase('id-ID');
  const mentorPrograms = (mentor: User) => kejuruanList.filter(
    (program) => {
      const assignedMentorName = normalizeName(program.mentorName || '');
      const selectedMentorName = normalizeName(mentor.name);
      return program.mentorId === mentor.id ||
        program.id === mentor.kejuruanId ||
        (!!assignedMentorName && (
          assignedMentorName.includes(selectedMentorName) ||
          selectedMentorName.includes(assignedMentorName)
        ));
    }
  );
  const availableMentors = useMemo(
    () => mentors.filter((mentor) => mentorPrograms(mentor).length > 0),
    [mentors, kejuruanList]
  );
  const selectedMentor = availableMentors.find((mentor) => mentor.id === mentorId);
  const selectablePrograms = role === 'trainee' && selectedMentor
    ? mentorPrograms(selectedMentor)
    : role === 'trainee' ? [] : kejuruanList;

  useEffect(() => {
    if (role !== 'trainee' || !availableMentors.length) return;
    const mentor = availableMentors.find((item) => item.id === mentorId) || availableMentors[0];
    if (mentor.id !== mentorId) setMentorId(mentor.id);
    const assignedProgram = mentorPrograms(mentor)[0];
    if (assignedProgram && assignedProgram.id !== kejuruanId) setKejuruanId(assignedProgram.id);
  }, [role, availableMentors, mentorId, kejuruanId, kejuruanList]);

  const resetForm = () => {
    setName('');
    setNim('');
    setKejuruanId(kejuruanList[0]?.id || '');
    setMentorId('');
    setRole('trainee');
    setPassword(generateDefaultPassword());
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const selectedProgram = selectablePrograms.find((k) => k.id === kejuruanId);
    if (role === 'trainee' && (!selectedMentor || !selectedProgram)) {
      setIsSubmitting(false);
      return;
    }

    const result = await onSubmit({
      name: name.trim(),
      nim: nim.trim() || '',
      kejuruanId: kejuruanId || undefined,
      kejuruanName: selectedProgram?.name,
      role,
      password,
      avatar: '',
      phone: '',
      status: 'active',
      joinedDate: new Date().toISOString(),
    });

    setIsSubmitting(false);

    if (result.success) {
      handleClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Tambah Akun Pengguna Baru"
      description="Buat akun peserta magang atau instruktur mentor dengan kredensial instan."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">
            Peran (Role) Pengguna <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setRole('trainee');
                const mentor = availableMentors[0];
                if (mentor) {
                  setMentorId(mentor.id);
                  setKejuruanId(mentorPrograms(mentor)[0]?.id || '');
                }
              }}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                role === 'trainee'
                  ? 'border-[#2E7D32] bg-emerald-50 text-[#2E7D32]'
                  : 'border-[#E4EAF0] text-[#6F7F8D] hover:bg-slate-50'
              }`}
            >
              Peserta Magang
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('mentor');
                setKejuruanId(kejuruanList[0]?.id || '');
              }}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                role === 'mentor'
                  ? 'border-[#123B59] bg-sky-50 text-[#123B59]'
                  : 'border-[#E4EAF0] text-[#6F7F8D] hover:bg-slate-50'
              }`}
            >
              Instruktur Mentor
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">
            Nama Lengkap <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Muhammad Rizky"
            className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">
            NIM / No. Identitas (Opsional)
          </label>
          <input
            type="text"
            value={nim}
            onChange={(e) => setNim(e.target.value)}
            placeholder="Kosongkan jika ingin dibuat otomatis"
            className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
          />
        </div>

        {role === 'trainee' && (
          <div>
            <label className="block text-xs font-bold text-[#123B59] mb-1">
              Mentor Pembimbing <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={mentorId}
              onChange={(e) => {
                const mentor = availableMentors.find((item) => item.id === e.target.value);
                setMentorId(e.target.value);
                setKejuruanId(mentor ? mentorPrograms(mentor)[0]?.id || '' : '');
              }}
              className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none focus:border-[#4C83B5]"
            >
              <option value="">Pilih mentor</option>
              {availableMentors.map((mentor) => (
                <option key={mentor.id} value={mentor.id}>{mentor.name}</option>
              ))}
            </select>
            {!availableMentors.length && (
              <p className="mt-1 text-[11px] text-rose-600">
                Belum ada mentor dengan program kejuruan yang ditugaskan.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">
            Program Kejuruan
          </label>
          <select
            value={kejuruanId}
            onChange={(e) => setKejuruanId(e.target.value)}
            required={role === 'trainee'}
            disabled={role === 'trainee' && !selectedMentor}
            className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none focus:border-[#4C83B5]"
          >
            {selectablePrograms.map((kj) => (
              <option key={kj.id} value={kj.id}>
                {kj.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-[#123B59]">
              Sandi Default (8 Digit)
            </label>
            <button
              type="button"
              onClick={() => setPassword(generateDefaultPassword())}
              className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" /> Acak Baru
            </button>
          </div>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 font-mono font-bold rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
            />
          </div>
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
            disabled={isSubmitting || (role === 'trainee' && !selectedMentor)}
            className="px-5 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Akun'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
