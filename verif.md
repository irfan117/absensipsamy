# FEATURE_CHECKLIST.md — Verifikasi Keberadaan Fitur Hadir Skill

> Tujuan: memastikan **semua fitur yang seharusnya ada menurut SRS v1.0 benar-benar ada dan bisa diakses** oleh peran yang tepat.
> Ini pemeriksaan **keberadaan & keterjangkauan** fitur, bukan pengujian mendalam (batas nilai, keamanan, dsb.).
> Sumber kebenaran: `SRS-Hadir_Skill.docx` (bagian 2.3, 3.1, 3.5, 5.3).

---

## Aturan Singkat

1. Login sebagai **tiap peran** (Admin, Mentor, Peserta) dan jelajahi seluruh menu/halaman.
2. Untuk tiap fitur, cari: **apakah ada halaman/menu/tombolnya, dan apakah bisa dipakai satu kali alur dasar** (happy path).
3. Catat **lokasinya** (nama menu / rute URL) agar mudah dilacak.
4. **Jangan mengubah kode.** Hanya periksa dan laporkan.
5. Jangan menilai hal di luar ruang lingkup: aplikasi mobile native, kebijakan WFH, hari libur, alpha otomatis, penggantian layanan pihak ketiga.

### Status

| Status | Arti |
| --- | --- |
| ✅ ADA | Fitur ada dan alur dasarnya berjalan |
| ⚠️ SEBAGIAN | Ada, tetapi ada bagian yang hilang atau rusak (jelaskan) |
| ❌ TIDAK ADA | Tidak ditemukan di UI maupun API |
| 🔒 BLOCKED | Tidak bisa dicek (kredensial/izin/layanan luar tidak tersedia) |

---

## 1. Inventaris Fitur per Peran

Isi kolom **Status** dan **Lokasi** untuk setiap baris.

### 1.1 Semua Peran (Admin, Mentor, Peserta)

| ID | Fitur yang harus ada | Status | Lokasi | Catatan |
| --- | --- | --- | --- | --- |
| FR-001 | Halaman login (kode 8 digit atau NIM/kode + kata sandi) | | | |
| FR-001 | Pesan kesalahan saat login gagal | | | |
| FR-003 | Navigasi/menu yang menyesuaikan peran | | | |
| FR-005 | Tombol keluar (logout) | | | |
| FR-006 | Ubah kata sandi | | | |
| FR-006 | Ubah foto profil | | | |
| FR-033 | Dashboard | | | |
| FR-034 | Rekap presensi dengan pilihan periode dan filter | | | |
| FR-035 | Ekspor rekap ke PDF | | | |
| FR-036 | Hall of Fame (peringkat) | | | |
| EI-04 | Seluruh teks, tanggal, dan status berbahasa Indonesia | | | |
| EI-01 | Tampilan dapat dipakai di desktop **dan** mobile | | | |

### 1.2 Peserta

| ID | Fitur yang harus ada | Status | Lokasi | Catatan |
| --- | --- | --- | --- | --- |
| FR-007/008 | Check-in dengan pilihan mode kerja (WFO / WFH) | | | |
| FR-009 | Pengambilan lokasi GPS saat check-in WFO | | | |
| FR-010 | Status hadir/terlambat tampil setelah check-in | | | |
| FR-011 | Check-out | | | |
| FR-014 | Status presensi & status verifikasi tampil di dashboard/rekap | | | |
| FR-015 | Form pengajuan izin/sakit (tanggal mulai, tanggal selesai, alasan, tautan lampiran) | | | |
| FR-019 | Daftar permohonan milik sendiri beserta status | | | |
| FR-020 | Form laporan harian (tanggal, deskripsi, tautan tugas, foto) | | | |
| FR-024 | Daftar laporan milik sendiri beserta status | | | |
| FR-027 | Daftar misi sesuai kejuruan sendiri | | | |
| FR-027 | Form pengumpulan hasil misi (tautan hasil + catatan) | | | |
| FR-029 | Tampilan status pengumpulan misi dan poin | | | |

### 1.3 Mentor

| ID | Fitur yang harus ada | Status | Lokasi | Catatan |
| --- | --- | --- | --- | --- |
| FR-007/008 | Check-in & check-out sendiri (WFO/WFH) | | | |
| FR-013 | Daftar presensi peserta + aksi setujui/tolak | | | |
| FR-017/018 | Daftar permohonan izin/sakit peserta + aksi setujui/tolak + catatan | | | |
| FR-022 | Daftar laporan harian peserta + pencarian/filter status & kejuruan | | | |
| FR-022 | Lihat isi laporan dan lampiran (foto/tautan) | | | |
| FR-023 | Aksi setujui/tolak laporan + catatan | | | |
| FR-025 | Buat misi (judul, deskripsi, kejuruan, poin, tingkat kesulitan, tenggat, kategori, panduan pengumpulan) | | | |
| FR-026 | Edit dan hapus misi | | | |
| FR-028 | Tinjau pengumpulan misi: umpan balik, keputusan, poin | | | |
| FR-032 | Hanya melihat peserta/kejuruan binaannya | | | |

### 1.4 Admin

| ID | Fitur yang harus ada | Status | Lokasi | Catatan |
| --- | --- | --- | --- | --- |
| FR-007/012 | Check-in & check-out sendiri (otomatis `verified`) | | | |
| FR-013 | Verifikasi presensi **mentor** (setujui/tolak) | | | |
| FR-017/018 | Lihat dan tinjau permohonan izin/sakit | | | |
| FR-022/023 | Lihat dan tinjau laporan harian | | | |
| FR-025/026 | Buat, edit, hapus misi | | | |
| FR-028 | Tinjau pengumpulan misi dan beri poin | | | |
| FR-030 | Kelola data pengguna (tambah/ubah) | | | |
| FR-030 | Kelola program kejuruan (tambah/ubah) | | | |
| FR-031 | Hapus akun | | | |
| FR-031 | Impor peserta dari file Excel | | | |
| FR-032 | Mengaitkan peserta & mentor dengan kejuruan | | | |
| FR-037 | Halaman pengaturan presensi | | | |
| FR-036 | Hall of Fame mentor | | | |

---

## 2. Kelengkapan Isian Form

Pastikan **semua kolom** berikut ada di form/halaman terkait.

| Form | Kolom yang harus ada |
| --- | --- |
| **Pengaturan presensi (Admin)** | jam mulai · batas terlambat · jam selesai · waktu mulai check-out · hari kerja · nama lokasi · koordinat (lat/long) · radius |
| **Izin/sakit** | tanggal mulai · tanggal selesai · alasan · tautan lampiran (+ jenis izin atau sakit) |
| **Laporan harian** | tanggal · deskripsi kegiatan · tautan pengumpulan tugas (opsional) · foto (opsional) |
| **Buat misi** | judul · deskripsi · kejuruan · poin · tingkat kesulitan · tenggat · kategori · panduan pengumpulan |
| **Pengumpulan misi** | tautan hasil · catatan |
| **Tinjauan (izin/laporan/misi)** | keputusan (setujui/tolak) · catatan/umpan balik · (misi) poin |
| **Catatan presensi** (terlihat di rekap/detail) | pengguna · tanggal · jam masuk · jam pulang · kejuruan · mode kerja · status kehadiran · status verifikasi |

---

## 3. Status dan Label yang Harus Muncul di UI

| Objek | Nilai yang harus ada | Ada? |
| --- | --- | --- |
| Status kehadiran | hadir · terlambat · izin · sakit · alpha | |
| Status verifikasi presensi | pending · verified · rejected | |
| Status izin / laporan / misi | pending · approved · rejected | |
| Mode kerja | WFO · WFH | |

---

## 4. Fitur yang **Tidak Boleh** Muncul untuk Peran Tertentu

Periksa dari sisi UI. Jika menu tampil, tandai sebagai temuan.

| Peran | Tidak boleh terlihat |
| --- | --- |
| Peserta | Menu kelola pengguna · kelola kejuruan · pengaturan presensi · tombol setujui/tolak apa pun |
| Mentor | Menu kelola pengguna · kelola kejuruan · pengaturan presensi · data peserta/mentor kejuruan lain |
| Admin | (tidak ada pembatasan menu; akses lintas kejuruan) |

> Catatan: menyembunyikan menu **tidak cukup** menurut SRS (NFR-02). Jika waktu memungkinkan, cek cepat satu endpoint admin dengan akun peserta; hasil yang benar adalah ditolak.

---

## 5. Pemeriksaan Integrasi Pendukung (Keberadaan)

| Item | Cara cek | Status |
| --- | --- | --- |
| Backend API `/api/*` merespons JSON | Buka salah satu halaman yang memuat data | |
| Database terhubung (data tampil, bisa disimpan) | Buat satu data uji | |
| Unggah foto (Cloudinary) | Unggah foto profil atau laporan. Jika kredensial tidak ada → 🔒 BLOCKED | |
| Geolocation browser | Check-in WFO memunculkan permintaan izin lokasi | |
| Ekspor PDF menghasilkan berkas yang bisa dibuka | Unduh dan buka | |
| Aplikasi dapat dibuild (`npm run build`) dan lint lulus | Jalankan perintah | |

---

## 6. Format Laporan

Simpan sebagai `FEATURE_REPORT.md`:

````markdown
# Laporan Keberadaan Fitur Hadir Skill

- Tanggal: <YYYY-MM-DD>
- URL yang diuji: <...>

## Ringkasan
| Status | Jumlah |
|---|---|
| ✅ ADA | n |
| ⚠️ SEBAGIAN | n |
| ❌ TIDAK ADA | n |
| 🔒 BLOCKED | n |

Cakupan: <n dari total fitur terverifikasi> · Fitur Must yang hilang: <daftar ID>

## Fitur yang Tidak Ada atau Sebagian
| ID | Fitur | Peran | Status | Yang kurang | Prioritas |
|---|---|---|---|---|---|

## Fitur yang Muncul Padahal Tidak Seharusnya
| Peran | Fitur | Lokasi |
|---|---|---|

## Tabel Lengkap
(salin tabel bagian 1 s.d. 5 yang sudah diisi)
````

### Prioritas fitur (MoSCoW dari SRS)

- **Must:** FR-001–005, 007–013, 015–018, 020, 022–025, 027–028, 030, 032, 034, 037–038
- **Should:** FR-006, 014, 019, 021, 026, 029, 031, 033, 035, 036, 039

Fitur Must yang `❌ TIDAK ADA` dilaporkan paling atas.

---

## 7. Checklist Akhir

- [ ] Sudah login dan menjelajah sebagai **ketiga peran**
- [ ] Setiap baris di bagian 1–5 punya status dan lokasi
- [ ] Fitur hilang/sebagian dilengkapi keterangan apa yang kurang
- [ ] Item di luar ruang lingkup tidak dinilai
- [ ] Tidak ada kode yang diubah