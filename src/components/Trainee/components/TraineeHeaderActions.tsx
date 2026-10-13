import React from 'react';
import { User, Kejuruan } from '../../../types';
import { UserPlus, Plus, FileSpreadsheet, Download, Trash2, KeyRound } from 'lucide-react';
import { exportUsersToExcel } from '../../../utils/userExcelUtils';

interface TraineeHeaderActionsProps {
  currentUserRole?: string;
  users: User[];
  trainees: User[];
  mentors: User[];
  kejuruanList: Kejuruan[];
  selectedTraineeCount: number;
  isProcessingSelectedDelete: boolean;
  onOpenAddUser: () => void;
  onOpenAddKejuruan: () => void;
  onOpenImport: () => void;
  onDeleteSelectedTrainees: () => void;
  onOpenClearAll: () => void;
}

export const TraineeHeaderActions: React.FC<TraineeHeaderActionsProps> = ({
  currentUserRole,
  users,
  trainees,
  mentors,
  kejuruanList,
  selectedTraineeCount,
  isProcessingSelectedDelete,
  onOpenAddUser,
  onOpenAddKejuruan,
  onOpenImport,
  onDeleteSelectedTrainees,
  onOpenClearAll,
}) => {
  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E4EAF0]">
      <div>
        <h1 className="text-xl font-bold text-[#123B59] flex items-center gap-2">
          <span>Manajemen Akun Pengguna</span>
          <span className="text-xs py-0.5 px-2 bg-emerald-100 text-[#2E7D32] rounded-full font-bold">
            Total {users.length} Akun
          </span>
        </h1>
        <p className="text-xs text-[#6F7F8D] mt-1 flex items-center gap-2">
          <span>{trainees.length} Peserta Magang</span>
          <span>•</span>
          <span>{mentors.length} Instruktur Mentor</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1 font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
            <KeyRound className="w-3 h-3" /> Login via Kode & Sandi 8-Digit
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isAdmin && selectedTraineeCount > 0 && (
          <button
            type="button"
            onClick={onDeleteSelectedTrainees}
            disabled={isProcessingSelectedDelete}
            className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus {selectedTraineeCount} Terpilih</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => exportUsersToExcel(users, kejuruanList)}
          className="px-3.5 py-2 rounded-xl border border-[#E4EAF0] bg-white hover:bg-[#F8FAFB] text-[#123B59] text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[#4C83B5]" />
          <span>Ekspor Excel</span>
        </button>

        {isAdmin && (
          <>
            <button
              type="button"
              onClick={onOpenImport}
              className="px-3.5 py-2 rounded-xl border border-[#2E7D32] bg-emerald-50 text-[#2E7D32] hover:bg-emerald-100 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import Excel</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddKejuruan}
              className="px-3.5 py-2 rounded-xl border border-[#123B59] bg-[#123B59] hover:bg-[#0E2E46] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Kejuruan</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddUser}
              className="px-4 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Akun</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
