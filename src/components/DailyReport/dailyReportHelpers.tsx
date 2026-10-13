import React from 'react';
import { DailyReportStatus } from '../../types';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { INDONESIAN_MONTHS } from '../../utils/dateUtils';

export const formatDateID = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${INDONESIAN_MONTHS[m - 1]} ${y}`;
};

export const formatTimeShort = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

export const getStatusBadge = (status: DailyReportStatus) => {
  if (status === 'approved')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Disetujui
      </span>
    );
  if (status === 'rejected')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FCF3F6] text-[#B84469] border border-[#D95B83]/20">
        <AlertCircle className="w-3 h-3" /> Perlu Revisi
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF5E6] text-[#C05621] border border-orange-200">
      <Clock className="w-3 h-3" /> Menunggu Review
    </span>
  );
};
