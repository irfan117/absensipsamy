import { getPool } from '../config/index.js';
import { mapAttendanceRecord, mapLeaveRequest, mapMissionRecord, mapSubmissionRecord, mapDailyReportRecord, mapKejuruan } from '../utils/late-penalty.js';

const getMentorProgramIds = async (user: any): Promise<string[]> => {
  const [rows] = await getPool().query<any[]>(
    'SELECT id FROM kejuruan WHERE id = ? OR mentor_id = ?',
    [user.kejuruanId || '', user.id]
  );
  return [...new Set([...(user.kejuruanId ? [String(user.kejuruanId)] : []), ...rows.map(row => String(row.id))])];
};

// Kejuruan operations
export const getKejuruan = async (role: 'admin' | 'mentor' | 'trainee', user: any, programNames: string[] = []): Promise<any[]> => {
  const nameClause = programNames.length
    ? `LOWER(TRIM(name)) IN (${programNames.map(() => '?').join(',')})`
    : '';

  if (role === 'admin') {
    const [rows] = await getPool().query<any[]>(
      `SELECT * FROM kejuruan ORDER BY name`
    );
    return rows;
  }

  if (role === 'mentor') {
    const [rows] = await getPool().query<any[]>(
      `SELECT * FROM kejuruan WHERE id = ? OR mentor_id = ?${nameClause ? ` OR ${nameClause}` : ''} ORDER BY name`,
      [user.kejuruanId || '', user.id, ...programNames]
    );
    return rows;
  }

  // trainee - Fix: use kejuruanId directly, not user.id
  if (!user?.kejuruanId) return [];
  const params = [user.kejuruanId, ...programNames];
  const [rows] = await getPool().query<any[]>(
    `SELECT * FROM kejuruan WHERE id = ?${nameClause ? ` OR ${nameClause}` : ''} ORDER BY name`,
    params
  );
  return rows;
};

export const getKejuruanById = async (id: string): Promise<any> => {
  const [rows] = await getPool().query<any[]>(
    'SELECT * FROM kejuruan WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0];
};

export const createKejuruan = async (data: any): Promise<any> => {
  const id = `kj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const code = canonicalKejuruanCode(data.name, data.code);
  try {
    await getPool().query(
      `INSERT INTO kejuruan (id, name, code, category, color, description, mentor_id, mentor_name) VALUES (?,?,?,?,?,?,?,?)`,
      [id, data.name, code, data.category, data.color, data.description || '', data.mentorId || null, data.mentorName || null]
    );
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('Kejuruan dengan kode atau nama tersebut sudah ada.');
    }
    throw error;
  }
  return {
    id,
    name: data.name,
    code,
    category: data.category,
    color: data.color,
    description: data.description || '',
    mentorId: data.mentorId || undefined,
    mentorName: data.mentorName || undefined,
  };
};

export const updateKejuruan = async (id: string, data: any): Promise<any> => {
  const code = canonicalKejuruanCode(data.name, data.code);
  const [result]: any = await getPool().query(
    `UPDATE kejuruan SET name=?, code=?, category=?, color=?, description=?, mentor_id=?, mentor_name=? WHERE id=?`,
    [data.name, code, data.category, data.color, data.description || '', data.mentorId || null, data.mentorName || null, id]
  );
  return result;
};

export const deleteKejuruan = async (id: string, userRole: 'admin' | 'mentor' | 'trainee', userId: string, userKejuruanId?: string): Promise<any> => {
  if (userRole === 'admin') {
    const [result]: any = await getPool().query('DELETE FROM kejuruan WHERE id = ?', [id]);
    return result;
  }

  if (userRole === 'mentor') {
    const [programRows]: any = await getPool().query<any[]>(
      `SELECT id FROM kejuruan WHERE id = ? OR mentor_id = ?`,
      [userKejuruanId || '', userId]
    );
    const programIds = [...new Set([...programRows.map((r: any) => String(r.id)), userKejuruanId || ''].filter(Boolean))];
    if (!programIds.includes(String(id))) {
      return { affectedRows: 0 };
    }

    const [result]: any = await getPool().query(
      `DELETE FROM kejuruan WHERE id = ? AND id IN (${programIds.map(() => '?').join(',')})`,
      [id, ...programIds]
    );
    return result;
  }

  // Kejuruan is master data — trainees cannot delete it.
  throw new Error('Peserta tidak diizinkan menghapus kejuruan.');
};

// Attendance operations
export const getAttendanceRecords = async (role: 'admin' | 'mentor' | 'trainee', user: any, programNames: string[] = []): Promise<any[]> => {
  if (role === 'admin') {
    const [rows] = await getPool().query<any[]>(
      `SELECT * FROM attendance_records ORDER BY attendance_date DESC`
    );
    return rows.map(mapAttendanceRecord);
  }

  if (role === 'mentor') {
    const mentorKejuruanIds = await getMentorProgramIds(user);
    const clauses: string[] = [];
    const params: any[] = [user.id];
    if (mentorKejuruanIds.length) {
      clauses.push(`a.kejuruan_id IN (${mentorKejuruanIds.map(() => '?').join(',')})`);
      params.push(...mentorKejuruanIds);
    }
    for (const column of ['a.kejuruan_name', 'u.kejuruan_name']) {
      const nameClause = programNames.length
        ? `LOWER(TRIM(${column})) IN (${programNames.map(() => '?').join(',')})`
        : '';
      if (nameClause) {
        clauses.push(nameClause);
        params.push(...programNames);
      }
    }
    if (!clauses.length) return [];

    const [rows] = await getPool().query<any[]>(
      `SELECT DISTINCT a.* FROM attendance_records a LEFT JOIN users u ON u.id = a.user_id WHERE ${clauses.map(clause => `(${clause})`).join(' OR ')}`,
      params
    );
    return rows.map(mapAttendanceRecord);
  }

  // trainee
  const [rows] = await getPool().query<any[]>(
    `SELECT * FROM attendance_records WHERE user_id = ? ORDER BY attendance_date DESC`,
    [user.id]
  );
  return rows.map(mapAttendanceRecord);
};

export const upsertAttendanceRecord = async (record: any, userRole: 'admin' | 'mentor' | 'trainee', userId: string): Promise<any> => {
  const [userRows] = await getPool().query<any[]>(
    'SELECT id, name, login_code AS nim, role, kejuruan_id, kejuruan_name FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  if (!userRows.length) {
    throw new Error('User not found');
  }
  const userData = userRows[0];

  const penaltySettings = await loadPenaltySettings();
  const date = record.date ? String(record.date).slice(0, 10) : '';

  const [existingRecordRows] = await getPool().query<any[]>(
    'SELECT * FROM attendance_records WHERE user_id = ? AND attendance_date = ? LIMIT 1',
    [userId, date]
  );
  const existingRecord = existingRecordRows[0];
  const effectiveStatus = record.status || existingRecord?.status || 'hadir';

  const latePenalty = computeLatePenalty(penaltySettings, {
    role: userData.role || 'trainee',
    status: effectiveStatus,
    checkInTime: record.checkInTime || existingRecord?.check_in_time || null,
  });

  const id = record.id || existingRecord?.id || `att-${Date.now()}`;

  const [result]: any = await getPool().query(
    `INSERT INTO attendance_records (
      id, user_id, user_name, user_nim, user_role, kejuruan_id, kejuruan_name, attendance_date,
      check_in_time, check_out_time, status, verification_status, verified_by, verified_at,
      location, latitude, longitude, notes, photo_url, rejection_reason, work_mode, late_minutes, late_penalty_points
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      notes = COALESCE(VALUES(notes), notes),
      work_mode = COALESCE(VALUES(work_mode), work_mode),
      check_in_time = COALESCE(VALUES(check_in_time), check_in_time),
      check_out_time = COALESCE(VALUES(check_out_time), check_out_time),
      status = COALESCE(VALUES(status), status),
      location = COALESCE(VALUES(location), location),
      latitude = COALESCE(VALUES(latitude), latitude),
      longitude = COALESCE(VALUES(longitude), longitude),
      photo_url = COALESCE(VALUES(photo_url), photo_url),
      late_minutes = IF(VALUES(late_minutes) > 0, VALUES(late_minutes), late_minutes),
      late_penalty_points = IF(VALUES(late_penalty_points) > 0, VALUES(late_penalty_points), late_penalty_points),
      verification_status = IF(?, VALUES(verification_status), verification_status),
      verified_by = IF(?, VALUES(verified_by), verified_by),
      verified_at = IF(?, VALUES(verified_at), verified_at),
      rejection_reason = IF(?, VALUES(rejection_reason), rejection_reason)`,
    [
      id, userId, userData.name, userData.nim, userData.role || 'trainee', userData.kejuruan_id || null, userData.kejuruan_name || 'Umum', date,
      record.checkInTime || null, record.checkOutTime || null, effectiveStatus, record.verificationStatus || 'pending', record.verifiedBy || null, dateTimeValue(record.verifiedAt) || null,
      record.location || null, record.coordinates?.lat ?? null, record.coordinates?.lng ?? null, record.notes || null, record.photoUrl || null,
      record.rejectionReason || null, record.workMode === 'WFH' ? 'WFH' : record.workMode === 'WFO' ? 'WFO' : null,
      latePenalty.lateMinutes, latePenalty.latePenaltyPoints,
      record.canWriteReview || false, record.canWriteReview || false, record.canWriteReview || false, record.canWriteReview || false,
    ]
  );
  const [savedRows] = await getPool().query<any[]>(
    'SELECT * FROM attendance_records WHERE user_id = ? AND attendance_date = ? LIMIT 1',
    [userId, date]
  );
  if (!savedRows.length) throw new Error('Presensi tersimpan tetapi gagal dibaca ulang.');
  return mapAttendanceRecord(savedRows[0]);
};

// Leave requests operations
export const getLeaveRequests = async (role: 'admin' | 'mentor' | 'trainee', user: any): Promise<any[]> => {
  if (role === 'admin') {
    const [rows] = await getPool().query<any[]>(
      'SELECT * FROM leave_requests ORDER BY created_at DESC'
    );
    return rows.map(mapLeaveRequest);
  }

  if (role === 'mentor') {
    const programIds = await getMentorProgramIds(user);
    if (!programIds.length) return [];
    const [rows] = await getPool().query<any[]>(
      `SELECT * FROM leave_requests WHERE kejuruan_id IN (${programIds.map(() => '?').join(',')}) ORDER BY created_at DESC`,
      programIds
    );
    return rows.map(mapLeaveRequest);
  }

  // trainee
  const [rows] = await getPool().query<any[]>(
    'SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC',
    [user.id]
  );
  return rows.map(mapLeaveRequest);
};

export const submitLeaveRequest = async (reqBody: any, user: any): Promise<any> => {
  const { type, startDate, endDate, reason, attachmentUrl } = reqBody || {};
  const userId = user.id;

  if (!['izin', 'sakit'].includes(type) || !/^\d{4}-\d{2}-\d{2}$/.test(startDate || '') || !/^\d{4}-\d{2}-\d{2}$/.test(endDate || '') || !String(reason || '').trim()) {
    throw new Error('Kategori, rentang tanggal, dan alasan wajib diisi.');
  }

  let attachment: URL;
  try {
    attachment = new URL(String(attachmentUrl || ''));
    if (!['http:', 'https:'].includes(attachment.protocol) || attachment.href.length > 2048) throw new Error('Invalid URL');
  } catch {
    throw new Error('Tautan lampiran wajib berupa URL HTTP/HTTPS yang valid (maksimal 2048 karakter).');
  }

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) {
    throw new Error('Rentang tanggal pengajuan tidak valid.');
  }

  const daysCount = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  const submittedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const id = `leave-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const [result]: any = await getPool().query(
    `INSERT INTO leave_requests (
      id, user_id, user_name, user_nim, kejuruan_id, kejuruan_name,
      request_type, start_date, end_date, days_count, reason, attachment_url,
      status, submitted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [id, userId, user.name, user.nim, user.kejuruanId || '', user.kejuruanName || 'Umum', type, startDate, endDate, daysCount, String(reason).trim(), attachment.href, submittedAt]
  );

  const [rows] = await getPool().query<any[]>(
    'SELECT * FROM leave_requests WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] ? mapLeaveRequest(rows[0]) : mapLeaveRequest({ ...result, id, user_id: userId, user_name: user.name, user_nim: user.nim, kejuruan_id: user.kejuruanId || '', kejuruan_name: user.kejuruanName || 'Umum', request_type: type, start_date: startDate, end_date: endDate, days_count: daysCount, reason: String(reason).trim(), attachment_url: attachment.href, status: 'pending', submitted_at: submittedAt });
};

export const reviewLeaveRequest = async (id: string, status: 'approved' | 'rejected', reviewNotes?: string, user?: any): Promise<any> => {
  if (!['approved', 'rejected'].includes(status)) {
    throw new Error('Status verifikasi tidak valid.');
  }

  const notes = String(reviewNotes || (status === 'approved' ? 'Pengajuan disetujui' : 'Pengajuan ditolak')).slice(0, 2000);
  const reviewedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const [rows] = await getPool().query<any[]>(
    'SELECT * FROM leave_requests WHERE id = ? LIMIT 1',
    [id]
  );
  if (!rows.length) throw new Error('Pengajuan izin tidak ditemukan.');
  if (user?.role === 'mentor') {
    const programIds = await getMentorProgramIds(user);
    if (!programIds.includes(String(rows[0].kejuruan_id || ''))) throw new Error('Pengajuan ini berada di luar kejuruan bimbingan Anda.');
  }

  const [result]: any = await getPool().query(
    'UPDATE leave_requests SET status = ?, reviewed_by = ?, reviewed_at = ?, review_notes = ? WHERE id = ?',
    [status, user?.name || 'Mentor', reviewedAt, notes, id]
  );

  const [resultRows] = await getPool().query<any[]>(
    'SELECT * FROM leave_requests WHERE id = ? LIMIT 1',
    [id]
  );
  return resultRows[0] ? mapLeaveRequest(resultRows[0]) : mapLeaveRequest({ ...result, id, status, reviewed_by: user?.name || 'Mentor', reviewed_at: reviewedAt, review_notes: notes });
};

// Mission operations
export const getMissions = async (role: 'admin' | 'mentor' | 'trainee', user: any): Promise<any[]> => {
  if (role === 'admin') {
    const [rows] = await getPool().query<any[]>(
      'SELECT * FROM missions ORDER BY created_at DESC'
    );
    return rows.map(mapMissionRecord);
  }

  if (role === 'mentor') {
    const programIds = await getMentorProgramIds(user);
    if (!programIds.length) return [];
    const [rows] = await getPool().query<any[]>(
      `SELECT * FROM missions WHERE mentor_id = ? OR kejuruan_id IN (${programIds.map(() => '?').join(',')}) ORDER BY created_at DESC`,
      [user.id, ...programIds]
    );
    return rows.map(mapMissionRecord);
  }

  // trainee
  const [rows] = await getPool().query<any[]>(
    `SELECT * FROM missions WHERE kejuruan_id = ?`,
    [user.kejuruanId || '']
  );
  return rows.map(mapMissionRecord);
};

export const createMission = async (missionData: any): Promise<any> => {
  const id = missionData.id || `mis-${Date.now()}`;
  const createdAt = missionData.createdAt || new Date().toISOString().slice(0, 19).replace('T', ' ');
  await getPool().query(
    `INSERT INTO missions (id, title, description, kejuruan_id, kejuruan_name, mentor_id, mentor_name, points, difficulty, due_date, created_at, status, category, submission_guide) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, missionData.title, missionData.description, missionData.kejuruanId || null, missionData.kejuruanName || null, missionData.mentorId || null, missionData.mentorName || null, missionData.points || 0, missionData.difficulty || 'Mudah', missionData.dueDate || null, createdAt, missionData.status || 'active', missionData.category || null, missionData.submissionGuide || null]
  );
  const [rows] = await getPool().query<any[]>('SELECT * FROM missions WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? mapMissionRecord(rows[0]) : null;
};

export const updateMission = async (id: string, updates: any): Promise<any> => {
  const setClause: string[] = [];
  const params: any[] = [];

  if (updates.title !== undefined) { setClause.push('title=?'); params.push(updates.title); }
  if (updates.description !== undefined) { setClause.push('description=?'); params.push(updates.description); }
  if (updates.kejuruanId !== undefined) { setClause.push('kejuruan_id=?'); params.push(updates.kejuruanId); }
  if (updates.kejuruanName !== undefined) { setClause.push('kejuruan_name=?'); params.push(updates.kejuruanName); }
  if (updates.mentorId !== undefined) { setClause.push('mentor_id=?'); params.push(updates.mentorId); }
  if (updates.mentorName !== undefined) { setClause.push('mentor_name=?'); params.push(updates.mentorName); }
  if (updates.points !== undefined) { setClause.push('points=?'); params.push(updates.points); }
  if (updates.difficulty !== undefined) { setClause.push('difficulty=?'); params.push(updates.difficulty); }
  if (updates.dueDate !== undefined) { setClause.push('due_date=?'); params.push(updates.dueDate); }
  if (updates.status !== undefined) { setClause.push('status=?'); params.push(updates.status); }
  if (updates.category !== undefined) { setClause.push('category=?'); params.push(updates.category); }
  if (updates.submissionGuide !== undefined) { setClause.push('submission_guide=?'); params.push(updates.submissionGuide); }

  if (setClause.length === 0) return {};

  params.push(id);
  const [result]: any = await getPool().query(
    `UPDATE missions SET ${setClause.join(', ')} WHERE id=?`,
    params
  );
  return result;
};

// Mission submissions operations
export const getMissionSubmissions = async (role: 'admin' | 'mentor' | 'trainee', user: any): Promise<any[]> => {
  if (role === 'admin') {
    const [rows] = await getPool().query<any[]>(
      'SELECT * FROM mission_submissions ORDER BY submitted_at DESC'
    );
    return rows.map(mapSubmissionRecord);
  }

  if (role === 'mentor') {
    const programIds = await getMentorProgramIds(user);
    if (!programIds.length) return [];
    const [rows] = await getPool().query<any[]>(
      `SELECT * FROM mission_submissions WHERE kejuruan_id IN (${programIds.map(() => '?').join(',')})`,
      programIds
    );
    return rows.map(mapSubmissionRecord);
  }

  // trainee
  const [rows] = await getPool().query<any[]>(
    `SELECT * FROM mission_submissions WHERE trainee_id = ?`,
    [user.id]
  );
  return rows.map(mapSubmissionRecord);
};

export const submitMissionWork = async (submissionData: any, currentUser: any): Promise<any> => {
  const [missionRows] = await getPool().query<any[]>(
    'SELECT * FROM missions WHERE id = ? LIMIT 1',
    [submissionData.missionId]
  );
  const targetMission = missionRows[0];
  if (!targetMission || targetMission.status !== 'active') throw new Error('Misi tidak ditemukan atau sudah tidak aktif.');
  if (String(targetMission.kejuruan_id || '') !== String(currentUser.kejuruanId || '')) {
    throw new Error('Misi ini bukan untuk kejuruan Anda.');
  }

  const newSub: any = {
    id: `sub-${Date.now()}`,
    missionId: targetMission.id,
    missionTitle: targetMission.title,
    traineeId: currentUser.id,
    traineeName: currentUser.name,
    traineeNim: currentUser.nim || '',
    traineeAvatar: currentUser.avatar || '',
    kejuruanId: currentUser.kejuruanId || '',
    kejuruanName: currentUser.kejuruanName || '',
    submissionLink: submissionData.submissionLink,
    notes: submissionData.notes,
    points: Number(targetMission.points) || 0,
    submittedAt: dateTimeValue(new Date().toISOString()),
    status: 'pending',
  };

  const [result]: any = await getPool().query(
    `INSERT INTO mission_submissions (id, mission_id, mission_title, trainee_id, trainee_name, trainee_nim, trainee_avatar, kejuruan_id, kejuruan_name, submission_link, notes, points, submitted_at, status, reviewed_by, reviewed_at, feedback) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [newSub.id, newSub.missionId, newSub.missionTitle, newSub.traineeId, newSub.traineeName, newSub.traineeNim, newSub.traineeAvatar, newSub.kejuruanId, newSub.kejuruanName, newSub.submissionLink, newSub.notes, newSub.points, newSub.submittedAt, newSub.status, null, null, null]
  );

  const [rows] = await getPool().query<any[]>(
    'SELECT * FROM mission_submissions WHERE id = ? LIMIT 1',
    [newSub.id]
  );
  return rows[0] ? mapSubmissionRecord(rows[0]) : mapSubmissionRecord(newSub);
};

export const reviewMissionSubmission = async (submissionId: string, status: 'approved' | 'rejected', feedback?: string, awardedPoints?: number, user?: any): Promise<any> => {
  if (!['approved', 'rejected'].includes(status)) {
    throw new Error('Status review tidak valid.');
  }

  const [existingRows] = await getPool().query<any[]>(
    'SELECT * FROM mission_submissions WHERE id = ? LIMIT 1',
    [submissionId]
  );
  if (!existingRows.length) throw new Error('Submission tidak ditemukan.');
  const [missionRows] = await getPool().query<any[]>(
    'SELECT kejuruan_id, points FROM missions WHERE id = ? LIMIT 1',
    [existingRows[0].mission_id]
  );
  if (user?.role === 'mentor') {
    const programIds = await getMentorProgramIds(user);
    if (!missionRows.length || !programIds.includes(String(missionRows[0].kejuruan_id || ''))) throw new Error('Submission ini berada di luar misi yang Anda kelola.');
  }

  if (awardedPoints !== undefined && awardedPoints !== null) {
    if (awardedPoints < 0) {
      throw new Error('Poin penghargaan tidak boleh negatif.');
    }
    const maxPoints = Number(missionRows[0]?.points || 0);
    if (maxPoints > 0 && awardedPoints > maxPoints) {
      throw new Error('Nilai tidak boleh melebihi batas maksimal poin misi.');
    }
  }

  const reviewedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const feedbackText = feedback || (status === 'approved' ? 'Disetujui' : 'Ditolak');

  const [result]: any = await getPool().query(
    `UPDATE mission_submissions SET status = ?, feedback = ?, reviewed_by = ?, reviewed_at = ?, points = ? WHERE id = ?`,
    [status, feedbackText, user?.name || 'Mentor', reviewedAt, awardedPoints || 0, submissionId]
  );

  const [rows] = await getPool().query<any[]>(
    'SELECT * FROM mission_submissions WHERE id = ? LIMIT 1',
    [submissionId]
  );
  return rows[0] ? mapSubmissionRecord(rows[0]) : mapSubmissionRecord({ ...result, id: submissionId, status, feedback: feedbackText, reviewed_by: user?.name || 'Mentor', reviewed_at: reviewedAt, points: awardedPoints || 0 });
};

// Daily reports operations
export const getDailyReports = async (role: 'admin' | 'mentor' | 'trainee', user: any): Promise<any[]> => {
  if (role === 'admin') {
    const [rows] = await getPool().query<any[]>(
      'SELECT * FROM daily_reports ORDER BY submitted_at DESC'
    );
    return rows.map(mapDailyReportRecord);
  }

  if (role === 'mentor') {
    const programIds = await getMentorProgramIds(user);
    if (!programIds.length) return [];
    const [rows] = await getPool().query<any[]>(
      `SELECT * FROM daily_reports WHERE kejuruan_id IN (${programIds.map(() => '?').join(',')})`,
      programIds
    );
    return rows.map(mapDailyReportRecord);
  }

  // trainee
  const [rows] = await getPool().query<any[]>(
    `SELECT * FROM daily_reports WHERE trainee_id = ?`,
    [user.id]
  );
  return rows.map(mapDailyReportRecord);
};

export const submitDailyReport = async (reportData: any, user: any): Promise<any> => {
  const reportDate = String(reportData.date).slice(0, 10);
  const description = String(reportData.description || '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate) || !description) {
    throw new Error('Tanggal dan catatan laporan wajib diisi.');
  }

  const userId = user.id;

  const [existingRows] = await getPool().query<any[]>(
    'SELECT * FROM daily_reports WHERE trainee_id = ? AND report_date = ? LIMIT 1',
    [userId, reportDate]
  );
  const existing = existingRows[0];
  if (existing && existing.status !== 'rejected') {
    throw new Error('Kamu sudah mengumpulkan laporan untuk tanggal ini.');
  }

  const submittedAt = new Date().toISOString();
  const id = existing ? existing.id : `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (existing) {
    const [result]: any = await getPool().query(
      `UPDATE daily_reports SET description = ?, photo_url = ?, photo_name = ?, submission_link = ?, status = 'pending', submitted_at = ?, reviewed_by = NULL, reviewed_at = NULL, review_notes = NULL WHERE id = ? AND trainee_id = ? AND status = 'rejected'`,
      [description, reportData.photoUrl || null, reportData.photoName || null, reportData.submissionLink || null, dateTimeValue(submittedAt), existing.id, userId]
    );
    const [savedRows] = await getPool().query<any[]>(
      'SELECT * FROM daily_reports WHERE trainee_id = ? AND report_date = ? LIMIT 1',
      [userId, reportDate]
    );
    return savedRows[0] ? mapDailyReportRecord(savedRows[0]) : mapDailyReportRecord({ ...result, trainee_id: userId, trainee_name: user.name, trainee_nim: user.nim || '', trainee_avatar: user.avatar || null, kejuruan_id: user.kejuruanId || null, kejuruan_name: user.kejuruanName || null, report_date: reportDate, description, photo_url: reportData.photoUrl || null, photo_name: reportData.photoName || null, submission_link: reportData.submissionLink || null, status: 'pending', submitted_at: submittedAt });
  } else {
    const [result]: any = await getPool().query(
      `INSERT INTO daily_reports (id, trainee_id, trainee_name, trainee_nim, trainee_avatar, kejuruan_id, kejuruan_name, report_date, description, photo_url, photo_name, submission_link, status, submitted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'pending',?)`,
      [id, userId, user.name, user.nim || '', user.avatar || null, user.kejuruanId || null, user.kejuruanName || null, reportDate, description, reportData.photoUrl || null, reportData.photoName || null, reportData.submissionLink || null, dateTimeValue(submittedAt)]
    );
    const [savedRows] = await getPool().query<any[]>(
      'SELECT * FROM daily_reports WHERE trainee_id = ? AND report_date = ? LIMIT 1',
      [userId, reportDate]
    );
    return savedRows[0] ? mapDailyReportRecord(savedRows[0]) : mapDailyReportRecord({ ...result, trainee_id: userId, trainee_name: user.name, trainee_nim: user.nim || '', trainee_avatar: user.avatar || null, kejuruan_id: user.kejuruanId || null, kejuruan_name: user.kejuruanName || null, report_date: reportDate, description, photo_url: reportData.photoUrl || null, photo_name: reportData.photoName || null, submission_link: reportData.submissionLink || null, status: 'pending', submitted_at: submittedAt });
  }
};

export const reviewDailyReport = async (id: string, status: 'approved' | 'rejected', reviewNotes?: string, user?: any): Promise<any> => {
  if (!['approved', 'rejected'].includes(status)) {
    throw new Error('Status review tidak valid.');
  }

  const notes = String(reviewNotes || '').trim().slice(0, 2000);

  const [rows] = await getPool().query<any[]>(
    'SELECT * FROM daily_reports WHERE id = ? LIMIT 1',
    [id]
  );
  if (!rows.length) throw new Error('Laporan harian tidak ditemukan.');

  if (user?.role === 'mentor') {
    const programIds = await getMentorProgramIds(user);
    if (!programIds.includes(String(rows[0].kejuruan_id || ''))) throw new Error('Review hanya dapat dilakukan untuk laporan pada kejuruan Anda.');
  }

  const reviewedAt = new Date().toISOString();
  const [result]: any = await getPool().query(
    'UPDATE daily_reports SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_notes = ? WHERE id = ?',
    [status, user?.name || 'Mentor', notes, id]
  );

  const [savedRows] = await getPool().query<any[]>(
    'SELECT * FROM daily_reports WHERE id = ? LIMIT 1',
    [id]
  );
  return savedRows[0] ? mapDailyReportRecord(savedRows[0]) : mapDailyReportRecord({ ...result, id, status, reviewed_by: user?.name || 'Mentor', reviewed_at: reviewedAt, review_notes: notes });
};

// Settings operations
export const loadPenaltySettings = async (): Promise<any> => {
  const [rows]: any = await getPool().query<any[]>(
    'SELECT late_limit_time, late_point_penalty_per_minute, absent_point_penalty_per_day, start_time, end_time, allow_checkout_start, work_days, office_location, penalty_start_date FROM attendance_settings ORDER BY updated_at DESC LIMIT 1'
  );
  if (!rows || !rows.length) {
    return {
      lateLimitTime: '09:00',
      latePointPenaltyPerMinute: 1,
      absentPointPenaltyPerDay: 2,
      startTime: '08:00',
      endTime: '17:00',
      allowCheckoutStart: '16:30',
      penaltyStartDate: '2026-10-01',
    };
  }
  const row = rows[0];
  return {
    ...row,
    lateLimitTime: row.late_limit_time || '09:00',
    latePointPenaltyPerMinute: Number(row.late_point_penalty_per_minute ?? 1),
    absentPointPenaltyPerDay: Number(row.absent_point_penalty_per_day ?? 2),
    startTime: row.start_time || '08:00',
    endTime: row.end_time || '17:00',
    allowCheckoutStart: row.allow_checkout_start || '16:30',
    penaltyStartDate: dateValue(row.penalty_start_date) || '2026-10-01',
  };
};

export const updateAttendanceSettings = async (settings: any, userId: string): Promise<any> => {
  const location = settings.officeLocation || {};
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  const radiusMeters = Number(location.radiusMeters);
  const latePointPenaltyPerMinute = Number(settings.latePointPenaltyPerMinute);
  const absentPointPenaltyPerDay = Number(settings.absentPointPenaltyPerDay);

  if (
    typeof settings.startTime !== 'string' || !settings.startTime ||
    typeof settings.lateLimitTime !== 'string' || !settings.lateLimitTime ||
    typeof settings.endTime !== 'string' || !settings.endTime ||
    typeof settings.allowCheckoutStart !== 'string' || !settings.allowCheckoutStart ||
    !Array.isArray(settings.workDays) || typeof location.name !== 'string' || !location.name.trim() ||
    !Number.isFinite(lat) || lat < -90 || lat > 90 ||
    !Number.isFinite(lng) || lng < -180 || lng > 180 ||
    !Number.isFinite(radiusMeters) || radiusMeters < 10 || radiusMeters > 5000
  ) {
    throw new Error('Pengaturan jam atau koordinat lokasi tidak valid.');
  }
  if (!Number.isInteger(latePointPenaltyPerMinute) || latePointPenaltyPerMinute < 0 || latePointPenaltyPerMinute > 500) {
    throw new Error('Poin pengurangan per menit keterlambatan harus bilangan bulat 0-500.');
  }
  if (!Number.isInteger(absentPointPenaltyPerDay) || absentPointPenaltyPerDay < 0 || absentPointPenaltyPerDay > 500) {
    throw new Error('Poin pengurangan per hari tidak absen harus bilangan bulat 0-500.');
  }

  const penaltyStartDate = settings.penaltyStartDate || '2026-10-01';

  const [result]: any = await getPool().query(
    `INSERT INTO attendance_settings (id, start_time, late_limit_time, end_time, allow_checkout_start, work_days, office_location, late_point_penalty_per_minute, absent_point_penalty_per_day, penalty_start_date, updated_by) VALUES ('global', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE start_time=VALUES(start_time), late_limit_time=VALUES(late_limit_time),
     end_time=VALUES(end_time), allow_checkout_start=VALUES(allow_checkout_start), work_days=VALUES(work_days),
     office_location=VALUES(office_location), late_point_penalty_per_minute=VALUES(late_point_penalty_per_minute),
     absent_point_penalty_per_day=VALUES(absent_point_penalty_per_day), penalty_start_date=VALUES(penalty_start_date), updated_by=VALUES(updated_by)`,
    [settings.startTime, settings.lateLimitTime, settings.endTime, settings.allowCheckoutStart,
      JSON.stringify(settings.workDays), JSON.stringify({ ...location, lat, lng, radiusMeters }),
      latePointPenaltyPerMinute, absentPointPenaltyPerDay, penaltyStartDate, userId]
  );
  return result;
};

// Helper function to build exempt dates for Hall of Fame penalty calculation
const buildExemptDates = async (startDate: any, endDate: any): Promise<Map<string, Set<string>>> => {
  const pool = getPool();
  const exemptByUser = new Map<string, Set<string>>();
  const add = (userId: string, date: string) => {
    if (!userId || !date) return;
    const set = exemptByUser.get(userId) || new Set<string>();
    set.add(date);
    exemptByUser.set(userId, set);
  };

  const dateText = (value: any) => value instanceof Date ? value.toISOString().slice(0, 10) : value ? String(value).slice(0, 10) : '';

  const cleanStartDate = dateText(startDate) || '2026-10-01';
  const cleanEndDate = dateText(endDate) || new Date().toISOString().slice(0, 10);

  const [attendanceRows] = await pool.query<any[]>(
    `SELECT user_id, attendance_date FROM attendance_records
     WHERE check_in_time IS NOT NULL AND attendance_date >= ? AND attendance_date <= ?`,
    [cleanStartDate, cleanEndDate]
  );
  for (const row of attendanceRows) {
    add(String(row.user_id), dateText(row.attendance_date));
  }

  const [leaveRows] = await pool.query<any[]>(
    `SELECT user_id, start_date, end_date FROM leave_requests
     WHERE status = 'approved' AND end_date >= ? AND start_date <= ?`,
    [cleanStartDate, cleanEndDate]
  );
  for (const row of leaveRows) {
    const start = dateText(row.start_date);
    const end = dateText(row.end_date);
    if (!start || !end) continue;
    let timestamp = Math.max(Date.parse(`${start}T00:00:00Z`), Date.parse(`${cleanStartDate}T00:00:00Z`));
    const endTimestamp = Math.min(Date.parse(`${end}T00:00:00Z`), Date.parse(`${cleanEndDate}T00:00:00Z`));
    for (let guard = 0; timestamp <= endTimestamp && guard < 400; timestamp += 86_400_000, guard += 1) {
      add(String(row.user_id), new Date(timestamp).toISOString().slice(0, 10));
    }
  }
  return exemptByUser;
};

// Hall of Fame operations
export const getTraineeHallOfFame = async (user: any): Promise<any[]> => {
  const [rows]: any = await getPool().query<any[]>(`
    SELECT u.id, u.login_code AS nim, u.name, u.avatar, u.kejuruan_id, u.kejuruan_name, u.joined_date,
           COALESCE(submission_stats.completed_missions_count, 0) AS completed_missions_count,
           COALESCE(submission_stats.total_points, 0) AS approved_points,
           COALESCE(late_penalties.total_penalty, 0) AS total_late_penalty
    FROM users u
    LEFT JOIN (
      SELECT trainee_id, COUNT(*) AS completed_missions_count, COALESCE(SUM(points), 0) AS total_points
      FROM mission_submissions
      WHERE status = 'approved'
      GROUP BY trainee_id
    ) submission_stats ON submission_stats.trainee_id = u.id
    LEFT JOIN (
      SELECT user_id, COALESCE(SUM(late_penalty_points), 0) AS total_penalty
      FROM attendance_records
      WHERE late_penalty_points > 0
      GROUP BY user_id
    ) late_penalties ON late_penalties.user_id = u.id
    WHERE u.role = 'trainee'
  `);
  const today = todayWib();
  const setting = await loadPenaltySettings();
  let workDays = [1, 2, 3, 4, 5];
  try {
    const parsed = typeof setting?.work_days === 'string' ? JSON.parse(setting.work_days) : setting?.work_days;
    if (Array.isArray(parsed)) {
      const days = parsed.map(Number).filter((day: number) => Number.isInteger(day) && day >= 0 && day <= 6);
      if (days.length) workDays = days;
    }
  } catch {
    // keep default Mon–Fri
  }
  const absentPointPenaltyPerDay = normalizeAbsentPointPenaltyPerDay(setting?.absent_point_penalty_per_day);
  const penaltyStartDate = dateValue(setting?.penalty_start_date) || setting?.penaltyStartDate || '2026-10-01';
  const exemptByUser = await buildExemptDates(penaltyStartDate, today);

  const trainees = rows.map((row: any) => {
    const latePenaltyPoints = Number(row.total_late_penalty || 0);
    const absent = computeAbsentPenalty({
      workDays,
      absentPointPenaltyPerDay,
      today,
      joinedDate: row.joined_date,
      attendedOrLeaveDates: exemptByUser.get(String(row.id)) || [],
      penaltyStartDate,
    });
    const approvedPoints = Number(row.approved_points || 0);
    return {
      id: row.id,
      nim: row.nim,
      name: row.name,
      avatar: row.avatar || '',
      kejuruanId: row.kejuruan_id || undefined,
      kejuruanName: row.kejuruan_name || undefined,
      totalPoints: Math.max(0, approvedPoints - latePenaltyPoints - absent.absentPenaltyPoints),
      latePenaltyPoints,
      absentPenaltyPoints: absent.absentPenaltyPoints,
      absentDays: absent.absentDays,
      completedMissionsCount: Number(row.completed_missions_count),
    };
  });

  trainees.sort((a: any, b: any) =>
    b.totalPoints - a.totalPoints ||
    b.completedMissionsCount - a.completedMissionsCount ||
    String(a.name).localeCompare(String(b.name))
  );

  return trainees;
};

export const getMentorHallOfFame = async (user: any): Promise<any[]> => {
  if (user.role !== 'admin' && user.role !== 'mentor') throw new Error('Akses hanya untuk admin dan mentor.');

  const mentorScope = user.role === 'mentor' ? 'AND mentor.id = ?' : '';
  const [rows]: any = await getPool().query<any[]>(`
    SELECT mentor.id, mentor.login_code AS nim, mentor.name, mentor.kejuruan_name,
           COUNT(DISTINCT CASE WHEN submission.status = 'approved' THEN submission.id END) AS completed_missions_count,
           COALESCE(SUM(
             CASE WHEN submission.status = 'approved'
               THEN submission.points / COALESCE(NULLIF(trainee_counts.active_trainees, 0), 1)
               ELSE 0
             END
           ), 0) AS total_points
    FROM users mentor
    LEFT JOIN missions mission ON mission.mentor_id = mentor.id
    LEFT JOIN mission_submissions submission ON submission.mission_id = mission.id
    LEFT JOIN (
      SELECT kejuruan_id, COUNT(*) AS active_trainees
      FROM users
      WHERE role = 'trainee' AND status = 'active'
      GROUP BY kejuruan_id
    ) trainee_counts ON trainee_counts.kejuruan_id = mission.kejuruan_id
    WHERE mentor.role = 'mentor' ${mentorScope}
    GROUP BY mentor.id, mentor.login_code, mentor.name, mentor.kejuruan_name
    ORDER BY total_points DESC, completed_missions_count DESC, mentor.name ASC
  `, user.role === 'mentor' ? [user.id] : []);

  return rows.map((row: any) => ({
    id: row.id,
    nim: row.nim,
    name: row.name,
    kejuruanName: row.kejuruan_name || undefined,
    totalPoints: Number(Number(row.total_points).toFixed(1)),
    completedMissionsCount: Number(row.completed_missions_count),
  }));
};

export const resetTraineeHallOfFamePoints = async (): Promise<{ success: boolean; count: number; message: string }> => {
  const [result]: any = await getPool().query('UPDATE mission_submissions SET points = 0 WHERE points <> 0');
  const count = Number(result?.affectedRows || 0);
  return { success: true, count, message: `Poin HOF peserta berhasil direset untuk ${count} submission. Riwayat submission tetap tersimpan.` };
};

export const resetMentorMissionData = async (user: any): Promise<{ success: boolean; missions: number; submissions: number; message: string }> => {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [missions]: any = await connection.query<any[]>('SELECT id FROM missions WHERE mentor_id = ?', [user.id]);
    const missionIds = missions.map((mission: any) => String(mission.id));
    let submissionCount = 0;
    if (missionIds.length) {
      const placeholders = missionIds.map(() => '?').join(',');
      const [result]: any = await connection.query(`DELETE FROM mission_submissions WHERE mission_id IN (${placeholders})`, missionIds);
      submissionCount = Number(result?.affectedRows || 0);
    }
    const [missionResult]: any = await connection.query('DELETE FROM missions WHERE mentor_id = ?', [user.id]);
    const missionCount = Number(missionResult?.affectedRows || 0);
    await connection.commit();
    return { success: true, missions: missionCount, submissions: submissionCount, message: `Data misi berhasil dibersihkan: ${missionCount} misi dan ${submissionCount} tugas/review dihapus beserta poinnya.` };
  } catch (error: any) {
    await connection.rollback();
    console.error('[Reset Mission Submission Points Error]', error);
    return { success: false, missions: 0, submissions: 0, message: 'Gagal membersihkan data misi.' };
  } finally {
    connection.release();
  }
};

// Utility functions from appData.ts
export const todayWib = (): string => {
  const shifted = new Date(Date.now() + 7 * 3_600_000);
  return shifted.toISOString().slice(0, 10);
};

export const canonicalKejuruanCode = (name: string, currentCode?: string) => {
  const normalizedName = (name || '').trim().toLocaleLowerCase('id-ID');
  if (normalizedName.includes('pemasangan sistem integrasi bangunan cerdas')) return 'SB-04';
  if (normalizedName.includes('pembuatan sistem informasi pariwisata berbasis website')) return 'ST-04';
  if (normalizedName.includes('pengembangan web dengan node.js dan react')) return 'WEB-04';
  if (currentCode && String(currentCode).trim()) return String(currentCode).trim();
  const initials = (name || '')
    .trim()
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 4) || 'KJ';
  return `${initials}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

export const normalizeLatePointPenaltyPerMinute = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 1;
  return Math.min(Math.round(parsed), 500);
};

export const normalizeAbsentPointPenaltyPerDay = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 1;
  return Math.min(Math.round(parsed), 500);
};

export const computeLatePenalty = (
  settings: any,
  record: { role?: string | null; status?: string | null; checkInTime?: string | null }
): { lateMinutes: number; latePenaltyPoints: number } => {
  const empty = { lateMinutes: 0, latePenaltyPoints: 0 };
  if (!record || record.status !== 'terlambat' || !record.checkInTime) return empty;
  if (record.role === 'mentor' || record.role === 'admin') return empty;

  const toSeconds = (time?: string | null): number | null => {
    if (!time) return null;
    const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(time).trim());
    if (!match) return null;
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] || 0);
  };

  const limitTime = settings?.lateLimitTime || settings?.late_limit_time || '09:00';
  const limitSeconds = toSeconds(limitTime);
  const checkInSeconds = toSeconds(record.checkInTime);
  if (limitSeconds == null || checkInSeconds == null) return empty;

  const diffSeconds = checkInSeconds - limitSeconds;
  if (diffSeconds <= 0) return empty;

  const lateMinutes = Math.ceil(diffSeconds / 60);
  const rate = normalizeLatePointPenaltyPerMinute(settings?.latePointPenaltyPerMinute ?? settings?.late_point_penalty_per_minute ?? 1);
  return { lateMinutes, latePenaltyPoints: lateMinutes * rate };
};

export const computeAbsentPenalty = (input: {
  workDays: number[];
  absentPointPenaltyPerDay: number;
  today: string;
  joinedDate?: string | null;
  attendedOrLeaveDates: Iterable<string>;
  penaltyStartDate?: string;
}): { absentDays: number; absentPenaltyPoints: number } => {
  const today = input.today.slice(0, 10);
  const joinedDate = input.joinedDate ? String(input.joinedDate).slice(0, 10) : null;

  const ABSENT_PENALTY_START_DATE = input.penaltyStartDate || '2026-10-01';
  const startDate = joinedDate && joinedDate > ABSENT_PENALTY_START_DATE ? joinedDate : ABSENT_PENALTY_START_DATE;

  const allowedDays = new Set(
    (input.workDays || []).map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
  );
  if (!allowedDays.size) return { absentDays: 0, absentPenaltyPoints: 0 };

  const exempt = new Set(Array.from(input.attendedOrLeaveDates || []));

  let count = 0;
  for (let timestamp = Date.parse(`${startDate}T00:00:00Z`); timestamp <= Date.parse(`${today}T00:00:00Z`) && count < 2000; timestamp += 86_400_000) {
    const date = new Date(timestamp).toISOString().slice(0, 10);
    if (!allowedDays.has(new Date(timestamp).getUTCDay())) continue;
    if (exempt.has(date)) continue;
    count++;
  }
  const rate = normalizeAbsentPointPenaltyPerDay(input.absentPointPenaltyPerDay);
  return { absentDays: count, absentPenaltyPoints: count * rate };
};

export const dateValue = (value?: any) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return s.slice(0, 10);
};
export const dateTimeValue = (value?: string) => value ? String(value).replace('T', ' ').replace(/Z$/, '').slice(0, 19) : null;

export const deleteMission = async (id: string): Promise<any> => {
  const [result]: any = await getPool().query('DELETE FROM missions WHERE id = ?', [id]);
  return result;
};
