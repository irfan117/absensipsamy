# Rencana Refactor 01: Dekomposisi Komponen Frontend & UI Reusable

Dokumen ini menjelaskan strategi pemecahan komponen UI yang gemuk (>600 baris) dan ekstraksi komponen reusable di direktori `src/components/`.

---

## 1. Masalah Komponen Saat Ini

| Komponen | Baris | Masalah Utama |
|---|---|---|
| `TraineeManagementView.tsx` | 1.398 | 4 Modal inline (Add User, Add Kejuruan, Import Excel, Mass Delete) + Form State bertumpuk + Tabel |
| `MissionManagementView.tsx` | 1.312 | Tab Misi vs Tab Submission + Modal Add/Edit Mission + Modal Review Submission + Timer refresh 15s |
| `DailyReportView.tsx` | 850 | Kalender/List laporan + Modal review + Form input laporan harian + Upload foto |
| `AdminDashboard.tsx` | 807 | Statistik card + Tabel presensi hari ini + Filter kejuruan + Quick action verifikasi |
| `TraineeDashboard.tsx` | 733 | Card profil + Timer presensi + Upload foto selfie + History ringkasan |
| `MonthlyRecapView.tsx` | 637 | Filter bulan/tahun + Kalkulasi rekap harian + Tabel matriks kehadiran + Tombol export |

---

## 2. Fondasi UI Bersama (`src/components/common/`)

Buat komponen dasar atomik sebelum memecah halaman besar agar kode tidak duplikasi:

### 2.1. `Modal.tsx`
Komponen dialog fleksibel dengan backdrop blur, animasi enter/leave, header dinamis, dan tombol escape/close.
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}
```

### 2.2. `ConfirmDialog.tsx`
Untuk konfirmasi aksi destruktif (hapus peserta, reset poin, tolak izin, tolak laporan).
```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  confirmWordRequired?: string; // misal wajib ketik "HAPUS"
  isDanger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}
```

### 2.3. `StatusBadge.tsx`
Badge warna status yang saat ini gayanya tersebar di dashboard dan tabel:
- Status Presensi: `Hadir`, `Izin`, `Sakit`, `Alpa`, `Terlambat`
- Status Verifikasi: `Menunggu`, `Terverifikasi`, `Ditolak`
- Status Misi & Laporan: `Pending`, `Approved`, `Rejected`

### 2.4. `SearchBar.tsx` & `FilterSelect.tsx`
Input pencarian terpadu dengan ikon search + dropdown filter program kejuruan/role yang seragam.

---

## 3. Rencana Dekomposisi: `TraineeManagementView.tsx` (1.398 → ~180 baris)

### Struktur Baru:
```text
src/components/Trainee/
├── TraineeManagementView.tsx        # Container utama (hanya layout, filter bar, dan pemanggil modal)
├── hooks/
│   ├── useTraineeFilter.ts          # State search, role filter, filter kejuruan, list hasil filter
│   └── useTraineeModals.ts          # State buka/tutup modal & form temporary
├── components/
│   ├── TraineeHeaderActions.tsx     # Tombol: Tambah User, Tambah Kejuruan, Import, Export, Hapus Terpilih
│   ├── TraineeTable.tsx             # Table rendering, checkbox select all, baris user
│   ├── TraineeTableRow.tsx          # Render single row peserta/mentor + copy code/pass + tombol action
│   ├── AddUserModal.tsx             # Modal form tambah akun peserta / mentor
│   ├── AddKejuruanModal.tsx         # Modal form tambah jurusan/program
│   ├── ImportExcelModal.tsx         # File dropzone, parsing file, tabel pratinjau import
│   └── BatchDeleteModal.tsx         # Modal konfirmasi ketik kata kunci untuk hapus massal
```

### Manfaat:
- Form state masing-masing modal terisolasi (tidak memicu re-render seluruh halaman saat mengetik nama user).
- Membaca alur kerja halaman manajemen trainee menjadi sangat mudah dan terfokus.

---

## 4. Rencana Dekomposisi: `MissionManagementView.tsx` (1.312 → ~200 baris)

### Struktur Baru:
```text
src/components/Missions/
├── MissionManagementView.tsx        # Tab switcher (Misi vs Submission), filter bar, container
├── hooks/
│   ├── useMissionAutoRefresh.ts     # Hook timer interval 15 detik + focus window refresh
│   └── useMissionFilter.ts          # Filter berdasarkan kejuruan & tingkat kesulitan
├── components/
│   ├── MissionList.tsx              # Grid daftar kartu misi
│   ├── MissionCard.tsx              # Kartu detail misi individu, tombol aksi edit/delete/submit
│   ├── SubmissionList.tsx           # Tabel/daftar submission dari peserta
│   ├── SubmissionItem.tsx           # Item submission tunggal dengan info link & feedback
│   ├── UpsertMissionModal.tsx       # Modal form tambah / edit misi
│   ├── SubmitWorkModal.tsx          # Modal siswa mengumpulkan tugas & catatan
│   └── ReviewSubmissionModal.tsx    # Modal mentor/admin memeriksa nilai & revisi
```

---

## 5. Rencana Dekomposisi: `DailyReportView.tsx` (850 → ~150 baris)

### Struktur Baru:
```text
src/components/DailyReport/
├── DailyReportView.tsx              # Container
├── hooks/
│   └── useDailyReportFilter.ts      # Filter tanggal & status laporan
├── components/
│   ├── DailyReportList.tsx          # Riwayat laporan harian
│   ├── DailyReportCard.tsx          # Tampilan detail satu laporan + foto bukti
│   ├── SubmitReportModal.tsx        # Form kirim laporan (deskripsi, link, upload foto)
│   └── ReviewReportModal.tsx        # Modal mentor memverifikasi laporan
```

---

## 6. Rencana Dekomposisi: Dashboards (Admin, Mentor, Trainee)

| Komponen Asal | Sub-Komponen yang Diekstrak |
|---|---|
| `AdminDashboard.tsx` (807 baris) | `AdminStatCards.tsx`, `AdminLiveAttendanceTable.tsx`, `AdminPendingLeaveCard.tsx`, `AdminPendingMissionsCard.tsx` |
| `TraineeDashboard.tsx` (733 baris) | `TraineeClockActionCard.tsx` (Jam WIB & tombol presensi), `TraineeTodayStatus.tsx`, `TraineePenaltyInfo.tsx` |
| `MentorDashboard.tsx` (570 baris) | `MentorSummaryCards.tsx`, `MentorTraineeAttendanceList.tsx` |
| `MonthlyRecapView.tsx` (637 baris) | `RecapFilterBar.tsx`, `RecapMatrixTable.tsx`, `RecapExportActions.tsx` |

---

## 7. Metrik Sukses Refactor Komponen
- Tidak ada file view yang memiliki lebih dari 300 baris.
- Setiap modal memiliki file komponen mandiri.
- Semua logika filter dan form state kompleks dipisahkan ke custom hooks.
- Render performance meningkat karena input mengetik di modal tidak me-render ulang tabel di belakangnya.
