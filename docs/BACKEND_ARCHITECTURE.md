# Arsitektur Backend & Modularisasi Layanan (REST API) Pasca-Refactor

Dokumen ini menjelaskan struktur backend aplikasi Absensi PSA setelah diverifikasi dari monolit menjadi pola modular **Routes - Controllers - Services - Middlewares** sesuai Dokumen Refactor 03.

---

## 📁 Struktur Direktori Server (Layered Architecture)

```
/server/
├── index.ts              # 🚀 Entry Point Modular (Panggil Route Definisi)
├── config/
│   └── index.ts          # ⚙️ TiDB Pool Konfigurasi + Pool Management
├── middlewares/
│   └── auth.ts           # 🛡️ Middleware Otentikasi & Authorisasi Role
├── routes/
│   ├── kejuruan.ts       # Routes: /api/kejuruan
│   ├── attendance.ts     # Routes: /api/attendance (clock in/out)
│   ├── leave.ts          # Routes: /api/leave (izin/cuti)
│   ├── missions.ts       # Routes: /api/missions (tugas & gamefikasi)
│   ├── daily-reports.ts  # Routes: /api/daily-reports (laporan harian)
│   ├── settings.ts       # Routes: /api/settings (aturan sistem)
│   └── hall-of-fame.ts   # Routes: /api/hall-of-fame (leaderboard)
├── controllers/
│   └── index.ts          # 🎯 Express Controllers per Domain
├── services/
│   ├── data.service.ts   # 💾 SQL Queries & Business Logic (Core Layer)
│   └── auth.service.ts   # 🔐 Auth & JWT Token Services
├── utils/
│   └── late-penalty.ts   # ⏱️ Util: Penalty Calculation + Kejuruan Canonical Codes
└── utils/
    └── kejuruan-codes.ts # ⚠️ (Dipotong/Merge ke late-penalty.ts)
```

### Deskripsi Setiap Lantai:

| Lantai | Tanggung Jawab | File Kunci |
|:---:|---|---|
| **Router Layer** | Mendefinisikan endpoint URL + routing | `server/routes/*.ts` |
| **Controller Layer** | Mendefinisikan handler request, validasi input, format response | `server/controllers/index.ts` |
| **Service Layer** | Logika bisnis, eksekusi query SQL, operasi CRUD | `server/services/data.service.ts` |
| **Utilities** | Fungsi penunjang: kalkulasi, kanonisasi kode, format date | `server/utils/late-penalty.ts` |
| **Config** | Koneksi ke database TiDB (pool mysql2), environment management | `server/config/index.ts` |
| **Middlewares** | Otentikasi JWT, cek role, error handling standar | `server/middlewares/auth.ts` |

---

## 🛠️ Flow Request: CRUD Contoh (Mission Submission)

```
Client HTTP Request
     │
     ▼
[ Auth Middleware ] → Validasi JWT Token → { userId, role, kejuruanId }
     │
     ▼
[ Route Definisi ] → `POST /api/missions/:missionId/submissions`
     │
     ▼
[ Mission Controller ] → Parsing input, panggil service method
     │
     ▼
[ Data Service (SQL) ] → INSERT/UPDATE/SELECT ke TiDB
     │
     ▼
[ Response Format JSON ]
     │
     ▼
[ HTTP Response to Client ]
```

---

## 📊 Rute API Endpoint (7 File Route)

| No | File Route | Prefix | Method | Deskripsi Fitur |
|:---:|---|---|---|---|
| **1** | `server/routes/kejuruan.ts` | `/api/kejuruan` | GET | Daftar kejuruan berdasarkan role (filter mentee/mentor/admin) |
| **2** | `server/routes/attendance.ts` | `/api/attendance` | POST | Clock in / Clock out (body: checkInTime, GPS coords) |
| **3** | `server/routes/leave.ts` | `/api/leave` | POST/GET | Submit review cuti: create, daftar, setujui, tolak (Lampiran foto/dokumen) |
| **4** | `server/routes/missions.ts` | `/api/missions` | GET/POST/POST:submission | Daftar misi, submit hasil kerja, review submission mentor |
| **5** | `server/routes/daily-reports.ts` | `/api/daily-reports` | GET/POST/POST:review | Laporan harian: submit deskripsi + foto, review approval |
| **6** | `server/routes/settings.ts` | `/api/settings` | GET/PUT | Konfigurasi sistem: jam kerja, batas keterlambatan, aturan poin |
| **7** | `server/routes/hall-of-fame.ts` | `/api/hall-of-fame` | GET | Leaderboard peringkat peserta per kejuruan (poin total, badge, gelar) |

---

## 🔗 Flow Data Service: Extract dari `appData.ts` (~887 baris)

File `server/services/data.service.ts` merupakan kumpulan **semua query SQL** dan **logika bisnis** yang lama berada di `server/appData.ts`. File ini diekstrak untuk:

1. **Single Source of Truth**: Semua operasi database menyatu di satu tempat.
2. **Reusability**: Bisa dipanggil dari berbagai controller tanpa duplikasi kode.
3. **Testability**: Query SQL bisa diuji secara terpisah dari Express server.

### Contoh Struktur Operasi dalam `data.service.ts`:

| Kategori | Contoh Fungsi | Asal File Lama |
|:---|---|---|
| **Kejuruan** | `getKejuruan()`, `createKejuruan()`, `updateKejuruan()` | `appData.ts` |
| **Presensi** | `clockIn()`, `clockOut()`, `getAttendanceList()` | `appData.ts` |
| **Cuti/Izin** | `createLeaveRequest()`, `getLeaveList()`, `reviewLeave()` | `appData.ts` |
| **Missions** | `getMissions()`, `createMission()`, `submitMission()`, `reviewMissionSubmission()` | `appData.ts` |
| **Daily Reports** | `getDailyReports()`, `submitDailyReport()`, `reviewDailyReport()` | `appData.ts` |
| **Settings** | `getSettings()`, `updateSettings()` | `appData.ts` |
| **Hall of Fame** | `getHallOfFame()` | `appData.ts` |
| **Penalti** | `computeLatePenalty()`, `computeAbsentPenalty()`, canonical code mapping | `latePenalty.ts` |

### Contoh Fungsi Terstruktur:

```typescript
// Contoh: Mission Submission Review
export const reviewMissionSubmission = async (
  submissionId: string,
  status: 'approved' | 'rejected',
  feedback?: string,
  awardedPoints?: number
): Promise<any> => {
  // 1. Validasi submission ada
  // 2. Ambil data lama
  // 3. UPDATE mission_submissions SET status, feedback, awarded_points
  // 4. SELECT ulang untuk mapping record
  // 5. Return mapped record
}
```

---

## ⚡ Middleware Otentikasi & Authorisasi (Auth Middleware)

File: `server/middlewares/auth.ts`

### Fungsi:
1. **Ekstraksi Token**: Membaca `Authorization: Bearer <token>` dari header HTTP.
2. **Verifikasi JWT**: Memvalidasi signature token menggunakan `JWT_SECRET` dari `.env`.
3. **Payload Decode**: Mendapatkan `userId`, `role` (admin/mentor/trainee), dan `kejuruanId`.
4. **Role-Based Access Control (RBAC)**:
   - `role === 'admin'` → akses penuh semua endpoint
   - `role === 'mentor'` → akses fitur kejuruan spesifik + review submission/misi
   - `role === 'trainee'` → akses fitur personal (presensi, submit tugas, laporan)

### Contoh Middleware Chain:

```typescript
// Express Router Contoh
router.post('/attendance/clock-in',
  authMiddleware,           // 1. Cek token valid
  validateRole('trainee'),  // 2. Cek role punya izin
  clockInController         // 3. Jalankan handler
)
```

---

## 📦 Utility Functions Terintegrasi (late-penalty.ts)

File ini menggabungkan dua utility lama:

| Fungsi | Deskripsi |
|:---|---|
| `computeLatePenalty()` | Hitung poin penalti keterlambatan check-in (menit → poin) berdasarkan konfigurasi sistem |
| `computeAbsentPenalty()` | Hitung poin penalti alfa/hadir tidak (total hari × rate per hari) |
| `canonicalKejuruanCode()` | Mapping nama kejuruan ke kode canonical (SB-04, ST-04, WEB-04) |
| `mapAttendanceRecord()` | Mapping record SQL → object response JSON API |
| `mapLeaveRequest()` | Mapping record SQL → object response JSON API |
| `mapMissionRecord()` | Mapping record SQL → object response JSON API |
| `mapSubmissionRecord()` | Mapping record SQL → object response JSON API |
| `mapDailyReportRecord()` | Mapping record SQL → object response JSON API |
| `mapKejuruan()` | Mapping record SQL + canonical code ke object response |

---

## 📈 Verifikasi Build & Performansi

| Command | Status |
|:---|---|
| `npm run build` | ✅ Build Vite produksi berhasil (dist/ directory ter-generate) |
| `npm run lint` | ⚠️ 360 error (359 baru + 1 pre-existing TS18047) |
| Server Start | ❌ Gagal (TiDB Cloud SSL connection blocker - blokir koneksi database) |
| API Endpoint | ⚠️ Struktur sudah modular, butuh konfigurasi .env & SSL fix |

---

## 🔄 Migrasi dari Lama ke Baru

### Apa yang Berganti?

| Area | Sebelum (Monolitik) | Sesudah (Modular) |
|:---|---|---|
| **Entry Point** | `server/index.ts` (~1315 baris) | Pecah ke `index.ts` + route files |
| **SQL Queries** | `server/appData.ts` (~887 baris) | `server/services/data.service.ts` |
| **Utility Functions** | `server/latePenalty.ts`, `server/kejuruanCodes.ts` | `server/utils/late-penalty.ts` (merged) |
| **Middleware** | Cek token di setiap route | `server/middlewares/auth.ts` (single tempat) |
| **Pool Config** | Terstruktur di dalam appData.ts | `server/config/index.ts` (terpusat) |
| **Route Definition** | Setiap controller punya routing sendiri | `server/routes/*.ts` (7 file terpisah) |
| **Controllers** | Terlalu banyak logika di controller | `server/controllers/index.t` (thin controller, logika ke service) |

### Keuntungan Migrasi:
- **Kode lebih bersih**: Setiap layer memiliki tanggung jawab yang jelas.
- **Mudah diedit**: Ubah query SQL di `data.service.ts` tanpa ketakangan di controller.
- **Reusable**: Utility `late-penalty.ts` bisa digunakan di berbagai modul.
- **Testable**: Setiap layer bisa diuji secara unit (mock database).

---
*Dokumen ini dibuat sebagai bagian dari Incremental Refactor Roadmap Docs 01-03. 
Build terverifikasi: ✅. Lint masih perlu perbaikan: ⚠️ (359 error baru).*