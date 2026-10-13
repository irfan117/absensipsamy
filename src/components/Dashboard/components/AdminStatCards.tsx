import React from 'react';

interface AdminStatCardsProps {
  mentorTotal: number;
  mentorHadir: number;
  mentorPending: number;
  mentorVerified: number;
}

export const AdminStatCards: React.FC<AdminStatCardsProps> = ({
  mentorTotal,
  mentorHadir,
  mentorPending,
  mentorVerified,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <article className="surface soft-hover rounded-2xl p-4 sm:p-5 border border-[#E4EAF0]">
        <span className="text-[10px] font-bold text-[#6F7F8D] uppercase tracking-wider block">
          Total Instruktur Mentor
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-[#123B59]">
            {mentorTotal}
          </span>
          <span className="text-xs text-[#6F7F8D]">orang</span>
        </div>
      </article>

      <article className="surface soft-hover rounded-2xl p-4 sm:p-5 border border-[#E4EAF0]">
        <span className="text-[10px] font-bold text-[#4C83B5] uppercase tracking-wider block">
          Mentor Hadir Hari Ini
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-[#28618F]">
            {mentorHadir}
          </span>
          <span className="text-xs text-[#6F7F8D]">tercatat</span>
        </div>
      </article>

      <article className="surface soft-hover rounded-2xl p-4 sm:p-5 border border-[#E4EAF0]">
        <span className="text-[10px] font-bold text-[#D95B83] uppercase tracking-wider block">
          Menunggu Verifikasi Admin
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-[#B84469]">
            {mentorPending}
          </span>
          <span className="text-xs text-[#6F7F8D]">perlu aksi</span>
        </div>
      </article>

      <article className="surface soft-hover rounded-2xl p-4 sm:p-5 border border-[#E4EAF0]">
        <span className="text-[10px] font-bold text-[#4C83B5] uppercase tracking-wider block">
          Telah Diverifikasi
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-[#4C83B5]">
            {mentorVerified}
          </span>
          <span className="text-xs text-[#6F7F8D]">selesai</span>
        </div>
      </article>
    </div>
  );
};
