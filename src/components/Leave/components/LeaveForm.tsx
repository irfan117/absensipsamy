import React from 'react';
import { User } from '../../../types';
import { FileText, Check, AlertCircle, Clock, Paperclip } from 'lucide-react';

interface LeaveFormProps {
  type: 'izin' | 'sakit';
  setType: (t: 'izin' | 'sakit') => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  reason: string;
  setReason: (r: string) => void;
  attachmentUrl: string;
  setAttachmentUrl: (u: string) => void;
  submittedSuccess: boolean;
  setSubmittedSuccess: (s: boolean) => void;
  submittedMessage: string;
  setSubmittedMessage: (m: string) => void;
  currentUser: User;
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, char => ({
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": "'",
  }[char] || char));

export const LeaveForm: React.FC<LeaveFormProps> = ({
  type, setType, startDate, setStartDate,
  endDate, setEndDate,
  reason, setReason,
  attachmentUrl, setAttachmentUrl,
  submittedSuccess, setSubmittedSuccess,
  submittedMessage, setSubmittedMessage,
  currentUser,
}) => {
  const downloadLetterTemplate = () => {
    const today = new Date();
    const formattedToday = `${today.getDate().toString().padStart(2, '0')}/${
      (today.getMonth() + 1).toString().padStart(2, '0')
    }/${today.getFullYear()}`;

    const documentHtml = `<!doctype html>
<html><head><meta charset="utf-8"><title>Template Surat Izin</title></head>
<body style="font-family:Arial,sans-serif;max-width:760px;margin:48px auto;line-height:1.7;color:#111">
<p style="text-align:right">Bandung, ${escapeHtml(formattedToday)}</p>
<p>Kepada Yth.<br><b>Mentor/Pembimbing Punya Skill Akademi</b><br>di tempat</p>
<p><b>Perihal: Permohonan Izin Tidak Hadir</b></p>
<p>Dengan hormat,</p>
<p>Saya yang bertanda tangan di bawah ini:</p>
<table style="border-collapse:collapse">
  <tr><td style="padding:3px 16px 3px 0">Nama</td><td>: ${escapeHtml(currentUser?.name || '')}</td></tr>
  <tr><td style="padding:3px 16px 3px 0">NIM/Kode Peserta</td><td>: ${escapeHtml(currentUser?.nim || '')}</td></tr>
  <tr><td style="padding:3px 16px 3px 0">Program</td><td>: ${escapeHtml(currentUser?.kejuruanName || '—')}</td></tr>
</table>
<p>Dengan ini mengajukan izin tidak hadir pada tanggal <b>${escapeHtml(startDate)}</b>
${startDate !== endDate ? ` sampai dengan <b>${escapeHtml(endDate)}</b>` : ''} karena:</p>
<p style="min-height:72px;border-bottom:1px solid #888">${escapeHtml(reason.trim() || '[Tuliskan alasan izin]')}</p>
<p>Sebagai bahan pertimbangan, saya melampirkan dokumen pendukung. Saya akan bertanggung jawab untuk mengejar materi atau tugas yang tertinggal. Demikian permohonan ini saya sampaikan. Atas perhatian dan izin yang diberikan, saya ucapkan terima kasih.</p>
<p style="margin-top:52px">Hormat saya,</p>
<p style="margin-top:72px"><b>${escapeHtml(currentUser?.name || '')}</b><br>${escapeHtml(currentUser?.nim || '')}</p></body></html>`;

    const themedDocumentHtml = documentHtml
      .replace(
        '<body style="font-family:Arial,sans-serif;max-width:760px;margin:48px auto;line-height:1.7;color:#111">',
        '<body style="font-family:Arial,sans-serif;max-width:760px;margin:48px auto;line-height:1.7;color:#0D2F47"><h1 style="color:#0D2F47;font-size:20px;text-align:center">SURAT PERMOHONAN IZIN</h1>'
      )
      .replace(
        '</p></body></html>',
        '</p><p style="margin-top:52px;text-align:right">Mengetahui,<br>Koordinator Program Pelatihan<br><br><br><b>Abdul Rozzak Junaidi</b></p></body></html>'
      );

    const url = URL.createObjectURL(new Blob([themedDocumentHtml], { type: 'application/msword;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `Template_Surat_Izin_${currentUser?.nim}.doc`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <form className="surface rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#E4EAF0]">
        <h2 className="font-bold text-lg text-[#123B59]">
          Formulir Pengajuan
        </h2>
        <span className="rounded-full bg-[#EAF2F8] px-3 py-1 text-[10px] font-bold text-[#4C83B5]">
          BARU
        </span>
      </div>

      {submittedSuccess && (
        <div className="rounded-xl border border-[#C8DCEB] bg-[#EEF6FB] px-4 py-3 flex items-center gap-2.5 text-xs text-[#123B59] font-bold">
          <Check className="w-4 h-4 text-[#4C83B5] shrink-0" />
          <span>{submittedMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-[#123B59] uppercase tracking-wide">
            Kategori Permohonan
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('izin')}
              className={`py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${type === 'izin' ? 'border-[#4C83B5] bg-[#EAF2F8] text-[#28618F]' : 'border-[#E4EAF0] bg-[#F8FAFB] text-[#6F7F8D] hover:bg-white'}`}
            >
              Izin Keperluan
            </button>
            <button
              type="button"
              onClick={() => setType('sakit')}
              className={`py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${type === 'sakit' ? 'border-[#4C83B5] bg-[#EEF5FA] text-[#4C83B5]' : 'border-[#E4EAF0] bg-[#F8FAFB] text-[#6F7F8D] hover:bg-white'}`}
            >
              Sakit (Medis)
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-[#123B59] uppercase tracking-wide">
            Dari Tanggal
          </label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] px-3.5 py-2.5 text-sm text-[#123B59] outline-none focus:border-[#4C83B5]"
            required
          />
        </div>
        <div>
          <label className="text-xs font-bold text-[#123B59] uppercase tracking-wide">
            Sampai Tanggal
          </label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            min={startDate}
            className="mt-1.5 w-full rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] px-3.5 py-2.5 text-sm text-[#123B59] outline-none focus:border-[#4C83B5]"
            required
          />
        </div>
      </div>

      <div className="mt-3 grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-[#123B59] uppercase tracking-wide">
            Alasan Izin
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Tuliskan alasan singkat atau diagnosis dokter..."
            rows={4}
            className="mt-1.5 w-full rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] px-3.5 py-2.5 text-sm text-[#123B59] outline-none focus:border-[#4C83B5]"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[#123B59] uppercase tracking-wide">
            {type === 'sakit' ? 'Link Surat Keterangan Sakit (Wajib)' : 'Link Lampiran Surat Izin (Wajib)'}
          </label>
          <div className="mt-1.5">
            <input
              type="url"
              value={attachmentUrl}
              onChange={e => setAttachmentUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              maxLength={2048}
              required
              className="block w-full rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] px-3.5 py-2.5 text-sm text-[#123B59]"
            />
          </div>
          <p className="mt-1.5 text-xs text-[#6F7F8D]">
            Tempel tautan berbagi file (Drive/Cloudinary) dan pastikan mentor dapat membukanya. {type === 'sakit' ? 'Lampirkan surat keterangan dokter.' : 'Isi template surat izin, unggah ke penyimpanan pilihan Anda, lalu tempel tautannya di sini.'}
          </p>
        </div>
      </div>

      {type === 'izin' && (
        <button
          type="button"
          onClick={downloadLetterTemplate}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#C8DCEB] bg-[#EEF6FB] px-3.5 py-2.5 text-xs font-bold text-[#28618F] hover:bg-[#EAF2F8]"
        >
          <FileText className="h-4 w-4" /> Unduh Template Surat Izin (.doc)
        </button>
      )}

      <button
        type="button"
        className="mt-4 w-full rounded-xl bg-[#123B59] hover:bg-[#0D2F47] px-4 py-3.5 font-bold text-white transition hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-md text-sm"
      >
        Kirim Pengajuan Izin
      </button>
    </form>
  );
};