import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getPool } from '../config/index.js';
import {
  getKejuruan, createKejuruan, updateKejuruan, deleteKejuruan,
  getAttendanceRecords, upsertAttendanceRecord,
  getLeaveRequests, submitLeaveRequest, reviewLeaveRequest,
  getMissions, createMission, updateMission, deleteMission,
  getMissionSubmissions, submitMissionWork, reviewMissionSubmission,
  getDailyReports, submitDailyReport, reviewDailyReport,
  updateAttendanceSettings,
  getTraineeHallOfFame, getMentorHallOfFame, resetTraineeHallOfFamePoints, resetMentorMissionData,
  canonicalKejuruanCode, todayWib, dateValue, dateTimeValue
} from '../services/data.service.js';

// Type extension for Express Request with user property
declare global {
  namespace Express {
    interface User {
      id: string;
      nim: string;
      name: string;
      role: 'admin' | 'mentor' | 'trainee';
      kejuruanId?: string | null;
      kejuruanName?: string | null;
      loginCode?: string;
      avatar?: string | null;
    }
    interface Request {
      user?: User;
    }
  }
}

export const kejuruanController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const { role } = req.user!;
      const programNames: string[] = [];
      const usersRole = role;

      let rows: any[];
      if (usersRole === 'admin') {
        rows = await getKejuruan('admin', { role, kejuruanId: '', kejuruanName: '' }, programNames);
      } else if (usersRole === 'mentor') {
        rows = await getKejuruan('mentor', req.user, programNames);
      } else {
        rows = await getKejuruan('trainee', req.user, programNames);
      }

      res.json({ success: true, kejuruanList: rows.map((row: any) => ({
        id: String(row.id),
        name: String(row.name || ''),
        code: String(row.code || ''),
        category: String(row.category || ''),
        color: String(row.color || '#2563eb'),
        description: String(row.description || ''),
        mentorId: row.mentorId || row.mentor_id || undefined,
        mentorName: row.mentorName || row.mentor_name || undefined,
        subPrograms: row.subPrograms || [],
      })) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  create: async (req: Request, res: Response) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Hanya admin yang dapat membuat program kejuruan.' });
    try {
      const { name, code, category, color, description, mentorId, mentorName } = req.body;
      const codeGenerated = canonicalKejuruanCode(name, code);
      const result = await createKejuruan({ id: randomUUID(), name, code: codeGenerated, category, color, description, mentorId, mentorName });
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  update: async (req: Request, res: Response) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Hanya admin yang dapat mengubah program kejuruan.' });
    try {
      const { id } = req.params;
      const { name, code, category, color, description, mentorId, mentorName } = req.body;
      const codeGenerated = canonicalKejuruanCode(name, code);
      const result = await updateKejuruan(id, { name, code: codeGenerated, category, color, description, mentorId, mentorName });
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  delete: async (req: Request, res: Response) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Hanya admin yang dapat menghapus program kejuruan.' });
    try {
      const { id } = req.params;
      const { role } = req.user!;
      let result;

      if (role === 'admin') {
        result = await deleteKejuruan(id, 'admin', '');
      } else if (role === 'mentor') {
        result = await deleteKejuruan(id, 'mentor', req.user!.id, req.user!.kejuruanId || undefined);
      } else {
        result = await deleteKejuruan(id, 'trainee', req.user!.id);
      }

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

export const usersController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      let rows: any[];
      if (user.role === 'admin') {
        [rows] = await getPool().query<any[]>("SELECT * FROM users ORDER BY name");
      } else if (user.role === 'mentor') {
        const programs = await getKejuruan('mentor', user);
        const ids = [...new Set(programs.map((program: any) => String(program.id)))];
        if (!ids.length) return res.json({ success: true, users: [] });
        [rows] = await getPool().query<any[]>(
          `SELECT * FROM users WHERE role = 'trainee' AND kejuruan_id IN (${ids.map(() => '?').join(',')}) ORDER BY name`,
          ids
        );
      } else {
        [rows] = await getPool().query<any[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [user.id]);
      }
      const users = rows.map((row: any) => ({
        id: String(row.id), nim: String(row.nim || ''), name: String(row.name || ''),
        email: row.email || '', role: row.role, avatar: row.avatar || '', phone: row.phone || '',
        status: row.status || 'active', joinedDate: row.joined_date || '',
        kejuruanId: row.kejuruan_id || undefined, kejuruanName: row.kejuruan_name || undefined,
        loginCode: row.login_code || undefined,
      }));
      res.json({ success: true, users });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

export const attendanceController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const { role } = req.user!;
      const programNames: string[] = [];
      const requestedDate = typeof req.query.date === 'string' ? req.query.date : undefined;
      if (requestedDate && !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) return res.status(400).json({ success: false, message: 'Filter tanggal tidak valid.' });
      const rows = await getAttendanceRecords(role, req.user, programNames, requestedDate);
      res.json({ success: true, attendanceRecords: rows });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  approvePendingMentors: async (req: Request, res: Response) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Hanya admin yang dapat memverifikasi presensi mentor.' });
    try {
      const reviewedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const [result]: any = await getPool().query(
        `UPDATE attendance_records a JOIN users u ON u.id = a.user_id
          SET a.verification_status = 'verified', a.verified_by = ?, a.verified_at = ?
          WHERE u.role = 'mentor' AND a.verification_status = 'pending' AND a.attendance_date = ?`,
        [`${req.user.name} (Admin)`, reviewedAt, todayWib()]
      );
      return res.json({ success: true, count: Number(result.affectedRows || 0), message: `${Number(result.affectedRows || 0)} presensi mentor disetujui.` });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || 'Gagal memverifikasi presensi mentor.' });
    }
  },

  upsert: async (req: Request, res: Response) => {
    try {
      const { role } = req.user!;
      const userId = role === 'trainee' ? req.user!.id : (req.body.userId || req.user!.id);
      if (!['admin', 'mentor', 'trainee'].includes(role)) return res.status(403).json({ success: false, message: 'Akses presensi ditolak.' });
      const [targetRows] = await getPool().query<any[]>(
        'SELECT id,name,nim,role,kejuruan_id,kejuruan_name FROM users WHERE id = ? LIMIT 1', [userId]
      );
      const target = targetRows[0];
      if (!target) return res.status(404).json({ success: false, message: 'Akun presensi tidak ditemukan.' });
      if (role === 'admin' && target.role !== 'mentor') return res.status(403).json({ success: false, message: 'Admin hanya dapat mengelola presensi mentor.' });
      if (role === 'trainee' && target.id !== req.user!.id) return res.status(403).json({ success: false, message: 'Peserta hanya dapat mengelola presensinya sendiri.' });
      if (role === 'mentor' && target.id !== req.user!.id) {
        const inProgram = target.role === 'trainee' && await mentorCanAccessProgram(req.user!, target.kejuruan_id, target.kejuruan_name);
        if (!inProgram) return res.status(403).json({ success: false, message: 'Peserta berada di luar kejuruan binaan Anda.' });
      }
      if (!['hadir', 'terlambat', 'izin', 'sakit', 'alpha'].includes(req.body?.status)) {
        return res.status(400).json({ success: false, message: 'Status presensi tidak valid.' });
      }
      const canReview = role === 'admin' || (role === 'mentor' && target.id !== req.user!.id);
      const verificationStatus = canReview && ['verified', 'rejected'].includes(req.body?.verificationStatus)
        ? req.body.verificationStatus : 'pending';
      const result = await upsertAttendanceRecord({
        id: req.body.id,
        userName: target.name,
        userNim: target.nim,
        userRole: target.role,
        kejuruanId: target.kejuruan_id,
        kejuruanName: target.kejuruan_name,
        date: req.body.date,
        checkInTime: req.body.checkInTime,
        checkOutTime: req.body.checkOutTime,
        status: req.body.status,
        verificationStatus,
        verifiedBy: canReview && verificationStatus !== 'pending' ? `${req.user!.name} (${role === 'admin' ? 'Admin' : 'Mentor'})` : null,
        verifiedAt: canReview && verificationStatus !== 'pending' ? new Date().toISOString() : null,
        location: req.body.location,
        coordinates: req.body.coordinates,
        notes: req.body.notes,
        photoUrl: req.body.photoUrl,
        rejectionReason: req.body.rejectionReason,
        workMode: req.body.workMode,
        canWriteReview: canReview,
      }, role, userId);
      res.json({ success: true, attendanceRecord: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

export const leaveController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const { role } = req.user!;
      const rows = await getLeaveRequests(role, req.user);
      res.json({ success: true, requests: rows, leaveRequests: rows });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  submit: async (req: Request, res: Response) => {
    if (req.user?.role !== 'trainee') return res.status(403).json({ success: false, message: 'Hanya peserta yang dapat mengajukan izin atau sakit.' });
    try {
      const result = await submitLeaveRequest(req.body, req.user!);
      res.status(201).json({ success: true, request: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  review: async (req: Request, res: Response) => {
    if (req.user?.role !== 'mentor') {
      return res.status(403).json({ success: false, message: 'Hanya mentor yang dapat meninjau permohonan izin.' });
    }
    try {
      const result = await reviewLeaveRequest(
        req.params.id,
        req.body.status,
        req.body.reviewNotes,
        req.user
      );
      res.json({ success: true, request: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};

export const missionController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const { role } = req.user!;
      const rows = await getMissions(role, req.user);
      const submissions = await getMissionSubmissions(role, req.user);
      res.json({ success: true, missions: rows, submissions });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      if (!req.user || !['admin', 'mentor'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Akses membuat misi ditolak.' });
      if (req.user.role === 'mentor' && !await mentorCanAccessProgram(req.user, req.body?.kejuruanId, req.body?.kejuruanName)) {
        return res.status(403).json({ success: false, message: 'Misi harus berada pada kejuruan binaan Anda.' });
      }
      const missionInput = req.user.role === 'mentor'
        ? { ...req.body, mentorId: req.user.id, mentorName: req.user.name }
        : req.body;
      const result = await createMission(missionInput);
      res.status(201).json({ success: true, mission: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!req.user || !['admin', 'mentor'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Akses mengubah misi ditolak.' });
      if (req.user.role === 'mentor' && !await mentorCanAccessMission(req.user, id)) return res.status(403).json({ success: false, message: 'Misi berada di luar kejuruan binaan Anda.' });
      if (req.user.role === 'mentor' && req.body?.kejuruanId !== undefined &&
          !await mentorCanAccessProgram(req.user, req.body.kejuruanId, req.body.kejuruanName)) {
        return res.status(403).json({ success: false, message: 'Misi tidak dapat dipindahkan ke kejuruan lain.' });
      }
      const updates = req.user.role === 'mentor'
        ? { ...req.body, mentorId: req.user.id, mentorName: req.user.name }
        : req.body;
      const result = await updateMission(id, updates);
      res.json({ success: true, mission: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      if (!req.user || !['admin', 'mentor'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Akses menghapus misi ditolak.' });
      if (req.user.role === 'mentor' && !await mentorCanAccessMission(req.user, req.params.id)) return res.status(403).json({ success: false, message: 'Misi berada di luar kejuruan binaan Anda.' });
      const { id } = req.params;
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'mentor') return res.status(403).json({ success: false, message: 'Hanya admin atau mentor yang dapat menghapus misi.' });
      if (user.role === 'mentor') {
        const [missionRows] = await getPool().query<any[]>('SELECT kejuruan_id FROM missions WHERE id = ? LIMIT 1', [id]);
        const assignedPrograms = await getKejuruan('mentor', user);
        const allowedIds = new Set(assignedPrograms.map((program: any) => String(program.id)));
        if (!missionRows.length || !allowedIds.has(String(missionRows[0].kejuruan_id || ''))) return res.status(403).json({ success: false, message: 'Anda hanya dapat menghapus misi dalam kejuruan bimbingan.' });
      }
      const result = await deleteMission(id);
      res.json({ success: true, deleted: result.affectedRows > 0 });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  submitWork: async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== 'trainee') return res.status(403).json({ success: false, message: 'Hanya peserta yang dapat mengumpulkan misi.' });
      req.body.missionId = req.params.id;
      const result = await submitMissionWork(req.body, req.user!);
      res.json({ success: true, message: 'Tugas misi berhasil dikumpulkan.', submission: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  review: async (req: Request, res: Response) => {
    try {
      if (!req.user || !['admin', 'mentor'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Akses review misi ditolak.' });
      if (req.user.role === 'mentor' && !await mentorCanAccessSubmission(req.user, req.params.id)) return res.status(403).json({ success: false, message: 'Pengumpulan ini berada di luar kejuruan binaan Anda.' });
      const result = await reviewMissionSubmission(
        req.params.id,
        req.body.status,
        req.body.feedback,
        req.body.awardedPoints ?? req.body.points,
        req.user
      );
      res.json({ success: true, submission: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};

async function mentorCanAccessProgram(user: Express.User, kejuruanId?: string, kejuruanName?: string): Promise<boolean> {
  if (user.role !== 'mentor') return false;
  const id = String(kejuruanId || '').trim();
  const name = String(kejuruanName || '').trim().toLowerCase();
  if (id && id === String(user.kejuruanId || '')) return true;
  const [rows] = await getPool().query<any[]>(
    `SELECT id FROM kejuruan WHERE mentor_id = ? OR id = ?
      OR LOWER(TRIM(mentor_name)) = LOWER(TRIM(?))
      OR (? <> '' AND LOWER(TRIM(name)) = ?)
      OR (? <> '' AND LOWER(TRIM(name)) = ?)
      LIMIT 1`,
    [user.id, id, user.name || '', id, name, name, String(user.kejuruanName || '').trim().toLowerCase()]
  );
  return rows.length > 0;
}

async function mentorCanAccessMission(user: Express.User, missionId: string): Promise<boolean> {
  const [rows] = await getPool().query<any[]>('SELECT id,mentor_id,kejuruan_id,kejuruan_name FROM missions WHERE id = ? LIMIT 1', [missionId]);
  const mission = rows[0];
  return !!mission && (String(mission.mentor_id || '') === user.id || await mentorCanAccessProgram(user, mission.kejuruan_id, mission.kejuruan_name));
}

async function mentorCanAccessSubmission(user: Express.User, submissionId: string): Promise<boolean> {
  const [rows] = await getPool().query<any[]>(
    `SELECT s.kejuruan_id,s.kejuruan_name,m.mentor_id,m.kejuruan_id AS mission_kejuruan_id,m.kejuruan_name AS mission_kejuruan_name
       FROM mission_submissions s LEFT JOIN missions m ON m.id = s.mission_id WHERE s.id = ? LIMIT 1`, [submissionId]
  );
  const submission = rows[0];
  return !!submission && (String(submission.mentor_id || '') === user.id ||
    await mentorCanAccessProgram(user, submission.kejuruan_id, submission.kejuruan_name) ||
    await mentorCanAccessProgram(user, submission.mission_kejuruan_id, submission.mission_kejuruan_name));
}

export const dailyReportController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const { role } = req.user!;
      const rows = await getDailyReports(role, req.user);
      res.json({ success: true, dailyReports: rows });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  submit: async (req: Request, res: Response) => {
    if (req.user?.role !== 'trainee') return res.status(403).json({ success: false, message: 'Hanya peserta yang dapat mengirim laporan harian.' });
    try {
      const result = await submitDailyReport(req.body, req.user!);
      res.json({ success: true, report: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  review: async (req: Request, res: Response) => {
    if (!['mentor', 'admin'].includes(req.user?.role || '')) return res.status(403).json({ success: false, message: 'Hanya mentor atau admin yang dapat meninjau laporan.' });
    try {
      if (req.user!.role !== 'admin' && req.user!.role !== 'mentor') return res.status(403).json({ success: false, message: 'Hanya admin atau mentor yang dapat mereview laporan.' });
      const result = await reviewDailyReport(
        req.params.id,
        req.body.status,
        req.body.reviewNotes,
        req.user!
      );
      res.json({ success: true, report: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};

export const settingsController = {
  getSettings: async (req: Request, res: Response) => {
    try {
      const [rows] = await getPool().query<any[]>(
        'SELECT start_time, late_limit_time, end_time, allow_checkout_start, work_days, office_location, late_point_penalty_per_minute, absent_point_penalty_per_day FROM attendance_settings ORDER BY updated_at DESC LIMIT 1'
      );
      const row = rows[0];
      if (!row) return res.json({ success: true, settings: null });
      const officeLocation = typeof row.office_location === 'string'
        ? JSON.parse(row.office_location)
        : row.office_location;
      const workDays = typeof row.work_days === 'string' ? JSON.parse(row.work_days) : row.work_days;
      const settings = {
        startTime: row.start_time,
        lateLimitTime: row.late_limit_time,
        endTime: row.end_time,
        allowCheckoutStart: row.allow_checkout_start,
        workDays,
        officeLocation,
        latePointPenaltyPerMinute: Number(row.late_point_penalty_per_minute ?? 1),
        absentPointPenaltyPerDay: Number(row.absent_point_penalty_per_day ?? 1),
      };
      res.json({ success: true, settings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { role } = req.user!;
      if (role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Hanya admin yang dapat mengubah pengaturan.' });
      }
      const result = await updateAttendanceSettings(req.body, req.user!.id);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};

export const hallOfFameController = {
  getTrainee: async (req: Request, res: Response) => {
    try {
      const { role } = req.user!;
      const usersRole = role;
      let trainees: any[];

      if (usersRole === 'admin' || usersRole === 'mentor') {
        trainees = await getTraineeHallOfFame(req.user!);
      } else {
        trainees = await getTraineeHallOfFame(req.user!);
      }

      res.json({ success: true, trainees });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getMentor: async (req: Request, res: Response) => {
    try {
      const { role } = req.user!;
      if (role !== 'admin' && role !== 'mentor') {
        return res.status(403).json({ success: false, message: 'Akses hanya untuk admin dan mentor.' });
      }
      const mentors = await getMentorHallOfFame(req.user!);
      res.json({ success: true, mentors });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  resetTraineePoints: async (req: Request, res: Response) => {
    try {
      const { role } = req.user!;
      if (role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Hanya admin yang dapat mereset poin Hall of Fame.' });
      }
      const result = await resetTraineeHallOfFamePoints();
      res.json({ ...result, success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  resetMentorData: async (req: Request, res: Response) => {
    try {
      const { role } = req.user!;
      if (role !== 'mentor' && role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Hanya mentor atau admin yang dapat mereset data misi.' });
      }
      const result = await resetMentorMissionData(req.user!);
      res.json({ ...result, success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
