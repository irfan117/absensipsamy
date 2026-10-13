# Rencana Refactor 04: Roadmap Implementasi, Checklist & Strategi Pengujian

Dokumen ini adalah panduan operasional langkah demi langkah (*step-by-step implementation guide*) untuk menjalankan refactoring secara bertahap tanpa downtime dan tanpa regresi fungsional.

---

## 1. Urutan & Timeline Tahapan

```text
[Sprint 1] Fondasi UI Bersama & Trainee Management (Quick Wins)
   │
   ▼
[Sprint 2] Dekomposisi Halaman Misi & Laporan Harian
   │
   ▼
[Sprint 3] Dekomposisi AppContext (State Management Domain)
   │
   ▼
[Sprint 4] Restrukturisasi Server Express (Controller & Service)
```

---

## 2. Rincian Checklist Pekerjaan

### Sprint 1: UI Atoms & Refactor `TraineeManagementView.tsx`
- [ ] Buat folder `src/components/common/`
- [ ] Implementasikan `src/components/common/Modal.tsx`
- [ ] Implementasikan `src/components/common/ConfirmDialog.tsx`
- [ ] Implementasikan `src/components/common/StatusBadge.tsx`
- [ ] Buat folder `src/components/Trainee/components/`
  - [ ] Ekstrak `AddUserModal.tsx`
  - [ ] Ekstrak `AddKejuruanModal.tsx`
  - [ ] Ekstrak `ImportExcelModal.tsx`
  - [ ] Ekstrak `BatchDeleteModal.tsx`
  - [ ] Ekstrak `TraineeTable.tsx` dan `TraineeTableRow.tsx`
- [ ] Rampingkan `TraineeManagementView.tsx` hingga < 200 baris
- [ ] Uji fungsionalitas:
  - Tambah peserta & mentor manual
  - Import peserta dari file Excel
  - Copy kredensial kode login & password
  - Hapus peserta satu per satu dan hapus massal

### Sprint 2: Dekomposisi `MissionManagementView.tsx` & `DailyReportView.tsx`
- [ ] Buat folder `src/components/Missions/components/`
  - [ ] Ekstrak `UpsertMissionModal.tsx`
  - [ ] Ekstrak `SubmitWorkModal.tsx`
  - [ ] Ekstrak `ReviewSubmissionModal.tsx`
  - [ ] Ekstrak `MissionCard.tsx` & `MissionList.tsx`
  - [ ] Ekstrak `SubmissionList.tsx`
- [ ] Buat hook `src/components/Missions/hooks/useMissionAutoRefresh.ts`
- [ ] Rampingkan `MissionManagementView.tsx` hingga < 250 baris
- [ ] Buat folder `src/components/DailyReport/components/`
  - [ ] Ekstrak `SubmitReportModal.tsx`
  - [ ] Ekstrak `ReviewReportModal.tsx`
  - [ ] Ekstrak `DailyReportCard.tsx`
- [ ] Rampingkan `DailyReportView.tsx` hingga < 200 baris
- [ ] Uji fungsionalitas:
  - Mentor membuat misi baru & edit misi
  - Peserta upload link submission
  - Mentor memberi nilai/poin & review
  - Upload laporan harian dan verifikasi

### Sprint 3: Modularisasi Context State Management
- [ ] Buat `src/context/AuthContext.tsx`
- [ ] Buat `src/context/UserContext.tsx`
- [ ] Buat `src/context/AttendanceContext.tsx`
- [ ] Buat `src/context/LeaveContext.tsx`
- [ ] Buat `src/context/MissionContext.tsx`
- [ ] Buat `src/context/DailyReportContext.tsx`
- [ ] Ubah `src/context/AppContext.tsx` menjadi Facade Provider
- [ ] Verifikasi tidak ada circular dependency
- [ ] Uji alur aplikasi:
  - Login via Kode & Login Admin
  - Presensi Masuk / Keluar (Clock in / out)
  - Ajukan Izin / Sakit
  - Periksa nilai Hall of Fame

### Sprint 4: Restrukturisasi Backend Express
- [ ] Buat folder `server/controllers/`, `server/services/`, `server/routes/`, `server/middlewares/`
- [ ] Pindahkan otentikasi JWT ke `server/middlewares/authMiddleware.ts`
- [ ] Ekstrak modul User & Kejuruan ke `userController.ts` & `userService.ts`
- [ ] Ekstrak modul Presensi & Keterlambatan ke `attendanceController.ts` & `attendanceService.ts`
- [ ] Ekstrak modul Misi & Laporan ke controller/service masing-masing
- [ ] Rampingkan `server/index.ts` hanya untuk inisialisasi Express & mounting router
- [ ] Uji endpoint dengan `npm run dev:all` dan verifikasi koneksi TiDB / MySQL

---

## 3. Strategi Pengujian & Safeguard (Pencegahan Regresi)

1. **Type Checking Sebelum Commit**:
   Jalankan pemeriksaan TypeScript secara berkala:
   ```bash
   npm run lint
   # atau
   npx tsc --noEmit
   ```
2. **Uji Build Produksi**:
   Pastikan bundling Vite tidak mengalami circular dependency atau error sintaks:
   ```bash
   npm run build
   ```
3. **Manual Smoke Testing Matrix**:
   | Fitur | Role yang Diuji | Yang Harus Dicek |
   |---|---|---|
   | Autentikasi | Admin / Mentor / Trainee | Login berhasil, cookie/token tersimpan, sesi tidak logout saat refresh |
   | Presensi | Trainee | Lokasi GPS terbaca, foto selfie terupload, status terlambat akurat |
   | Verifikasi Presensi | Mentor / Admin | Status presensi bisa diverifikasi / ditolak dengan catatan |
   | Misi & Gamifikasi | Mentor & Trainee | Misi baru muncul realtime, poin terakumulasi di Hall of Fame |
   | Pengajuan Izin | Trainee & Mentor | Form izin/sakit tersimpan, kuota/tanggal terhitung di rekap |
   | Manajemen User | Admin | Export Excel, template import, generate kode 8 digit |

---

## 4. Definisi Selesai (*Definition of Done*)
Sebuah tahap refactoring dianggap selesai jika:
1. Tidak ada file komponen UI atau server handler yang melebihi 300 baris.
2. Kode baru menerapkan prinsip modularitas (sub-komponen & hooks terpisah).
3. `npm run lint` (`tsc --noEmit`) dan `npm run build` sukses tanpa error.
4. Fitur terkait berfungsi 100% identik dengan sebelum di-refactor.
