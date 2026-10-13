# Peta Fitur Lengkap Aplikasi Absensi PSA (HadirKu)

Dokumen ini memetakan seluruh modul dan fitur aplikasi Absensi PSA pasca-refaktorisasi (frontend atom/modular components, context separation, dan backend routes-controllers-services).

---

## 👥 Matrix Akses Fitur Berdasarkan Role

| No | Modul / Fitur | Trainee (Peserta) | Mentor (Instruktur) | Admin |
|:---:|:---|:---:|:---:|:---:|
| **1** | **Autentikasi & Profil** | | | |
| 1.1 | Login (NIM / Email / Password) | ✅ | ✅ | ✅ |
| 1.2 | Logout & Persistent Session | ✅ | ✅ | ✅ |
| 1.3 | Profil Saya & Ubah Password | ✅ | ✅ | ✅ |
| 1.4 | Ganti Avatar / Foto Profil | ✅ | ✅ | ✅ |
| 1.5 | Dark / Light Theme Toggle | ✅ | ✅ | ✅ |
| **2** | **Dashboard & Presensi Harian** | | | |
| 2.1 | Clock In (Masuk) & Clock Out (Pulang) | ✅ | ✅ | ❌ |
| 2.2 | Deteksi Lokasi (GPS Geofencing / Koordinat) | ✅ | ✅ | ❌ |
| 2.3 | Unggah Foto Bukti Kehadiran (Cloudinary) | ✅ | ✅ | ❌ |
| 2.4 | Status Kehadiran (Hadir / Terlambat / Izin / Alfa) | ✅ | ✅ | ❌ |
| 2.5 | Perhitungan Penalti Poin Keterlambatan Otomatis | ✅ | ✅ | ❌ |
| 2.6 | Ringkasan Statistik Presensi Harian & Bulanan | ✅ | ✅ (Per Kejuruan) | ✅ (Global) |
| 2.7 | Verifikasi / Validasi Kehadiran Peserta | ❌ | ✅ | ✅ |
| **3** | **Pengajuan & Manajemen Izin/Cuti (Leave)** | | | |
| 3.1 | Buat Pengajuan Izin/Sakit/Cuti + Lampiran Dokumen | ✅ | ❌ | ❌ |
| 3.2 | Riwayat Pengajuan Izin Pribadi | ✅ | ❌ | ❌ |
| 3.3 | Review Izin (Setujui / Tolak + Catatan) | ❌ | ✅ (Per Kejuruan) | ✅ (Semua) |
| 3.4 | Filter Status Izin (Pending / Approved / Rejected) | ✅ | ✅ | ✅ |
| **4** | **Laporan Harian (Daily Report)** | | | |
| 4.1 | Submit Laporan Kegiatan Harian + Dokumentasi/Link | ✅ | ❌ | ❌ |
| 4.2 | Riwayat Laporan Harian Pribadi | ✅ | ❌ | ❌ |
| 4.3 | Review Laporan (Approval & Feedback Pembimbing) | ❌ | ✅ (Per Kejuruan) | ✅ (Semua) |
| **5** | **Tugas & Misi (Missions / Gamifikasi)** | | | |
| 5.1 | Lihat Daftar Misi Aktif & Reward Poin | ✅ | ✅ | ✅ |
| 5.2 | Submit Hasil Misi (Link Repository / Hasil Kerja) | ✅ | ❌ | ❌ |
| 5.3 | Buat, Edit, & Hapus Misi Baru | ❌ | ✅ (Per Kejuruan) | ✅ (Semua) |
| 5.4 | Review Submission Misi (Reward / Penalti Poin) | ❌ | ✅ | ✅ |
| **6** | **Peringkat & Gamifikasi (Hall of Fame)** | | | |
| 6.1 | Leaderboard Peserta Berdasarkan Poin | ✅ | ✅ | ✅ |
| 6.2 | Filter Leaderboard per Kejuruan | ✅ | ✅ | ✅ |
| 6.3 | Status Badge / Gelar Peserta Terbaik | ✅ | ✅ | ✅ |
| **7** | **Rekap & Ekspor Data (Monthly Recap)** | | | |
| 7.1 | Rekapitulasi Presensi Bulanan | ❌ | ✅ (Per Kejuruan) | ✅ (Semua) |
| 7.2 | Ekspor Rekap ke Excel (.xlsx) | ❌ | ✅ | ✅ |
| 7.3 | Ekspor Rekap ke PDF / Print Friendly | ❌ | ✅ | ✅ |
| **8** | **Manajemen Peserta & Pengguna (Trainee Management)** | | | |
| 8.1 | Tabel Daftar Pengguna (Search, Filter Kejuruan/Role) | ❌ | ✅ (Read-only) | ✅ (Full CRUD) |
| 8.2 | Tambah Pengguna Baru (Manual) | ❌ | ❌ | ✅ |
| 8.3 | Import Pengguna Massal via Excel | ❌ | ❌ | ✅ |
| 8.4 | Download Template Excel Pengguna | ❌ | ❌ | ✅ |
| 8.5 | Reset Password & Generate Kredensial Baru | ❌ | ❌ | ✅ |
| 8.6 | Hapus Pengguna (Single & Batch Delete by Role) | ❌ | ❌ | ✅ |
| **9** | **Manajemen Kejuruan / Program Pelatihan** | | | |
| 9.1 | Tambah / Edit Kejuruan | ❌ | ❌ | ✅ |
| 9.2 | Assign Mentor ke Kejuruan | ❌ | ❌ | ✅ |
| 9.3 | Pemetaan Canonical Code Kejuruan (SB-04, ST-04, WEB-04)| ❌ | ❌ | ✅ (Sistem) |
| **10**| **Pengaturan Sistem (Settings)** | | | |
| 10.1| Jam Masuk & Batas Keterlambatan Presensi | ❌ | ❌ | ✅ |
| 10.2| Aturan Penalti Keterlambatan (Poin per Menit) | ❌ | ❌ | ✅ |
| 10.3| Aturan Penalti Alfa/Tidak Hadir (Poin per Hari) | ❌ | ❌ | ✅ |
| 10.4| Hari Kerja Aktif (Senin - Jumat / Sabtu) | ❌ | ❌ | ✅ |
| 10.5| Status Konektivitas Database (TiDB Healthcheck) | ❌ | ❌ | ✅ |

---

## 📁 Struktur Navigasi & Tampilan (Views)

```
src/components/
├── Auth/
│   └── LoginView.tsx                   # Layar Login pengguna
├── Dashboard/
│   ├── TraineeDashboard.tsx            # Dashboard utama Peserta
│   ├── MentorDashboard.tsx             # Dashboard utama Pembimbing/Mentor
│   ├── AdminDashboard.tsx              # Dashboard analitik Admin
│   └── components/
│       ├── TraineeClockCard.tsx        # Widget Clock-In/Out Trainee
│       ├── TraineeRecentHistory.tsx    # List presensi terakhir
│       ├── MentorClockCard.tsx         # Widget Clock-In/Out Mentor
│       ├── MentorTraineeTable.tsx      # Monitoring trainee bimbingan
│       └── AdminStatCards.tsx          # Kartu KPI total pengguna & presensi
├── Leave/
│   ├── LeaveManagementView.tsx         # Pusat perizinan & cuti
│   └── components/
│       ├── LeaveForm.tsx               # Formulir permohonan izin baru
│       └── LeaveList.tsx               # Daftar izin & aksi approval
├── DailyReport/
│   ├── DailyReportView.tsx             # Manajemen laporan harian
│   └── components/
│       ├── SubmitReportForm.tsx        # Input laporan harian peserta
│       ├── DailyReportCard.tsx         # Card item laporan
│       └── ReviewReportModal.tsx       # Modal feedback/approval mentor
├── Missions/
│   ├── MissionManagementView.tsx       # Manajemen Misi & Tugas
│   └── components/
│       ├── MissionCard.tsx             # Card informasi tugas
│       ├── SubmissionList.tsx          # Daftar tugas yang dikumpulkan
│       ├── SubmitWorkModal.tsx         # Form kumpul tugas
│       ├── UpsertMissionModal.tsx      # Modal buat/edit misi
│       └── ReviewSubmissionModal.tsx   # Modal grading & poin misi
├── HallOfFame/
│   ├── HallOfFameView.tsx              # Peringkat/Leaderboard Peserta
│   └── MentorHallOfFameView.tsx        # Peringkat tingkat Mentor
├── Recap/
│   └── MonthlyRecapView.tsx            # Rekapitulasi & Ekspor Excel/PDF
├── Trainee/
│   ├── TraineeManagementView.tsx       # Kelola Akun & Peserta
│   └── components/
│       ├── TraineeTable.tsx            # Grid daftar user
│       ├── TraineeTableRow.tsx         # Baris interaktif user
│       ├── TraineeHeaderActions.tsx    # Action bar (Filter, Export, Search)
│       ├── AddUserModal.tsx            # Modal tambah user manual
│       ├── ImportExcelModal.tsx        # Modal import data Excel
│       ├── AddKejuruanModal.tsx        # Modal kelola kejuruan
│       └── BatchDeleteModal.tsx        # Modal hapus massal
├── Settings/
│   └── SettingsView.tsx                # Aturan jam kerja, penalti & koneksi
└── Profile/
    └── ProfileView.tsx                 # Informasi profil, avatar, & password
```
