import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { DailyReport } from '../../types';
import { api } from '../../services/api';
import {
  Check,
  Search,
  CalendarDays,
  FileImage,
  X
} from 'lucide-react';
import { getTodayDateString } from '../../utils/dateUtils';
import { getKejuruanFilterOptions, matchesKejuruanFilter } from '../../utils/kejuruanCodes';
import { MobileHeaderStatus } from '../MobileHeaderStatus';

import { DailyReportCard } from './components/DailyReportCard';
import { SubmitReportForm } from './components/SubmitReportForm';
import { ReviewReportModal } from './components/ReviewReportModal';
import { Modal } from '../common/Modal';

export const DailyReportView: React.FC = () => {
  const {
    currentUser,
    users,
    kejuruanList,
    dailyReports,
    submitDailyReport,
    reviewDailyReport,
  } = useApp();

  const isTrainee = currentUser.role === 'trainee';
  const isMentor = currentUser.role === 'mentor';
  const isAdmin = currentUser.role === 'admin';

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

  // Mentor / Admin Filter States
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterKejuruan, setFilterKejuruan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTrainee, setSearchTrainee] = useState<string>('');

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

  // Mentor / Admin Filter Logic
  const filteredReports = useMemo(() => {
    return dailyReports
      .filter((r) => {
        if (filterDate && r.date !== filterDate) return false;
        if (filterStatus !== 'all' && r.status !== filterStatus) return false;
        if (filterKejuruan !== 'all' && !matchesKejuruanFilter(filterKejuruan, kejuruanList, r.kejuruanId, r.kejuruanName)) {
          return false;
        }
        if (searchTrainee.trim()) {
          const q = searchTrainee.toLowerCase();
          const matchName = r.traineeName.toLowerCase().includes(q);
          const matchNim = r.traineeNim?.toLowerCase().includes(q);
          if (!matchName && !matchNim) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [dailyReports, filterDate, filterStatus, filterKejuruan, searchTrainee, kejuruanList]);

  const kejuruanFilterOptions = useMemo(
    () => getKejuruanFilterOptions(kejuruanList),
    [kejuruanList]
  );

  return (
    <div className="space-y-6 pb-12">
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 py-2.5 px-4 rounded-xl bg-[#0D2F47] text-white text-xs font-medium shadow-lg flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <p className="text-[10px] font-bold tracking-[.14em] text-[#4C83B5] uppercase mb-1">
          Jurnal Magang
        </p>
        <h1 className="text-xl sm:text-2xl font-bold text-[#123B59]">Laporan Harian</h1>
        <p className="text-xs text-[#6F7F8D] mt-0.5">
          {isTrainee
            ? 'Upload foto dan catatan kegiatan harian kamu untuk diverifikasi mentor.'
            : 'Pantau dan verifikasi laporan aktivitas harian peserta pelatihan.'}
        </p>
        <MobileHeaderStatus />
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
        <div className="space-y-4">
          <div className="surface p-4 rounded-2xl border border-[#E4EAF0] flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none"
              />
              <select
                value={filterKejuruan}
                onChange={(e) => setFilterKejuruan(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none"
              >
                <option value="all">Semua Program Kejuruan</option>
                {kejuruanFilterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.name}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu Review</option>
                <option value="approved">Disetujui</option>
                <option value="rejected">Perlu Revisi</option>
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#6F7F8D] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTrainee}
                onChange={(e) => setSearchTrainee(e.target.value)}
                placeholder="Cari nama atau NIM..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.length === 0 ? (
              <div className="col-span-full py-12 text-center text-[#6F7F8D] surface rounded-2xl border border-[#E4EAF0]">
                Tidak ada laporan harian yang sesuai filter.
              </div>
            ) : (
              filteredReports.map((r) => (
                <DailyReportCard
                  key={r.id}
                  report={r}
                  isTrainee={false}
                  onViewPhoto={(rep) => setPreviewPhotoUrl(rep.photoUrl || null)}
                  onOpenReview={(rep) => setReviewModalReport(rep)}
                />
              ))
            )}
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
