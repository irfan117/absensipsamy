import React from 'react';
import { ConfirmDialog } from '../../common/ConfirmDialog';

interface BatchDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: 'trainee' | 'mentor' | 'all';
  targetCount: number;
  isProcessing: boolean;
  onConfirm: () => Promise<void>;
}

export const BatchDeleteModal: React.FC<BatchDeleteModalProps> = ({
  isOpen,
  onClose,
  targetRole,
  targetCount,
  isProcessing,
  onConfirm,
}) => {
  const roleLabel =
    targetRole === 'trainee'
      ? 'Semua Peserta Magang'
      : targetRole === 'mentor'
      ? 'Semua Instruktur Mentor'
      : 'Semua Akun Peserta & Mentor';

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Hapus Massal ${roleLabel}`}
      message={`Apakah Anda yakin ingin menghapus seluruh ${targetCount} akun ${roleLabel}? Seluruh data riwayat presensi, izin, dan tugas yang bersangkutan akan dihapus dan tidak dapat dipulihkan.`}
      confirmText={`Hapus ${targetCount} Akun`}
      confirmWordRequired="HAPUS"
      isDanger={true}
      isLoading={isProcessing}
    />
  );
};
