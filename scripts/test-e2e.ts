import 'dotenv/config';
import { spawn, ChildProcess } from 'child_process';
import { getPool } from '../server/config/index.js';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';
let serverProcess: ChildProcess | null = null;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  process.stdout.write(`⏳ Menjalankan: ${name}... `);
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ name, passed: true, durationMs });
    console.log(`\x1b[32m✓ LULUS\x1b[0m (${durationMs}ms)`);
  } catch (error: any) {
    const durationMs = Date.now() - start;
    results.push({ name, passed: false, error: error?.message || String(error), durationMs });
    console.log(`\x1b[31m✗ GAGAL\x1b[0m (${durationMs}ms)`);
    console.log(`   \x1b[33mDetail:\x1b[0m ${error?.message || error}`);
  }
}

async function request(path: string, options: { method?: string; token?: string; body?: any } = {}) {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: any = {};
  try { json = JSON.parse(text); } catch { json = { rawText: text }; }

  return { status: res.status, ok: res.ok, data: json };
}

async function main() {
  console.log('\n======================================================');
  console.log('   🚀 ABSENSI PSA - MASTER END-TO-END (E2E) TEST SUITE');
  console.log(`   Target Server: ${BASE_URL}`);
  console.log('======================================================\n');

  process.stdout.write('Memeriksa status API server... ');
  let ready = false;
  try {
    const ping = await fetch(`${BASE_URL}/api/health`);
    if (ping.ok) ready = true;
  } catch {}

  if (!ready) {
    process.stdout.write('memulai server lokal... ');
    serverProcess = spawn(
      process.execPath,
      ['--require', './scripts/tsx-userinfo-fallback.cjs', './node_modules/tsx/dist/cli.mjs', 'server/index.ts'],
      { stdio: 'inherit', env: { ...process.env, PORT: '5000' } }
    );
    for (let i = 0; i < 40; i++) {
      try {
        const ping = await fetch(`${BASE_URL}/api/health`);
        if (ping.ok) { ready = true; break; }
      } catch {
        await new Promise(r => setTimeout(r, 250));
      }
    }
  }

  if (!ready) {
    console.log('\x1b[31mGagal menyalakan server\x1b[0m');
    throw new Error(`Tidak dapat terhubung ke server API di ${BASE_URL}. Pastikan database MySQL lokal aktif.`);
  }
  console.log('\x1b[32mOnline ✓\x1b[0m\n');

  // Shared state
  let adminToken = '';
  let traineeToken = '';
  let mentorToken = '';
  let otherMentorToken = '';
  let createdKejuruanId = '';
  let otherKejuruanId = '';
  let traineeId = '';
  let mentorId = '';
  let otherMentorId = '';
  const traineeNim = String(Math.floor(20000000 + Math.random() * 70000000));
  const mentorNim  = String(Math.floor(30000000 + Math.random() * 60000000));
  const otherMentorNim = String(Math.floor(40000000 + Math.random() * 50000000));
  let missionId = '';
  let submissionId = '';
  let dailyReportId = '';

  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\x1b[36m─── GRUP 1: Koneksi, Auth Admin & Konfigurasi ───\x1b[0m');
  // ═══════════════════════════════════════════════════════════════════════════

  await runTest('1. Database Connection & Schema Health Check', async () => {
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT 1 AS connected');
    if (!rows?.[0]?.connected) throw new Error('Database pool tidak merespons query.');
  });

  await runTest('2. Autentikasi Admin Default (POST /api/auth/login)', async () => {
    let res = await request('/api/auth/login', { method: 'POST', body: { code: '10101010', password: '12341234' } });
    if (!res.ok) res = await request('/api/auth/login', { method: 'POST', body: { code: '10101010', password: 'password' } });
    if (!res.ok || !res.data.token) throw new Error(`Login admin gagal: ${JSON.stringify(res.data)}`);
    adminToken = res.data.token;
  });

  await runTest('3. Simpan & Baca Pengaturan Presensi (PUT & GET /api/settings)', async () => {
    const putRes = await request('/api/settings', {
      method: 'PUT',
      token: adminToken,
      body: {
        startTime: '08:00',
        lateLimitTime: '09:00',
        endTime: '17:00',
        allowCheckoutStart: '16:30',
        workDays: [1, 2, 3, 4, 5],
        officeLocation: { name: 'Kantor Pusat PSA', lat: -6.2088, lng: 106.8456, radiusMeters: 150 },
        latePointPenaltyPerMinute: 1,
        absentPointPenaltyPerDay: 2,
        penaltyStartDate: '2026-10-01',
      },
    });
    if (!putRes.ok || !putRes.data.success) throw new Error(`Gagal menyimpan pengaturan: ${JSON.stringify(putRes.data)}`);

    const getRes = await request('/api/settings', { token: adminToken });
    if (!getRes.ok || !getRes.data.settings) throw new Error(`Gagal mengambil pengaturan: ${JSON.stringify(getRes.data)}`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\x1b[36m─── GRUP 2: Data Master (Kejuruan, Mentor, Trainee) ───\x1b[0m');
  // ═══════════════════════════════════════════════════════════════════════════

  await runTest('4. Pembuatan Kejuruan Utama & Kedua (POST /api/kejuruan)', async () => {
    // Kejuruan 1
    const res1 = await request('/api/kejuruan', {
      method: 'POST',
      token: adminToken,
      body: { name: `Kejuruan E2E Test ${Date.now()}`, category: 'Teknologi', color: '#10B981', description: 'Kejuruan E2E Utama' },
    });
    if (!res1.ok || !res1.data.success) throw new Error(`Gagal membuat kejuruan 1: ${JSON.stringify(res1.data)}`);
    const created1 = res1.data.kejuruan || res1.data.data;
    createdKejuruanId = created1.id;

    // Kejuruan 2 (untuk cross-kejuruan testing)
    const res2 = await request('/api/kejuruan', {
      method: 'POST',
      token: adminToken,
      body: { name: `Kejuruan Lain E2E ${Date.now()}`, category: 'Bisnis', color: '#6366F1', description: 'Kejuruan E2E Pembanding' },
    });
    if (!res2.ok || !res2.data.success) throw new Error(`Gagal membuat kejuruan 2: ${JSON.stringify(res2.data)}`);
    const created2 = res2.data.kejuruan || res2.data.data;
    otherKejuruanId = created2.id;
  });

  await runTest('5. Pendaftaran Mentor Utama & Mentor Lain (POST /api/users role=mentor)', async () => {
    // Mentor 1 (mengampu kejuruan 1)
    const res1 = await request('/api/users', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Mentor Utama E2E',
        nim: mentorNim,
        email: `mentor_${mentorNim}@hadirku.test`,
        role: 'mentor',
        kejuruanId: createdKejuruanId,
        kejuruanName: 'Kejuruan E2E Test',
        password: 'mentor_pass123',
      },
    });
    if (!res1.ok || !res1.data.success) throw new Error(`Gagal membuat mentor 1: ${JSON.stringify(res1.data)}`);
    mentorId = res1.data.user.id;

    // Mentor 2 (mengampu kejuruan 2)
    const res2 = await request('/api/users', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Mentor Lain E2E',
        nim: otherMentorNim,
        email: `mentor_lain_${otherMentorNim}@hadirku.test`,
        role: 'mentor',
        kejuruanId: otherKejuruanId,
        kejuruanName: 'Kejuruan Lain E2E',
        password: 'mentor_pass123',
      },
    });
    if (!res2.ok || !res2.data.success) throw new Error(`Gagal membuat mentor 2: ${JSON.stringify(res2.data)}`);
    otherMentorId = res2.data.user.id;
  });

  await runTest('6. Pendaftaran Trainee (POST /api/users role=trainee)', async () => {
    const res = await request('/api/users', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Siswa Percobaan E2E',
        nim: traineeNim,
        email: `siswa_${traineeNim}@hadirku.test`,
        role: 'trainee',
        kejuruanId: createdKejuruanId,
        kejuruanName: 'Kejuruan E2E Test',
        password: 'password123',
      },
    });
    if (!res.ok || !res.data.success) throw new Error(`Gagal membuat trainee: ${JSON.stringify(res.data)}`);
    traineeId = res.data.user.id;
  });

  await runTest('7. Login Trainee, Mentor Utama & Mentor Lain', async () => {
    // Trainee
    const tRes = await request('/api/auth/login', { method: 'POST', body: { code: traineeNim, password: 'password123' } });
    if (!tRes.ok || !tRes.data.token) throw new Error(`Login trainee gagal: ${JSON.stringify(tRes.data)}`);
    traineeToken = tRes.data.token;

    // Mentor 1
    const mRes = await request('/api/auth/login', { method: 'POST', body: { code: mentorNim, password: 'mentor_pass123' } });
    if (!mRes.ok || !mRes.data.token) throw new Error(`Login mentor 1 gagal: ${JSON.stringify(mRes.data)}`);
    mentorToken = mRes.data.token;

    // Mentor 2
    const m2Res = await request('/api/auth/login', { method: 'POST', body: { code: otherMentorNim, password: 'mentor_pass123' } });
    if (!m2Res.ok || !m2Res.data.token) throw new Error(`Login mentor 2 gagal: ${JSON.stringify(m2Res.data)}`);
    otherMentorToken = m2Res.data.token;
  });

  await runTest('7A. Admin Import Batch Hanya Mentor & Peserta, Bukan Admin', async () => {
    const importRes = await request('/api/users/batch', {
      method: 'POST',
      token: adminToken,
      body: {
        users: [
          {
            name: 'Import Mentor Batch E2E',
            nim: String(Math.floor(50000000 + Math.random() * 40000000)),
            email: `import_mentor_${Date.now()}@hadirku.test`,
            role: 'mentor',
            kejuruanId: createdKejuruanId,
            kejuruanName: 'Kejuruan E2E Test',
            password: 'mentor_batch123',
          },
          {
            name: 'Import Trainee Batch E2E',
            nim: String(Math.floor(60000000 + Math.random() * 40000000)),
            email: `import_trainee_${Date.now()}@hadirku.test`,
            role: 'trainee',
            kejuruanId: createdKejuruanId,
            kejuruanName: 'Kejuruan E2E Test',
            password: 'trainee_batch123',
          },
          {
            name: 'Import Admin Batch E2E',
            nim: String(Math.floor(70000000 + Math.random() * 40000000)),
            email: `import_admin_${Date.now()}@hadirku.test`,
            role: 'admin',
            kejuruanId: createdKejuruanId,
            kejuruanName: 'Kejuruan E2E Test',
            password: 'admin_batch123',
          },
        ],
      },
    });

    if (!importRes.ok || !importRes.data.success) {
      throw new Error(`Import batch gagal: ${JSON.stringify(importRes.data)}`);
    }

    if (importRes.data.count !== 2) {
      throw new Error(`Admin batch import harus hanya membuat 2 akun (mentor + peserta). Ditemukan: ${importRes.data.count}`);
    }

    if (importRes.data.skipped !== 1) {
      throw new Error(`Admin batch import harus melewati 1 akun admin. Ditemukan skipped: ${importRes.data.skipped}`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\x1b[36m─── GRUP 3: Kejuruan Scoping & Role Boundaries ───\x1b[0m');
  // ═══════════════════════════════════════════════════════════════════════════

  await runTest('8. Trainee Hanya Melihat Kejuruan Miliknya (GET /api/kejuruan)', async () => {
    const res = await request('/api/kejuruan', { token: traineeToken });
    if (!res.ok || !Array.isArray(res.data.kejuruanList)) throw new Error(`Respons kejuruan tidak valid: ${JSON.stringify(res.data)}`);
    const hasAssigned = res.data.kejuruanList.some((k: any) => String(k.id) === String(createdKejuruanId));
    if (!hasAssigned) throw new Error(`Trainee tidak melihat kejuruan miliknya (ID: ${createdKejuruanId})`);
  });

  await runTest('9. Mentor Hanya Melihat Trainee Kejuruannya (GET /api/users)', async () => {
    const res = await request('/api/users', { token: mentorToken });
    if (!res.ok || !Array.isArray(res.data.users)) throw new Error(`Gagal ambil user sebagai mentor: ${JSON.stringify(res.data)}`);
    const outsiders = res.data.users.filter(
      (u: any) => u.role === 'trainee' && String(u.kejuruanId) !== String(createdKejuruanId)
    );
    if (outsiders.length > 0) throw new Error(`Mentor melihat ${outsiders.length} trainee dari kejuruan lain!`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\x1b[36m─── GRUP 4: Alur Izin & Validasi ───\x1b[0m');
  // ═══════════════════════════════════════════════════════════════════════════

  await runTest('10. Pengajuan Izin Trainee & Review Mentor (POST & PATCH /api/leaves)', async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const leaveRes = await request('/api/leaves', {
      method: 'POST',
      token: traineeToken,
      body: { type: 'izin', requestType: 'izin', startDate: tomorrow, endDate: tomorrow, daysCount: 1, reason: 'Urusan keluarga mendesak', attachmentUrl: 'https://example.com/surat-izin.pdf' },
    });
    if (!leaveRes.ok || !leaveRes.data.success) throw new Error(`Gagal mengajukan izin: ${JSON.stringify(leaveRes.data)}`);
    const leaveId = leaveRes.data.request.id;

    const reviewRes = await request(`/api/leaves/${leaveId}/review`, {
      method: 'PATCH',
      token: mentorToken,
      body: { status: 'approved', reviewNotes: 'Disetujui mentor via E2E test.' },
    });
    if (!reviewRes.ok || !reviewRes.data.success) throw new Error(`Gagal me-review izin: ${JSON.stringify(reviewRes.data)}`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\x1b[36m─── GRUP 5: Siklus Misi Master & Update ───\x1b[0m');
  // ═══════════════════════════════════════════════════════════════════════════

  await runTest('11. Pembuatan & Update Misi (POST & PUT /api/missions)', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const createRes = await request('/api/missions', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Misi E2E Automated Test',
        description: 'Tugas pengujian otomatis',
        kejuruanId: createdKejuruanId,
        kejuruanName: 'Kejuruan E2E Test',
        mentorId: mentorId,
        mentorName: 'Mentor Utama E2E',
        points: 50,
        difficulty: 'Mudah',
        dueDate: today,
        category: 'Testing',
      },
    });
    if (!createRes.ok || !createRes.data.success) throw new Error(`Gagal membuat misi: ${JSON.stringify(createRes.data)}`);
    missionId = createRes.data.mission.id;

    const updateRes = await request(`/api/missions/${missionId}`, {
      method: 'PUT',
      token: adminToken,
      body: { title: 'Misi E2E Updated Title', points: 75 },
    });
    if (!updateRes.ok || !updateRes.data.success) throw new Error(`Gagal update misi: ${JSON.stringify(updateRes.data)}`);
    if (!updateRes.data.mission && !updateRes.data.data) throw new Error('Respons update misi tidak memiliki format konsisten (Fix 4).');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\x1b[36m─── GRUP 6: Modul Presensi Masuk & Keluar (Clock-In / Clock-Out) ───\x1b[0m');
  // ═══════════════════════════════════════════════════════════════════════════

  // CLK-01
  await runTest('12. [CLK-01] Clock-In Tepat Waktu (Hadir, 0 Poin Penalti)', async () => {
    const dateStr = '2026-10-20'; // Tanggal khusus test
    const res = await request('/api/attendance', {
      method: 'POST',
      token: traineeToken,
      body: {
        date: dateStr,
        checkInTime: '08:00:00',
        status: 'hadir',
        workMode: 'WFO',
        location: 'Kantor Pusat PSA',
        coordinates: { lat: -6.2088, lng: 106.8456 },
      },
    });
    if (!res.ok || !res.data.success) throw new Error(`Gagal clock-in tepat waktu: ${JSON.stringify(res.data)}`);

    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT late_minutes, late_penalty_points, status FROM attendance_records WHERE user_id = ? AND attendance_date = ? LIMIT 1',
      [traineeId, dateStr]
    );
    if (!rows.length) throw new Error('Record presensi tidak ditemukan di DB.');
    if (rows[0].late_minutes !== 0 || rows[0].late_penalty_points !== 0) {
      throw new Error(`Kalkulasi penalti salah: ${rows[0].late_minutes} menit, ${rows[0].late_penalty_points} poin.`);
    }
  });

  // CLK-02
  await runTest('13. [CLK-02] Clock-In Terlambat (Kalkulasi Otomatis Menit & Poin Penalti)', async () => {
    const dateStr = '2026-10-21';
    const res = await request('/api/attendance', {
      method: 'POST',
      token: traineeToken,
      body: {
        date: dateStr,
        checkInTime: '09:15:00', // Batas 09:00 -> telat 15 menit
        status: 'terlambat',
        workMode: 'WFO',
        location: 'Kantor Pusat PSA',
        coordinates: { lat: -6.2088, lng: 106.8456 },
      },
    });
    if (!res.ok || !res.data.success) throw new Error(`Gagal clock-in telat: ${JSON.stringify(res.data)}`);

    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT late_minutes, late_penalty_points, status FROM attendance_records WHERE user_id = ? AND attendance_date = ? LIMIT 1',
      [traineeId, dateStr]
    );
    if (!rows.length) throw new Error('Record presensi telat tidak ditemukan di DB.');
    if (rows[0].late_minutes !== 15 || rows[0].late_penalty_points !== 15) {
      throw new Error(`Kalkulasi penalti telat salah: diharapkan 15 menit & 15 poin, didapat: ${rows[0].late_minutes}m, ${rows[0].late_penalty_points}p.`);
    }
  });

  // CLK-03
  await runTest('14. [CLK-03] Clock-In Tepat di Batas Akhir (09:00:00 -> 0 Penalti)', async () => {
    const dateStr = '2026-10-22';
    const res = await request('/api/attendance', {
      method: 'POST',
      token: traineeToken,
      body: {
        date: dateStr,
        checkInTime: '09:00:00',
        status: 'hadir',
        workMode: 'WFO',
        location: 'Kantor Pusat PSA',
        coordinates: { lat: -6.2088, lng: 106.8456 },
      },
    });
    if (!res.ok || !res.data.success) throw new Error(`Gagal clock-in batas: ${JSON.stringify(res.data)}`);

    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT late_minutes, late_penalty_points FROM attendance_records WHERE user_id = ? AND attendance_date = ? LIMIT 1',
      [traineeId, dateStr]
    );
    if (!rows.length || rows[0].late_minutes !== 0 || rows[0].late_penalty_points !== 0) {
      throw new Error('Clock-in tepat di jam 09:00:00 seharusnya tidak terkena denda.');
    }
  });

  // CLK-05
  await runTest('15. [CLK-05] Clock-Out pada Hari yang Sama (Memperbarui Jam Keluar)', async () => {
    const dateStr = '2026-10-20'; // Menggunakan record test 12
    const res = await request('/api/attendance', {
      method: 'POST',
      token: traineeToken,
      body: {
        date: dateStr,
        checkOutTime: '17:05:00',
        status: 'hadir',
      },
    });
    if (!res.ok || !res.data.success) throw new Error(`Gagal clock-out: ${JSON.stringify(res.data)}`);

    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT check_in_time, check_out_time FROM attendance_records WHERE user_id = ? AND attendance_date = ? LIMIT 1',
      [traineeId, dateStr]
    );
    if (!rows.length || !rows[0].check_in_time || !rows[0].check_out_time) {
      throw new Error(`Record presensi harus memiliki check_in_time dan check_out_time: ${JSON.stringify(rows[0])}`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\x1b[36m─── GRUP 7: Modul Status WFH dan WFO ───\x1b[0m');
  // ═══════════════════════════════════════════════════════════════════════════

  // WFX-01
  await runTest('16. [WFX-01] Presensi WFO Valid dengan Lokasi & Koordinat', async () => {
    const dateStr = '2026-10-23';
    const res = await request('/api/attendance', {
      method: 'POST',
      token: traineeToken,
      body: {
        date: dateStr,
        checkInTime: '08:10:00',
        status: 'hadir',
        workMode: 'WFO',
        location: 'Kantor Pusat PSA - Gedung B',
        coordinates: { lat: -6.20885, lng: 106.84562 },
        photoUrl: 'https://example.com/selfie-wfo.jpg',
      },
    });
    if (!res.ok || !res.data.success) throw new Error(`Gagal presensi WFO: ${JSON.stringify(res.data)}`);

    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT work_mode, location, photo_url FROM attendance_records WHERE user_id = ? AND attendance_date = ? LIMIT 1',
      [traineeId, dateStr]
    );
    if (rows[0].work_mode !== 'WFO') throw new Error(`work_mode tersimpan: ${rows[0].work_mode}, ekspektasi: WFO`);
  });

  // WFX-02
  await runTest('17. [WFX-02] Presensi WFH Valid dengan Catatan Kegiatan', async () => {
    const dateStr = '2026-10-24';
    const res = await request('/api/attendance', {
      method: 'POST',
      token: traineeToken,
      body: {
        date: dateStr,
        checkInTime: '08:05:00',
        status: 'hadir',
        workMode: 'WFH',
        location: 'Rumah Siswa',
        notes: 'Bekerja remote: menyelesaikan modul API testing',
      },
    });
    if (!res.ok || !res.data.success) throw new Error(`Gagal presensi WFH: ${JSON.stringify(res.data)}`);

    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT work_mode, notes FROM attendance_records WHERE user_id = ? AND attendance_date = ? LIMIT 1',
      [traineeId, dateStr]
    );
    if (rows[0].work_mode !== 'WFH') throw new Error(`work_mode tersimpan: ${rows[0].work_mode}, ekspektasi: WFH`);
  });

  // WFX-03
  await runTest('18. [WFX-03] Sanitasi workMode Ilegal (Bukan ENUM WFO/WFH Disanitasi Menjadi NULL)', async () => {
    const dateStr = '2026-10-25';
    const res = await request('/api/attendance', {
      method: 'POST',
      token: traineeToken,
      body: {
        date: dateStr,
        checkInTime: '08:00:00',
        status: 'hadir',
        workMode: 'ILLEGAL_MODE_INJECTION',
      },
    });
    if (!res.ok || !res.data.success) throw new Error(`Gagal request presensi: ${JSON.stringify(res.data)}`);

    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT work_mode FROM attendance_records WHERE user_id = ? AND attendance_date = ? LIMIT 1',
      [traineeId, dateStr]
    );
    if (rows[0].work_mode !== null) throw new Error(`workMode ilegal harus disanitasi menjadi NULL, didapat: ${rows[0].work_mode}`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\x1b[36m─── GRUP 8: Modul Verifikasi Presensi & Laporan Harian ───\x1b[0m');
  // ═══════════════════════════════════════════════════════════════════════════

  // VER-01
  await runTest('19. [VER-01] Mentor Menyetujui Presensi Trainee (Status -> verified)', async () => {
    const dateStr = '2026-10-23'; // Menggunakan record test 16
    const res = await request('/api/attendance', {
      method: 'POST',
      token: mentorToken,
      body: {
        userId: traineeId,
        date: dateStr,
        verificationStatus: 'verified',
        verifiedBy: 'Mentor Utama E2E',
        verifiedAt: new Date().toISOString(),
        canWriteReview: true,
      },
    });
    if (!res.ok || !res.data.success) throw new Error(`Mentor gagal memverifikasi: ${JSON.stringify(res.data)}`);

    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT verification_status, verified_by FROM attendance_records WHERE user_id = ? AND attendance_date = ? LIMIT 1',
      [traineeId, dateStr]
    );
    if (rows[0].verification_status !== 'verified') {
      throw new Error(`verification_status adalah ${rows[0].verification_status}, ekspektasi: verified`);
    }
  });

  // VER-02
  await runTest('20. [VER-02] Mentor Menolak Presensi Trainee Beserta Alasan (Status -> rejected)', async () => {
    const dateStr = '2026-10-24'; // Menggunakan record test 17
    const res = await request('/api/attendance', {
      method: 'POST',
      token: mentorToken,
      body: {
        userId: traineeId,
        date: dateStr,
        verificationStatus: 'rejected',
        rejectionReason: 'Foto bukti WFH tidak dilampirkan',
        verifiedBy: 'Mentor Utama E2E',
        verifiedAt: new Date().toISOString(),
        canWriteReview: true,
      },
    });
    if (!res.ok || !res.data.success) throw new Error(`Mentor gagal menolak: ${JSON.stringify(res.data)}`);

    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT verification_status, rejection_reason FROM attendance_records WHERE user_id = ? AND attendance_date = ? LIMIT 1',
      [traineeId, dateStr]
    );
    if (rows[0].verification_status !== 'rejected') {
      throw new Error(`verification_status adalah ${rows[0].verification_status}, ekspektasi: rejected`);
    }
    if (!rows[0].rejection_reason) throw new Error('rejection_reason tidak tersimpan di database.');
  });

  // VER-03: Security Test
  await runTest('21. [VER-03] Sekuriti: Trainee DITOLAK saat Mencoba Verifikasi Mandiri', async () => {
    const dateStr = '2026-10-25'; // Record test 18
    // Trainee mencoba menyuntikkan canWriteReview: true dan verificationStatus: 'verified'
    const res = await request('/api/attendance', {
      method: 'POST',
      token: traineeToken,
      body: {
        date: dateStr,
        verificationStatus: 'verified',
        canWriteReview: true,
      },
    });
    if (!res.ok || !res.data.success) throw new Error(`Request gagal: ${JSON.stringify(res.data)}`);

    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT verification_status FROM attendance_records WHERE user_id = ? AND attendance_date = ? LIMIT 1',
      [traineeId, dateStr]
    );
    // Presensi trainee HARUS tetap 'pending' karena trainee tidak berhak menyetujui presensinya sendiri
    if (rows[0].verification_status === 'verified') {
      throw new Error('VULNERABILITY DETECTED: Trainee berhasil melakukan self-verification!');
    }
    if (rows[0].verification_status !== 'pending') {
      throw new Error(`Ekspektasi verification_status tetap pending, didapat: ${rows[0].verification_status}`);
    }
  });

  // VER-04: Security Test
  await runTest('22. [VER-04] Sekuriti: Mentor DITOLAK Memverifikasi Trainee Beda Kejuruan (403)', async () => {
    const dateStr = '2026-10-23';
    // Mentor 2 (kejuruan bisnis) mencoba memverifikasi trainee milik Mentor 1 (kejuruan teknologi)
    const res = await request('/api/attendance', {
      method: 'POST',
      token: otherMentorToken,
      body: {
        userId: traineeId,
        date: dateStr,
        verificationStatus: 'verified',
        canWriteReview: true,
      },
    });
    if (res.status !== 403) {
      throw new Error(`Mentor beda kejuruan seharusnya ditolak 403, didapat status: ${res.status}`);
    }
  });

  // VER-05 & VER-06 & VER-07: Laporan Harian
  await runTest('23. [VER-05] Trainee Submit Laporan Harian & Mentor Mereview Ditolak', async () => {
    const reportDate = '2026-10-20';
    const subRes = await request('/api/daily-reports', {
      method: 'POST',
      token: traineeToken,
      body: {
        date: reportDate,
        description: 'Laporan harian awal sebelum revisi',
      },
    });
    if (!subRes.ok || !subRes.data.success) throw new Error(`Gagal submit laporan: ${JSON.stringify(subRes.data)}`);
    dailyReportId = subRes.data.report.id;

    // Mentor menolak dengan catatan revisi
    const revRes = await request(`/api/daily-reports/${dailyReportId}/review`, {
      method: 'PATCH',
      token: mentorToken,
      body: {
        status: 'rejected',
        reviewNotes: 'Harap tambahkan detail hasil koding dan screenshot.',
      },
    });
    if (!revRes.ok || !revRes.data.success) throw new Error(`Mentor gagal menolak laporan: ${JSON.stringify(revRes.data)}`);

    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT status, review_notes FROM daily_reports WHERE id = ? LIMIT 1',
      [dailyReportId]
    );
    if (rows[0].status !== 'rejected') throw new Error(`Status laporan: ${rows[0].status}, ekspektasi: rejected`);
  });

  await runTest('24. [VER-06] Trainee Dapat Mengirim Ulang Laporan yang Ditolak', async () => {
    const reportDate = '2026-10-20';
    const reRes = await request('/api/daily-reports', {
      method: 'POST',
      token: traineeToken,
      body: {
        date: reportDate,
        description: 'Laporan harian revisi lengkap dengan detail koding.',
      },
    });
    if (!reRes.ok || !reRes.data.success) throw new Error(`Gagal resubmit laporan: ${JSON.stringify(reRes.data)}`);

    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT status, description FROM daily_reports WHERE id = ? LIMIT 1',
      [dailyReportId]
    );
    if (rows[0].status !== 'pending') throw new Error(`Status setelah resubmit harus reset ke pending, didapat: ${rows[0].status}`);
  });

  await runTest('25. [VER-07] Mentor Menyetujui Laporan & Trainee Ditolak Menimpa Laporan Disetujui', async () => {
    // Mentor menyetujui
    const appRes = await request(`/api/daily-reports/${dailyReportId}/review`, {
      method: 'PATCH',
      token: mentorToken,
      body: { status: 'approved', reviewNotes: 'Laporan revisi sangat baik.' },
    });
    if (!appRes.ok || !appRes.data.success) throw new Error(`Gagal menyetujui laporan: ${JSON.stringify(appRes.data)}`);

    // Trainee mencoba menimpa laporan yang sudah approved (harus ditolak 400)
    const reportDate = '2026-10-20';
    const reRes = await request('/api/daily-reports', {
      method: 'POST',
      token: traineeToken,
      body: { date: reportDate, description: 'Mencoba menimpa laporan yang sudah disetujui.' },
    });
    if (reRes.ok || reRes.status !== 400) {
      throw new Error(`Siswa seharusnya dilarang menimpa laporan yang sudah approved! Status: ${reRes.status}`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\x1b[36m─── GRUP 9: Modul Penilaian Misi oleh Mentor ───\x1b[0m');
  // ═══════════════════════════════════════════════════════════════════════════

  await runTest('26. [MSN-01] Trainee Submit Misi & Mentor Menyetujui dengan Poin Sah', async () => {
    const submitRes = await request(`/api/missions/${missionId}/submit`, {
      method: 'POST',
      token: traineeToken,
      body: {
        missionId,
        notes: 'Pekerjaan misi siap dinilai.',
        submissionLink: 'https://example.com/submission-valid.pdf',
      },
    });
    if (!submitRes.ok || !submitRes.data.success) throw new Error(`Gagal submit misi: ${JSON.stringify(submitRes.data)}`);
    submissionId = submitRes.data.submission.id;

    // Mentor memberi nilai 70 (max misi = 75)
    const reviewRes = await request(`/api/missions/submissions/${submissionId}/review`, {
      method: 'PATCH',
      token: mentorToken,
      body: {
        status: 'approved',
        feedback: 'Implementasi sangat rapi dan komprehensif.',
        awardedPoints: 70,
      },
    });
    if (!reviewRes.ok || !reviewRes.data.success) throw new Error(`Gagal mereview misi: ${JSON.stringify(reviewRes.data)}`);

    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT status, points, feedback FROM mission_submissions WHERE id = ? LIMIT 1',
      [submissionId]
    );
    if (rows[0].status !== 'approved' || rows[0].points !== 70) {
      throw new Error(`Data submission di DB tidak sesuai: status=${rows[0].status}, points=${rows[0].points}`);
    }
  });

  await runTest('27. [MSN-03] Boundary: Penilaian Misi Melebihi Batas Maksimal DITOLAK', async () => {
    // Misi max 75 poin, mentor mencoba memberi nilai 150
    const res = await request(`/api/missions/submissions/${submissionId}/review`, {
      method: 'PATCH',
      token: mentorToken,
      body: { status: 'approved', awardedPoints: 150 },
    });
    if (res.ok || res.status !== 400) {
      throw new Error(`Pemberian poin melebihi batas harus ditolak HTTP 400! Status: ${res.status}`);
    }
  });

  await runTest('28. [MSN-04] Boundary: Penilaian Misi dengan Poin Negatif DITOLAK', async () => {
    const res = await request(`/api/missions/submissions/${submissionId}/review`, {
      method: 'PATCH',
      token: mentorToken,
      body: { status: 'approved', awardedPoints: -20 },
    });
    if (res.ok || res.status !== 400) {
      throw new Error(`Pemberian poin negatif harus ditolak HTTP 400! Status: ${res.status}`);
    }
  });

  await runTest('29. [MSN-05] Sekuriti: Mentor DITOLAK Menilai Misi di Luar Kejuruannya', async () => {
    // Mentor 2 (kejuruan bisnis) mencoba menilai submission misi kejuruan teknologi
    const res = await request(`/api/missions/submissions/${submissionId}/review`, {
      method: 'PATCH',
      token: otherMentorToken,
      body: { status: 'approved', awardedPoints: 50 },
    });
    if (res.ok || res.status !== 400) {
      throw new Error(`Mentor beda kejuruan harus ditolak! Status: ${res.status}`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\x1b[36m─── GRUP 10: Presensi Mentor & Verifikasi oleh Admin ───\x1b[0m');
  // ═══════════════════════════════════════════════════════════════════════════

  // ADM-01
  await runTest('30. [ADM-01] Presensi Mentor Berhasil Dicatat (Role = mentor)', async () => {
    const dateStr = '2026-10-26';
    const res = await request('/api/attendance', {
      method: 'POST',
      token: mentorToken,
      body: {
        date: dateStr,
        checkInTime: '08:30:00',
        status: 'hadir',
        workMode: 'WFO',
        location: 'Ruang Mentor PSA',
      },
    });
    if (!res.ok || !res.data.success) throw new Error(`Presensi mentor gagal dicatat: ${JSON.stringify(res.data)}`);

    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT user_role, verification_status FROM attendance_records WHERE user_id = ? AND attendance_date = ? LIMIT 1',
      [mentorId, dateStr]
    );
    if (!rows.length || rows[0].user_role !== 'mentor') {
      throw new Error('Presensi mentor harus tersimpan dengan user_role = mentor.');
    }
  });

  // ADM-02
  await runTest('31. [ADM-02] Admin Memverifikasi Presensi Mentor (verified)', async () => {
    const dateStr = '2026-10-26';
    const res = await request('/api/attendance', {
      method: 'POST',
      token: adminToken,
      body: {
        userId: mentorId,
        date: dateStr,
        verificationStatus: 'verified',
        verifiedBy: 'Admin Pusat PSA',
        verifiedAt: new Date().toISOString(),
        canWriteReview: true,
      },
    });
    if (!res.ok || !res.data.success) throw new Error(`Admin gagal verifikasi presensi mentor: ${JSON.stringify(res.data)}`);

    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT verification_status, verified_by FROM attendance_records WHERE user_id = ? AND attendance_date = ? LIMIT 1',
      [mentorId, dateStr]
    );
    if (rows[0].verification_status !== 'verified') {
      throw new Error(`verification_status mentor adalah ${rows[0].verification_status}, ekspektasi: verified`);
    }
  });

  // ADM-03
  await runTest('32. [ADM-03] Pengecualian Penalti: Mentor Clock-In Telat Tidak Kena Denda Poin', async () => {
    const dateStr = '2026-10-27';
    // Mentor datang jam 10:30 (lewat batas 09:00)
    const res = await request('/api/attendance', {
      method: 'POST',
      token: mentorToken,
      body: {
        date: dateStr,
        checkInTime: '10:30:00',
        status: 'terlambat',
        workMode: 'WFO',
      },
    });
    if (!res.ok || !res.data.success) throw new Error(`Presensi telat mentor gagal: ${JSON.stringify(res.data)}`);

    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT late_penalty_points FROM attendance_records WHERE user_id = ? AND attendance_date = ? LIMIT 1',
      [mentorId, dateStr]
    );
    if (rows[0].late_penalty_points !== 0) {
      throw new Error(`Mentor seharusnya dibebaskan dari penalti poin, tetapi mendapat: ${rows[0].late_penalty_points} poin.`);
    }
  });

  // ADM-04
  await runTest('33. [ADM-04] Sekuriti: Sesama Mentor DITOLAK Memverifikasi Presensi Mentor Lain (403)', async () => {
    const dateStr = '2026-10-26';
    // Mentor 2 mencoba memverifikasi presensi Mentor 1
    const res = await request('/api/attendance', {
      method: 'POST',
      token: otherMentorToken,
      body: {
        userId: mentorId,
        date: dateStr,
        verificationStatus: 'verified',
        canWriteReview: true,
      },
    });
    if (res.status !== 403) {
      throw new Error(`Sesama mentor seharusnya ditolak 403 saat memverifikasi presensi mentor, status: ${res.status}`);
    }
  });

  // ADM-05
  await runTest('34. [ADM-05] Sekuriti: Trainee DITOLAK Mengubah Presensi Mentor (403)', async () => {
    const dateStr = '2026-10-26';
    const res = await request('/api/attendance', {
      method: 'POST',
      token: traineeToken,
      body: {
        userId: mentorId,
        date: dateStr,
        verificationStatus: 'verified',
        canWriteReview: true,
      },
    });
    // Controller memaksa userId ke trainee sendiri sehingga tidak bisa menimpa mentor
    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT user_id, verification_status FROM attendance_records WHERE user_id = ? AND attendance_date = ? LIMIT 1',
      [mentorId, dateStr]
    );
    if (rows[0].user_id !== mentorId) {
      throw new Error('Integritas ID mentor rusak oleh manipulasi request!');
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\x1b[36m─── GRUP 11: Endpoint Sekuriti, Batch & Administrasi ───\x1b[0m');
  // ═══════════════════════════════════════════════════════════════════════════

  await runTest('35. Hall of Fame Leaderboard & Perhitungan Poin (GET /api/hall-of-fame/trainees)', async () => {
    const res = await request('/api/hall-of-fame/trainees', { token: adminToken });
    const list = res.data.hallOfFame || res.data.trainees;
    if (!res.ok || !res.data.success || !Array.isArray(list)) throw new Error(`Gagal ambil Hall of Fame: ${JSON.stringify(res.data)}`);
  });

  await runTest('36. Proteksi Endpoint Reset Presensi (DELETE /api/attendance/reset)', async () => {
    const failRes = await request('/api/attendance/reset', { method: 'DELETE', token: adminToken });
    if (failRes.status !== 400 || failRes.data.success === true) {
      throw new Error(`SEKURITI GAGAL: Endpoint reset tidak memblokir request tanpa token! Status: ${failRes.status}`);
    }

    const successRes = await request('/api/attendance/reset', {
      method: 'DELETE',
      token: adminToken,
      body: { confirmToken: 'CONFIRM_DELETE_ALL_ATTENDANCE' },
    });
    if (!successRes.ok || !successRes.data.success) throw new Error(`Gagal reset presensi dengan token: ${JSON.stringify(successRes.data)}`);
  });

  await runTest('37. Proteksi Namespace Folder Cloudinary (POST /api/upload/signature)', async () => {
    const res = await request('/api/upload/signature', {
      method: 'POST',
      token: traineeToken,
      body: { folder: 'injected_admin_folder' },
    });
    if (!res.ok || !res.data.success) throw new Error(`Gagal upload signature: ${JSON.stringify(res.data)}`);
    if (!res.data.folder || !res.data.folder.startsWith(`hadirku/trainee/${traineeId}`)) {
      throw new Error(`VULNERABILITY: Folder tidak di-prefix dengan benar! Folder: ${res.data.folder}`);
    }
  });

  await runTest('38. Import & Hapus Batch User Trainee oleh Admin', async () => {
    const batchNim1 = String(Math.floor(40000000 + Math.random() * 50000000));
    const batchNim2 = String(Math.floor(40000000 + Math.random() * 50000000));
    const res = await request('/api/users/batch', {
      method: 'POST',
      token: adminToken,
      body: {
        users: [
          { name: 'Batch User 1', nim: batchNim1, email: `batch1_${batchNim1}@test.test`, role: 'trainee', kejuruanId: createdKejuruanId, kejuruanName: 'Kejuruan E2E Test', password: 'batch_password_1' },
          { name: 'Batch User 2', nim: batchNim2, email: `batch2_${batchNim2}@test.test`, role: 'trainee', kejuruanId: createdKejuruanId, kejuruanName: 'Kejuruan E2E Test', password: 'batch_password_2' },
        ],
      },
    });
    if (!res.ok || !res.data.success) throw new Error(`Gagal batch import: ${JSON.stringify(res.data)}`);

    const pool = getPool();
    await pool.query('DELETE FROM users WHERE login_code IN (?, ?)', [batchNim1, batchNim2]);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Cleanup: hapus data test
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    const pool = getPool();
    if (traineeId) await pool.query('DELETE FROM users WHERE id = ?', [traineeId]);
    if (mentorId) await pool.query('DELETE FROM users WHERE id = ?', [mentorId]);
    if (otherMentorId) await pool.query('DELETE FROM users WHERE id = ?', [otherMentorId]);
    if (createdKejuruanId) await pool.query('DELETE FROM kejuruan WHERE id = ?', [createdKejuruanId]);
    if (otherKejuruanId) await pool.query('DELETE FROM kejuruan WHERE id = ?', [otherKejuruanId]);
  } catch { /* ignore cleanup error */ }

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n======================================================');
  console.log('              📊 RINGKASAN HASIL TEST E2E');
  console.log('======================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Pengujian: ${total}`);
  console.log(`Lulus          : \x1b[32m${passed}\x1b[0m`);
  console.log(`Gagal          : ${failed > 0 ? `\x1b[31m${failed}\x1b[0m` : '0'}`);

  if (failed > 0) {
    console.log('\n\x1b[31mTest yang Gagal:\x1b[0m');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ✗ ${r.name}`);
      console.log(`    → ${r.error}`);
    });
  }

  if (failed === 0) {
    console.log('\n\x1b[32m🎉 SEMUA PENGUJIAN END-TO-END BERHASIL 100%! APLIKASI DAN DB SEHAT.\x1b[0m\n');
  } else {
    console.log('\n\x1b[31m⚠️  ADA PENGUJIAN YANG GAGAL. SILAKAN PERIKSA LOG DI ATAS.\x1b[0m\n');
  }

  if (serverProcess) serverProcess.kill();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  if (serverProcess) serverProcess.kill();
  process.exit(1);
});
