import React from 'react';
import { AttendanceRecord } from '../../../types';
import { CheckCircle2, Clock, AlertTriangle, AlertCircle } from 'lucide-react';

interface TraineeRecentHistoryProps {
  records: AttendanceRecord[];
}

export const TraineeRecentHistory: React.FC<TraineeRecentHistoryProps> = ({ records }) => {
  return (
    <div className="surface rounded-3xl border border-[#E4EAF0] overflow-hidden shadow-xs">
      <div className="px-5 py-4 border-b border-[#E4EAF0] flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#123B59] uppercase tracking-wider">
          Riwayat Presensi Terbaru
        </h3>
        <span className="text-[11px] text-[#6F7F8D]">10 hari terakhir</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#F8FAFB] border-b border-[#E4EAF0] text-[#6F7F8D] text-[10px] font-bold tracking-wide uppercase">
              <th className="py-2.5 px-4">Tanggal</th>
              <th className="py-2.5 px-3">Masuk</th>
              <th className="py-2.5 px-3">Keluar</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Mode</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4EAF0]">
            {records.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#6F7F8D]">
                  Belum ada riwayat presensi bulan ini.
                </td>
              </tr>
            ) : (
              records.slice(0, 10).map((r) => (
                <tr key={r.id} className="hover:bg-[#F8FAFB] transition-colors">
                  <td className="py-2.5 px-4 font-bold text-[#123B59]">
                    {String(r.date).slice(0, 10)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#123B59]">
                    {r.checkInTime || '-'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#123B59]">
                    {r.checkOutTime || '-'}
                  </td>
                  <td className="py-2.5 px-3">
                    {r.status === 'hadir' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Tepat Waktu
                      </span>
                    ) : r.status === 'terlambat' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3" /> Terlambat
                      </span>
                    ) : r.status === 'izin' || r.status === 'sakit' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                        <AlertTriangle className="w-3 h-3" /> {r.status}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="w-3 h-3" /> Alpha
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#6F7F8D]">
                    {r.workMode || 'WFO'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
