import { Request, Response } from 'express';
import { getPool } from '../config/index.js';
import {
  getKejuruan, createKejuruan, updateKejuruan, deleteKejuruan,
  getAttendanceRecords, upsertAttendanceRecord,
  getLeaveRequests, submitLeaveRequest, reviewLeaveRequest,
  getMissions, createMission, updateMission, deleteMission,
  getMissionSubmissions, submitMissionWork, reviewMissionSubmission,
  getDailyReports, submitDailyReport, reviewDailyReport,
  loadPenaltySettings, updateAttendanceSettings,
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

      const kejuruanList = rows.map((row: any) => ({
        id: String(row.id), name: String(row.name || ''), code: String(row.code || ''),
        category: String(row.category || ''), color: String(row.color || ''),
        description: String(row.description || ''), mentorId: row.mentor_id || undefined,
        mentorName: row.mentor_name || undefined,
        subPrograms: Array.isArray(row.sub_programs) ? row.sub_programs : undefined,
      }));
      res.json({ success: true, kejuruanList });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { name, code, category, color, description, mentorId, mentorName } = req.body;
      const codeGenerated = canonicalKejuruanCode(name, code);
      const result = await createKejuruan({ name, code: codeGenerated, category, color, description, mentorId, mentorName });
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  update: async (req: Request, res: Response) => {
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
    try {
      const { id } = req.params;
      const { role } = req.user!;
      let result;

      if (role === 'admin') {
        result = await deleteKejuruan(id, 'admin', '');
      } else if (role === 'mentor') {
        result = await deleteKejuruan(id, 'mentor', req.user!.id, req.user!.kejuruanId);
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
      const rows = await getAttendanceRecords(role, req.user, programNames);
      res.json({ success: true, attendanceRecords: rows });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  upsert: async (req: Request, res: Response) => {
    try {
      const { role } = req.user!;
      const userId = role === 'trainee' ? req.user!.id : (req.body.userId || req.user!.id);
      if (role === 'mentor' && userId !== req.user!.id) {
        const assignedPrograms = await getKejuruan('mentor', req.user!);
        const [targetRows] = await getPool().query<any[]>(
          'SELECT kejuruan_id FROM users WHERE id = ? LIMIT 1',
          [userId]
        );
        const assignedIds = new Set(assignedPrograms.map((program: any) => String(program.id)));
        if (!targetRows.length || !assignedIds.has(String(targetRows[0].kejuruan_id || ''))) {
          return res.status(403).json({ success: false, message: 'Anda hanya dapat mengubah presensi peserta kejuruan bimbingan Anda.' });
        }
      }
      const result = await upsertAttendanceRecord({
        id: req.body.id,
        userName: req.body.userName,
        userNim: req.body.userNim,
        userRole: req.body.userRole,
        kejuruanId: req.body.kejuruanId,
        kejuruanName: req.body.kejuruanName,
        date: req.body.date,
        checkInTime: req.body.checkInTime,
        checkOutTime: req.body.checkOutTime,
        status: req.body.status,
        verificationStatus: req.body.verificationStatus,
        verifiedBy: req.body.verifiedBy,
        verifiedAt: req.body.verifiedAt,
        location: req.body.location,
        coordinates: req.body.coordinates,
        notes: req.body.notes,
        photoUrl: req.body.photoUrl,
        rejectionReason: req.body.rejectionReason,
        workMode: req.body.workMode,
        canWriteReview: req.body.canWriteReview,
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
    try {
      const result = await submitLeaveRequest(req.body, req.user!);
      res.status(201).json({ success: true, request: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  review: async (req: Request, res: Response) => {
    try {
      if (req.user!.role !== 'admin' && req.user!.role !== 'mentor') return res.status(403).json({ success: false, message: 'Hanya admin atau mentor yang dapat memverifikasi izin.' });
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
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'mentor') return res.status(403).json({ success: false, message: 'Hanya admin atau mentor yang dapat membuat misi.' });
      const data = { ...req.body };
      if (user.role === 'mentor') {
        const assignedPrograms = await getKejuruan('mentor', user);
        const target = assignedPrograms.find((program: any) => String(program.id) === String(data.kejuruanId));
        if (!target) return res.status(403).json({ success: false, message: 'Misi hanya dapat dibuat untuk kejuruan bimbingan Anda.' });
        data.mentorId = user.id;
        data.mentorName = user.name;
        data.kejuruanName = target.name;
      }
      const result = await createMission(data);
      res.status(201).json({ success: true, mission: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'mentor') return res.status(403).json({ success: false, message: 'Hanya admin atau mentor yang dapat mengubah misi.' });
      if (user.role === 'mentor') {
        const [missionRows] = await getPool().query<any[]>('SELECT mentor_id, kejuruan_id FROM missions WHERE id = ? LIMIT 1', [id]);
        const assignedPrograms = await getKejuruan('mentor', user);
        const updates = { ...req.body };
        const allowedIds = new Set(assignedPrograms.map((program: any) => String(program.id)));
        if (!missionRows.length || !allowedIds.has(String(missionRows[0].kejuruan_id || '')) || !allowedIds.has(String(updates.kejuruanId ?? missionRows[0].kejuruan_id))) {
          return res.status(403).json({ success: false, message: 'Anda hanya dapat mengubah misi dalam kejuruan bimbingan.' });
        }
        updates.mentorId = missionRows[0].mentor_id || user.id;
        updates.mentorName = missionRows[0].mentor_id ? undefined : user.name;
        delete updates.mentorId;
        delete updates.mentorName;
        const result = await updateMission(id, updates);
        return res.json({ success: true, mission: result });
      }
      const result = await updateMission(id, req.body);
      res.json({ success: true, mission: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
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
      if (req.user!.role !== 'trainee') return res.status(403).json({ success: false, message: 'Hanya peserta yang dapat mengumpulkan misi.' });
      const result = await submitMissionWork(req.body, req.user!);
      res.json({ success: true, message: 'Tugas misi berhasil dikumpulkan.', submission: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  review: async (req: Request, res: Response) => {
    try {
      if (req.user!.role !== 'admin' && req.user!.role !== 'mentor') return res.status(403).json({ success: false, message: 'Hanya admin atau mentor yang dapat menilai submission.' });
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
    try {
      const result = await submitDailyReport(req.body, req.user!);
      res.json({ success: true, report: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  review: async (req: Request, res: Response) => {
    try {
      if (req.user!.role !== 'admin' && req.user!.role !== 'mentor') return res.status(403).json({ success: false, message: 'Hanya admin atau mentor yang dapat mereview laporan.' });
      const result = await reviewDailyReport(
        req.params.id,
        req.body.status,
        req.body.reviewNotes,
        req.user
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
      const { role } = req.user!;
      const settings = await loadPenaltySettings();
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
      res.json({ success: true, ...result });
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
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
