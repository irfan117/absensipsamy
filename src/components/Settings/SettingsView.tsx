import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MobileHeaderStatus } from '../MobileHeaderStatus';
import { Clock, MapPin, Save, CheckCircle2, ShieldCheck, UserCheck, GraduationCap, LocateFixed } from 'lucide-react';
import { DEFAULT_LATE_POINT_PENALTY_PER_MINUTE } from '../../utils/latePenalty';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, resetToDefaultData } = useApp();

  const [startTime, setStartTime] = useState(settings.startTime);
  const [lateLimitTime, setLateLimitTime] = useState(settings.lateLimitTime);
  const [latePointPenalty, setLatePointPenalty] = useState(
    String(settings.latePointPenaltyPerMinute ?? DEFAULT_LATE_POINT_PENALTY_PER_MINUTE)
  );
  const [absentPointPenalty, setAbsentPointPenalty] = useState(
    String(settings.absentPointPenaltyPerDay ?? DEFAULT_LATE_POINT_PENALTY_PER_MINUTE)
  );
  const [endTime, setEndTime] = useState(settings.endTime);
  const [locationName, setLocationName] = useState(settings.officeLocation.name || 'Punya Skill Akademi, Bandung');
  const [radiusMeters, setRadiusMeters] = useState(settings.officeLocation.radiusMeters);
  // Keep coordinate inputs as strings so users can type/paste decimals without
  // React coercing an empty or partially entered value to zero.
  const [officeLat, setOfficeLat] = useState(String(settings.officeLocation.lat));
  const [officeLng, setOfficeLng] = useState(String(settings.officeLocation.lng));
  const [pastedLocation, setPastedLocation] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadMessage, setReloadMessage] = useState('');

  useEffect(() => {
    setStartTime(settings.startTime);
    setLateLimitTime(settings.lateLimitTime);
    setLatePointPenalty(String(settings.latePointPenaltyPerMinute ?? DEFAULT_LATE_POINT_PENALTY_PER_MINUTE));
    setAbsentPointPenalty(String(settings.absentPointPenaltyPerDay ?? DEFAULT_LATE_POINT_PENALTY_PER_MINUTE));
    setEndTime(settings.endTime);
    setLocationName(settings.officeLocation.name || 'Punya Skill Akademi, Bandung');
    setRadiusMeters(settings.officeLocation.radiusMeters);
    setOfficeLat(String(settings.officeLocation.lat));
    setOfficeLng(String(settings.officeLocation.lng));
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError('');
    setSavedSuccess(false);
    const latitude = Number(officeLat.trim());
    const longitude = Number(officeLng.trim());
    const radius = Number(radiusMeters);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setSaveError('Latitude harus berupa angka antara -90 dan 90.');
      setIsSaving(false);
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setSaveError('Longitude harus berupa angka antara -180 dan 180.');
      setIsSaving(false);
      return;
    }
    if (!Number.isFinite(radius) || radius < 10 || radius > 5000) {
      setSaveError('Radius geofence harus antara 10 dan 5000 meter.');
      setIsSaving(false);
      return;
    }
    const parsedPenalty = Number(latePointPenalty);
    const penaltyPerMinute = latePointPenalty.trim() === '' || !Number.isFinite(parsedPenalty)
      ? DEFAULT_LATE_POINT_PENALTY_PER_MINUTE
      : parsedPenalty;
    const parsedAbsentPenalty = Number(absentPointPenalty);
    const absentPenaltyPerDay = absentPointPenalty.trim() === '' || !Number.isFinite(parsedAbsentPenalty)
      ? DEFAULT_LATE_POINT_PENALTY_PER_MINUTE
      : parsedAbsentPenalty;
    const result = await updateSettings({
      startTime,
      lateLimitTime,
      latePointPenaltyPerMinute: penaltyPerMinute,
      absentPointPenaltyPerDay: absentPenaltyPerDay,
      endTime,
      officeLocation: {
        lat: latitude,
        lng: longitude,
        name: locationName,
        radiusMeters: radius
      }
    });
    setIsSaving(false);
    if (result.success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } else {
      setSaveError(result.message);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-[#E4EAF0]">
        <p className="text-[10px] font-bold tracking-[.14em] text-[#4C83B5] uppercase">
          KONFIGURASI LEMBAGA
        </p>
        <h1 className="mt-1 text-2xl lg:text-3xl font-bold tracking-tight text-[#123B59]">
          Pengaturan Presensi & Lokasi GPS
        </h1>
        <p className="text-xs text-[#6F7F8D] mt-1">
          Konfigurasi jam masuk pelatihan kejuruan, batas toleransi keterlambatan, tarif pengurangan poin per menit telat, dan parameter radius absensi.
        </p>
        <MobileHeaderStatus />
      </div>

      {savedSuccess && (
        <div className="p-3.5 bg-[#EEF6FB] border border-[#C8DCEB] text-[#123B59] rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#4C83B5] shrink-0" />
          <span>Pengaturan presensi berhasil disimpan ke sistem.</span>
        </div>
      )}
      {saveError && (
        <div role="alert" className="p-3.5 bg-[#FFF1F2] border border-[#F2C6CE] text-[#9F2945] rounded-2xl text-xs font-bold">
          {saveError}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Working Hours */}
        <div className="surface min-w-0 rounded-2xl p-5 sm:p-6 border border-[#E4EAF0] space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E4EAF0] pb-3">
            <span className="w-8 h-8 rounded-xl bg-[#EAF2F8] text-[#4C83B5] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-[#123B59]">
              Jadwal Waktu Sesi Pelatihan
            </h2>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-[#123B59] font-bold mb-1.5">
                Jam Mulai Masuk
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none focus:border-[#4C83B5]"
                required
              />
              <span className="text-[11px] text-[#6F7F8D] mt-1 block">Waktu check-in resmi (09:00 WIB)</span>
            </div>

            <div>
              <label className="block text-[#123B59] font-bold mb-1.5">
                Batas Toleransi Terlambat
              </label>
              <input
                type="time"
                value={lateLimitTime}
                onChange={e => setLateLimitTime(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#C05621] font-bold outline-none focus:border-[#4C83B5]"
                required
              />
              <span className="text-[11px] text-[#6F7F8D] mt-1 block">Check-in setelah jam ini = Terlambat + pengurangan poin</span>
            </div>

            <div>
              <label className="block text-[#123B59] font-bold mb-1.5">
                Poin Telat / Menit
              </label>
              <input
                type="number"
                value={latePointPenalty}
                onChange={e => setLatePointPenalty(e.target.value)}
                min={0}
                max={500}
                step={1}
                className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#C05621] font-bold outline-none focus:border-[#4C83B5]"
                required
              />
              <span className="text-[11px] text-[#6F7F8D] mt-1 block">
                Poin Hall of Fame peserta yang dipotong per menit keterlambatan check-in (default {DEFAULT_LATE_POINT_PENALTY_PER_MINUTE}, isi 0 untuk menonaktifkan)
              </span>
            </div>

            <div>
              <label className="block text-[#123B59] font-bold mb-1.5">
                Poin Tidak Absen / Hari
              </label>
              <input
                type="number"
                value={absentPointPenalty}
                onChange={e => setAbsentPointPenalty(e.target.value)}
                min={0}
                max={500}
                step={1}
                className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#C05621] font-bold outline-none focus:border-[#4C83B5]"
                required
              />
              <span className="text-[11px] text-[#6F7F8D] mt-1 block">
                Poin Hall of Fame peserta yang dipotong per hari kerja tanpa absen, dihitung sejak 1 Oktober 2026 (default {DEFAULT_LATE_POINT_PENALTY_PER_MINUTE}, isi 0 untuk menonaktifkan)
              </span>
            </div>

            <div>
              <label className="block text-[#123B59] font-bold mb-1.5">
                Jam Selesai Pulang
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none focus:border-[#4C83B5]"
                required
              />
              <span className="text-[11px] text-[#6F7F8D] mt-1 block">Waktu check-out sesi berakhir</span>
            </div>
          </div>
        </div>

        {/* Location & GPS */}
        <div className="surface min-w-0 rounded-2xl p-5 sm:p-6 border border-[#E4EAF0] space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E4EAF0] pb-3">
            <span className="w-8 h-8 rounded-xl bg-[#EAF2F8] text-[#4C83B5] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-[#123B59]">
              Lokasi Kampus / Balai Pelatihan
            </h2>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-[#123B59] font-bold mb-1.5">
                Nama Gedung / Kampus Pelatihan
              </label>
              <input
                type="text"
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none focus:border-[#4C83B5]"
                required
              />
            </div>

            <div>
              <label className="block text-[#123B59] font-bold mb-1.5">
                Radius Geofence (Meter)
              </label>
              <input
                type="number"
                value={radiusMeters}
                onChange={e => setRadiusMeters(Number(e.target.value))}
                min={10}
                max={5000}
                className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none focus:border-[#4C83B5]"
                required
              />
            </div>
            <div>
              <label className="block text-[#123B59] font-bold mb-1.5">Latitude Kampus</label>
              <input type="text" inputMode="decimal" value={officeLat} onChange={e => setOfficeLat(e.target.value)} placeholder="-6.200000" className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none focus:border-[#4C83B5]" required />
            </div>
            <div>
              <label className="block text-[#123B59] font-bold mb-1.5">Longitude Kampus</label>
              <input type="text" inputMode="decimal" value={officeLng} onChange={e => setOfficeLng(e.target.value)} placeholder="106.800000" className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none focus:border-[#4C83B5]" required />
            </div>
            <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
              <button type="button" disabled={isLocating} onClick={() => {
                if (!navigator.geolocation) { setLocationError('Perangkat ini tidak mendukung GPS.'); return; }
                setLocationError('');
                setIsLocating(true);
                navigator.geolocation.getCurrentPosition(position => {
                  setOfficeLat(position.coords.latitude.toFixed(6));
                  setOfficeLng(position.coords.longitude.toFixed(6));
                  setLocationError('Pin GPS perangkat terisi. Simpan pengaturan untuk menerapkannya.');
                  setIsLocating(false);
                }, error => {
                  const reason = error.code === error.PERMISSION_DENIED
                    ? 'Izin lokasi ditolak. Aktifkan izin lokasi browser.'
                    : error.code === error.POSITION_UNAVAILABLE
                      ? 'Posisi GPS tidak tersedia. Periksa layanan lokasi perangkat.'
                      : 'GPS belum merespons. Coba lagi atau masukkan koordinat manual.';
                  setLocationError(`${reason} Akses GPS browser memerlukan HTTPS atau localhost.`);
                  setIsLocating(false);
                }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
              }} className="inline-flex max-w-full items-center gap-2 rounded-xl border border-[#C8DCEB] bg-[#EEF6FB] px-3 py-2.5 text-left font-bold text-[#28618F] disabled:opacity-60">
                <LocateFixed className="h-4 w-4 shrink-0" /> {isLocating ? 'Mencari lokasi GPS…' : 'Ambil pin GPS perangkat saat ini'}
              </button>
              <a className="text-xs font-semibold text-[#28618F] hover:underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${officeLat},${officeLng}`)}`}>Buka titik di Google Maps</a>
              <div className="w-full space-y-2 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] p-3">
                <label className="block font-bold text-[#123B59]">Atur dari koordinat atau tautan Google Maps</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input value={pastedLocation} onChange={e => setPastedLocation(e.target.value)} placeholder="Contoh: -6.200000, 106.800000 atau tempel tautan Maps" className="min-w-0 flex-1 rounded-xl border border-[#E4EAF0] bg-white p-2.5 text-[#123B59] outline-none focus:border-[#4C83B5]" />
                  <button type="button" onClick={() => {
                    const decoded = decodeURIComponent(pastedLocation);
                    const match = decoded.match(/(-?\d{1,2}(?:\.\d+)?)\s*[,;/]\s*(-?\d{1,3}(?:\.\d+)?)/);
                    if (!match) { setLocationError('Koordinat tidak ditemukan. Tempel format latitude, longitude atau tautan Google Maps yang memuat koordinat.'); return; }
                    const lat = Number(match[1]);
                    const lng = Number(match[2]);
                    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) { setLocationError('Koordinat di luar rentang latitude/longitude yang valid.'); return; }
                    setOfficeLat(String(lat));
                    setOfficeLng(String(lng));
                    setLocationError('Koordinat berhasil diisi. Simpan pengaturan untuk menerapkan pin check-in.');
                  }} className="shrink-0 rounded-xl bg-[#28618F] px-4 py-2.5 font-bold text-white">Gunakan koordinat</button>
                </div>
                <p className="text-[11px] leading-relaxed text-[#6F7F8D]">Di Google Maps, klik kanan titik lokasi lalu salin koordinatnya. Tempel di sini; pin akan menjadi pusat pemeriksaan WFO setelah disimpan.</p>
              </div>
              {locationError && <p role="alert" className="w-full text-xs font-semibold text-[#B84469]">{locationError}</p>}
              <p className="w-full text-[11px] leading-relaxed text-[#6F7F8D]">Admin perlu mengatur pin ini satu kali saat berada tepat di lokasi Punya Skill Akademi. Presensi WFO memakai pin ini dengan radius 100 m.</p>
            </div>
          </div>
        </div>

        {/* Hierarchical Verification Info Card */}
        <div className="surface min-w-0 rounded-2xl p-5 sm:p-6 border border-[#E4EAF0] space-y-3">
          <div className="flex items-center gap-2 border-b border-[#E4EAF0] pb-3">
            <span className="w-8 h-8 rounded-xl bg-[#EAF2F8] text-[#4C83B5] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-[#123B59]">
              Skema Verifikasi Bertingkat
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#F8FAFB] border border-[#E4EAF0] space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[#123B59]">
                <GraduationCap className="w-4 h-4 text-[#4C83B5]" />
                <span>Mentor Memverifikasi Trainee</span>
              </div>
              <p className="text-[11px] text-[#6F7F8D] leading-relaxed">
                Trainee melakukan presensi mandiri, lalu mentor kejuruan memeriksa dan menyetujui kehadiran peserta di kelasnya.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAFB] border border-[#E4EAF0] space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[#123B59]">
                <UserCheck className="w-4 h-4 text-[#28618F]" />
                <span>Admin Memverifikasi Mentor</span>
              </div>
              <p className="text-[11px] text-[#6F7F8D] leading-relaxed">
                Mentor melakukan presensi instruktur harian, lalu administrator memvalidasi kehadiran mentor seluruh kejuruan.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
          {reloadMessage && <p role="status" className="text-xs font-semibold text-[#28618F]">{reloadMessage}</p>}
          <button
            type="button"
            disabled={isReloading}
            onClick={async () => {
              if (confirm('Muat ulang seluruh data dari database TiDB?')) {
                setIsReloading(true);
                setReloadMessage('');
                const result = await resetToDefaultData();
                setIsReloading(false);
                setReloadMessage(result.message);
              }
            }}
            className="rounded-xl border border-[#E3C4D0] bg-[#FCF3F6] hover:bg-[#fae3ec] px-4 py-2 text-xs font-bold text-[#B84469] transition cursor-pointer disabled:opacity-60"
          >
            {isReloading ? 'Memuat ulang...' : 'Muat Ulang Data TiDB'}
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#123B59] hover:bg-[#0D2F47] text-white text-xs font-bold transition cursor-pointer shadow-sm hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
