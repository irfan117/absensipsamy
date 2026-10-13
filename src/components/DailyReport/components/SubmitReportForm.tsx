import React, { useRef } from 'react';
import { DailyReport } from '../../../types';
import { formatDateID } from '../dailyReportHelpers';
import { Upload, FileImage, ImageIcon, X, Send, Loader2, RefreshCw, Pencil, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface SubmitReportFormProps {
  today: string;
  formDate: string;
  setFormDate: (date: string) => void;
  formDesc: string;
  setFormDesc: (desc: string) => void;
  formPhotoUrl?: string;
  formPhotoName?: string;
  formSubmissionLink: string;
  setFormSubmissionLink: (link: string) => void;
  formError: string | null;
  setFormError: (err: string | null) => void;
  isUploadingPhoto: boolean;
  isSubmitting: boolean;
  editingReport: DailyReport | null;
  myReportForDate?: DailyReport;
  onEditReport: (report: DailyReport) => void;
  onCancelEdit: () => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const SubmitReportForm: React.FC<SubmitReportFormProps> = ({
  today,
  formDate,
  setFormDate,
  formDesc,
  setFormDesc,
  formPhotoUrl,
  formPhotoName,
  formSubmissionLink,
  setFormSubmissionLink,
  formError,
  setFormError,
  isUploadingPhoto,
  isSubmitting,
  editingReport,
  myReportForDate,
  onEditReport,
  onCancelEdit,
  onPhotoChange,
  onRemovePhoto,
  onSubmit,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="surface rounded-2xl overflow-hidden border border-[#E4EAF0]">
      <div className="px-5 py-4 border-b border-[#E4EAF0]">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-[#4C83B5]" />
          <h2 className="text-sm font-bold text-[#123B59]">
            {editingReport ? 'Revisi Laporan Harian' : 'Kirim Laporan Harian'}
          </h2>
        </div>
        <p className="text-xs text-[#6F7F8D] mt-0.5">1 laporan per hari · foto wajib</p>
      </div>

      <form onSubmit={onSubmit} className="p-5 space-y-4">
        {/* Editing mode banner */}
        {editingReport && (
          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs flex items-start gap-2">
            <RefreshCw className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="flex-1">
              <p className="font-semibold text-amber-700">
                Mode Revisi — Laporan tanggal {formatDateID(editingReport.date)}
              </p>
              {editingReport.reviewNotes && (
                <p className="mt-0.5 italic text-amber-600">
                  Catatan mentor: "{editingReport.reviewNotes}"
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onCancelEdit}
              className="shrink-0 text-[10px] font-semibold text-amber-700 hover:text-amber-900 underline cursor-pointer"
            >
              Batal
            </button>
          </div>
        )}

        {/* Date picker */}
        <div>
          <label className="block text-xs font-semibold text-[#123B59] mb-1">
            Tanggal Laporan
          </label>
          <input
            type="date"
            value={formDate}
            max={today}
            disabled={!!editingReport}
            onChange={(e) => {
              setFormDate(e.target.value);
              setFormError(null);
            }}
            className="w-full text-xs p-2.5 rounded-lg border border-[#E4EAF0] bg-white text-[#123B59] outline-none focus:ring-1 focus:ring-[#4C83B5] disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {/* Status indicator if report already exists */}
        {myReportForDate && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              myReportForDate.status === 'approved'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : myReportForDate.status === 'rejected'
                ? 'bg-[#FCF3F6] border-[#D95B83]/20 text-[#B84469]'
                : 'bg-[#FFF5E6] border-orange-200 text-[#C05621]'
            }`}
          >
            {myReportForDate.status === 'approved' && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
            {myReportForDate.status === 'rejected' && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            {myReportForDate.status === 'pending' && <Clock className="w-4 h-4 shrink-0 mt-0.5" />}
            <div>
              {myReportForDate.status === 'approved' && (
                <p className="font-semibold">Laporan tanggal ini sudah disetujui mentor.</p>
              )}
              {myReportForDate.status === 'pending' && (
                <p className="font-semibold">Laporan tanggal ini sedang menunggu review mentor.</p>
              )}
              {myReportForDate.status === 'rejected' && (
                <>
                  <p className="font-semibold">Laporan dikembalikan untuk direvisi.</p>
                  {myReportForDate.reviewNotes && (
                    <p className="mt-0.5 italic">Catatan mentor: "{myReportForDate.reviewNotes}"</p>
                  )}
                  {!editingReport && (
                    <button
                      type="button"
                      onClick={() => onEditReport(myReportForDate)}
                      className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#B84469] text-white text-[11px] font-semibold hover:bg-[#9E3555] transition cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" /> Muat Data untuk Direvisi
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Photo upload */}
        <div>
          <label className="block text-xs font-semibold text-[#123B59] mb-1">
            Foto Bukti Kegiatan <span className="text-[#D95B83]">*</span>
          </label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={onPhotoChange}
            className="hidden"
          />
          {formPhotoUrl ? (
            <div className="relative rounded-xl border border-[#E4EAF0] overflow-hidden bg-slate-50">
              <img
                src={formPhotoUrl}
                alt="Bukti kegiatan"
                className="w-full h-44 object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white/90 text-xs font-semibold text-[#123B59] hover:bg-white"
                >
                  Ganti Foto
                </button>
                <button
                  type="button"
                  onClick={onRemovePhoto}
                  className="p-1.5 rounded-lg bg-rose-600/90 text-white hover:bg-rose-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-3 py-1.5 text-[11px] text-[#6F7F8D] bg-white border-t border-[#E4EAF0] flex items-center gap-1.5 truncate">
                <FileImage className="w-3.5 h-3.5 text-[#4C83B5] shrink-0" />
                <span className="truncate">{formPhotoName || 'Foto terpilih'}</span>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#CFD8DC] hover:border-[#4C83B5] rounded-xl p-6 text-center cursor-pointer transition bg-[#F8FAFB]"
            >
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#4C83B5] mx-auto mb-2 border border-[#E4EAF0] shadow-xs">
                {isUploadingPhoto ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ImageIcon className="w-5 h-5" />
                )}
              </div>
              <p className="text-xs font-semibold text-[#123B59]">
                {isUploadingPhoto ? 'Mengunggah foto...' : 'Klik untuk mengunggah foto kegiatan'}
              </p>
              <p className="text-[11px] text-[#6F7F8D] mt-0.5">JPG, PNG, WEBP (maks. 5MB)</p>
            </div>
          )}
        </div>

        {/* Description textarea */}
        <div>
          <label className="block text-xs font-semibold text-[#123B59] mb-1">
            Uraian Kegiatan Hari Ini <span className="text-[#D95B83]">*</span>
          </label>
          <textarea
            rows={4}
            value={formDesc}
            onChange={(e) => {
              setFormDesc(e.target.value);
              setFormError(null);
            }}
            placeholder="Tuliskan aktivitas, materi yang dipelajari, progress tugas, atau kendala yang dihadapi hari ini..."
            className="w-full text-xs p-3 rounded-xl border border-[#E4EAF0] bg-white text-[#123B59] outline-none focus:ring-1 focus:ring-[#4C83B5]"
          />
        </div>

        {/* Link Dokumen */}
        <div>
          <label className="block text-xs font-semibold text-[#123B59] mb-1">
            Tautan Hasil Kerja / Dokumen (Opsional)
          </label>
          <input
            type="url"
            value={formSubmissionLink}
            onChange={(e) => setFormSubmissionLink(e.target.value)}
            placeholder="https://drive.google.com/... atau https://github.com/..."
            className="w-full text-xs p-2.5 rounded-lg border border-[#E4EAF0] bg-white text-[#123B59] outline-none focus:ring-1 focus:ring-[#4C83B5]"
          />
        </div>

        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || isUploadingPhoto}
          className="w-full py-2.5 bg-[#2E7D32] hover:bg-[#256628] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>{isSubmitting ? 'Mengirim...' : editingReport ? 'Kirim Revisi Laporan' : 'Kirim Laporan'}</span>
        </button>
      </form>
    </div>
  );
};
