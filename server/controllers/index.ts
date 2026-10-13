import { Request, Response } from 'express';
import { getPool } from '../config.js';
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

      res.json({ success: true, kejuruanList: rows });
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
      const result = await reviewLeaveRequest(
        req.params.id,
        req.body.status,
        req.body.reviewNotes,
        req.user?.role,
        req.user?.name
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
      const result = await createMission(req.body);
      res.status(201).json({ success: true, mission: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await updateMission(id, req.body);
      res.json({ success: true, mission: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await deleteMission(id);
      res.json({ success: true, deleted: result.affectedRows > 0 });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  submitWork: async (req: Request, res: Response) => {
    try {
      const result = await submitMissionWork(req.body, req.user!);
      res.json({ success: true, submission: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  review: async (req: Request, res: Response) => {
    try {
      const result = await reviewMissionSubmission(
        req.params.id,
        req.body.status,
        req.body.feedback,
        req.body.awardedPoints,
        req.user?.role,
        req.user?.name
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
      const result = await reviewDailyReport(
        req.params.id,
        req.body.status,
        req.body.reviewNotes,
        req.user?.role,
        req.user?.name
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
