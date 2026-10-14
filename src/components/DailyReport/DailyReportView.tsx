import React, { useState, useMemo, useContext, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { DailyReport } from '../../types';
import { api } from '../../services/api';
import { Check, Search, Clock, ClipboardCheck } from 'lucide-react';
import { getTodayDateString } from '../../utils/dateUtils';
import { HeaderStatusContext, MobileHeaderStatus } from '../MobileHeaderStatus';

import { DailyReportCard } from './components/DailyReportCard';
import { SubmitReportForm } from './components/SubmitReportForm';
import { ReviewReportModal } from './components/ReviewReportModal';
import { Modal } from '../common/Modal';

const getLiveClock = () => new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
}).format(new Date()).replace(/:/g, '.');

export const DailyReportView: React.FC = () => {
  const {
    currentUser,
    dailyReports,
    submitDailyReport,
    reviewDailyReport,
  } = useApp();

  const isTrainee = currentUser.role === 'trainee';
  const isMentor = currentUser.role === 'mentor';

  const today = getTodayDateString();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Trainee Submit State
  const [formDate, setFormDate] = useState(today);
  const [formDesc, setFormDesc] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState<string | undefined>();
  const [formPhotoName, setFormPhotoName] = useState<string | undefined>();
  const [formSubmissionLink, setFormSubmissionLink] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);

  // Review & Photo Lightbox Modal State
  const [reviewModalReport, setReviewModalReport] = useState<DailyReport | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [reportSearch, setReportSearch] = useState('');
  const [reportStatus, setReportStatus] = useState('all');
  const [liveClock, setLiveClock] = useState(getLiveClock);
  const headerStatus = useContext(HeaderStatusContext);

  useEffect(() => {
    const timer = window.setInterval(() => setLiveClock(getLiveClock()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const myReportForDate = useMemo(
    () => dailyReports.find((r) => r.traineeId === currentUser.id && r.date === formDate),
    [dailyReports, currentUser.id, formDate]
  );

  const myAllReports = useMemo(
    () =>
      dailyReports
        .filter((r) => r.traineeId === currentUser.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [dailyReports, currentUser.id]
  );

  const handleEditReport = (report: DailyReport) => {
    setEditingReport(report);
    setFormDate(report.date);
    setFormDesc(report.description);
    setFormPhotoUrl(report.photoUrl);
    setFormPhotoName(report.photoName || (report.photoUrl ? 'Foto sebelumnya' : undefined));
    setFormSubmissionLink(report.submissionLink || '');
    setFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingReport(null);
    setFormDate(today);
    setFormDesc('');
    setFormPhotoUrl(undefined);
    setFormPhotoName(undefined);
    setFormSubmissionLink('');
    setFormError(null);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Hanya file gambar yang diperbolehkan (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Ukuran foto maksimal 5 MB.');
      return;
    }

    setIsUploadingPhoto(true);
    setFormError(null);
    try {
      const uploadRes = await api.uploadImageToCloudinary({ file, folder: 'hadirku/reports' });
      if (uploadRes.success && uploadRes.url) {
        setFormPhotoUrl(uploadRes.url);
        setFormPhotoName(file.name);
      } else {
        setFormPhotoUrl(undefined);
        setFormPhotoName(undefined);
        setFormError(uploadRes.message || 'Gagal mengunggah foto.');
      }
    } catch {
      setFormPhotoUrl(undefined);
      setFormPhotoName(undefined);
      setFormError('Terjadi kesalahan saat mengunggah foto.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc.trim()) {
      setFormError('Uraian kegiatan wajib diisi.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);

    const result = await submitDailyReport({
      date: formDate,
      description: formDesc.trim(),
      photoUrl: formPhotoUrl,
      photoName: formPhotoName,
      submissionLink: formSubmissionLink.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      showToast(result.message);
      handleCancelEdit();
    } else {
      setFormError(result.message);
    }
  };

  // Mentor reports are scoped to the single kejuruan saved in their profile.
  const filteredReports = useMemo(() => dailyReports
    .filter((report) => !isMentor || report.kejuruanId === currentUser.kejuruanId)
    .filter((report) => reportStatus === 'all' || report.status === reportStatus)
    .filter((report) => {
      const query = reportSearch.trim().toLowerCase();
      return !query || [report.traineeName, report.traineeNim || '', report.description]
        .some((value) => value.toLowerCase().includes(query));
    })
    .sort((a, b) => b.date.localeCompare(a.date)), [dailyReports, isMentor, currentUser.kejuruanId, reportStatus, reportSearch]);

  return (
    <div className="space-y-6 pb-12">
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 py-2.5 px-4 rounded-xl bg-[#0D2F47] text-white text-xs font-medium shadow-lg flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className={!isTrainee ? 'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between' : ''}>
        <div>
        <p className="text-[10px] font-bold tracking-[.14em] text-[#4C83B5] uppercase mb-1">
          {isTrainee ? 'Jurnal Magang' : 'Verifikasi'}
        </p>
        <h1 className="text-xl sm:text-2xl font-bold text-[#123B59]">{isTrainee ? 'Laporan Harian' : 'Laporan Harian Peserta'}</h1>
        <p className="text-xs text-[#6F7F8D] mt-0.5">
          {isTrainee
            ? 'Upload foto dan catatan kegiatan harian kamu untuk diverifikasi mentor.'
            : 'Pantau dan verifikasi laporan aktivitas harian peserta pelatihan.'}
        </p>
        {isTrainee && <MobileHeaderStatus />}
        </div>
        {!isTrainee && headerStatus && (
          <div className="surface flex items-center gap-3 rounded-2xl border border-[#E4EAF0] px-3.5 py-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF2F8] text-[#4C83B5]"><Clock className="h-4 w-4" /></span>
            <div><p className="text-[9px] font-bold tracking-[.1em] text-[#6F7F8D]">WAKTU SAAT INI</p><p className="text-base font-bold text-[#123B59] tabular-nums">{liveClock} WIB</p></div>
            <span className="rounded-xl border border-[#E4EAF0] bg-[#F4F6F8] px-3 py-2 text-xs font-semibold text-[#123B59]">{headerStatus.roleBadgeLabel}</span>
          </div>
        )}
      </div>

      {isTrainee ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <SubmitReportForm
              today={today}
              formDate={formDate}
              setFormDate={setFormDate}
              formDesc={formDesc}
              setFormDesc={setFormDesc}
              formPhotoUrl={formPhotoUrl}
              formPhotoName={formPhotoName}
              formSubmissionLink={formSubmissionLink}
              setFormSubmissionLink={setFormSubmissionLink}
              formError={formError}
              setFormError={setFormError}
              isUploadingPhoto={isUploadingPhoto}
              isSubmitting={isSubmitting}
              editingReport={editingReport}
              myReportForDate={myReportForDate}
              onEditReport={handleEditReport}
              onCancelEdit={handleCancelEdit}
              onPhotoChange={handlePhotoChange}
              onRemovePhoto={() => {
                setFormPhotoUrl(undefined);
                setFormPhotoName(undefined);
              }}
              onSubmit={handleSubmit}
            />
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold text-[#123B59] uppercase tracking-wider">
              Riwayat Laporan Saya ({myAllReports.length})
            </h3>
            {myAllReports.length === 0 ? (
              <div className="surface p-6 rounded-2xl text-center text-xs text-[#6F7F8D] border border-[#E4EAF0]">
                Belum ada laporan yang dikirimkan.
              </div>
            ) : (
              myAllReports.map((r) => (
                <DailyReportCard
                  key={r.id}
                  report={r}
                  isTrainee={true}
                  onViewPhoto={(rep) => setPreviewPhotoUrl(rep.photoUrl || null)}
                  onEditReport={handleEditReport}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        /* Mentor & Admin View */
        <div className="space-y-6">
          <div className="surface flex flex-wrap items-center gap-2 rounded-2xl border border-[#E4EAF0] p-3 shadow-xs">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6F7F8D]" />
              <input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Cari nama, NIM, atau deskripsi..." className="w-full rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] py-2.5 pl-9 pr-3 text-xs text-[#123B59] outline-none focus:border-[#4C83B5]" />
            </div>
            <select value={reportStatus} onChange={(event) => setReportStatus(event.target.value)} className="rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] px-3 py-2.5 text-xs font-semibold text-[#123B59] outline-none">
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu Review</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Perlu Revisi</option>
            </select>
            <span className="ml-auto px-2 text-xs text-[#6F7F8D]">{filteredReports.length} laporan</span>
          </div>

          <div className="surface overflow-hidden rounded-2xl border border-[#E4EAF0]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead className="bg-[#F4F6F8] text-[11px] font-bold text-[#6F7F8D]">
                  <tr><th className="px-4 py-3">Peserta</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Deskripsi Kegiatan</th><th className="px-4 py-3">Foto</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-[#E4EAF0]">
            {filteredReports.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-xs text-[#6F7F8D]">Tidak ada laporan harian yang cocok.</td></tr>
            ) : (
              filteredReports.map((report) => (
                <tr key={report.id} className="align-top text-xs text-[#123B59] hover:bg-[#F8FAFB]">
                  <td className="px-4 py-4 font-semibold">{report.traineeName}<div className="mt-1 text-[10px] font-normal text-[#6F7F8D]">{report.traineeNim || '-'}</div></td>
                  <td className="whitespace-nowrap px-4 py-4 text-[#6F7F8D]">{new Date(`${report.date}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="max-w-sm px-4 py-4"><p className="line-clamp-3 leading-relaxed">{report.description}</p>{report.submissionLink && <a href={report.submissionLink} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[10px] font-semibold text-[#4C83B5] hover:underline">Buka tautan lampiran</a>}</td>
                  <td className="px-4 py-3">{report.photoUrl ? <button type="button" onClick={() => setPreviewPhotoUrl(report.photoUrl || null)} title="Lihat foto" className="relative block h-11 w-14 overflow-hidden rounded-lg border border-[#E4EAF0]"><img src={report.photoUrl} alt="Foto kegiatan" className="h-full w-full object-cover" /></button> : <span className="text-[#6F7F8D]">-</span>}</td>
                  <td className="px-4 py-4">{report.status === 'pending' ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">Menunggu Review</span> : report.status === 'approved' ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Disetujui</span> : <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700">Perlu Revisi</span>}</td>
                  <td className="px-4 py-3 text-right"><button type="button" onClick={() => setReviewModalReport(report)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#123B59] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#0D2F47]"><ClipboardCheck className="h-3.5 w-3.5" /> Review</button></td>
                </tr>
              ))
            )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal for Mentor / Admin */}
      <ReviewReportModal
        isOpen={Boolean(reviewModalReport)}
        onClose={() => setReviewModalReport(null)}
        report={reviewModalReport}
        onReview={async (id, status, notes) => {
          const res = await reviewDailyReport(id, status, notes);
          showToast(res.message);
          return res;
        }}
      />

      {/* Photo Lightbox Modal */}
      <Modal
        isOpen={Boolean(previewPhotoUrl)}
        onClose={() => setPreviewPhotoUrl(null)}
        title="Bukti Foto Kegiatan"
        maxWidth="2xl"
      >
        {previewPhotoUrl && (
          <div className="rounded-2xl overflow-hidden bg-black/5 flex items-center justify-center p-2">
            <img
              src={previewPhotoUrl}
              alt="Bukti foto"
              className="max-h-[70vh] w-auto object-contain rounded-xl"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
