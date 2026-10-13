# Rencana Refactor 03: Restrukturisasi Backend (Pola Layered Architecture)

Dokumen ini merinci restrukturisasi backend Express di direktori `server/` agar terpisah menjadi modul route, controller, service, dan middleware.

---

## 1. Analisis Masalah Backend Saat Ini

- **`server/index.ts` (1.315 baris)**:
  - Mengatur konfigurasi Express, CORS, cookie, auth handlers (login, admin login, token verify), user CRUD, kejuruan CRUD, password reset, upload Cloudinary, dan database health check dalam satu file.
- **`server/appData.ts` (887 baris)**:
  - Mengatur seluruh endpoint data operasional: presensi, check-in, check-out, izin/sakit, misi, submission, laporan harian, rekapitulasi poin, dan reset data.
- **Query SQL Tercampur dengan Logika HTTP**:
  - `req` dan `res` Express bercampur langsung dengan raw query SQL `pool.query(...)`. Jika terjadi perubahan query atau validasi, kode menjadi rentan error.

---

## 2. Struktur Arsitektur Backend Baru

Gunakan pola **Routes - Controllers - Services - Middlewares**:

```text
server/
├── config/                  # Konfigurasi environment, CORS, Cookie, Cloudinary
│   ├── env.ts
│   └── cloudinary.ts
├── middlewares/             # Middleware otentikasi & validasi
│   ├── authMiddleware.ts    # authenticateToken, authorizeRoles
│   ├── errorMiddleware.ts   # Error handler terpusat
│   └── rateLimiter.ts
├── routes/                  # Deklarasi rute Express murni
│   ├── authRoutes.ts
│   ├── userRoutes.ts
│   ├── attendanceRoutes.ts
│   ├── leaveRoutes.ts
│   ├── missionRoutes.ts
│   ├── dailyReportRoutes.ts
│   └── uploadRoutes.ts
├── controllers/             # Membaca request HTTP, validasi, dan mengembalikan response
│   ├── authController.ts
│   ├── userController.ts
│   ├── attendanceController.ts
│   ├── leaveController.ts
│   ├── missionController.ts
│   └── dailyReportController.ts
├── services/                # Logika bisnis & akses database murni (SQL queries)
│   ├── authService.ts
│   ├── userService.ts
│   ├── attendanceService.ts
│   ├── leaveService.ts
│   ├── missionService.ts
│   └── dailyReportService.ts
├── utils/                   # Helper utils backend
│   ├── latePenalty.ts
│   └── kejuruanCodes.ts
├── db.ts                    # Koneksi Pool MySQL & inisialisasi tabel
└── index.ts                 # Entrypoint ramping (~80 baris)
```

---

## 3. Tanggung Jawab Tiap Layer

### A. Layer `routes/`
Hanya mendaftarkan path URL dan menghubungkannya dengan middleware serta controller:
```typescript
// server/routes/attendanceRoutes.ts
import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import * as attendanceController from '../controllers/attendanceController.js';

export const attendanceRoutes = Router();
attendanceRoutes.use(authenticateToken);

attendanceRoutes.post('/clock-in', attendanceController.clockIn);
attendanceRoutes.post('/clock-out', attendanceController.clockOut);
attendanceRoutes.patch('/:id/verify', attendanceController.verifyAttendance);
```

### B. Layer `controllers/`
Menangani `req` dan `res`, validasi parameter, lalu memanggil fungsi service:
```typescript
// server/controllers/attendanceController.ts
export async function clockIn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { notes, photoUrl, coordinates, workMode } = req.body;
    const result = await attendanceService.processClockIn(req.user.id, {
      notes, photoUrl, coordinates, workMode
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
```

### C. Layer `services/`
Menjalankan transaksi database dan logika bisnis (tanpa objek Express `req`/`res`):
```typescript
// server/services/attendanceService.ts
export async function processClockIn(userId: string, data: ClockInData) {
  const pool = getPool();
  // Validasi apakah sudah absen hari ini
  // Hitung keterlambatan berdasarkan settings
  // Insert ke tabel attendance_records
  return { message: 'Presensi berhasil disimpan' };
}
```

---

## 4. Entrypoint Ramping (`server/index.ts`)

File `server/index.ts` hanya bertugas:
1. Load environment variables.
2. Setup CORS & Body Parser.
3. Inisialisasi pool database & table migrasi.
4. Mount routes:
   ```typescript
   app.use('/api/auth', authRoutes);
   app.use('/api/users', userRoutes);
   app.use('/api/attendance', attendanceRoutes);
   app.use('/api/leave', leaveRoutes);
   app.use('/api/missions', missionRoutes);
   app.use('/api/daily-reports', dailyReportRoutes);
   app.use('/api/upload', uploadRoutes);
   // Backward compatibility endpoint:
   app.use('/api/app-data', legacyAppDataRouter);
   ```
5. Global error handling middleware.
6. `app.listen(PORT)`.

---

## 5. Sinkronisasi Utility Backend & Frontend
Saat ini terdapat file duplikat:
- `server/latePenalty.ts` vs `src/utils/latePenalty.ts`
- `server/kejuruanCodes.ts` vs `src/utils/kejuruanCodes.ts`

**Strategi**:
Pastikan konstanta dan aturan perhitungan pinalti (denda menit keterlambatan, batas jam 09.00 WIB) memiliki definisi spesifikasi yang sama persis. Jika memungkinkan di kemudian hari, simpan di folder `packages/shared/` atau `shared/` yang bisa di-import oleh frontend dan backend.
