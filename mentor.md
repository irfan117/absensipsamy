# Analisis Role Mentor

Dokumen ini merangkum perilaku role **mentor** pada project PSA sebagai acuan refactor. Tujuannya mempertahankan fitur, aksi, alur status, dan batas akses yang tampak pada implementasi saat ini.

## 1. Identitas dan akses

- Role tersimpan sebagai `mentor` (`src/types/index.ts`). Login satu form; role berasal dari akun terautentikasi, bukan pilihan pengguna (`src/components/Auth/LoginView.tsx`).
- `App.tsx` mengarahkan tab `dashboard` dan `presensi` untuk mentor ke `MentorDashboard`.
- Sidebar mentor menyediakan: **Verifikasi Peserta**, **Laporan Harian**, **Misi Kejuruan**, **Hall of Fame Peserta**, **Rekap Bulanan**, **Verifikasi Izin**, dan **Profil Saya** (`src/components/Sidebar.tsx`).
- Badge menu menghitung item pending yang relevan untuk presensi peserta hari ini, laporan, misi, dan izin.
- Data lintas halaman dikelola melalui `AppContext`; operasi persisten memakai service API/server. Refactor perlu mempertahankan sinkronisasi tampilan dan penyimpanan server, bukan hanya perubahan state lokal.

## 2. Ruang lingkup peserta dan kejuruan

- Fungsi umum `getMentorKejuruanIds` mengembalikan ID kejuruan akun mentor jika role mentor dan ID tersebut ada di katalog (`src/utils/mentorKejuruan.ts`).
- Dashboard juga memakai ID, nama kejuruan mentor, nama program, serta beberapa pemetaan nama mentor khusus. Pencocokan nama dinormalisasi ke huruf kecil dan mendukung kecocokan nama yang mengandung nama lain.
- Daftar peserta kelas biasanya dibatasi berdasarkan ID/nama kejuruan yang cocok dengan mentor.
- **Perbedaan implementasi yang perlu dijaga atau disepakati saat refactor:** halaman laporan dan izin terutama memfilter dengan `currentUser.kejuruanId`; rekap memakai daftar ID mentor; dashboard dan misi mempunyai fallback pencocokan nama/subprogram. Jangan menyederhanakan scope semua halaman menjadi satu filter tanpa memastikan dampaknya.

## 3. Dashboard dan presensi mentor

### Presensi mentor sendiri

- Mentor dapat melakukan **check-in** dan **check-out** untuk hari berjalan.
- Check-in menggunakan waktu WIB, menentukan status `hadir` atau `terlambat` berdasarkan pengaturan batas waktu, serta menyimpan catatan/lokasi dan data presensi.
- Catatan default check-in adalah kegiatan memfasilitasi pelatihan; catatan check-out memiliki teks default bahwa sesi pelatihan selesai.
- Presensi mentor berstatus menunggu verifikasi admin. Check-in ulang pada hari yang sama tidak membuat catatan baru; UI menampilkan waktu check-in yang sudah tersimpan.
- Dashboard memuat ulang data pengguna dan presensi saat halaman mendapat fokus serta secara berkala setiap 15 detik.

### Presensi peserta

- Dashboard memperlihatkan peserta bimbingan, catatan presensi hari ini, statistik hadir/terlambat/izin/sakit, yang belum absen, tingkat kehadiran, dan jumlah verifikasi pending.
- Mentor dapat memverifikasi satu presensi peserta atau menyetujui semua presensi pending yang tampil untuk kelasnya.
- Aksi cepat dapat mengubah status peserta kehadiran. Jika catatan sudah ada, statusnya diperbarui; jika belum, sistem membuat catatan manual. Status manual langsung terverifikasi dan pencatatnya adalah mentor.
- Jenis status presensi mencakup `hadir`, `terlambat`, `izin`, dan `sakit`. Perhitungan penalti keterlambatan juga diterapkan ketika status diperbarui.
- Mentor dapat mengekspor rekap kelas ke Excel atau PDF.
- Prinsip status bertingkat: **peserta menunggu mentor; mentor menunggu admin; admin otomatis terverifikasi**.

## 4. Laporan harian

- Mentor melihat laporan kegiatan peserta, termasuk foto, deskripsi, tanggal, nama/NIM, status, dan catatan review.
- Tersedia pencarian, filter status, filter kejuruan, pratinjau foto, dan daftar yang diurutkan dari pengajuan terbaru.
- Mentor membuka laporan lalu memilih **setujui** atau **kembalikan/tolak**, dengan catatan review opsional.
- Status laporan: `pending`, `approved`, atau `rejected`; hasil review dan catatan diperbarui ke server.
- Untuk mentor dengan `kejuruanId`, daftar laporan dan badge pending dibatasi ke ID kejuruan tersebut. Perilaku admin berbeda dan lebih luas.

## 5. Misi kejuruan

- Mentor dapat melihat misi dan submission peserta dalam cakupan program bimbingannya.
- Mentor dapat membuat, mengubah, dan menghapus misi; mengisi judul, deskripsi, poin, tingkat kesulitan, kategori, tenggat, panduan pengumpulan, dan program target.
- Misi baru dibuat dengan identitas mentor pembuat dan status aktif. Jika mentor menangani lebih dari satu program target, misi dapat diterbitkan untuk masing-masing target.
- Saat edit, target misi tetap program milik misi yang diedit; mentor tidak boleh memindahkan misi ke kejuruan di luar tanggung jawabnya.
- Mentor dapat memeriksa submission peserta dan mengelola data misi yang ia tangani. UI juga menyediakan aksi reset untuk misi/submission/review/poin yang dikelola mentor; aksi ini destruktif dan membutuhkan konfirmasi.
- Filter program, status submission, tingkat kesulitan, dan pencarian mempengaruhi daftar yang ditampilkan. Scope program mentor harus tetap diterapkan.

## 6. Pengajuan izin/sakit

- Daftar mentor menampilkan permohonan yang `kejuruanId`-nya sama dengan `currentUser.kejuruanId`.
- Mentor meninjau permohonan peserta dengan status pending lalu memilih setujui atau tolak; catatan review dapat disertakan.
- Peserta membuat pengajuan izin/sakit dengan jenis, rentang tanggal, alasan wajib, dan tautan lampiran HTTP/HTTPS yang valid. Mentor memproses pengajuan yang sudah masuk; form pengajuan utamanya untuk peserta.
- Badge verifikasi izin menghitung permohonan pending dalam scope mentor.
- Pastikan hasil persetujuan/penolakan mengubah status yang dilihat peserta dan rekap presensi sesuai mekanisme server yang ada.

## 7. Rekap bulanan

- Mentor dapat melihat ringkasan kehadiran bulanan peserta dalam cakupan kejuruan, mengganti bulan/tahun, mencari peserta, memfilter status/program/hari, serta membuka rincian per hari.
- Rekap menghitung dari daftar peserta dan record presensi; peserta yang tercakup umumnya dicari berdasarkan ID kejuruan mentor.
- Tersedia ekspor Excel/PDF. Aksi reset data presensi hanya ditampilkan untuk admin, bukan mentor.

## 8. Hall of Fame dan profil

- Menu Hall of Fame mentor membuka peringkat peserta (`HallOfFameView`); halaman peringkat mentor (`MentorHallOfFameView`) khusus admin.
- Mentor dapat melihat dan mengubah data profilnya sesuai fungsi halaman profil bersama, termasuk data diri dan penggantian kata sandi bila tersedia.

## 9. Aturan parity untuk refactor

1. Pertahankan identitas role dan pemilihan halaman berdasarkan role terautentikasi.
2. Terapkan otorisasi di backend untuk setiap mutasi; menyembunyikan tombol atau memfilter UI saja tidak cukup.
3. Pertahankan scope mentor ke peserta/kejuruan yang menjadi tanggung jawabnya pada **list, badge, detail, dan aksi tulis**.
4. Pertahankan alur status berbeda untuk presensi mentor dan peserta: presensi mentor diverifikasi admin, presensi peserta diverifikasi mentor.
5. Pertahankan aksi tunggal dan aksi massal, catatan review, umpan balik sukses/gagal, serta refresh data setelah perubahan.
6. Pertahankan penentuan terlambat, penalti, tanggal lokal/WIB, dan pembuatan presensi manual.
7. Jangan menghilangkan ekspor, filter, pencarian, pratinjau, atau detail yang tersedia dalam halaman mentor.
8. Untuk kesetaraan persis, validasi perilaku fallback nama kejuruan dan pemetaan mentor khusus di dashboard/misi. Implementasi ini berbeda dari filter sederhana berbasis `kejuruanId` pada laporan, izin, dan rekap.

## 10. Peta file utama

| Area | File |
|---|---|
| Role, navigasi, pemilihan halaman | `src/components/Sidebar.tsx`, `src/App.tsx` |
| Dashboard dan presensi mentor/peserta | `src/components/Dashboard/MentorDashboard.tsx`, `src/context/AppContext.tsx` |
| Scope kejuruan mentor | `src/utils/mentorKejuruan.ts` |
| Review laporan harian | `src/components/DailyReport/DailyReportView.tsx`, `src/context/AppContext.tsx` |
| Misi dan submission | `src/components/Missions/MissionManagementView.tsx`, `src/context/AppContext.tsx` |
| Review izin/sakit | `src/components/Leave/LeaveManagementView.tsx`, `src/context/AppContext.tsx` |
| Rekap dan ekspor | `src/components/Recap/MonthlyRecapView.tsx`, `src/utils/exportUtils.ts` |
| Bentuk data | `src/types/index.ts` |

> Catatan: analisis ini mengikuti kondisi kode yang dibaca saat ini. Sebelum menganggapnya sebagai spesifikasi backend lengkap, cocokkan juga pemeriksaan role dan scope pada endpoint server terkait.
