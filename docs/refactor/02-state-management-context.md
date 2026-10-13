# Rencana Refactor 02: Modularisasi State Management (Context & Custom Hooks)

Dokumen ini menguraikan pemecahan `src/context/AppContext.tsx` (1.428 baris) menjadi modul-modul Context dan Custom Hooks berbasis domain bisnis.

---

## 1. Analisis Masalah `AppContext.tsx`

Saat ini, `AppContext` berperan sebagai **God Object**:
- Mengelola lebih dari 25 state global (`users`, `attendanceRecords`, `leaveRequests`, `missions`, `dailyReports`, `settings`, `activeTab`, `jwtToken`, `tidbStatus`, dll).
- Mengelola lebih dari 30 function mutation yang berinteraksi langsung ke `api`.
- Menyebabkan **unnecessary re-renders**: Jika terjadi polling `refreshMissions()` setiap 15 detik, komponen yang hanya butuh data presensi atau profil ikut terpengaruh re-render.
- Membaca dan melacak bug di file 1.400 baris sangat memakan waktu.

---

## 2. Arsitektur Domain Context Baru

State dipecah berdasarkan batas domain (*domain boundaries*):

```text
src/context/
├── AuthContext.tsx           # Sesi login, token, user aktif, ganti password
├── UserContext.tsx           # Data master user & master kejuruan
├── AttendanceContext.tsx     # Presensi harian, check-in, check-out, verifikasi presensi
├── LeaveContext.tsx          # Pengajuan izin/sakit & persetujuan mentor/admin
├── MissionContext.tsx        # Daftar misi, tugas siswa, review submission, poin
├── DailyReportContext.tsx    # Laporan harian kegiatan siswa & verifikasi
├── SettingsContext.tsx       # Jam masuk, koordinat kantor, toleransi terlambat
└── AppContext.tsx            # Facade Provider (Penyatuan backward-compatible)
```

---

## 3. Detail Pembagian Domain

### 3.1. `AuthContext.tsx`
- **Tanggung Jawab**: Autentikasi dan sesi user saat ini.
- **State**:
  - `currentUser: User | null`
  - `isAuthenticated: boolean`
  - `authReady: boolean`
  - `jwtToken: string | null`
- **Actions**:
  - `loginWithCode(code, password)`
  - `loginWithAdmin(identifier, password)`
  - `logout()`
  - `changePassword(current, new)`
  - `updateMyAvatar(avatar)`

### 3.2. `UserContext.tsx`
- **Tanggung Jawab**: Manajemen user (Trainee/Mentor/Admin) dan data program Kejuruan.
- **State**:
  - `users: User[]`
  - `kejuruanList: Kejuruan[]`
- **Actions**:
  - `refreshUsers()`
  - `addUser(userData)`
  - `updateUser(id, updates)`
  - `deleteUser(id)`
  - `deleteUsersByRole(role)`
  - `deleteTraineesByIds(ids)`
  - `addKejuruan(kjData)`
  - `importUsers(usersList)`
  - `regenerateUserCredentials(id)`

### 3.3. `AttendanceContext.tsx`
- **Tanggung Jawab**: Presensi waktu-nyata, GPS, selfie, verifikasi mentor.
- **State**:
  - `attendanceRecords: AttendanceRecord[]`
  - `latePenaltyPoints: (userId: string) => number`
  - `absentPenaltyPoints: (userId: string) => number`
- **Actions**:
  - `clockIn(notes, photoUrl, coords, workMode)`
  - `clockOut(notes, coords)`
  - `getTodayRecordForUser(userId)`
  - `verifyAttendance(recordId, status, reason)`
  - `manualAddOrUpdateAttendance(...)`
  - `resetAttendanceRecords()`

### 3.4. `LeaveContext.tsx`
- **Tanggung Jawab**: Form permohonan izin/sakit dan persetujuan.
- **State**:
  - `leaveRequests: LeaveRequest[]`
- **Actions**:
  - `submitLeaveRequest(...)`
  - `reviewLeaveRequest(id, status, notes)`

### 3.5. `MissionContext.tsx`
- **Tanggung Jawab**: Penugasan misi dan kalkulasi gamifikasi poin.
- **State**:
  - `missions: Mission[]`
  - `missionSubmissions: MissionSubmission[]`
- **Actions**:
  - `refreshMissions()`
  - `addMission(missionData)`
  - `updateMission(id, updates)`
  - `deleteMission(id)`
  - `submitMissionWork(data)`
  - `reviewMissionSubmission(id, status, feedback, points)`
  - `getUserPoints(userId)`
  - `resetTraineeHallOfFamePoints()`
  - `resetMentorMissionData()`

### 3.6. `DailyReportContext.tsx`
- **Tanggung Jawab**: Laporan harian magang/pelatihan.
- **State**:
  - `dailyReports: DailyReport[]`
- **Actions**:
  - `submitDailyReport(...)`
  - `reviewDailyReport(...)`

---

## 4. Pola Facade untuk Transisi Aman (*Backward Compatibility*)

Agar kode yang sudah ada tidak rusak dan tidak perlu mengubah ratusan file sekaligus, `AppContext.tsx` dipertahankan sebagai **Facade Composer**:

```tsx
// src/context/AppContext.tsx (setelah refactor ~60 baris)
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { UserProvider, useUsers } from './UserContext';
import { AttendanceProvider, useAttendance } from './AttendanceContext';
import { LeaveProvider, useLeave } from './LeaveContext';
import { MissionProvider, useMissions } from './MissionContext';
import { DailyReportProvider, useDailyReports } from './DailyReportContext';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <UserProvider>
        <AttendanceProvider>
          <LeaveProvider>
            <MissionProvider>
              <DailyReportProvider>
                {children}
              </DailyReportProvider>
            </MissionProvider>
          </LeaveProvider>
        </AttendanceProvider>
      </UserProvider>
    </AuthProvider>
  );
};

// Facade Hook: Menyatukan domain hooks sehingga komponen lama tetap jalan:
export const useApp = () => {
  return {
    ...useAuth(),
    ...useUsers(),
    ...useAttendance(),
    ...useLeave(),
    ...useMissions(),
    ...useDailyReports(),
  };
};
```

### Keuntungan:
1. Komponen baru atau komponen yang di-refactor bisa langsung menggunakan hook spesifik: misal `const { missions } = useMissions()`.
2. Komponen lama yang masih memanggil `useApp()` tetap berjalan normal tanpa error kompilasi.
3. Migrasi dapat dilakukan per file secara bertahap.
