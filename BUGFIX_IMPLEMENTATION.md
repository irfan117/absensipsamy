# Bug Fix Implementation Plan - bugumentor.md

## Fix 1: Settings Endpoint Alignment ✓
**Change:** Frontend to use `/api/settings` instead of `/api/app-data/settings`
- File: `src/services/api.ts`
- Lines: `saveAttendanceSettings`, `updateSettings`, `resetToDefaultData`

## Fix 2: getKejuruan() Trainee Branch ✓
**Change:** Fix trainee query to use `kejuruanId` not `user.id`
- File: `server/services/data.service.ts`
- Function: `getKejuruan()`

## Fix 3: Attendance Upsert Server-Side Validation ✓
**Change:** Fetch user data from DB, ignore client-provided identity fields
- File: `server/services/data.service.ts`
- Function: `upsertAttendanceRecord()`

## Fix 4: Mission Update Response Shape ✓
**Change:** Return both `mission` and `data` for backward compatibility
- File: `server/controllers/index.ts`
- Function: `missionController.update`

## Fix 5: Hall of Fame Penalty Start Date ✓
**Change:** Add `penalty_start_date` to attendance_settings, make configurable
- Files: Database migration, `server/services/data.service.ts`

## Fix 6: Remove Duplicate usersController ✓
**Change:** Delete unused `usersController.getAll` from controllers
- File: `server/controllers/index.ts`

## Fix 7: Mentor User List Visibility ✓
**Change:** Document current behavior (intentional: mentors don't see other mentors)
- No code change needed - behavior is correct

## Fix 8: Kejuruan Create Safety ✓
**Change:** Remove client-provided ID, use INSERT only (no UPSERT)
- Files: `server/controllers/index.ts`, `server/services/data.service.ts`

## Fix 9: Attendance Reset Safety ✓
**Change:** Add confirmation token requirement
- File: `server/controllers/index.ts`

## Fix 10: Upload Folder Policy ✓
**Change:** Enforce role-based folder prefixing
- File: `server/routes/upload.ts`
