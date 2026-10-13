# Rencana Refactor 05: Safety Net, Kontrak Perilaku, dan Gerbang Verifikasi

Dokumen ini melengkapi `README.md` serta rencana `01`–`04` yang sudah ada. Fokusnya bukan menambah lapisan arsitektur baru, melainkan memastikan refactor Hadirku / Absensi PSA dilakukan bertahap, dapat diverifikasi, dan tidak mengubah perilaku aplikasi secara tidak sengaja.

> **Prinsip utama:** refactor mengubah struktur internal, bukan perilaku yang terlihat oleh pengguna. Perubahan perilaku harus direncanakan dan ditinjau sebagai perubahan fitur tersendiri.

---

## 1. Hubungan dengan Dokumen yang Sudah Ada

- `README.md`: tetap menjadi ringkasan masalah, sasaran, dan urutan fase.
- `01-frontend-components.md`: tetap menjadi panduan dekomposisi komponen UI.
- `02-state-management-context.md`: tetap menjadi panduan modularisasi Context dan hooks.
- `03-backend-restructuring.md`: tetap menjadi panduan pemisahan backend.
- `04-implementation-roadmap.md`: tetap menjadi checklist eksekusi utama.
- **Dokumen ini (`05-refactor-safety-and-verification.md`)**: menetapkan prasyarat, kontrak perilaku, gerbang verifikasi, serta cara pemulihan jika ditemukan regresi.

Dokumen ini tidak menggantikan dokumen lama. Jika ada konflik, jangan menebak: perbarui dokumen yang berkaitan dan sepakati keputusan sebelum implementasi berlanjut.

---

## 2. Tahap 0 — Baseline Sebelum Mengubah Kode

Selesaikan tahap ini sebelum Sprint 1 pada `04-implementation-roadmap.md`.

### 2.1 Simpan kondisi awal

- [ ] Pastikan perubahan lokal yang belum selesai sudah disimpan atau di-commit dengan aman.
- [ ] Buat branch khusus refactor, misalnya `refactor/architecture-cleanup`.
- [ ] Catat commit dasar yang menjadi titik pembanding.
- [ ] Pastikan aplikasi dapat dijalankan dengan instruksi project saat ini.
- [ ] Jalankan pemeriksaan yang memang tersedia di project dan catat hasilnya.
- [ ] Pisahkan error yang sudah ada sebelum refactor dari error baru yang muncul sesudah perubahan.

Contoh perintah berikut hanya digunakan jika sesuai dengan scripts dan konfigurasi project:

```bash
git status
git switch -c refactor/architecture-cleanup
npm run lint
npx tsc --noEmit
npm run build
```

Jangan menganggap semua perintah tersedia. Periksa `package.json` terlebih dahulu dan gunakan script yang benar-benar didefinisikan. Jangan mengubah konfigurasi lint/type-check semata-mata untuk membuat pemeriksaan tampak lulus.

### 2.2 Catat baseline perilaku

Buat catatan singkat untuk alur yang akan disentuh:

- Login Admin, Mentor, dan Trainee.
- Sesi setelah halaman di-refresh dan proses logout.
- Presensi masuk/keluar, termasuk mode WFO/WFH jika tersedia.
- Validasi lokasi, foto, keterlambatan, dan verifikasi presensi.
- Pengajuan serta persetujuan izin/sakit.
- Pembuatan misi, pengumpulan submission, review, dan perhitungan poin.
- Pengiriman serta review laporan harian.
- CRUD user, import/export Excel, dan pembuatan kredensial.
- Rekap bulanan dan Hall of Fame.

Jangan menganggap seluruh daftar selalu relevan untuk setiap perubahan. Uji alur yang terdampak langsung dan jalankan smoke test yang lebih luas pada gerbang fase.

---

## 3. Kontrak Perilaku yang Tidak Boleh Berubah Diam-Diam

Sebelum memindahkan modul, identifikasi kontrak yang digunakan oleh komponen lain atau pengguna. Dokumentasikan kontrak yang relevan; tidak harus membuat spesifikasi lengkap untuk semua endpoint sekaligus.

### 3.1 Kontrak API

Untuk endpoint yang terdampak, catat:

- HTTP method dan path.
- Bentuk request body, query parameter, dan parameter path.
- Bentuk response sukses.
- Status HTTP dan bentuk response error yang digunakan frontend.
- Persyaratan autentikasi dan role.
- Efek samping yang diharapkan, termasuk perubahan database atau upload berkas.

Pertahankan kontrak yang ada selama refactor, kecuali perubahan kontrak secara eksplisit disetujui dan seluruh konsumennya diperbarui. Jangan menghapus endpoint lama hanya karena endpoint baru sudah dibuat.

### 3.2 Kontrak aturan bisnis

Periksa secara khusus aturan yang berpengaruh pada data dan hasil operasional:

- Penentuan status hadir/terlambat dan perhitungan penalti.
- Aturan clock-in/clock-out dan pencegahan presensi ganda.
- Transisi status izin, submission misi, dan laporan harian.
- Perhitungan poin dan rekap.
- Aturan role dan kepemilikan data.
- Perilaku import/export dan penanganan data duplikat.

Jika perilaku lama ternyata merupakan bug, jangan memperbaikinya diam-diam dalam commit refactor. Catat sebagai isu terpisah, lalu putuskan apakah perbaikan itu masuk perubahan fitur tersendiri.

---

## 4. Gerbang Verifikasi untuk Setiap Perubahan

Setiap langkah refactor harus kecil dan dapat ditinjau. Setelah satu komponen, domain, atau kelompok endpoint selesai dipindahkan:

1. **Periksa diff:** pastikan perubahan terutama menyangkut pemindahan struktur, bukan perubahan aturan bisnis yang tidak disengaja.
2. **Jalankan pemeriksaan statis:** gunakan lint dan type-check yang tersedia.
3. **Jalankan build:** pastikan aplikasi dapat dibangun.
4. **Jalankan test terkait:** unit/integration test yang tersedia untuk kode yang diubah.
5. **Jalankan smoke test manual:** verifikasi alur pengguna yang terdampak.
6. **Tinjau kontrak:** pastikan endpoint, role, response, dan efek samping tetap sesuai.
7. **Commit perubahan yang lulus:** gunakan pesan commit yang menjelaskan modul dan tujuan perubahan.

Contoh pola commit:

```text
refactor(ui): extract trainee management modals
refactor(state): introduce attendance domain context
refactor(api): separate attendance routes and controller
test(attendance): cover clock-in business rules
```

Contoh tersebut hanya konvensi yang disarankan, bukan syarat penggunaan format commit tertentu.

**Aturan berhenti:** jika build, test, atau alur kritis gagal, jangan lanjut ke domain berikutnya. Tentukan dahulu apakah penyebabnya perubahan baru, masalah baseline, atau lingkungan pengujian.

---

## 5. Strategi Pengujian Bertahap

Tidak perlu membuat test suite lengkap sebelum memulai semua pekerjaan. Prioritaskan pengujian berdasarkan risiko.

### P0 — Lindungi aturan bisnis kritis

Tambahkan atau pastikan tersedia pengujian untuk:

- Perhitungan keterlambatan dan penalti.
- Pencegahan presensi ganda serta aturan clock-in/clock-out.
- Otorisasi role untuk operasi sensitif.
- Perubahan status izin, submission, dan laporan.
- Perhitungan poin/rekap yang memengaruhi hasil pengguna.

### P1 — Lindungi kontrak integrasi

Tambahkan pengujian untuk endpoint yang diubah, terutama:

- Login dan pemulihan sesi.
- Presensi serta verifikasi.
- Pengajuan izin.
- Misi, submission, dan review.
- CRUD user dan import data.

Gunakan database pengujian atau fixture yang terisolasi. Jangan menjalankan tes destruktif terhadap database produksi.

### P2 — Lindungi pengalaman antarmuka

Uji manual atau otomatis untuk:

- Modal membuka/menutup, validasi form, loading, dan error.
- Pemilihan baris dan aksi massal pada tabel.
- Polling/refresh data dan pembaruan UI setelah mutasi.
- Import/export file.
- Kondisi kosong, data gagal dimuat, dan akses berdasarkan role.

Gunakan alat test yang sudah ada bila memadai. Jika belum ada, pilih alat setelah memeriksa konfigurasi project; jangan menambahkan beberapa framework pengujian sekaligus tanpa kebutuhan.

---

## 6. Pedoman Batas Tanggung Jawab dan Dependensi

Pedoman ini melengkapi dokumen arsitektur; tidak mewajibkan penambahan layer baru di semua tempat.

### Frontend

- Komponen UI sebaiknya fokus pada rendering dan interaksi yang terkait langsung.
- Custom hook digunakan ketika logika state/efek memang kompleks atau digunakan ulang; jangan memindahkan setiap `useState` ke hook hanya demi pemisahan.
- Komponen yang hanya memerlukan satu domain sebaiknya menggunakan hook domain tersebut, bukan `useApp()` gabungan, setelah migrasi aman dilakukan.
- Pertahankan `useApp()` sementara untuk kompatibilitas, lalu migrasikan konsumennya bertahap.
- Pastikan provider yang bergantung pada autentikasi/pengaturan memiliki urutan dan siklus hidup yang jelas.
- Stabilkan nilai Context atau pecah Context lebih lanjut hanya bila pengukuran menunjukkan masalah render yang nyata.

### Backend

- `routes/`: deklarasi path dan middleware yang berlaku.
- `controllers/`: adaptasi request/response HTTP dan pemetaan error ke response.
- `services/`: aturan bisnis dan orkestrasi operasi.
- Akses SQL dapat tetap berada di service pada tahap awal jika sesuai kompleksitas project; repository layer tidak wajib ditambahkan hanya demi mengikuti pola.
- Service tidak boleh bergantung pada objek Express `req`/`res`.
- Gunakan transaksi untuk operasi multi-query yang wajib konsisten.
- Tangani error secara konsisten tanpa mengirim stack trace, token, password, atau rahasia lain kepada client.
- Validasi input di batas API dan validasi aturan bisnis di layer yang tepat.

### Shared utility

Untuk aturan yang dipakai frontend dan backend, tentukan satu sumber kebenaran jika memungkinkan. Namun, jangan memaksakan import lintas lingkungan bila itu menimbulkan masalah bundling atau membawa dependency server ke frontend. Jika belum aman untuk disatukan, pertahankan dua implementasi sementara dengan test yang memastikan hasilnya konsisten.

---

## 7. Data, Migrasi, dan Pemulihan

Refactor seharusnya tidak mengubah skema database. Jika perubahan skema memang diperlukan, pisahkan sebagai migrasi tersendiri dan dokumentasikan.

- [ ] Jangan menjalankan test destruktif pada database produksi.
- [ ] Pastikan backup tersedia dan prosedur restore diketahui sebelum perubahan berisiko.
- [ ] Uji perubahan pada lingkungan lokal/staging terlebih dahulu jika lingkungan tersebut tersedia.
- [ ] Jangan menghapus endpoint lama sampai semua konsumen berpindah dan penggunaan endpoint lama sudah diverifikasi.
- [ ] Untuk deployment, siapkan langkah kembali ke versi aplikasi sebelumnya.
- [ ] Setelah deployment, periksa log error dan jalankan smoke test.
- [ ] Jangan menyatakan rollback aman sebelum langkahnya benar-benar diketahui dan dapat dijalankan.

Rollback kode tidak otomatis membatalkan perubahan data. Karena itu, hindari menggabungkan refactor kode dengan migrasi data yang tidak kompatibel.

---

## 8. Definition of Done yang Diperbarui

Satu unit refactor dapat dianggap selesai jika kriteria yang relevan berikut terpenuhi:

- [ ] Tanggung jawab modul lebih jelas dan dependensinya dapat ditelusuri.
- [ ] Perilaku yang harus dipertahankan telah diverifikasi.
- [ ] Lint, type-check, dan build yang tersedia lulus, atau kegagalan baseline yang sudah diketahui telah didokumentasikan dengan jelas.
- [ ] Test yang relevan lulus; kekurangan cakupan test dicatat sebagai pekerjaan lanjutan.
- [ ] Kontrak API, role, dan efek samping tidak berubah tanpa persetujuan.
- [ ] Tidak ada error baru yang belum dijelaskan.
- [ ] Diff mudah ditinjau dan perubahan telah di-commit.
- [ ] Langkah pemulihan diketahui untuk perubahan yang berisiko.

Batas jumlah baris file pada dokumen lain tetap menjadi indikator untuk mengevaluasi kompleksitas, bukan satu-satunya syarat kelulusan.

---

## 9. Checklist Eksekusi Ringkas

Gunakan checklist ini untuk setiap unit kerja:

- [ ] Baseline dan perilaku yang harus dipertahankan sudah dipahami.
- [ ] Batas modul dan dependensi sudah ditentukan.
- [ ] Refactor dilakukan tanpa mencampur perubahan fitur yang tidak terkait.
- [ ] Pemeriksaan statis dan build dijalankan.
- [ ] Test serta smoke test yang relevan dijalankan.
- [ ] Kontrak API dan aturan bisnis diverifikasi jika terdampak.
- [ ] Diff ditinjau, lalu perubahan di-commit.
- [ ] Catatan atau dokumentasi diperbarui bila keputusan arsitektur berubah.

**Kesimpulan:** gunakan dokumen ini sebagai gerbang keselamatan dan verifikasi untuk menjalankan roadmap yang sudah ada. Jangan menambah kompleksitas arsitektur sebelum ada bukti bahwa project membutuhkannya.
