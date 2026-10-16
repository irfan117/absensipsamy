# Technical audit: Mentor & Student (trainee) roles

Scope: API integrity + database functionality for the `mentor` and `trainee` roles (plus role-boundary interactions with `admin` where it affects mentor/student flows). Findings are based on the current code in `server/` and `src/`, and spot-checks against the local MySQL schema (via `.env` credentials).

## System map (role-relevant)

### Key API routes (Express)
- Auth: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PUT /api/auth/kejuruan`, `POST /api/auth/change-password` (see `server/routes/auth.ts`).
- Users: `GET /api/users` (admin+mentor), plus admin-only management endpoints (see `server/routes/users.ts`).
- Kejuruan: `GET/POST/PUT/DELETE /api/kejuruan` (see `server/routes/kejuruan.ts` + controller/service).
- Attendance: `GET/POST /api/attendance`, `DELETE /api/attendance/reset` (admin-only) (see `server/routes/attendance.ts`).
- Leaves: `GET/POST /api/leaves`, `PATCH /api/leaves/:id/review` (mentor/admin review) (see `server/routes/leave.ts`).
- Missions: `GET/POST/PATCH/DELETE /api/missions`, `POST /api/missions/:id/submit` (trainee), `PATCH /api/missions/submissions/:id/review` (mentor/admin) (see `server/routes/missions.ts`).
- Daily reports: `GET/POST /api/daily-reports`, `PATCH /api/daily-reports/:id/review` (mentor/admin) (see `server/routes/daily-reports.ts`).
- Settings: `GET/PUT /api/settings` (GET all authed; PUT admin-only) (see `server/routes/settings.ts`).
- Profile: `PUT /api/profile/avatar` (any authed user) (see `server/routes/profile.ts`).
- Upload: `POST /api/upload/signature` (any authed user) (see `server/routes/upload.ts`).

### DB tables touched by mentor/trainee flows
- `users` (role, kejuruan assignment, avatar, login_code, password_hash)
- `kejuruan` (mentor ownership + program grouping)
- `attendance_records`, `attendance_settings`
- `leave_requests`
- `missions`, `mission_submissions`
- `daily_reports`

Local schema verification (MySQL):
- `mission_submissions` contains `points` (not `awarded_points`).
- `attendance_settings` contains `work_days` and `office_location`.

---

## Analysis of findings

### 1) Broken API contract: settings save endpoint mismatch (`/api/app-data/settings` vs `/api/settings`)
**Impact:** High (mentor & trainee cannot reliably load/save settings; admin cannot save settings from UI contexts that use the wrong endpoint).

- Frontend `api.saveAttendanceSettings()` sends `PUT /api/app-data/settings`.
- Backend exposes settings at `GET/PUT /api/settings` only.
- Result: `saveAttendanceSettings`, `updateSettings`, and `resetToDefaultData` will 404 (or hit a different handler if `appDataRouter` happens to match, but current server search shows no `/settings` under `/api/app-data`).

Evidence:
- Frontend: `src/services/api.ts`:
  - `saveAttendanceSettings(settings)` -> `PUT /api/app-data/settings`
  - `getSettings()` -> `GET /api/settings`
- Backend: `server/routes/settings.ts` registers `router.put('/', settingsController.update)` under `/api/settings`.
- Backend: no match for `app-data/settings` in `server/`.

Role relevance:
- Mentors/trainees call `GET /api/settings` (works) but any UI path that calls `saveAttendanceSettings` will fail.

---

### 2) Mentor visibility bug: `getKejuruan()` returns wrong rows for trainees (and can affect mentor-scoped queries indirectly)
**Impact:** Medium (trainee may see incorrect kejuruan list; mentor-scoped logic that depends on kejuruan names/IDs can become inconsistent).

In `server/services/data.service.ts`, `getKejuruan()` uses `scope = role === 'trainee' ? user.id : ...` but then queries `SELECT * FROM kejuruan WHERE id = ?` using `user.kejuruanId` in params. This mixes `user.id` and `user.kejuruanId` and can return empty or wrong results.

Evidence:
- `getKejuruan(role, user)`:
  - `const scope = ... : role === 'trainee' ? user.id;`
  - Later for non-admin/non-mentor: `WHERE id = ?` with params `[user.kejuruanId || '', ...]`.

Role relevance:
- Trainees likely rely on kejuruan list for mission filtering and UI labels.

---

### 3) Mentor authorization gap: `attendanceController.upsert` trusts client-provided `userRole`, `userName`, `userNim`, `kejuruanId`, `kejuruanName`
**Impact:** High (mentor can write attendance records for trainees in allowed programs, but can also spoof identity fields and kejuruan metadata; trainee can spoof their own record fields too).

The upsert path uses `userId` derived from role checks, but the inserted record uses many fields directly from `req.body` (e.g., `record.userRole`, `record.userName`, `record.userNim`, `record.kejuruanId`, `record.kejuruanName`). This allows a mentor (or trainee for self) to submit inconsistent data that does not match the `users` table.

Evidence:
- Controller: `server/controllers/index.ts` passes `req.body.userRole`, `req.body.userName`, etc. into `upsertAttendanceRecord`.
- Service: `upsertAttendanceRecord` inserts `user_name`, `user_nim`, `user_role`, `kejuruan_id`, `kejuruan_name` from the record payload.

Role relevance:
- Mentors editing trainee attendance could accidentally or maliciously corrupt reporting fields.

---

### 4) Mentor mission update restriction is correct, but API response shape may break existing clients
**Impact:** Medium (mentor/admin UI may expect `data` instead of `mission`, depending on older code paths).

`missionController.update` returns `{ success: true, mission: result }` for both mentor and admin paths. If older frontend expects `{ data: ... }`, it will break.

Evidence:
- `server/controllers/index.ts` mission update returns `mission`.
- Frontend `api.updateMission()` expects `{ success, message }` only, so it ignores returned mission; other callers might not.

Role relevance:
- Mentors updating missions may not see updated mission reflected unless UI refreshes.

---

### 5) Hall of Fame trainee penalty calculation uses hard-coded start date and may miscount for older cohorts
**Impact:** Medium (trainee ranking correctness).

`buildExemptDates('2026-10-01', today)` and `ABSENT_PENALTY_START_DATE = '2026-10-01'` are hard-coded. Trainees who joined before that date will never be penalized before that date, which may be intended but should be configurable.

Evidence:
- `server/services/data.service.ts`: `buildExemptDates('2026-10-01', today)` and `computeAbsentPenalty` constant.

Role relevance:
- Trainee leaderboard correctness.

---

### 6) Users list endpoint duplication: `usersController.getAll` exists but is unused; `/api/users` uses `server/routes/users.ts`
**Impact:** Low/Medium (maintenance + risk of divergence; mentor/student behavior depends on which endpoint is wired).

There are two implementations for listing users:
- `server/controllers/index.ts` exports `usersController.getAll` with different selection logic.
- `server/routes/users.ts` implements `GET /` directly.

Evidence:
- `server/index.ts` mounts `usersRoutes` not `usersController`.

Role relevance:
- Mentors rely on user list scoping; duplicated logic increases chance of future regressions.

---

### 7) Mentor scoping for user list: mentors can see themselves + trainees in their kejuruan, but not other mentors in same kejuruan
**Impact:** Medium (may be intended; if not, it’s a functional gap).

`GET /api/users` for mentors returns:
- `id = mentor.id` OR `(role='trainee' AND kejuruan_id IN (SELECT id FROM kejuruan WHERE mentor_id = ? OR id = ?))`.
This excludes other mentors assigned to the same kejuruan (if such a concept exists).

Evidence:
- `server/routes/users.ts` mentor query.

Role relevance:
- Mentor collaboration/visibility.

---

### 8) Data integrity risk: `createKejuruan` uses `ON DUPLICATE KEY UPDATE` and accepts client-provided `id`
**Impact:** High (admin can unintentionally overwrite existing kejuruan by reusing an ID; mentors/students are blocked at controller level, but admin mistakes are still possible).

The controller now accepts `id` from request body and passes it to `createKejuruan`. The service generates an ID if missing, but if provided and collides, it will update the existing row.

Evidence:
- `server/controllers/index.ts` kejuruan create destructures `id` from body.
- `server/services/data.service.ts` `INSERT ... ON DUPLICATE KEY UPDATE ...`.

Role relevance:
- Mentors/trainees depend on kejuruan mapping; accidental overwrite breaks their assignments.

---

### 9) Attendance reset endpoint is destructive and not transactional; no audit trail
**Impact:** Medium (admin-only, but affects mentor/student data availability and trust).

`DELETE FROM attendance_records` wipes all attendance without confirmation token, soft-delete, or backup. If called accidentally, mentor/student history is lost.

Evidence:
- `server/controllers/index.ts` `attendanceController.reset`.

Role relevance:
- Mentors lose ability to review attendance; trainees lose history.

---

### 10) Cloudinary signature endpoint: folder sanitization is good, but no role-based folder policy
**Impact:** Low/Medium (trainees can request signatures for arbitrary folders under allowed charset; could clutter storage).

Any authenticated user can request a signature for any sanitized folder. If you want separation (mentor vs trainee), enforce folder prefixing.

Evidence:
- `server/routes/upload.ts` allows any authed user.

Role relevance:
- Trainees can upload into mentor/admin folders if naming overlaps.

---

## Recommended resolutions

### Fix 1: Align settings endpoints
- Option A (recommended): Change frontend `saveAttendanceSettings` to call `PUT /api/settings` and update `resetToDefaultData` accordingly.
- Option B: Add backend route `PUT /api/app-data/settings` that proxies to `updateAttendanceSettings` (but avoid duplicating logic).

### Fix 2: Correct `getKejuruan()` trainee branch
- For `role === 'trainee'`, query by `user.kejuruanId` only (not `user.id`), and remove the confusing `scope` variable for trainee.

### Fix 3: Enforce server-side canonical attendance fields
- In `upsertAttendanceRecord`, fetch `users` row for `userId` and derive `user_name`, `user_nim`, `user_role`, `kejuruan_id`, `kejuruan_name` from DB, ignoring client-provided values (except fields that are truly user-entered like notes/photo).

### Fix 4: Stabilize API response shapes
- Standardize responses (`{ success, data: ... }` or `{ success, <entity>: ... }`) and update frontend callers accordingly; add backward-compatible aliases temporarily if needed.

### Fix 5: Make Hall of Fame penalty start date configurable
- Move `ABSENT_PENALTY_START_DATE` into `attendance_settings` or an env var; ensure `buildExemptDates` uses the same configured start.

### Fix 6: Remove or wire `usersController.getAll`
- Delete unused controller or refactor routes to use controllers consistently to avoid divergence.

### Fix 7: Decide mentor visibility rules explicitly
- If mentors should see other mentors in their kejuruan, extend the mentor query in `GET /api/users` accordingly.

### Fix 8: Prevent accidental kejuruan overwrite
- Do not accept `id` from client for create; generate server-side UUIDs.
- Replace `ON DUPLICATE KEY UPDATE` with a plain insert and return 409 on duplicate.

### Fix 9: Safer attendance reset
- Require an explicit confirmation token/body flag, log the actor, and consider soft-delete or archival table.

### Fix 10: Upload folder policy
- Enforce folder prefix per role (e.g., `trainee/<userId>/...`, `mentor/<userId>/...`) and ignore client-provided folder beyond a safe suffix.
