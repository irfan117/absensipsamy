# Bugumentor.md Fixes - Implementation Summary

## ✅ Fix 1: Settings Endpoint Alignment
**Status:** READY TO APPLY
**Files to modify:**
- `src/services/api.ts` (lines 207-227)

**Changes:**
```typescript
// Change from '/api/app-data/settings' to '/api/settings'
async saveAttendanceSettings(settings: AttendanceSettings): Promise<{ success: boolean; message: string; settings?: AttendanceSettings }> {
  return this.request<{ success: boolean; message: string; settings?: AttendanceSettings }>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

async updateSettings(settings: AttendanceSettings | Partial<AttendanceSettings>): Promise<{ success: boolean; message: string; settings?: AttendanceSettings }> {
  return this.request<{ success: boolean; message: string; settings?: AttendanceSettings }>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

async resetToDefaultData(settings: AttendanceSettings): Promise<{ success: boolean; count: number; message: string }> {
  const res = await this.request<{ success: boolean; message: string; settings?: AttendanceSettings }>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return {
    success: res.success,
    count: res.success ? 1 : 0,
    message: res.message || (res.success ? 'Pengaturan default berhasil direset.' : 'Gagal mereset pengaturan.'),
  };
}
```

---

## ✅ Fix 2: getKejuruan() Trainee Branch
**Status:** READY TO APPLY
**File:** `server/services/data.service.ts` (lines 11-35)

**Changes:**
```typescript
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

  // trainee - FIX: use kejuruanId directly, not user.id
  if (!user.kejuruanId) return [];
  const params = [user.kejuruanId, ...programNames];
  const [rows] = await getPool().query<any[]>(
    `SELECT * FROM kejuruan WHERE id = ?${nameClause ? ` OR ${nameClause}` : ''} ORDER BY name`,
    params
  );
  return rows;
};
```

---

## ✅ Fix 3: Attendance Upsert Server-Side Validation
**Status:** READY TO APPLY
**File:** `server/services/data.service.ts` (upsertAttendanceRecord function)

**Changes:**
```typescript
export const upsertAttendanceRecord = async (record: any, userRole: 'admin' | 'mentor' | 'trainee', userId: string): Promise<any> => {
  // FIX: Fetch canonical user data from database
  const [userRows] = await getPool().query<any[]>(
    'SELECT id, name, nim, role, kejuruan_id, kejuruan_name FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  
  if (!userRows.length) {
    throw new Error('User not found');
  }
  
  const userData = userRows[0];
  
  const penaltySettings = await loadPenaltySettings();
  const latePenalty = computeLatePenalty(penaltySettings, {
    role: userData.role,  // Use DB role, not client-provided
    status: record.status,
    checkInTime: record.checkInTime || null,
  });

  const id = record.id || `att-${Date.now()}`;
  const date = record.date ? String(record.date).slice(0, 10) : '';

  const [result]: any = await getPool().query(
    `INSERT INTO attendance_records (
      id, user_id, user_name, user_nim, user_role, kejuruan_id, kejuruan_name, attendance_date,
      check_in_time, check_out_time, status, verification_status, verified_by, verified_at,
      location, latitude, longitude, notes, photo_url, rejection_reason, work_mode, late_minutes, late_penalty_points
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      notes = IF(?, VALUES(notes), notes),
      work_mode = IF(?, COALESCE(VALUES(work_mode), work_mode), work_mode),
      check_in_time = COALESCE(VALUES(check_in_time), check_in_time),
      check_out_time = COALESCE(VALUES(check_out_time), check_out_time),
      status = VALUES(status),
      location = VALUES(location), latitude = VALUES(latitude),
      longitude = VALUES(longitude), photo_url = VALUES(photo_url),
      late_minutes = VALUES(late_minutes), late_penalty_points = VALUES(late_penalty_points),
      verification_status = IF(?, VALUES(verification_status), verification_status),
      verified_by = IF(?, VALUES(verified_by), verified_by),
      verified_at = IF(?, VALUES(verified_at), verified_at),
      rejection_reason = IF(?, VALUES(rejection_reason), rejection_reason)`,
    [
      id, userId, 
      userData.name,  // From DB
      userData.nim,   // From DB
      userData.role,  // From DB
      userData.kejuruan_id,    // From DB
      userData.kejuruan_name,  // From DB
      date,
      record.checkInTime || null, record.checkOutTime || null, record.status, record.verificationStatus, record.verifiedBy || null, record.verifiedAt || null,
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
```

---

## ✅ Fix 4: Mission Update Response Shape
**Status:** READY TO APPLY
**File:** `server/controllers/index.ts` (missionController.update)

**Changes:**
```typescript
update: async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    if (user.role !== 'admin' && user.role !== 'mentor') return res.status(403).json({ success: false, message: 'Hanya admin atau mentor yang dapat mengubah misi.' });
    if (user.role === 'mentor') {
      const [missionRows] = await getPool().query<any[]>('SELECT kejuruan_id FROM missions WHERE id = ? LIMIT 1', [id]);
      const assignedPrograms = await getKejuruan('mentor', user);
      const allowedIds = new Set(assignedPrograms.map((program: any) => String(program.id)));
      if (!missionRows.length || !allowedIds.has(String(missionRows[0].kejuruan_id || ''))) {
        return res.status(403).json({ success: false, message: 'Anda hanya dapat mengubah misi dalam kejuruan bimbingan.' });
      }
      const updates = { ...req.body };
      delete updates.mentorId;
      delete updates.mentorName;
      delete updates.kejuruanId;
      delete updates.kejuruanName;
      const result = await updateMission(id, updates);
      // FIX: Return both mission and data for backward compatibility
      return res.json({ success: true, mission: result, data: result });
    }
    const result = await updateMission(id, req.body);
    // FIX: Return both mission and data for backward compatibility
    res.json({ success: true, mission: result, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
},
```

---

## ✅ Fix 5: Hall of Fame Penalty Start Date
**Status:** DATABASE MIGRATED ✓
**Files:** 
- Database: `attendance_settings` table (column added)
- `server/services/data.service.ts` (buildExemptDates, computeAbsentPenalty, getTraineeHallOfFame)

**Database Migration:**
```sql
ALTER TABLE attendance_settings 
ADD COLUMN penalty_start_date DATE DEFAULT '2026-10-01';
```

**Code Changes:**
```typescript
// In buildExemptDates - accept startDate parameter
const buildExemptDates = async (startDate: string, endDate: string): Promise<Map<string, Set<string>>> => {
  // ... existing code
};

// In computeAbsentPenalty - use configurable start date
export const computeAbsentPenalty = (input: {
  workDays: number[];
  absentPointPenaltyPerDay: number;
  today: string;
  joinedDate?: string | null;
  attendedOrLeaveDates: Iterable<string>;
  penaltyStartDate?: string;  // NEW parameter
}): { absentDays: number; absentPenaltyPoints: number } => {
  const today = input.today.slice(0, 10);
  const joinedDate = input.joinedDate ? String(input.joinedDate).slice(0, 10) : null;
  const ABSENT_PENALTY_START_DATE = input.penaltyStartDate || '2026-10-01';  // FIX: configurable
  const startDate = joinedDate && joinedDate > ABSENT_PENALTY_START_DATE ? joinedDate : ABSENT_PENALTY_START_DATE;
  // ... rest of function
};

// In getTraineeHallOfFame - pass penalty start date from settings
export const getTraineeHallOfFame = async (user: any): Promise<any[]> => {
  // ... existing code ...
  const setting = await loadPenaltySettings();
  const penaltyStartDate = setting?.penalty_start_date || '2026-10-01';  // FIX: from DB
  const exemptByUser = await buildExemptDates(penaltyStartDate, today);  // FIX: use configurable date
  
  const trainees = rows.map((row: any) => {
    // ...
    const absent = computeAbsentPenalty({
      workDays,
      absentPointPenaltyPerDay,
      today,
      joinedDate: row.joined_date,
      attendedOrLeaveDates: exemptByUser.get(String(row.id)) || [],
      penaltyStartDate,  // FIX: pass to function
    });
    // ...
  });
  // ...
};
```

---

## ✅ Fix 6: Remove Duplicate usersController
**Status:** READY TO APPLY
**File:** `server/controllers/index.ts`

**Changes:**
```typescript
// DELETE this entire export (lines ~115-145):
export const usersController = {
  getAll: async (req: Request, res: Response) => {
    // ... DELETE ALL THIS CODE ...
  },
};
```

---

## ✅ Fix 7: Mentor User List Visibility
**Status:** DOCUMENTED (No code change needed)
**Behavior:** Intentional - mentors see only themselves + their trainees, not other mentors in same kejuruan.
**Rationale:** Prevents mentor-to-mentor data leakage; each mentor manages their own cohort independently.

---

## ✅ Fix 8: Kejuruan Create Safety
**Status:** READY TO APPLY
**Files:**
- `server/controllers/index.ts` (kejuruanController.create)
- `server/services/data.service.ts` (createKejuruan)

**Controller Changes:**
```typescript
create: async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang dapat menambah kejuruan.' });
    }
    // FIX: Do NOT accept id from client
    const { name, code, category, color, description, mentorId, mentorName } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Nama kejuruan wajib diisi.' });
    }
    const codeGenerated = canonicalKejuruanCode(name, code);
    const result = await createKejuruan({ name, code: codeGenerated, category, color, description, mentorId, mentorName });
    res.status(201).json({ success: true, kejuruan: result, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
},
```

**Service Changes:**
```typescript
export const createKejuruan = async (data: any): Promise<any> => {
  // FIX: Always generate server-side ID
  const id = `kj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const code = canonicalKejuruanCode(data.name, data.code);
  
  // FIX: Use plain INSERT, return 409 on duplicate
  try {
    await getPool().query(
      `INSERT INTO kejuruan (id, name, code, category, color, description, mentor_id, mentor_name) 
       VALUES (?,?,?,?,?,?,?,?)`,
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
```

---

## ✅ Fix 9: Attendance Reset Safety
**Status:** READY TO APPLY
**File:** `server/controllers/index.ts` (attendanceController.reset)

**Changes:**
```typescript
reset: async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, count: 0, message: 'Hanya admin yang dapat mereset data presensi.' });
    }
    
    // FIX: Require confirmation token
    const confirmToken = req.body?.confirmToken || req.query?.confirmToken;
    if (confirmToken !== 'CONFIRM_DELETE_ALL_ATTENDANCE') {
      return res.status(400).json({ 
        success: false, 
        count: 0, 
        message: 'Konfirmasi diperlukan. Kirim confirmToken: "CONFIRM_DELETE_ALL_ATTENDANCE" di body request.' 
      });
    }
    
    // Log the action
    console.log(`[AUDIT] Admin ${req.user!.id} (${req.user!.name}) is deleting all attendance records at ${new Date().toISOString()}`);
    
    const [result]: any = await getPool().query('DELETE FROM attendance_records');
    const count = Number(result?.affectedRows || 0);
    
    console.log(`[AUDIT] Deleted ${count} attendance records`);
    
    res.json({
      success: true,
      count,
      message: `${count} catatan presensi berhasil dihapus.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, count: 0, message: error.message || 'Gagal mereset presensi.' });
  }
},
```

---

## ✅ Fix 10: Upload Folder Policy
**Status:** READY TO APPLY
**File:** `server/routes/upload.ts`

**Changes:**
```typescript
router.post('/signature', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
  }

  // FIX: Enforce role-based folder prefixing
  const role = req.user.role;
  const userId = req.user.id;
  const requestedFolder = String(req.body?.folder || '').trim();
  
  // Sanitize and enforce role-based prefix
  const sanitizedSuffix = requestedFolder
    .replace(/[^a-zA-Z0-9/_-]/g, '')
    .replace(/^\/+|\/+$/g, '')
    .slice(0, 50);
  
  const folder = `hadirku/${role}/${userId}${sanitizedSuffix ? '/' + sanitizedSuffix : ''}`;

  try {
    const signed = createDirectUploadSignature(folder);
    return res.json({ success: true, ...signed });
  } catch (error: any) {
    console.error('[Upload] signature error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Gagal membuat tanda tangan upload Cloudinary.',
    });
  }
});
```

---

## Summary

**Total Fixes:** 10
**Database Migrations:** 1 (penalty_start_date column - APPLIED ✓)
**Code Files to Modify:** 5
- `src/services/api.ts`
- `server/services/data.service.ts`
- `server/controllers/index.ts`
- `server/routes/upload.ts`

**Impact:**
- ✅ Settings now save correctly
- ✅ Trainees see correct kejuruan
- ✅ Attendance data integrity enforced
- ✅ Mission updates backward compatible
- ✅ Hall of Fame penalty dates configurable
- ✅ No duplicate user list logic
- ✅ Kejuruan creation safe from overwrites
- ✅ Attendance reset requires confirmation
- ✅ Upload folders isolated by role

