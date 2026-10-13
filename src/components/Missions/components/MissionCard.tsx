import React, { useState } from 'react';
import { Mission, MissionSubmission } from '../../../types';
import { getDifficultyBadge } from '../missionHelpers';
import { Target, Award, Calendar, ChevronRight, Edit3, Trash2, Send, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { formatIndonesianDate } from '../../../utils/dateUtils';

interface MissionCardProps {
  mission: Mission;
  isMentor: boolean;
  isAdmin: boolean;
  isTrainee: boolean;
  userSubmission?: MissionSubmission;
  onEdit: (mission: Mission) => void;
  onDelete: (mission: Mission) => void;
  onSubmitWork: (mission: Mission) => void;
}

export const MissionCard: React.FC<MissionCardProps> = ({
  mission,
  isMentor,
  isAdmin,
  isTrainee,
  userSubmission,
  onEdit,
  onDelete,
  onSubmitWork,
}) => {
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const canManage = isMentor || isAdmin;

  return (
    <div className="surface rounded-2xl border border-[#E4EAF0] p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {getDifficultyBadge(mission.difficulty)}
            <span className="text-[10px] font-bold text-[#4C83B5] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
              {mission.kejuruanName || 'Umum'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
            <Award className="w-3.5 h-3.5" />
            <span>+{mission.points} Poin</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-[#123B59] leading-snug">
          {mission.title}
        </h3>

        {/* Description */}
        <p
          className={`text-xs text-[#6F7F8D] leading-relaxed cursor-pointer ${
            isDescExpanded ? '' : 'line-clamp-3'
          }`}
          onClick={() => setIsDescExpanded(!isDescExpanded)}
          title="Klik untuk lihat selengkapnya"
        >
          {mission.description}
        </p>

        {/* Due Date & Submission Guide */}
        <div className="space-y-1.5 pt-1 text-[11px] text-[#6F7F8D]">
          {mission.dueDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Batas: {formatIndonesianDate(mission.dueDate)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Trainee Submission Status or Action Buttons */}
      <div className="pt-3 border-t border-[#E4EAF0]/80">
        {isTrainee && (
          <div>
            {userSubmission ? (
              <div
                className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold border ${
                  userSubmission.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : userSubmission.status === 'rejected'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {userSubmission.status === 'approved' && <CheckCircle2 className="w-4 h-4" />}
                  {userSubmission.status === 'pending' && <Clock className="w-4 h-4" />}
                  {userSubmission.status === 'rejected' && <AlertCircle className="w-4 h-4" />}
                  <span>
                    {userSubmission.status === 'approved'
                      ? `Selesai (+${userSubmission.awardedPoints ?? mission.points} poin)`
                      : userSubmission.status === 'rejected'
                      ? 'Revisi Diminta'
                      : 'Menunggu Review'}
                  </span>
                </div>

                {userSubmission.status === 'rejected' && (
                  <button
                    type="button"
                    onClick={() => onSubmitWork(mission)}
                    className="text-[11px] underline hover:text-rose-900 cursor-pointer"
                  >
                    Kirim Ulang
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSubmitWork(mission)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kumpulkan Tugas Misi</span>
              </button>
            )}
          </div>
        )}

        {canManage && (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onEdit(mission)}
              className="p-2 rounded-xl text-slate-500 hover:text-[#123B59] hover:bg-slate-100 transition"
              title="Edit Misi"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(mission)}
              className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
              title="Hapus Misi"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
