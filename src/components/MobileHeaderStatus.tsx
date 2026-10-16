import React, { createContext, useContext, useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface HeaderStatus {
  roleBadgeLabel: string;
}

export const HeaderStatusContext = createContext<HeaderStatus | null>(null);

export const MobileHeaderStatus: React.FC = () => {
  const status = useContext(HeaderStatusContext);
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!status) return null;
  const pad = (value: number) => String(value).padStart(2, '0');
  const liveClock = `${pad(time.getHours())}.${pad(time.getMinutes())}.${pad(time.getSeconds())}`;

  return (
    <div className="surface mt-3 flex w-full max-w-full flex-wrap items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 lg:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF2F8] text-[#4C83B5]">
          <Clock className="h-4 w-4" />
        </span>
        <div className="min-w-0 pr-1">
          <p className="text-[9px] font-bold tracking-[.1em] text-[#6F7F8D]">WAKTU SAAT INI</p>
          <p className="text-base font-bold text-[#123B59] tabular-nums">{liveClock} WIB</p>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center rounded-xl border border-[#E4EAF0] bg-[#F4F6F8] px-3 py-2 text-xs font-semibold text-[#123B59]">
        {status.roleBadgeLabel}
      </span>
    </div>
  );
};
