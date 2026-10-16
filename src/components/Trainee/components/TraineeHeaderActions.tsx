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
    <div className="flex flex-col gap-4 border-b border-[#E4EAF0] pb-2 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-[#123B59]">
          <span>Manajemen Akun Pengguna</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-[#2E7D32]">
            Total {users.length} Akun
          </span>
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6F7F8D]">
          <span>{trainees.length} Peserta Magang</span>
          <span>•</span>
          <span>{mentors.length} Instruktur Mentor</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 font-bold text-sky-700">
            <KeyRound className="h-3 w-3" /> Login via Kode & Sandi 8-Digit
          </span>
        </p>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        {isAdmin && selectedTraineeCount > 0 && (
          <button
            type="button"
            onClick={onDeleteSelectedTrainees}
            disabled={isProcessingSelectedDelete}
            className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
          >
            <span className="flex items-center gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              <span>Hapus {selectedTraineeCount} Terpilih</span>
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => exportUsersToExcel(users, kejuruanList)}
          className="shrink-0 rounded-xl border border-[#E4EAF0] bg-white px-3.5 py-2 text-xs font-bold text-[#123B59] transition hover:bg-[#F8FAFB]"
        >
          <span className="flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5 text-[#4C83B5]" />
            <span>Ekspor Excel</span>
          </span>
        </button>

        {isAdmin && (
          <>
            <button
              type="button"
              onClick={onOpenImport}
              className="shrink-0 rounded-xl border border-[#2E7D32] bg-emerald-50 px-3.5 py-2 text-xs font-bold text-[#2E7D32] transition hover:bg-emerald-100"
            >
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Import Excel</span>
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenAddKejuruan}
              className="shrink-0 rounded-xl border border-[#123B59] bg-[#123B59] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#0E2E46]"
            >
              <span className="flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Kejuruan</span>
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenAddUser}
              className="shrink-0 rounded-xl bg-[#2E7D32] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#256628]"
            >
              <span className="flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                <span>Tambah Akun</span>
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
