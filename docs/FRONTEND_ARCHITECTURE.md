# Arsitektur Frontend & State Management Pasca-Refactor

Dokumen ini menjelaskan arsitektur komponen frontend dan pemisahan state management menggunakan pola **Domain Contexts** dan **Facade Composer Pattern** sesuai Dokumen Refactor 01 dan 02.

---

## 🏛️ Pola State Management (Context Architecture)

Sebelum refaktor, seluruh state (otentikasi, presensi, cuti, misi, laporan, pengaturan, dan user) bertumpuk dalam satu file monolitik `AppContext.tsx` (>1200 baris).

Setelah refaktor, state dipecah ke dalam **7 Domain Contexts**:

```
src/context/
├── AuthContext.tsx         # Token, currentUser, login, logout, refresh
├── UserContext.tsx         # users list, addUser, importExcel, deleteUsers
├── AttendanceContext.tsx   # clockIn, clockOut, presensi harian, riwayat
├── LeaveContext.tsx        # leaveRequests, submitLeave, reviewLeave
├── MissionContext.tsx      # missions, submissions, upsertMission, review
├── DailyReportContext.tsx  # dailyReports, submitReport, reviewReport
├── SettingsContext.tsx     # workHours, latePenalty, activeDays, tidbStatus
├── ThemeContext.tsx        # dark/light mode toggle
└── AppContext.tsx          # 🎭 FACADE COMPOSER (Backward-Compatibility)
```

### Diagram Alur Data State:

```
[ App.tsx ]
   │
   ▼
[ AppProvider (Composer) ]
   ├── <AuthProvider>
   ├── <UserProvider>
   ├── <AttendanceProvider>
   ├── <LeaveProvider>
   ├── <MissionProvider>
   ├── <DailyReportProvider>
   └── <SettingsProvider>
          │
          ▼
   [ useApp() Facade ]  ◀── Menyatukan semua domain hook
          │
          ├── Dashboard Views (Trainee / Mentor / Admin)
          ├── Management Views (Missions, Leaves, Reports)
          └── Shared Components (Sidebar, Header, Modals)
```

### Keuntungan Pola Facade:
1. **Zero Regression pada Consumer**: Lebih dari 50 komponen yang sudah menggunakan `useApp()` tidak perlu diubah pemanggilan hook-nya.
2. **Modular saat dibutuhkan**: Komponen baru atau komponen yang dioptimasi dapat mengimpor hook domain spesifik (misal `useAttendance()`) untuk mencegah re-render yang tidak perlu.

---

## 🧩 Dekonstruksi Komponen Tampilan (Atomic & Sub-components)

Setiap tampilan dashboard dan form besar dipecah menjadi modul kecil:

### 1. Dashboard Peserta (`TraineeDashboard.tsx`)
- Dari **>800 baris** menjadi **308 baris**
- **Sub-komponen**:
  - `TraineeClockCard.tsx`: Menangani tombol Clock-in / Clock-out, preview webcam/kamera, status geolokasi GPS, dan timer real-time.
  - `TraineeRecentHistory.tsx`: Menampilkan tabel riwayat presensi 7 hari terakhir beserta status verifikasi.

### 2. Dashboard Mentor (`MentorDashboard.tsx`)
- Dari **>570 baris** menjadi **268 baris**
- **Sub-komponen**:
  - `MentorClockCard.tsx`: Presensi mandiri mentor.
  - `MentorTraineeTable.tsx`: Panel monitoring status kehadiran anak asuh per kejuruan hari ini.

### 3. Manajemen Izin/Cuti (`LeaveManagementView.tsx`)
- Dari **~389 baris** menjadi **125 baris**
- **Sub-komponen**:
  - `LeaveForm.tsx`: Modal form pengajuan izin (tipe izin, tanggal mulai/akhir, upload surat dokter/surat permohonan).
  - `LeaveList.tsx`: Grid kartu izin dengan action button untuk approval (setujui/tolak) mentor.

### 4. Manajemen Misi (`MissionManagementView.tsx`)
- Dipecah menjadi:
  - `MissionCard.tsx`: Item kartu info misi, reward poin, batas waktu.
  - `SubmissionList.tsx`: Daftar submission tugas yang masuk dari siswa.
  - `SubmitWorkModal.tsx`: Form upload link pekerjaan bagi peserta.
  - `UpsertMissionModal.tsx`: Modal buat/edit misi untuk instruktur.
  - `ReviewSubmissionModal.tsx`: Modal penilai tugas dan reward poin.

### 5. Manajemen Laporan Harian (`DailyReportView.tsx`)
- Dipecah menjadi:
  - `SubmitReportForm.tsx`: Form input aktivitas kerja harian dan dokumentasi foto.
  - `DailyReportCard.tsx`: List feed laporan harian peserta.
  - `ReviewReportModal.tsx`: Modal feedback review instruktur.

### 6. Manajemen Pengguna (`TraineeManagementView.tsx`)
- Dipecah menjadi:
  - `TraineeTable.tsx` & `TraineeTableRow.tsx`: Tabel data pengguna.
  - `TraineeHeaderActions.tsx`: Action bar filter kejuruan, search bar, dan tombol export.
  - `AddUserModal.tsx`, `ImportExcelModal.tsx`, `AddKejuruanModal.tsx`, `BatchDeleteModal.tsx`.
