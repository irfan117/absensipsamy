import React from 'react';
import { User } from '../../../types';
import { TraineeTableRow } from './TraineeTableRow';

interface TraineeTableProps {
  users: User[];
  currentUserRole?: string;
  selectedTraineeIds: string[];
  onToggleSelectTrainee: (id: string) => void;
  onSelectAllTrainees: () => void;
  allTraineesSelected: boolean;
  visiblePasswords: Record<string, boolean>;
  onTogglePasswordVisibility: (id: string) => void;
  copiedId: string | null;
  copiedType: 'code' | 'pass' | null;
  onCopy: (text: string, id: string, type: 'code' | 'pass') => void;
  onRegenerateCredentials: (user: User) => void;
  onDeleteUser: (user: User) => void;
}

export const TraineeTable: React.FC<TraineeTableProps> = ({
  users,
  currentUserRole,
  selectedTraineeIds,
  onToggleSelectTrainee,
  onSelectAllTrainees,
  allTraineesSelected,
  visiblePasswords,
  onTogglePasswordVisibility,
  copiedId,
  copiedType,
  onCopy,
  onRegenerateCredentials,
  onDeleteUser,
}) => {
  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="surface rounded-2xl border border-[#E4EAF0] overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#F8FAFB] border-b border-[#E4EAF0] text-[#6F7F8D] text-[10px] font-bold tracking-wide uppercase">
              <th className="py-3 px-2 w-10 text-center">
                {isAdmin && (
                  <input
                    type="checkbox"
                    checked={allTraineesSelected}
                    onChange={onSelectAllTrainees}
                    className="rounded border-[#CFD8DC] text-[#2E7D32] focus:ring-[#2E7D32] cursor-pointer"
                    title="Pilih semua peserta"
                  />
                )}
              </th>
              <th className="py-3 px-3.5 w-10 text-center">No</th>
              <th className="py-3 px-3 min-w-[200px]">Nama Pengguna</th>
              <th className="py-3 px-3 w-28">Peran (Role)</th>
              <th className="py-3 px-3 w-36">Kode Login</th>
              <th className="py-3 px-3 min-w-[150px]">Kejuruan</th>
              <th className="py-3 px-3 min-w-[130px] bg-[#F4F6F8]">Sandi 8 Digit</th>
              <th className="py-3 px-3 w-24 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#6F7F8D]">
                  <p className="text-sm font-semibold">Tidak ada data pengguna.</p>
                  <p className="text-xs mt-1">Coba sesuaikan kata kunci pencarian atau filter.</p>
                </td>
              </tr>
            ) : (
              users.map((user, idx) => (
                <TraineeTableRow
                  key={user.id}
                  user={user}
                  index={idx}
                  isSelected={selectedTraineeIds.includes(user.id)}
                  onToggleSelect={onToggleSelectTrainee}
                  canSelect={isAdmin && user.role === 'trainee'}
                  isPasswordVisible={Boolean(visiblePasswords[user.id])}
                  onTogglePasswordVisibility={onTogglePasswordVisibility}
                  copiedId={copiedId}
                  copiedType={copiedType}
                  onCopy={onCopy}
                  onRegenerateCredentials={onRegenerateCredentials}
                  onDeleteUser={onDeleteUser}
                  canDelete={isAdmin && user.role !== 'admin'}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
