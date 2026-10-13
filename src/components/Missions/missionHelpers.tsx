import React from 'react';
import { MissionDifficulty } from '../../types';

export const formatSubmissionDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Jakarta',
  }).format(date);

  return `${dateLabel}, ${timeLabel} WIB`;
};

export const getDifficultyBadge = (difficulty: MissionDifficulty) => {
  switch (difficulty) {
    case 'Mudah':
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Mudah
        </span>
      );
    case 'Sedang':
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          Sedang
        </span>
      );
    case 'Tantangan':
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          Tantangan
        </span>
      );
    default:
      return null;
  }
};
