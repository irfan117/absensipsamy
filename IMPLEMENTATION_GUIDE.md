# Bugumentor.md - Complete Implementation Guide

## Database Migration (Already Applied ✓)

```sql
ALTER TABLE attendance_settings 
ADD COLUMN penalty_start_date DATE DEFAULT '2026-10-01';
```

Status: ✓ Column added successfully

---

## Fix 1: Frontend Settings Endpoint Alignment

**File:** `src/services/api.ts`

**Find and replace these 3 functions:**

### 1.1 saveAttendanceSettings (line ~207)
```typescript
// BEFORE:
async saveAttendanceSettings(settings: AttendanceSettings): Promise<{ success: boolean; message: string }> {
  return this.request<{ success: boolean; message: string }>('/api/app-data/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// AFTER:
async saveAttendanceSettings(settings: AttendanceSettings): Promise<{ success: boolean; message: string; settings?: AttendanceSettings }> {
  return this.request<{ success: boolean; message: string; settings?: AttendanceSettings }>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}
```

### 1.2 updateSettings (line ~212)
```typescript
// BEFORE:
async updateSettings(settings: AttendanceSettings | Partial<AttendanceSettings>): Promise<{ success: boolean; message: string }> {
  return this.saveAttendanceSettings(settings as AttendanceSettings);
}

// AFTER:
async updateSettings(settings: AttendanceSettings | Partial<AttendanceSettings>): Promise<{ success: boolean; message: string; settings?: AttendanceSettings }> {
  return this.request<{ success: boolean; message: string; settings?: AttendanceSettings }>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}
```

### 1.3 resetToDefaultData (line ~220)
```typescript
// BEFORE:
async resetToDefaultData(settings: AttendanceSettings): Promise<{ success: boolean; count: number; message: string }> {
  const res = await this.saveAttendanceSettings(settings);
  return {
    success: res.success,
    count: res.success ? 1 : 0,
    message: res.message || (res.success ? 'Pengaturan default berhasil direset.' : 'Gagal mereset pengaturan.'),
  };
}

// AFTER:
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

## Fix 2: getKejuruan() Trainee Branch

**File:** `server/services/data.service.ts`

**Find function `getKejuruan` (around line 11) and replace:**

```typescript
// BEFORE:
export const getKejuruan = async (role: 'admin' | 'mentor' | 'trainee', user: any, programNames: string[] = []): Promise<any[]> => {
  const scope = role === 'admin' ? null : role === 'mentor' ? user.kejuruanId || '' : user.id;
  const nameClause = programNames.length
    ? `LOWER(TRIM(name)) IN (${programNames.map(() => '?').join(',')})`
    : '';

  if (scope === null) {
    const [rows] = await getPool().query<any[]>(
      `SELECT * FROM kejuruan ORDER BY name`
    );
    return rows;
  }

  if (role === 'mentor') {
    const [rows] = await getPool().query<any[]>(
      `SELECT * FROM kejuruan WHERE id = ? OR mentor_id = ?${nameClause ? ` OR ${nameClause}` : ''} ORDER BY name`,
      [scope, user.id, ...programNames]
    );
    return rows;
  }

  const [rows] = await getPool().query<any[]>(
    `SELECT * FROM kejuruan WHERE id = ?${nameClause ? ` OR ${nameClause}` : ''} ORDER BY name`,
    scope === '' ? [] : [user.kejuruanId || '', ...programNames]
  );
  return rows;
};

// AFTER:
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

  // trainee - FIX: use kejuruanId directly
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

## Fix 3: Attendance Upsert Server-Side Validation

**File:** `server/services/data.service.ts`

**Find function `upsertAttendanceRecord` (around line 115) and replace the beginning:**

```typescript
// BEFORE:
export const upsertAttendanceRecord = async (record: any, userRole: 'admin' | 'mentor' | 'trainee', userId: string): Promise<any> => {
  const penaltySettings = await loadPenaltySettings();
  const latePenalty = computeLatePenalty(penaltySettings, {
    role: record.userRole || 'trainee',
    status: record.status,
    checkInTime: record.checkInTime || null,
  });

  const id = record.id || `att-${Date.now()}`;
  const date = record.date ? String(record.date).slice(0, 10) : '';

  const [result]: any = await getPool().query(
    `INSERT INTO attendance_records (
      id, user_id, user_name, user_nim, user_role, kejuruan_id, kejuruan_name, attendance_date,
      ...
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ...`,
    [
      id, userId, record.userName, record.userNim, record.userRole || 'trainee', record.kejuruanId || null, record.kejuruanName || 'Umum', date,
      ...
    ]
  );

// AFTER:
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
```

---

## Fix 4: Mission Update Response Shape

**File:** `server/controllers/index.ts`

**Find `missionController.update` (around line 287) and modify return statements:**

```typescript
// Find these two return statements and add 'data: result':

// Line ~304 (mentor path):
return res.json({ success: true, mission: result, data: result });

// Line ~307 (admin path):
res.json({ success: true, mission: result, data: result });
```

---

## Fix 5: Hall of Fame Penalty Start Date

**File:** `server/services/data.service.ts`

### 5.1 Update computeAbsentPenalty function signature (around line 750):

```typescript
// BEFORE:
export const computeAbsentPenalty = (input: {
  workDays: number[];
  absentPointPenaltyPerDay: number;
  today: string;
  joinedDate?: string | null;
  attendedOrLeaveDates: Iterable<string>;
}): { absentDays: number; absentPenaltyPoints: number } => {
  const today = input.today.slice(0, 10);
  const joinedDate = input.joinedDate ? String(input.joinedDate).slice(0, 10) : null;

  const ABSENT_PENALTY_START_DATE = '2026-10-01';
  const startDate = joinedDate && joinedDate > ABSENT_PENALTY_START_DATE ? joinedDate : ABSENT_PENALTY_START_DATE;

// AFTER:
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
```

### 5.2 Update getTraineeHallOfFame (around line 650):

```typescript
// Find this section and add penaltyStartDate:

// BEFORE:
const setting = await loadPenaltySettings();
let workDays = [1, 2, 3, 4, 5];
// ... parsing code ...
const absentPointPenaltyPerDay = normalizeAbsentPointPenaltyPerDay(setting?.absent_point_penalty_per_day);
const exemptByUser = await buildExemptDates('2026-10-01', today);

const trainees = rows.map((row: any) => {
  // ...
  const absent = computeAbsentPenalty({
    workDays,
    absentPointPenaltyPerDay,
    today,
    joinedDate: row.joined_date,
    attendedOrLeaveDates: exemptByUser.get(String(row.id)) || [],
  });

// AFTER:
const setting = await loadPenaltySettings();
let workDays = [1, 2, 3, 4, 5];
// ... parsing code ...
const absentPointPenaltyPerDay = normalizeAbsentPointPenaltyPerDay(setting?.absent_point_penalty_per_day);
const penaltyStartDate = setting?.penalty_start_date ? String(setting.penalty_start_date).slice(0, 10) : '2026-10-01';  // FIX: from DB
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
```

---

## Fix 6: Remove Duplicate usersController

**File:** `server/controllers/index.ts`

**Find and DELETE the entire `usersController` export (around line 115-145):**

```typescript
// DELETE THIS ENTIRE BLOCK:
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
```

---

## Fix 8: Kejuruan Create Safety

**File:** `server/controllers/index.ts`

**Find `kejuruanController.create` (around line 62):**

```typescript
// BEFORE:
create: async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang dapat menambah kejuruan.' });
    }
    const { name, code, category, color, description, mentorId, mentorName, id } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Nama kejuruan wajib diisi.' });
    }
    const codeGenerated = canonicalKejuruanCode(name, code);
    const result = await createKejuruan({ id, name, code: codeGenerated, category, color, description, mentorId, mentorName });
    res.status(201).json({ success: true, kejuruan: result, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
},

// AFTER:
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

**File:** `server/services/data.service.ts`

**Find `createKejuruan` function (around line 47):**

```typescript
// BEFORE:
export const createKejuruan = async (data: any): Promise<any> => {
  const id = data.id || `kj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const code = canonicalKejuruanCode(data.name, data.code);
  await getPool().query(
    `INSERT INTO kejuruan (id, name, code, category, color, description, mentor_id, mentor_name) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),code=VALUES(code),category=VALUES(category),color=VALUES(color),description=VALUES(description),mentor_id=VALUES(mentor_id),mentor_name=VALUES(mentor_name)`,
    [id, data.name, code, data.category, data.color, data.description || '', data.mentorId || null, data.mentorName || null]
  );
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

// AFTER:
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

## Fix 9: Attendance Reset Safety

**File:** `server/controllers/index.ts`

**Find `attendanceController.reset` (around line 194):**

```typescript
// BEFORE:
reset: async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, count: 0, message: 'Hanya admin yang dapat mereset data presensi.' });
    }
    const [result]: any = await getPool().query('DELETE FROM attendance_records');
    const count = Number(result?.affectedRows || 0);
    res.json({
      success: true,
      count,
      message: `${count} catatan presensi berhasil dihapus.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, count: 0, message: error.message || 'Gagal mereset presensi.' });
  }
},

// AFTER:
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

## Fix 10: Upload Folder Policy

**File:** `server/routes/upload.ts`

**Replace the entire file content:**

```typescript
import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../auth.js';
import { createDirectUploadSignature } from '../cloudinary.js';

const router = Router();

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

export default router;
```

---

## Verification Checklist

After applying all fixes, verify:

- [ ] Settings can be saved via frontend (check browser console for 404 errors)
- [ ] Trainees see their kejuruan correctly
- [ ] Attendance records show correct user data (not spoofed)
- [ ] Mission updates return both `mission` and `data` fields
- [ ] Hall of Fame penalty calculation uses DB penalty_start_date
- [ ] No duplicate user list logic in codebase
- [ ] Kejuruan creation doesn't accept client ID
- [ ] Attendance reset requires confirmation token
- [ ] Upload folders are prefixed with role/userId

---

## Testing Commands

```bash
# Test settings endpoint
curl -X PUT http://localhost:5000/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startTime":"08:00","lateLimitTime":"09:00","endTime":"17:00"}'

# Test attendance reset (should fail without token)
curl -X DELETE http://localhost:5000/api/attendance/reset \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test attendance reset (should succeed with token)
curl -X DELETE http://localhost:5000/api/attendance/reset \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmToken":"CONFIRM_DELETE_ALL_ATTENDANCE"}'
```

