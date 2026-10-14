# Kontrak Fitur Admin untuk Penyelarasan Refactor

Dokumen ini merangkum perilaku admin yang tersedia di proyek acuan. Gunakan sebagai daftar parity saat memperbaiki hasil refactor; pertahankan alur, izin, perubahan status, dan batas data meskipun struktur komponen atau state berbeda.

## 1. Identitas, navigasi, dan akses

- Role sistem: `admin`, `mentor`, `trainee`. Dashboard admin aktif jika `currentUser.role === 'admin'`.
- Halaman admin: Dashboard/Verifikasi Mentor, Rekap, Izin, Manajemen Peserta (peserta dan mentor), Misi, Laporan Harian, Hall of Fame Mentor, Pengaturan, dan Profil.
- Sesi diverifikasi server saat aplikasi mulai. Data dimuat setelah autentikasi siap; admin mendapat roster dan cakupan data penuh.
- Hak akses harus ditegakkan di API/server, bukan hanya dengan menyembunyikan tombol.
- Akun admin dibuat langsung di database. Admin tidak dapat dibuat melalui alur tambah akun/impor reguler, dihapus individual, atau dihapus massal.

## 2. Dashboard dan verifikasi presensi mentor

### Data dan penyegaran
- Dashboard memanggil `refreshUsers()` saat dibuka.
- Presensi disegarkan saat dashboard dibuka, saat jendela kembali fokus, dan setiap 15 detik.
- Data hari ini dicocokkan dengan tanggal lokal aplikasi. Mentor dan peserta dipisahkan menurut role.
- Ringkasan mencakup statistik presensi dan program; filter program mengikuti katalog kejuruan kanonik. Kode program tertentu sengaja dikecualikan dari ringkasan admin.
- Ekspor Excel/PDF memakai bulan dan tahun berjalan, filter program terpilih, roster peserta, katalog kejuruan, dan catatan presensi.

### Tindakan admin
- Admin dapat memverifikasi presensi mentor lintas program. Hanya record `pending` yang masuk aksi “setujui semua”; record lain tidak berubah.
- Admin dapat menetapkan status mentor hari ini: `hadir`, `terlambat`, `izin`, `sakit`, `alpha`.
- Jika record hari ini ada, perbarui status dan verifikasi. Jika belum ada, buat record manual dengan identitas/program mentor, tanggal hari ini, status terverifikasi, reviewer admin, dan waktu verifikasi.
- Record manual hadir/terlambat menggunakan waktu saat ini. Fungsi manual umum memakai 08:00 untuk hadir dan 08:25 untuk terlambat bila waktu tidak diberikan.
- Simpan ke backend; perubahan state lokal saja tidak boleh dianggap sukses.

### Hierarki verifikasi
1. Peserta presensi → `pending`, menunggu mentor programnya.
2. Mentor memverifikasi peserta dalam cakupan programnya.
3. Mentor presensi sendiri → `pending`, menunggu admin.
4. Admin memverifikasi mentor lintas program.
5. Presensi admin otomatis `verified`.

Perubahan mencatat `verifiedBy`, `verifiedAt`, dan alasan penolakan jika ada.

## 3. Manajemen akun dan program kejuruan

Laman Peserta juga digunakan admin untuk mengelola mentor.

- Sediakan filter semua role/peserta/mentor. Baris akun menyediakan identitas, salin kredensial, tampil/sembunyi kata sandi, dan regenerasi kredensial.
- Admin dapat menambah peserta, menambah program, impor Excel, ekspor roster, menghapus akun non-admin, dan menghapus massal peserta, mentor, atau keduanya.
- Tambah akun baru dimasukkan ke roster hanya setelah API mengembalikan sukses.
- Impor menyediakan template, role target peserta/mentor/otomatis, pratinjau, dan pemetaan role. Validasi backend mencakup nama, kode login/NIM 8 digit, sandi 8 digit, role, program wajib untuk peserta/mentor, identifier duplikat, dan benturan dengan akun admin.
- Setelah impor sukses, muat roster dan katalog kejuruan dari server. Kegagalan tidak boleh membuat pratinjau tampak sudah tersimpan.
- Regenerasi menghasilkan kode login 8 digit dan sandi default. Perbarui UI hanya setelah server sukses; jika gagal, pertahankan kredensial lama.
- Hapus massal memiliki target `trainee`, `mentor`, atau `all`, dengan konfirmasi yang jelas. Akun admin selalu dipertahankan dan roster mengikuti hasil server.
- Katalog kejuruan menggunakan ID/kode kanonik dan direferensikan oleh akun, presensi, laporan, dan misi. Jangan mengganti ID hingga referensi terputus.
- Acuan menyediakan aksi tambah/ubah kejuruan di context dan persistensi app data admin. Pastikan refactor menyimpan perubahan ke server, bukan hanya memori.

## 4. Permohonan izin dan sakit

- Peserta mengajukan jenis `izin`/`sakit`, rentang tanggal, alasan, dan lampiran.
- Admin melihat daftar dan lampiran semua permohonan. UI acuan tidak memberikan tombol review admin; aksi review diberikan kepada mentor.
- Mentor hanya melihat permohonan dengan `kejuruanId` yang sesuai. Server acuan membatasi endpoint review ke role mentor. Jangan menambah aksi review admin kecuali kebijakan backend refactor memang berubah.
- Review mencatat status `approved`/`rejected`, reviewer, waktu, dan catatan. Jika kosong, gunakan catatan default.
- Persetujuan membuat record presensi `izin`/`sakit` untuk hari kerja Senin–Jumat di rentang permohonan, berstatus `verified`, dengan alasan. Record tanggal yang sama bagi user diganti agar tidak ganda.
- Penolakan tidak membuat record presensi. Sabtu/Minggu tidak dihitung sebagai record persetujuan.

## 5. Misi, pengumpulan, dan poin

- Admin melihat dan mengelola misi semua program, membuat/mengubah/menghapus misi, dan meninjau pengumpulan. Mentor dibatasi pada programnya.
- Misi menyimpan judul, deskripsi, program, mentor, poin, kesulitan (`Mudah`/`Sedang`/`Tantangan`), tenggat, status (`active`/`archived`), kategori opsional, dan panduan pengumpulan opsional.
- Pengumpulan memuat tautan opsional, catatan, status (`pending`/`approved`/`rejected`), poin, dan feedback. Persetujuan memberi poin sesuai nilai reviewer; penolakan menyimpan feedback dan tidak dihitung selesai.
- Filter admin mencakup semua program. Batas program mentor tetap ditegakkan server untuk buat/edit/hapus/review.
- Misi menggunakan endpoint khusus. Snapshot app data umum tidak boleh membuat kembali misi yang dihapus atau menimpa data dengan snapshot usang.
- Setelah operasi, sinkronkan respons/server dan tampilkan kegagalan backend.

## 6. Laporan harian

- Admin meninjau laporan peserta lintas program. Peserta mengirim laporan per tanggal dengan deskripsi, foto opsional, atau tautan.
- Satu laporan per peserta per tanggal. Data meliputi identitas/program, isi, foto/nama file, tautan, status, waktu kirim, reviewer, waktu review, dan catatan review.
- Status: `pending`, `approved`, `rejected`. Admin/mentor meninjau; peserta hanya mengelola kirimannya sendiri.
- Foto harus gambar dengan ukuran maksimal 5 MB dan diunggah melalui layanan gambar. Jika unggah gagal, laporan tidak boleh terlihat terkirim.
- Kiriman peserta tidak boleh menimpa status/reviewer yang sudah ditetapkan staf di backend.

## 7. Rekap presensi

- Admin melihat rekap peserta berdasarkan bulan/tahun dan program serta mengunduh Excel/PDF.
- Terapkan filter yang sama pada tampilan dan ekspor. Gunakan roster peserta, status, tanggal, waktu masuk/keluar, dan katalog kejuruan.
- Status yang dikenal: hadir, terlambat, izin, sakit, alpha. Catatan manual dan hasil persetujuan izin ikut dihitung.
- Jangan memasukkan mentor ke daftar peserta pada ekspor.

## 8. Hall of Fame

- Tab admin merender `MentorHallOfFameView`; role lain merender Hall of Fame umum.
- Pertahankan sumber data/peringkat mentor terpisah dari peserta; tangani data kosong dengan wajar.

## 9. Pengaturan presensi dan lokasi

- Pengaturan mencakup jam mulai, batas terlambat, jam selesai, lokasi kantor (nama/latitude/longitude), dan radius geofence.
- `lateLimitTime` menentukan klasifikasi check-in: setelah batas berarti `terlambat`, selain itu `hadir`.
- Pada WFO, bila koordinat tersedia, hitung jarak ke lokasi kantor dan tolak check-in/check-out di luar radius. WFH tidak menjalani pemeriksaan geofence.
- Simpan ke server dahulu; tampilkan sukses dan ubah state hanya sesudah penyimpanan berhasil. Pada gagal, tampilkan error dan jangan mengklaim sukses.
- Admin dapat mengambil pin GPS perangkat dan membuka koordinat di Maps.
- Model juga memiliki `workDays` dan `allowCheckoutStart`, meskipun form acuan tidak mengeditnya. Saat menyimpan sebagian pengaturan, jangan menghapus properti yang tidak ditampilkan.
- Tombol “Muat Ulang Data TiDB” meminta konfirmasi lalu memuat ulang data server. `resetToDefaultData` berarti refresh dari TiDB, bukan mengisi data contoh.

## 10. Persistensi dan kondisi gagal

- Server/TiDB adalah sumber utama akun, presensi, izin, misi, laporan, dan pengaturan. Cache/state bukan bukti operasi berhasil.
- Data admin memiliki cakupan penuh; jangan menerapkan filter mentor/peserta pada hasil admin.
- Aturan snapshot: katalog dan pengaturan hanya ditulis admin; misi melalui API khusus; peserta tidak boleh menimpa status review staf.
- Refresh bersamaan tidak boleh menimpa perubahan terbaru dengan snapshot usang (acuan menggunakan revision guard untuk presensi).
- Bedakan loading, kosong, error, dan sukses. Saat offline/timeout, jangan tampilkan sukses atau menghapus data UI seolah backend berhasil.
- Untuk hapus akun, hapus massal, dan hapus misi, minta konfirmasi yang menyebut target. Hapus dari UI hanya setelah server berhasil.

## Checklist parity refactor

- [ ] Navigasi admin membuka halaman yang benar.
- [ ] API/server membatasi role dan cakupan program.
- [ ] Dashboard memuat roster lengkap dan menyetujui hanya presensi mentor pending.
- [ ] Perubahan status/manual attendance mencatat reviewer dan tersimpan.
- [ ] Impor/ekspor/CRUD akun menjaga aturan kredensial dan akun admin.
- [ ] Persetujuan izin membuat record hanya untuk hari kerja; penolakan tidak membuat record.
- [ ] Misi, review, poin, dan laporan tetap konsisten setelah reload.
- [ ] Filter rekap dan ekspor identik.
- [ ] Pengaturan lokasi/jam memengaruhi presensi dan penyimpanan parsial mempertahankan properti lain.
- [ ] Operasi punya state loading, kosong, sukses, dan gagal yang sesuai hasil backend.

## File acuan

- Navigasi/role: `src/App.tsx`, `src/components/Sidebar.tsx`
- State, aksi, persistensi: `src/context/AppContext.tsx`
- Dashboard presensi: `src/components/Dashboard/AdminDashboard.tsx`
- Akun/program: `src/components/Trainee/TraineeManagementView.tsx`
- Izin: `src/components/Leave/LeaveManagementView.tsx`
- Misi: `src/components/Missions/MissionManagementView.tsx`
- Laporan: `src/components/DailyReport/DailyReportView.tsx`
- Rekap: `src/components/Recap/MonthlyRecapView.tsx`
- Pengaturan: `src/components/Settings/SettingsView.tsx`
- Otorisasi/backend: `server/index.ts`, `server/appData.ts`

