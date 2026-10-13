// Perhitungan pengurangan poin karena keterlambatan check-in (sisi server).
// Logika ini identik dengan server/appData.ts; dipisahkan untuk reusability.

export interface LatePenaltySettings {
  lateLimitTime: string; // "09:00" atau "09:00:00"
  latePointPenaltyPerMinute: number;
}

export interface LatePenaltyInput {
  role?: string | null;
  status?: string | null;
  checkInTime?: string | null;
}

export interface LatePenaltyResult {
  lateMinutes: number;
  latePenaltyPoints: number;
}

export const DEFAULT_LATE_POINT_PENALTY_PER_MINUTE = 1;

const toSeconds = (time?: string | null): number | null => {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(time).trim());
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] || 0);
};

export const normalizeLatePointPenaltyPerMinute = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_LATE_POINT_PENALTY_PER_MINUTE;
  return Math.min(Math.round(parsed), 500);
};

/**
 * Peserta yang check-in setelah batas toleransi kehilangan poin Hall of Fame
 * sebanyak menit keterlambatan x tarif yang diatur admin (default 1 poin/menit).
 */
export const computeLatePenalty = (
  settings: LatePenaltySettings,
  record: LatePenaltyInput
): LatePenaltyResult => {
  const empty = { lateMinutes: 0, latePenaltyPoints: 0 };
  if (!record || record.status !== 'terlambat' || !record.checkInTime) return empty;
  if (record.role === 'mentor' || record.role === 'admin') return empty;

  const limitSeconds = toSeconds(settings.lateLimitTime);
  const checkInSeconds = toSeconds(record.checkInTime);
  if (limitSeconds == null || checkInSeconds == null) return empty;

  const diffSeconds = checkInSeconds - limitSeconds;
  if (diffSeconds <= 0) return empty;

  const lateMinutes = Math.ceil(diffSeconds / 60);
  const rate = normalizeLatePointPenaltyPerMinute(settings.latePointPenaltyPerMinute);
  return { lateMinutes, latePenaltyPoints: lateMinutes * rate };
};

// ---------------------------------------------------------------------------
// Pengurangan poin untuk peserta yang tidak absen pada hari kerja.
// Mulai dihitung sejak 1 Oktober 2026 (atau tanggal gabung peserta, mana yang
// lebih akhir). Hari dengan check-in atau izin/sakit yang disetujui dikecualikan.
// ---------------------------------------------------------------------------
export const ABSENT_PENALTY_START_DATE = '2026-10-01';

export const normalizeAbsentPointPenaltyPerDay = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_LATE_POINT_PENALTY_PER_MINUTE;
  return Math.min(Math.round(parsed), 500);
};

const normalizeDateOnly = (value?: string | null): string | null => {
  const text = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

/** Jumlah hari kerja (sesuai workDays) dalam rentang yang belum diecualikan. */
export const countAbsentWorkDays = (input: {
  workDays: number[];
  startDate: string;
  endDate: string;
  exemptDates: Iterable<string>;
}): number => {
  const start = Date.parse(`${input.startDate}T00:00:00Z`);
  const end = Date.parse(`${input.endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;

  const allowedDays = new Set(
    (input.workDays || []).map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
  );
  if (!allowedDays.size) return 0;

  const exempt = input.exemptDates instanceof Set
    ? input.exemptDates
    : new Set(Array.from(input.exemptDates || []));

  let count = 0;
  for (let timestamp = start; timestamp <= end && count < 2000; timestamp += 86_400_000) {
    const date = new Date(timestamp).toISOString().slice(0, 10);
    if (!allowedDays.has(new Date(timestamp).getUTCDay())) continue;
    if (exempt.has(date)) continue;
    count++;
  }
  return count;
};

export const computeAbsentPenalty = (input: {
  workDays: number[];
  absentPointPenaltyPerDay: number;
  today: string;
  joinedDate?: string | null;
  attendedOrLeaveDates: Iterable<string>;
}): { absentDays: number; absentPenaltyPoints: number } => {
  const today = normalizeDateOnly(input.today);
  const joinedDate = normalizeDateOnly(input.joinedDate);
  if (!today) return { absentDays: 0, absentPenaltyPoints: 0 };

  const startDate = joinedDate && joinedDate > ABSENT_PENALTY_START_DATE
    ? joinedDate
    : ABSENT_PENALTY_START_DATE;
  const absentDays = countAbsentWorkDays({
    workDays: input.workDays,
    startDate,
    endDate: today,
    exemptDates: input.attendedOrLeaveDates,
  });
  const rate = normalizeAbsentPointPenaltyPerDay(input.absentPointPenaltyPerDay);
  return { absentDays, absentPenaltyPoints: absentDays * rate };
};

/** Hari ini (WIB) dalam format YYYY-MM-DD. */
export const todayWib = (): string => {
  const shifted = new Date(Date.now() + 7 * 3_600_000);
  return shifted.toISOString().slice(0, 10);
};

export const canonicalKejuruanCode = (name: string, currentCode: string) => {
  const normalizedName = name.trim().toLocaleLowerCase('id-ID');
  if (normalizedName.includes('pemasangan sistem integrasi bangunan cerdas')) return 'SB-04';
  if (normalizedName.includes('pembuatan sistem informasi pariwisata berbasis website')) return 'ST-04';
  if (normalizedName.includes('pengembangan web dengan node.js dan react')) return 'WEB-04';
  const legacyCodes: Record<string, string> = {
    'imp-1nl422t': 'SB-04',
    'imp-1t5ojqc': 'ST-04',
    'imp-hyd7hm': 'WEB-04',
  };
  return legacyCodes[normalizedName] || currentCode;
};
export const mapAttendanceRecord = (r: any) => ({
  id: r.id,
  userId: r.user_id,
  userName: r.user_name,
  userNim: r.user_nim,
  userRole: r.user_role,
  kejuruanId: r.kejuruan_id || '',
  kejuruanName: r.kejuruan_name || '',
  date: r.attendance_date ? String(r.attendance_date).slice(0, 10) : '',
  checkInTime: r.check_in_time || undefined,
  checkOutTime: r.check_out_time || undefined,
  status: r.status,
  workMode: r.work_mode || undefined,
  verificationStatus: r.verification_status,
  verifiedAt: r.verified_at ? String(r.verified_at).replace('T', ' ').slice(0, 19) : undefined,
  location: r.location || undefined,
  coordinates: r.latitude == null || r.longitude == null ? undefined : { lat: Number(r.latitude), lng: Number(r.longitude) },
  notes: r.notes || undefined,
  photoUrl: r.photo_url || undefined,
  rejectionReason: r.rejection_reason || undefined,
  lateMinutes: Number(r.late_minutes || 0),
  latePenaltyPoints: Number(r.late_penalty_points || 0),
});

export const mapLeaveRequest = (r: any) => ({
  id: r.id,
  userId: r.user_id,
  userName: r.user_name,
  userNim: r.user_nim,
  kejuruanId: r.kejuruan_id || '',
  kejuruanName: r.kejuruan_name || '',
  type: r.request_type,
  startDate: r.start_date ? String(r.start_date).slice(0, 10) : '',
  endDate: r.end_date ? String(r.end_date).slice(0, 10) : '',
  daysCount: r.days_count,
  reason: r.reason,
  attachmentName: r.attachment_name || undefined,
  attachmentUrl: r.attachment_url || undefined,
  status: r.status,
  submittedAt: r.submitted_at ? String(r.submitted_at).replace('T', ' ').slice(0, 19) : undefined,
  reviewedBy: r.reviewed_by || undefined,
  reviewedAt: r.reviewed_at ? String(r.reviewed_at).replace('T', ' ').slice(0, 19) : undefined,
  reviewNotes: r.review_notes || undefined,
});

export const mapMissionRecord = (r: any) => ({
  id: r.id,
  title: r.title,
  description: r.description,
  kejuruanId: r.kejuruan_id,
  kejuruanName: r.kejuruan_name,
  mentorId: r.mentor_id,
  mentorName: r.mentor_name,
  points: r.points,
  difficulty: r.difficulty,
  dueDate: r.due_date ? String(r.due_date).slice(0, 10) : '',
  createdAt: r.created_at ? String(r.created_at).slice(0, 10) : '',
  status: r.status,
  category: r.category || undefined,
  submissionGuide: r.submission_guide || undefined,
});

export const mapSubmissionRecord = (r: any) => ({
  id: r.id,
  missionId: r.mission_id,
  missionTitle: r.mission_title,
  traineeId: r.trainee_id,
  traineeName: r.trainee_name,
  traineeNim: r.trainee_nim,
  traineeAvatar: r.trainee_avatar || '',
  kejuruanId: r.kejuruan_id || '',
  kejuruanName: r.kejuruan_name || '',
  submissionLink: r.submission_link || undefined,
  notes: r.notes || '',
  points: r.points,
  submittedAt: r.submitted_at ? String(r.submitted_at).replace('T', ' ').slice(0, 19) : undefined,
  status: r.status,
  reviewedBy: r.reviewed_by || undefined,
  reviewedAt: r.reviewed_at ? String(r.reviewed_at).replace('T', ' ').slice(0, 19) : undefined,
  feedback: r.feedback || undefined,
});

export const mapDailyReportRecord = (r: any) => ({
  id: r.id,
  traineeId: r.trainee_id,
  traineeName: r.trainee_name,
  traineeNim: r.trainee_nim,
  traineeAvatar: r.trainee_avatar || '',
  kejuruanId: r.kejuruan_id || '',
  kejuruanName: r.kejuruan_name || '',
  date: r.report_date ? String(r.report_date).slice(0, 10) : '',
  description: r.description,
  photoUrl: r.photo_url || undefined,
  photoName: r.photo_name || undefined,
  submissionLink: r.submission_link || undefined,
  status: r.status,
  submittedAt: r.submitted_at ? String(r.submitted_at).replace('T', ' ').slice(0, 19) : undefined,
  reviewedBy: r.reviewed_by || undefined,
  reviewedAt: r.reviewed_at ? String(r.reviewed_at).replace('T', ' ').slice(0, 19) : undefined,
  reviewNotes: r.review_notes || undefined,
});

export const mapKejuruan = (r: any) => ({
  id: r.id,
  name: r.name,
  code: canonicalKejuruanCode(r.name, r.code),
  category: r.category,
  color: r.color,
  description: r.description || '',
  mentorId: r.mentor_id || undefined,
  mentorName: r.mentor_name || undefined,
});
