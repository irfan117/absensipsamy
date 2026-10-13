import React, { useRef } from 'react';
import { Kejuruan, User } from '../../../types';
import { Modal } from '../../common/Modal';
import { Upload, Download, FileSpreadsheet, AlertCircle, FileCheck2, Loader2 } from 'lucide-react';
import { downloadUserImportTemplate } from '../../../utils/userExcelUtils';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  kejuruanList: Kejuruan[];
  importTargetRole: 'auto' | 'trainee' | 'mentor';
  onChangeTargetRole: (role: 'auto' | 'trainee' | 'mentor') => void;
  importingFile: File | null;
  parsedImportUsers: Partial<User>[];
  importError: string | null;
  isProcessingImport: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onApplyImport: () => Promise<void>;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  kejuruanList,
  importTargetRole,
  onChangeTargetRole,
  importingFile,
  parsedImportUsers,
  importError,
  isProcessingImport,
  onFileChange,
  onApplyImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewTrainees = parsedImportUsers.filter((u) => u.role === 'trainee').length;
  const previewMentors = parsedImportUsers.filter((u) => u.role === 'mentor').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Akun Pengguna dari File Excel"
      description="Unggah file .xlsx untuk menambahkan daftar peserta atau instruktur sekaligus."
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Template & Target Role Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-sky-50/70 border border-sky-100 rounded-2xl">
          <div className="text-xs text-sky-900">
            <span className="font-bold">Belum punya format file?</span> Unduh template resmi kami untuk menghindari error.
          </div>
          <button
            type="button"
            onClick={() => downloadUserImportTemplate(kejuruanList)}
            className="px-3 py-1.5 bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Template Excel</span>
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#123B59] mb-1">
            Target Peran (Role) untuk Hasil Import:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onChangeTargetRole('auto')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                importTargetRole === 'auto'
                  ? 'border-[#123B59] bg-[#123B59] text-white shadow-2xs'
                  : 'border-[#E4EAF0] text-[#6F7F8D] hover:bg-slate-50'
              }`}
            >
              Otomatis (Ikuti Kolom Role)
            </button>
            <button
              type="button"
              onClick={() => onChangeTargetRole('trainee')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                importTargetRole === 'trainee'
                  ? 'border-[#2E7D32] bg-[#2E7D32] text-white shadow-2xs'
                  : 'border-[#E4EAF0] text-[#6F7F8D] hover:bg-slate-50'
              }`}
            >
              Paksa Sebagai Peserta
            </button>
            <button
              type="button"
              onClick={() => onChangeTargetRole('mentor')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                importTargetRole === 'mentor'
                  ? 'border-[#123B59] bg-[#123B59] text-white shadow-2xs'
                  : 'border-[#E4EAF0] text-[#6F7F8D] hover:bg-slate-50'
              }`}
            >
              Paksa Sebagai Mentor
            </button>
          </div>
        </div>

        {/* Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#CFD8DC] hover:border-[#4C83B5] rounded-2xl p-6 text-center cursor-pointer transition bg-[#F8FAFB]"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileChange}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#4C83B5] mx-auto mb-2 border border-[#E4EAF0] shadow-xs">
            {isProcessingImport ? (
              <Loader2 className="w-6 h-6 animate-spin text-[#123B59]" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>
          <p className="text-xs font-bold text-[#123B59]">
            {importingFile ? importingFile.name : 'Klik untuk memilih berkas Excel (.xlsx / .xls)'}
          </p>
          <p className="text-[11px] text-[#6F7F8D] mt-1">
            Mendukung file hasil ekspor atau template resmi Hadirku PSA
          </p>
        </div>

        {/* Error notification */}
        {importError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{importError}</span>
          </div>
        )}

        {/* Preview Summary */}
        {parsedImportUsers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#123B59]">
              <span className="flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>Pratinjau Data ({parsedImportUsers.length} baris terbaca):</span>
              </span>
              <span className="text-[11px] text-[#6F7F8D]">
                {previewTrainees} Peserta, {previewMentors} Mentor
              </span>
            </div>
            <div className="max-h-40 overflow-y-auto border border-[#E4EAF0] rounded-xl text-[11px]">
              <table className="w-full text-left">
                <thead className="bg-[#F8FAFB] sticky top-0 border-b border-[#E4EAF0] text-[#6F7F8D]">
                  <tr>
                    <th className="py-1.5 px-2">Nama</th>
                    <th className="py-1.5 px-2">NIM / Kode</th>
                    <th className="py-1.5 px-2">Peran</th>
                    <th className="py-1.5 px-2">Kejuruan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4EAF0]">
                  {parsedImportUsers.slice(0, 50).map((u, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-1 px-2 font-medium text-[#123B59]">{u.name}</td>
                      <td className="py-1 px-2 font-mono">{u.nim || '-'}</td>
                      <td className="py-1 px-2">{u.role}</td>
                      <td className="py-1 px-2">{u.kejuruanName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#E4EAF0] text-xs font-bold text-[#6F7F8D] hover:bg-slate-50 transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={parsedImportUsers.length === 0 || isProcessingImport}
            onClick={onApplyImport}
            className="px-5 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isProcessingImport ? 'Memproses...' : `Import ${parsedImportUsers.length} Pengguna`}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
