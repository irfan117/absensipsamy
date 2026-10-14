# Analisis Role Siswa / Trainee

Dokumen ini merangkum perilaku role `trainee` yang terimplementasi pada frontend dan backend. Label UI memakai “Peserta”, “Peserta Magang”, atau “Siswa”; nilai role pada model dan token adalah `trainee`. Catatan membedakan kontrol tampilan dari pembatasan server agar refactor tidak menganggap UI saja sebagai otorisasi.

## 1. Sesi, autentikasi, dan navigasi

- Form login bersama semua role menerima kode login/NIM serta password. Kode dipangkas dari spasi; UI menolak kode kosong dan password kosong. Role diambil dari hasil server, bukan pilihan pengguna. Login memanggil `POST /api/auth/login`; sukses mengaktifkan sesi JWT/cookie, memasukkan pengguna ke state, dan membuka tab `dashboard`. Error server ditampilkan; fallback client: “Login gagal.”
- Token juga disimpan di `sessionStorage` sebagai `hadirku_session_token`; request mengirim `Authorization: Bearer ...` bila tersedia dan selalu `credentials: include`. Kegagalan respons non-JSON dibedakan (404 API Vercel atau backend gagal start); HTTP error memakai `message`/`error` respons.
- Saat startup, sesi dipulihkan melalui endpoint `/api/auth/me` (lihat inisialisasi `AppContext`); data aplikasi dimuat dari `/api/app-data`. Jika pemuatan gagal, status TiDB menjadi `offline` dan `appDataReady` tetap false. Logout memanggil `POST /api/auth/logout` secara best-effort, lalu mengosongkan token, pengguna aktif, dan state pengguna.
- Menu trainee: Dashboard Presensi, Laporan Harian, Misi Kejuruan, Hall of Fame, Rekap Kehadiran, Pengajuan Izin, Profil Saya. Navigasi mobile bawah menyediakan Dashboard, Laporan, Izin, dan Menu & Profil. Tab dipilih melalui state `activeTab`, bukan router URL. Tampilan dashboard menyertakan nama/tanggal; halaman detail memiliki judul masing-masing. Badge role ditampilkan sebagai Peserta.
- Tema pilihan light/dark/system disimpan di localStorage global (`absensi-ojt-psa-theme`), berlaku lintas role.

## 2. Dashboard presensi dan check-in/check-out

### Data dan tampilan

- Dashboard hanya mengambil record milik `currentUser.id`; record hari ini menentukan tombol/status. Ringkasan bulan berjalan menghitung jumlah `hadir`, `terlambat`, `izin`, `sakit`, `alpha`; persentase = (hadir + terlambat) / seluruh record status tersebut, dibulatkan. Bila belum ada record persentase ditampilkan 100%.
- Menampilkan program kejuruan dan nama mentor dari katalog (fallback label “Instruktur Kejuruan”), lokasi kantor, status check-in dan status verifikasi. Kehadiran trainee berstatus pending sampai mentor memverifikasi; tampilan menyebut mentor binaan.
- Bila waktu lokal melewati `09:00`, belum check-in, dan tidak ada izin disetujui hari ini, peringatan keterlambatan ditampilkan. UI mengamati `settings.lateLimitTime`, tetapi teks/banner membandingkan literal `09:00`; klasifikasi backend memakai `settings.lateLimitTime`.
- Tombol untuk ekspor PDF rekap personal bulan berjalan menggunakan utilitas `exportToPDF` dan hanya mengirim data pengguna saat ini dan record pribadinya.

### Check-in

1. Pengguna dapat memasukkan catatan agenda opsional dan memilih WFO atau WFH sebelum check-in (default dari record hari ini atau WFO). Pilihan terkunci setelah check-in.
2. Aksi meminta geolokasi browser dengan high accuracy, timeout 15 detik, cache 0. Browser tanpa Geolocation atau error permission/timeout/lokasi menghasilkan pesan UI; tidak membuat presensi.
3. WFO membandingkan koordinat dengan titik dan radius kantor di pengaturan memakai jarak Haversine; WFH tetap merekam koordinat GPS, tanpa pembatasan radius. UI menjelaskan aturan yang sama.
4. `clockIn` menolak bila record hari ini sudah punya `checkInTime` (“Anda sudah melakukan Check-In…”). Status menjadi `terlambat` bila waktu WIB lebih besar dari `lateLimitTime:00`, selain itu `hadir`.
5. Record mencakup identitas trainee, program, tanggal, waktu, status, lokasi/mode, koordinat, catatan (default “Terlambat check-in” atau “Hadir tepat waktu”), dan URL foto fallback bawaan. Record trainee selalu `verificationStatus: pending`.
6. Disimpan langsung lewat `PUT /api/app-data/attendance`. Hanya setelah respons sukses beserta `attendanceRecord`, state lokal diperbarui. Gagal menyimpan membuat TiDB offline dan mengembalikan pesan gagal; sukses menampilkan waktu, tepat waktu/terlambat, dan menunggu verifikasi mentor.

### Check-out

- Tombol berubah menjadi Check-out setelah check-in. Check-out ditolak jika belum check-in, sudah check-out, atau (WFO) berada di luar radius. WFH melewati pemeriksaan radius. Check-out merekam waktu dan koordinat baru; menambahkan catatan selesai hanya jika dikirimkan.
- Penyimpanan memakai endpoint presensi yang sama; state diperbarui hanya jika server mengembalikan record sukses. Gagal menampilkan pesan bahwa check-out belum tersimpan. Sukses menampilkan sesi selesai.
- Izin disetujui untuk hari ini menonaktifkan aksi presensi. Jika check-out sudah tercatat, aksi hari ini juga tidak dapat diulang.

## 3. Laporan harian / jurnal magang

- Form trainee memilih tanggal (default hari ini), deskripsi kegiatan wajib (trim dan tidak boleh kosong), foto opsional, dan tautan hasil kerja opsional. Foto hanya menerima MIME `image/*`, maksimum 5 MB; diunggah ke Cloudinary folder `hadirku/reports` melalui `POST /api/upload/signature`, lalu upload langsung ke Cloudinary. Gagal upload menampilkan error, membersihkan URL/nama foto dan input file.
- Pengiriman mencari laporan dengan trainee dan tanggal yang sama. Jika tidak ada: membuat record `pending` dengan identitas trainee/program dan waktu ISO; jika ada berstatus `rejected`: memperbarui laporan yang sama, mengosongkan data review, mengubah status menjadi pending; jika status `pending` atau `approved`: ditolak dengan “Kamu sudah mengumpulkan laporan untuk tanggal ini.”
- Sukses membersihkan deskripsi/foto/tautan dan menampilkan toast. Gagal validasi/duplikat mempertahankan form dan menampilkan error. Tombol dinonaktifkan untuk laporan tanggal yang pending atau approved; rejected dapat dikirim ulang.
- Riwayat hanya memfilter `traineeId` pengguna aktif, urut tanggal menurun, menampilkan status, waktu, deskripsi, foto (modal preview), serta catatan mentor. Data laporan disimpan dalam state lalu snapshot `PUT /api/app-data`; autosave backend membatasi record trainee ke dirinya. Belum ada endpoint khusus submit laporan pada client ini.

## 4. Misi kejuruan dan pengumpulan tugas

- Daftar misi yang diterima trainee dibatasi backend pada program `kejuruanId` miliknya; UI menetapkan filter awal sesuai program/nama trainee. Daftar dapat dicari/difilter program/kesulitan/status yang tersedia dalam UI. Kartu menampilkan instruksi, kategori, kesulitan, deadline, mentor, poin, dan status pengumpulan.
- Trainee dapat mengirim tautan hasil kerja opsional (field bertipe URL) dan catatan wajib (HTML `required`). Identitas dan poin diambil dari pengguna/misi aktif, waktu pengiriman dibuat client, status awal `pending`.
- Submission yang sudah `approved` tidak dapat diajukan lagi dan menghasilkan pesan “Anda sudah menyelesaikan misi ini dan poin telah diterima.” Submission yang belum approved (pending/rejected) diperbarui menggunakan ID submission sebelumnya dan dikembalikan ke pending; tanpa submission sebelumnya, record baru dibuat. Sukses memberi confetti dan pesan pengiriman ke mentor.
- Poin hanya dihitung dari submission approved; total poin dan jumlah misi selesai dipakai leaderboard. Feedback/review serta pemberian poin dilakukan mentor/admin, bukan trainee. Misi dibuat/diubah/dihapus oleh role lain.
- Client mempertahankan submission di state dan menyimpannya melalui `/api/app-data` snapshot. Backend trainee hanya menyimpan record submission miliknya; update trainee memaksa status pending dan tidak mengizinkan trainee menimpa hasil review (lihat upsert/review-update `server/appData.ts`).

## 5. Hall of Fame

- Saat role trainee, halaman meminta `GET /api/app-data/hall-of-fame/trainees`. Backend hanya mengizinkan trainee; role lain menerima 403 dengan pesan bahwa peringkat hanya tersedia bagi peserta. Hasil backend memuat ringkasan seluruh trainee (nama, NIM, avatar/program, poin total submission approved, jumlah misi selesai). Query menghitung jumlah poin dari status approved.
- UI menampilkan status loading, kegagalan “Peringkat peserta belum dapat dimuat. Coba muat ulang halaman.” atau daftar; kegagalan dicatat ke console. Tidak ada tombol retry khusus selain reload halaman.
- Ranking diurut poin menurun, lalu jumlah misi selesai menurun, rank berurutan. Tingkat badge: baru (0), aktif (>0), aspirant (>=100), expert (>=200), master (>=350). Pengguna melihat peringkat dirinya, podium 3 teratas, pencarian nama/NIM/program dan filter kejuruan.
- Detail menampilkan profil, poin, rank, badge dan submission approved. Catatan kode UI mengindikasikan rincian misi peserta lain tidak ditampilkan; rincian submission yang cocok tersedia hanya jika data submission ada di state. Kegagalan pemuatan leaderboard tidak otomatis diganti data lokal untuk trainee.

## 6. Rekap kehadiran pribadi

- Trainee selalu dihitung sebagai satu-satunya peserta (`[currentUser]`), program filter dipaksa ke kejuruan sendiri, dan efek menjaga baris pribadi terbuka. Tidak ada kontrol pemilihan pengguna/program yang mengubah cakupan.
- Dapat memilih bulan/tahun, pencarian/predikat bila ditampilkan, mode ringkasan atau rincian tanggal, membuka rincian per hari, dan mengunduh slip Excel/PDF. Fungsi ekspor menerima pengguna dan record kehadiran yang tersedia; ekspor tidak memanggil API khusus.
- Ringkasan dan kalender membedakan hadir, terlambat, izin, sakit, alpha, libur/tanpa record; rincian menghubungkan laporan harian pada trainee dan tanggal. Data presensi trainee di `/api/app-data` dibatasi ke `user_id` sendiri, sehingga rekap pribadi tidak seharusnya mendapat presensi peserta lain.

## 7. Pengajuan izin/sakit

- Form hanya ditampilkan untuk trainee. Pilihan jenis `izin` atau `sakit`; tanggal mulai dan akhir wajib, akhir memiliki atribut `min` = tanggal mulai; alasan wajib dan diperiksa trim agar tidak kosong. Tautan lampiran wajib, tipe URL, maksimum 2048 karakter; handler menerima hanya URL `http:`/`https:` yang valid. Error validasi ditampilkan dengan `alert`.
- Jenis izin menyediakan unduhan surat `.doc` yang dibuat lokal dari HTML berisi nama, NIM, program, tanggal dan alasan. Nilai di-escape HTML; sakit meminta tautan surat keterangan medis. Pengguna mengunggah/berbagi berkas sendiri lalu menempelkan tautannya.
- Submit memanggil `POST /api/leaves` dengan tipe, tanggal, alasan, attachmentUrl. Endpoint mewajibkan role trainee, membuat pemohon dari identitas token (bukan identitas kiriman), status `pending`, dan mengembalikan request + message. Sukses memasukkan request ke state, membersihkan alasan/URL dan menampilkan pesan; respons gagal/exception diberitahukan lewat alert dan form tidak direset.
- Daftar “Pengajuan Saya” hanya menampilkan `userId` aktif dan memperlihatkan rentang tanggal, tipe/jumlah hari, alasan, lampiran, status pending/approved/rejected, reviewer/catatan bila tersedia. Backend `/api/app-data` membatasi leave trainee pada `user_id` sendiri. Tidak ada kontrol edit/hapus pengajuan trainee.
- UI memblokir aksi presensi jika ada permohonan approved yang mencakup hari ini. Pada persetujuan, proses review membuat/mengganti record presensi pada hari kerja (Senin–Jumat) di rentang izin dengan status izin/sakit; implementasi ini berada pada alur review mentor.

## 8. Profil dan keamanan akun

- Profil menampilkan nama, role, NIM/kode login, dan avatar. Foto dapat dipilih dengan `image/*`, dibatasi maksimum 5 MB, diunggah ke Cloudinary folder `hadirku/profile` setelah meminta signature backend (`POST /api/upload/signature`), lalu URL disimpan lewat `PUT /api/profile/avatar`. Sukses memperbarui pengguna aktif; format/ukuran/upload/simpan gagal ditampilkan sebagai status error.
- Ganti password mewajibkan semua tiga field, password baru harus tepat 8 digit angka, konfirmasi harus sama. Lalu `POST /api/auth/change-password` memakai password lama dan baru. Pesan server ditampilkan; pada sukses seluruh field dikosongkan. Kegagalan jaringan/server ditangkap context dan ditampilkan sebagai error.
- Endpoint avatar dan password memerlukan autentikasi. Password baru diverifikasi lagi di server; aturan rinci response mengikuti validasi route di `server/index.ts`.

## 9. Data, API, batas akses dan kegagalan lintas fitur

- `GET /api/app-data` memerlukan JWT. Untuk trainee backend memfilter attendance, leave, submissions, dan daily reports dengan ID dirinya; misi difilter menurut program; daftar kejuruan difilter ke program pengguna. Pengaturan presensi dibaca dari konfigurasi server. Hall of Fame adalah endpoint terpisah yang memang mengembalikan agregat seluruh peserta.
- `PUT /api/app-data` snapshot mengirim attendance, leave, mission submissions, dan daily reports dari state; kejuruan dikirim hanya admin, misi dan settings kosong/null karena disimpan lewat jalur terpisah. Autosave debounce 350 ms. Backend melakukan scope trainee, melewatkan row bukan milik sendiri, menetapkan status pengajuan trainee `pending`, serta menjaga kolom review agar tidak diubah oleh trainee. Kegagalan autosave membuat status TiDB `offline` dan tercatat di console; tidak ada notifikasi toast global.
- Check-in/check-out memiliki persistensi langsung `PUT /api/app-data/attendance`, disusul update state hanya setelah response sukses. `persistAttendanceRecord` menangkap error dan mengembalikan null; refresh presensi setelah penulisan menunggu promise penulisan yang aktif.
- Upload gambar: signature memerlukan token, upload gambar dilakukan langsung ke Cloudinary; error HTTP atau tidak adanya `secure_url` menjadi error. Cloudinary memerlukan konfigurasi server yang berfungsi.
- Request API memakai JSON dan cookie; HTTP non-2xx menjadi exception memakai `message` dan opsional `error`. Tidak semua aksi frontend menampilkan error via toast; per fitur di atas disebut mekanisme aktualnya.
- Endpoint penting yang dipakai trainee: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`, `GET /api/app-data`, `PUT /api/app-data`, `PUT /api/app-data/attendance`, `GET /api/app-data/hall-of-fame/trainees`, `POST /api/leaves`, `PUT /api/profile/avatar`, `POST /api/upload/signature`, dan upload langsung Cloudinary. Mission/report submissions dikirim melalui snapshot data aplikasi, bukan route khusus dari alur trainee ini.

## 10. Perilaku penting untuk dipertahankan saat refactor

1. Identitas trainee berasal dari sesi terautentikasi; query dan mutasi data pribadi harus tetap terscope ke ID itu di server.
2. Check-in satu kali per hari, check-out hanya sesudah check-in dan satu kali, geofence WFO menggunakan konfigurasi server, WFH tetap meminta/merekam GPS tanpa geofence, klasifikasi terlambat memakai `lateLimitTime`, verifikasi trainee menunggu mentor.
3. Izin approved menonaktifkan presensi hari terkait. Pengajuan izin/sakit selalu pending saat diajukan; bukti berupa URL HTTP(S), dan riwayat hanya milik sendiri.
4. Laporan harian satu per trainee per tanggal; hanya status rejected yang dapat dikirim ulang, dengan ID sama dan metadata review dibersihkan.
5. Submission misi pending/rejected dapat diperbarui; approved tidak dapat diajukan ulang. Poin hanya dihitung setelah approved.
6. Rekap dan ekspor trainee adalah personal; leaderboard adalah pengecualian yang sengaja menampilkan peringkat agregat semua trainee.
7. Upload foto membatasi MIME gambar dan 5 MB serta memakai Cloudinary; perubahan avatar/laporan baru dianggap sukses setelah langkah simpan yang sesuai.
8. Validasi frontend dan backend tidak identik di semua modul. Pertahankan aturan dari kedua lapisan dan status/error yang relevan, bukan hanya tampilan form.

## Referensi source utama

- `src/App.tsx`, `src/components/Sidebar.tsx`
- `src/context/AppContext.tsx`, `src/context/ThemeContext.tsx`
- `src/components/Dashboard/TraineeDashboard.tsx`
- `src/components/DailyReport/DailyReportView.tsx`
- `src/components/Missions/MissionManagementView.tsx`
- `src/components/HallOfFame/HallOfFameView.tsx`
- `src/components/Recap/MonthlyRecapView.tsx`, `src/utils/exportUtils.ts`
- `src/components/Leave/LeaveManagementView.tsx`
- `src/components/Profile/ProfileView.tsx`, `src/services/api.ts`
- `server/index.ts`, `server/appData.ts`
