# Admin Module Audit Report

## Overview
Comprehensive audit of all Admin pages, identifying bugs in API connectivity, data integration, and technical inconsistencies.

---

## Admin Pages Audited

| Tab | Page | Description |
|-----|------|-------------|
| dashboard | AdminDashboard | Mentor verification & trainee monitoring dashboard |
| verifikasi-mentor | AdminDashboard | Same as dashboard (mentor verification view) |
| peserta | TraineeManagementView | User/mentor/trainee management, CRUD operations |
| pengaturan | SettingsView | Attendance settings, GPS location, schedule |
| hall-of-fame | MentorHallOfFameView | Hall of Fame leaderboard for mentors |
| misi | MissionManagementView | Mission creation/review (admin can review all) |
| laporan-harian | DailyReportView | Daily report review (admin view) |
| rekap | MonthlyRecapView | Monthly attendance recap & export |
| profil | ProfileView | User profile, avatar upload, password change |

---

## Backend Bugs Found

### BUG-001: `createKejuruan()` returns undefined `result` variable
**File:** `server/services/data.service.ts:49-56`
**Severity:** Critical
**Description:** The `createKejuruan()` function executes an INSERT query but discards the result. On line 55, it returns `result` — a variable that was never declared or assigned. This will throw `ReferenceError: result is not defined` at runtime.
**Fix:** Capture the query result with `const [result]: any = await getPool().query(...)`.

### BUG-002: `reviewMissionSubmission()` writes to non-existent `awarded_points` column
**File:** `server/services/data.service.ts:435-438`
**Severity:** Critical
**Description:** The UPDATE query in `reviewMissionSubmission()` references an `awarded_points` column that does not exist in the `mission_submissions` table schema. The schema (database/init_complete_db.sql) defines a `points` column instead. The same issue appears on line 444 where the fallback return object references `awarded_points`.
**Fix:** Replace `awarded_points` with `points` in the SQL UPDATE and fallback object.

### BUG-003: Hall of Fame calls non-existent `buildExemptDates()` function
**File:** `server/services/data.service.ts:621`
**Severity:** Critical
**Description:** `getTraineeHallOfFame()` calls `buildExemptDates('2026-10-01', today)` but this function is not defined or imported in data.service.ts. The same function exists in `server/appData.ts:53` but is scoped to that module. Additionally, the `workDays` parameter is hardcoded to `[]` on line 626, which means `computeAbsentPenalty()` always returns `{ absentDays: 0, absentPenaltyPoints: 0 }` regardless of input.
**Fix:** Add `buildExemptDates()` function to data.service.ts (ported from appData.ts). Load workDays from `attendance_settings` table for absent penalty calculation.

### BUG-004: MissionController.update has dead code for mentor role
**File:** `server/controllers/index.ts:263-288`
**Severity:** Medium
**Description:** In the mentor branch of `missionController.update`, lines 277-278 set `updates.mentorId` and `updates.mentorName` on the updates object, but then immediately delete them on lines 278-279. This is dead code — the values are set and immediately removed. The intent was to clear the mentor assignment when a different mentor exists, but the logic is inverted.
**Fix:** Remove the dead code or fix the logic to properly handle mentor assignments.

### BUG-005: MissionController.update mentor branch has incorrect condition
**File:** `server/controllers/index.ts:273`
**Severity:** Medium
**Description:** The condition `!allowedIds.has(String(missionRows[0].kejuruan_id || '')) || !allowedIds.has(String(updates.kejuruanId ?? missionRows[0].kejuruan_id))` is overly restrictive. If `updates.kejuruanId` is not being changed, it checks `missionRows[0].kejuruan_id` twice — once for the existing mission and once for the update. This could incorrectly reject valid updates.
**Fix:** Simplify the condition to only check the existing mission's kejuruan_id against allowed IDs.

### BUG-006: `deleteKejuruan()` trainee branch is unreachable/unlogical
**File:** `server/services/data.service.ts:67-91`
**Severity:** Medium
**Description:** Trainees can never delete kejuruan (these are master data entities, not user-owned). The trainee delete branch (line 89) uses `DELETE FROM kejuruan WHERE id = ? AND user_id = ?` but the `kejuruan` table has no `user_id` column. This will always return 0 affected rows.
**Fix:** Remove the trainee delete branch or add proper authorization.

---

## Missing Backend Endpoints

### BUG-007: Missing `PUT /api/users/:id` - Update user endpoint
**File:** `server/routes/users.ts`
**Severity:** High
**Description:** The frontend `api.ts:259-264` defines `updateUser()` which calls `PUT /api/users/:id`, but this route does not exist in the backend. The frontend `TraineeManagementView` also uses `deleteUser`, `deleteUsersByRole`, `deleteTraineesByIds`, `addKejuruan`, `importUsers`, `regenerateUserCredentials` — none of which are implemented in AppContext or the backend.
**Fix:** Add the route to `server/routes/users.ts`:
- `PUT /api/users/:id` — Update user (admin only)
- `DELETE /api/users/:id` — Delete user (admin only)
- `POST /api/users/batch` — Batch import users (admin only)
- `DELETE /api/users/clear/:role` — Clear all users by role (admin only)
- `POST /api/users/batch-delete-trainees` — Batch delete trainees by IDs (admin only)

### BUG-008: Missing `PUT /api/profile/avatar` endpoint
**File:** `server/routes/users.ts` or new `server/routes/profile.ts`
**Severity:** Medium
**Description:** The frontend `api.ts:266-271` defines `updateMyAvatar()` which calls `PUT /api/profile/avatar`, but this route does not exist in the backend. The `ProfileView` component allows users to upload avatar images.
**Fix:** Add `PUT /api/profile/avatar` route to update the user's avatar URL.

### BUG-009: Missing `POST /api/upload/signature` endpoint
**File:** `server/index.ts` routing
**Severity:** Medium
**Description:** The frontend `api.ts:287-322` calls `POST /api/upload/signature` to get a Cloudinary upload signature, but this route is not registered in the backend. There's a `server/cloudinary.ts` with a `createDirectUploadSignature()` function, but no route exposes it.
**Fix:** Add `POST /api/upload/signature` route.

---

## AppContext Missing Functions

### BUG-010: AppContext missing `addKejuruan`, `addMission` (kejuruan operations)
**File:** `src/context/AppContext.tsx`
**Severity:** High
**Description:** The `TraineeManagementView` calls `addKejuruan(kjData)` from AppContext (line 402), but `addKejuruan` is not defined in AppContext. Similarly, `deleteUser`, `deleteUsersByRole`, `deleteTraineesByIds`, `importUsers`, and `regenerateUserCredentials` are used in TraineeManagementView but not defined in AppContext. The `addMission` function works but calls `api.createMission()` directly.
**Fix:** Add missing context functions:
- `addKejuruan` — calls API to create kejuruan
- `deleteUser` — calls API DELETE `/api/users/:id`
- `deleteUsersByRole` — calls API DELETE `/api/users/clear/:role`
- `deleteTraineesByIds` — calls API POST `/api/users/batch-delete-trainees`
- `importUsers` — calls API POST `/api/users/batch`
- `regenerateUserCredentials` — calls new API endpoint

---

## Frontend Issues

### BUG-011: AppContext uses `any` casts for missing API methods
**File:** `src/context/AppContext.tsx` lines 288, 463, 473, 484, 494, 503
**Severity:** Medium
**Description:** Several AppContext functions use `(api as any)` to call methods that don't exist on the api object, silently returning fallback values. This masks API failures:
- `resetAttendanceRecords` calls `(api as any).resetAttendanceRecords?.()` (line 288) — no such method in api.ts
- `resetMentorMissionData` calls `(api as any).resetMentorMissionData?.()` (line 463) — no such method in api.ts
- `resetTraineeHallOfFamePoints` calls `(api as any).resetTraineeHallOfFamePoints?.()` (line 473) — no such method in api.ts
- `updateSettings` calls `(api as any).updateSettings?.()` (line 484) — no such method in api.ts
- `resetToDefaultData` calls `(api as any).resetToDefaultData?.()` (line 494) — no such method in api.ts
- `reviewDailyReport` calls `(api as any).reviewDailyReport?.()` (line 503) — exists in api.ts ✓ (but uses any cast unnecessarily)
**Fix:** Add the missing API methods to api.ts or remove the fallback patterns.

### BUG-012: `resetAttendanceRecords` has no backend endpoint
**File:** `src/services/api.ts:221-225`
**Severity:** Low
**Description:** `api.ts` defines `resetAttendanceRecords()` calling `DELETE /api/attendance/reset`, but this route doesn't exist in `server/routes/attendance.ts`. The Admin "Reset Presensi" button in MonthlyRecapView will fail silently due to the AppContext's `(api as any)` fallback.
**Fix:** Add `DELETE /api/attendance/reset` route to backend.

---

## Summary

| ID | Bug | Severity | Status |
|----|-----|----------|--------|
| BUG-001 | `createKejuruan()` returns undefined `result` | Critical | ✅ Fixed |
| BUG-002 | `reviewMissionSubmission()` writes to non-existent `awarded_points` column | Critical | ✅ Fixed |
| BUG-003 | `buildExemptDates()` not defined in data.service.ts | Critical | ✅ Fixed |
| BUG-004 | Dead code in MissionController.update mentor branch | Medium | ✅ Fixed |
| BUG-005 | Incorrect condition in MissionController.update | Medium | ✅ Fixed |
| BUG-006 | Trainee delete branch uses non-existent `user_id` column in kejuruan table | Medium | ✅ Fixed |
| BUG-007 | Missing user management endpoints (PUT/:id, DELETE/:id, batch, clear, batch-delete) | High | ✅ Fixed |
| BUG-008 | Missing `/api/profile/avatar` endpoint | Medium | ✅ Fixed |
| BUG-009 | Missing `/api/upload/signature` endpoint | Medium | ✅ Fixed |
| BUG-010 | AppContext missing several functions (addKejuruan, deleteUser, etc.) | High | ✅ Fixed |
| BUG-011 | AppContext uses `(api as any)` casts masking API failures | Medium | ✅ Fixed |
| BUG-012 | Missing `/api/attendance/reset` endpoint | Low | ✅ Fixed |

### Immediate Fixes Applied
- ✅ `createKejuruan()` — captures query result properly
- ✅ `reviewMissionSubmission()` — uses `points` column instead of `awarded_points`
- ✅ `buildExemptDates()` — added to data.service.ts (ported from appData.ts)
- ✅ MissionController.update — mentor auth aligned with delete; dead mentorId code removed
- ✅ `deleteKejuruan()` — trainee branch removed; mentor delete SQL fixed
- ✅ User management routes — PUT/DELETE/:id, batch, clear, batch-delete, regenerate-credentials
- ✅ `PUT /api/profile/avatar` and `POST /api/upload/signature`
- ✅ AppContext — addKejuruan, deleteUser, importUsers, etc.; removed `(api as any)` casts
- ✅ `DELETE /api/attendance/reset` (admin only)
- ✅ Hall of Fame absent penalty loads `workDays` from attendance_settings
