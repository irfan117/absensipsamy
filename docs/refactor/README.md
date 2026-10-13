# Rencana Induk Refactoring Arsitektur Project (Hadirku / Absensi PSA)

## 1. Latar Belakang & Masalah Utama
Project ini berkembang pesat dengan fitur lengkap (Presensi, Izin, Misi, Laporan Harian, Hall of Fame, Manajemen Peserta/Mentor, Ekspor Laporan). Namun, terjadi akumulasi "kode gemuk" (*bloated/monolithic files*) yang menyulitkan pemeliharaan:

- **Frontend Context Terlalu Besar**: `src/context/AppContext.tsx` (1.428 baris) menangani semua domain data, UI tab, autentikasi, dan kalkulasi sekaligus.
- **Komponen Halaman Raksasa**:
  - `TraineeManagementView.tsx` (1.398 baris)
  - `MissionManagementView.tsx` (1.312 baris)
  - `DailyReportView.tsx` (850 baris)
  - `AdminDashboard.tsx` (807 baris)
  - `TraineeDashboard.tsx` (733 baris)
  - `MonthlyRecapView.tsx` (637 baris)
- **Backend Monolitik**: `server/index.ts` (1.315 baris) dan `server/appData.ts` (887 baris) menggabungkan route handler, query SQL mentah, enkripsi, dan validasi tanpa pemisahan controller/service.
- **Duplikasi Logika**: Kalkulasi pinalti dan kode kejuruan dibuat ganda di backend dan frontend.

---

## 2. Sasaran Refactoring
1. **Modular**: Setiap modul/komponen bertanggung jawab pada 1 tugas spesifik (*Single Responsibility Principle*). Batas ideal komponen UI < 250 baris.
2. **Reusable**: Ekstraksi komponen UI atomik (Modal, Status Badge, Table, Confirm Dialog) dan custom hooks agar tidak menulis ulang kode serupa.
3. **Zero Regression**: Refactor dilakukan secara bertahap tanpa mengubah behavior, struktur database, atau merusak endpoint API yang ada.
4. **Gradual Migration**: Mempertahankan backward compatibility (misal: Facade Pattern pada Context) agar kode yang belum di-refactor tetap berjalan normal.

---

## 3. Struktur Dokumen Perencanaan
Dokumen rencana refactor dibagi menjadi beberapa file modular di folder `docs/refactor/`:

| File | Fokus Bahasan |
|---|---|
| [`01-frontend-components.md`](./01-frontend-components.md) | Dekomposisi komponen view raksasa, ekstraksi sub-komponen, modal, dan UI atoms |
| [`02-state-management-context.md`](./02-state-management-context.md) | Dekomposisi `AppContext.tsx` menjadi domain context & hook facade |
| [`03-backend-restructuring.md`](./03-backend-restructuring.md) | Refactoring backend Express menjadi pola Routes - Controllers - Services |
| [`04-implementation-roadmap.md`](./04-implementation-roadmap.md) | Urutan rilis, timeline fase, checklist verifikasi, dan strategi testing |

---

## 4. Ringkasan 4 Fase Eksekusi

```text
[FASE 1: UI Atoms & Quick Wins]
  ├── Bikin komponen bersama (Modal, Badge, ConfirmDialog, TableHeader)
  └── Pecah TraineeManagementView.tsx ke sub-modal & tabel terpisah
        │
[FASE 2: Dekomposisi Komponen View Kompleks]
  ├── Pecah MissionManagementView.tsx (Missions List, Submissions, Review Modal)
  ├── Pecah DailyReportView.tsx & Dashboard views
  └── Ekstraksi Custom Hooks untuk query/filter
        │
[FASE 3: Modularisasi State Management (Context)]
  ├── Buat AuthContext, AttendanceContext, MissionContext, UserContext, LeaveContext
  └── Rampingkan AppContext.tsx menjadi Facade Provider
        │
[FASE 4: Restrukturisasi Backend Express]
  ├── Ekstrak route dari server/index.ts & server/appData.ts
  └── Pisahkan layer Controllers dan Services
```

---

## 5. Kaidah & Standar Koding Baru
- **Maksimal baris file**: Usahakan file komponen UI maksimal 200–250 baris.
- **Pemisahan Logika & Tampilan**: Tempatkan state rumit, efek samping (useEffect), dan kalkulasi memoized dalam *custom hook* (`use...`).
- **Komponen Presentasional**: Komponen anak hanya menerima `props` murni tanpa menyentuh langsung Context jika memungkinkan, agar mudah diuji dan digunakan ulang.
