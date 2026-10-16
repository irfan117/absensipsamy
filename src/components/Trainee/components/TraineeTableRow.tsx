import React from 'react';
import { Kejuruan, User } from '../../../types';
import { KeyRound, ShieldCheck, UserCheck, GraduationCap, Copy, Check, Eye, EyeOff, Trash2, RefreshCw } from 'lucide-react';

interface TraineeTableRowProps {
  user: User;
  index: number;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  canSelect: boolean;
  isPasswordVisible: boolean;
  onTogglePasswordVisibility: (id: string) => void;
  copiedId: string | null;
  copiedType: 'code' | 'pass' | null;
  onCopy: (text: string, id: string, type: 'code' | 'pass') => void;
  onRegenerateCredentials: (user: User) => void;
  onDeleteUser: (user: User) => void;
  canDelete: boolean;
}

export const TraineeTableRow: React.FC<TraineeTableRowProps> = ({
  user,
  index,
  isSelected,
  onToggleSelect,
  canSelect,
  isPasswordVisible,
  onTogglePasswordVisibility,
  copiedId,
  copiedType,
  onCopy,
  onRegenerateCredentials,
  onDeleteUser,
  canDelete,
}) => {
  return (
    <tr
      className={`border-b border-[#E4EAF0] transition-colors ${
        isSelected ? 'bg-emerald-50/50' : 'hover:bg-[#F8FAFB]'
      }`}
    >
      <td className="py-2.5 px-2 text-center">
        {canSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(user.id)}
            className="rounded border-[#CFD8DC] text-[#2E7D32] focus:ring-[#2E7D32] cursor-pointer"
          />
        )}
      </td>
      <td className="py-2.5 px-3.5 text-center text-[#6F7F8D] font-mono text-[11px]">
        {index + 1}
      </td>
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#E4EAF0] flex items-center justify-center font-bold text-[#123B59] text-xs shrink-0 overflow-hidden">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="font-bold text-[#123B59] text-xs flex items-center gap-1.5">
              <span>{user.name}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="py-2.5 px-3">
        {user.role === 'admin' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <ShieldCheck className="w-3 h-3" /> Admin
          </span>
        ) : user.role === 'mentor' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <UserCheck className="w-3 h-3" /> Mentor
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <GraduationCap className="w-3 h-3" /> Peserta
          </span>
        )}
      </td>
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold text-[#123B59]">
            {user.nim || user.loginCode || '-'}
          </span>
          {(user.nim || user.loginCode) && (
            <button
              type="button"
              onClick={() => onCopy(user.nim || user.loginCode || '', user.id, 'code')}
              className="text-[#6F7F8D] hover:text-[#123B59] p-1 rounded transition"
              title="Salin Kode Login"
            >
              {copiedId === user.id && copiedType === 'code' ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </td>
      <td className="py-2.5 px-3 text-[#123B59] font-medium text-xs">
        {user.kejuruanName || '-'}
      </td>
      <td className="py-2.5 px-3 bg-[#F8FAFB]/70">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold text-[#123B59]">
            {user.plainPassword
              ? isPasswordVisible
                ? user.plainPassword
                : '••••••••'
              : '••••••••'}
          </span>
          {user.plainPassword && (
            <>
              <button
                type="button"
                onClick={() => onTogglePasswordVisibility(user.id)}
                className="text-[#6F7F8D] hover:text-[#123B59] p-1 rounded transition"
                title={isPasswordVisible ? 'Sembunyikan sandi' : 'Lihat sandi'}
              >
                {isPasswordVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={() => onCopy(user.plainPassword!, user.id, 'pass')}
                className="text-[#6F7F8D] hover:text-[#123B59] p-1 rounded transition"
                title="Salin Sandi"
              >
                {copiedId === user.id && copiedType === 'pass' ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </>
          )}
        </div>
      </td>
      <td className="py-2.5 px-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {user.role !== 'admin' && (
            <button
              type="button"
              onClick={() => onRegenerateCredentials(user)}
              className="text-[#6F7F8D] hover:text-[#123B59] p-1.5 rounded-lg hover:bg-[#F4F6F8] transition"
              title="Acak ulang kode & sandi"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDeleteUser(user)}
              className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition"
              title="Hapus Pengguna"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
