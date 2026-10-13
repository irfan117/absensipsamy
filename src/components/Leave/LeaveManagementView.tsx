import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getTodayDateString } from '../../utils/dateUtils';
import { MobileHeaderStatus } from '../MobileHeaderStatus';
import { LeaveForm } from './components/LeaveForm';
import { LeaveList } from './components/LeaveList';

export const LeaveManagementView: React.FC = () => {
  const { currentUser, leaveRequests, submitLeaveRequest, reviewLeaveRequest } = useApp();

  const today = getTodayDateString();

  const [type, setType] = useState<'izin' | 'sakit'>('izin');
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [reason, setReason] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);
  const [submittedMessage, setSubmittedMessage] = useState('');

  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');

  const isTrainee = currentUser.role === 'trainee';

  const visibleRequests = leaveRequests.filter(l => {
    if (isTrainee) return l.userId === currentUser.id;
    if (currentUser.role === 'mentor') return l.kejuruanId === currentUser.kejuruanId;
    return true;
  });

  const handleReview = async (id: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      const result = await reviewLeaveRequest(id, status, notes || reviewNotes || undefined);
      if (!result.success) {
        alert(result.message);
        return;
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Permohonan gagal diproses. Coba lagi.');
      return;
    }
    setSelectedRequest(null);
    setReviewNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header matching style.html */}
      <div>
        <p className="text-[10px] font-bold tracking-[.14em] text-[#4C83B5] uppercase">
          PENGAJUAN
        </p>
        <h1 className="mt-1 font-bold text-2xl lg:text-3xl text-[#123B59]">
          {isTrainee ? 'Ajukan Izin & Sakit' : currentUser.role === 'admin' ? 'Daftar Permohonan Izin' : 'Verifikasi Permohonan Izin'}
        </h1>
        <p className="mt-1 text-sm text-[#6F7F8D]">
          {isTrainee
            ? 'Formulir resmi ketidakhadiran peserta pelatihan & magang kejuruan.'
            : currentUser.role === 'admin' ? 'Lihat permohonan izin dan lampiran peserta.' : 'Tinjau dan setujui surat permohonan izin atau surat keterangan sakit peserta.'}
        </p>
        <MobileHeaderStatus />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
        {/* Left Side: Form for Trainee, or Queue Metric for Mentor/Admin */}
        {isTrainee ? (
          <LeaveForm
            type={type}
            setType={setType}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            reason={reason}
            setReason={setReason}
            attachmentUrl={attachmentUrl}
            setAttachmentUrl={setAttachmentUrl}
            submittedSuccess={submittedSuccess}
            setSubmittedSuccess={setSubmittedSuccess}
            submittedMessage={submittedMessage}
            setSubmittedMessage={setSubmittedMessage}
            currentUser={currentUser}
          />
        ) : (
          <div className="surface rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="font-bold text-lg text-[#123B59]">
              Ringkasan Antrean Izin
            </h2>
            <div className="divide-y divide-[#E4EAF0] text-sm">
              <div className="py-3 flex items-center justify-between">
                <span className="text-[#6F7F8D]">Menunggu Verifikasi</span>
                <span className="font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full text-xs">
                  {visibleRequests.filter(l => l.status === 'pending').length}
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <span className="text-[#6F7F8D]">Telah Disetujui</span>
                <span className="font-bold text-[#28618F] bg-[#EAF2F8] px-2.5 py-0.5 rounded-full text-xs">
                  {visibleRequests.filter(l => l.status === 'approved').length}
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <span className="text-[#6F7F8D]">Ditolak</span>
                <span className="font-bold text-[#B84469] bg-[#FCF3F6] px-2.5 py-0.5 rounded-full text-xs">
                  {visibleRequests.filter(l => l.status === 'rejected').length}
                </span>
              </div>
            </div>
            <p className="text-xs text-[#6F7F8D] pt-2 border-t border-[#E4EAF0] leading-relaxed">
              Persetujuan izin otomatis menandai status kehadiran siswa di rekapitulasi kehadiran dan modul pelaporan.
            </p>
          </div>
        )}

        {/* Right Side: Request List */}
        <LeaveList
          visibleRequests={visibleRequests}
          isTrainee={isTrainee}
          currentUser={currentUser}
          onReview={handleReview}
        />
      </div>
    </div>
  );
};