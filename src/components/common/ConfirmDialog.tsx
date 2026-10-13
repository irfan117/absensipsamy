import React, { useState } from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmWordRequired?: string;
  isDanger?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  confirmWordRequired,
  isDanger = false,
  isLoading = false,
}) => {
  const [typedWord, setTypedWord] = useState('');

  const isConfirmDisabled =
    isLoading ||
    (Boolean(confirmWordRequired) &&
      typedWord.trim().toLowerCase() !== confirmWordRequired?.trim().toLowerCase());

  const handleClose = () => {
    if (isLoading) return;
    setTypedWord('');
    onClose();
  };

  const handleConfirm = async () => {
    if (isConfirmDisabled) return;
    await onConfirm();
    setTypedWord('');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {isDanger && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          )}
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>

        {confirmWordRequired && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              Ketik kata <span className="font-bold text-rose-600">"{confirmWordRequired}"</span> untuk melanjutkan:
            </label>
            <input
              type="text"
              value={typedWord}
              onChange={(e) => setTypedWord(e.target.value)}
              placeholder={confirmWordRequired}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[#2E7D32] hover:bg-[#256628]'
            }`}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
