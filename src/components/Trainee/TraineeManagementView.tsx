import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { MobileHeaderStatus } from '../MobileHeaderStatus';
import { GraduationCap, UserCheck, Trash2, Search } from 'lucide-react';
import { User } from '../../types';
import { parseUsersFromExcelFile, generate8DigitLoginCode, generateDefaultPassword } from '../../utils/userExcelUtils';

import { TraineeHeaderActions } from './components/TraineeHeaderActions';
import { TraineeTable } from './components/TraineeTable';
import { AddUserModal } from './components/AddUserModal';
import { AddKejuruanModal } from './components/AddKejuruanModal';
import { ImportExcelModal } from './components/ImportExcelModal';
import { BatchDeleteModal } from './components/BatchDeleteModal';

export const TraineeManagementView: React.FC = () => {
  const {
    currentUser,
    users,
    kejuruanList,
    addUser,
    deleteUser,
    deleteUsersByRole,
    deleteTraineesByIds,
    addKejuruan,
    updateKejuruan,
    importUsers,
    regenerateUserCredentials,
  } = useApp();

  // Filter States
  const [activeRoleFilter, setActiveRoleFilter] = useState<'all' | 'trainee' | 'mentor'>('all');
  const [selectedKejuruan, setSelectedKejuruan] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals Visibility
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddKjModalOpen, setIsAddKjModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearRoleTarget, setClearRoleTarget] = useState<'trainee' | 'mentor' | 'all'>('trainee');
  const [isProcessingClear, setIsProcessingClear] = useState(false);

  // Selection & Copying
  const [selectedTraineeIds, setSelectedTraineeIds] = useState<string[]>([]);
  const [isProcessingSelectedDelete, setIsProcessingSelectedDelete] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'code' | 'pass' | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Import State
  const [importingFile, setImportingFile] = useState<File | null>(null);
  const [parsedImportUsers, setParsedImportUsers] = useState<Partial<User>[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importTargetRole, setImportTargetRole] = useState<'auto' | 'trainee' | 'mentor'>('auto');

  const trainees = useMemo(() => users.filter((u) => u.role === 'trainee'), [users]);
  const mentors = useMemo(() => users.filter((u) => u.role === 'mentor'), [users]);

  const normalizeKejuruanName = (name?: string) => name?.trim().toLocaleLowerCase('id-ID') || '';

  const userKejuruanOptions = useMemo(() => {
    const programs = new Map<string, string>();
    users
      .filter((user) => user.role === 'trainee' || user.role === 'mentor')
      .forEach((user) => {
        const masterProgram = kejuruanList.find((program) => program.id === user.kejuruanId);
        const name = user.kejuruanName?.trim() || masterProgram?.name?.trim();
        const key = normalizeKejuruanName(name);
        if (key && name) programs.set(key, name);
      });

    return [...programs.entries()]
      .map(([value, name]) => ({ value, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [users, kejuruanList]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (activeRoleFilter !== 'all' && user.role !== activeRoleFilter) return false;

      if (selectedKejuruan !== 'all') {
        const masterProgram = kejuruanList.find((program) => program.id === user.kejuruanId);
        const userProgramKey = normalizeKejuruanName(user.kejuruanName || masterProgram?.name);
        if (userProgramKey !== selectedKejuruan) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = user.name.toLowerCase().includes(query);
        const matchNim = user.nim ? user.nim.toLowerCase().includes(query) : false;
        const matchCode = user.loginCode ? user.loginCode.toLowerCase().includes(query) : false;
        const matchKj = user.kejuruanName ? user.kejuruanName.toLowerCase().includes(query) : false;
        if (!matchName && !matchNim && !matchCode && !matchKj) return false;
      }

      return true;
    });
  }, [users, activeRoleFilter, selectedKejuruan, searchQuery, kejuruanList]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text: string, id: string, type: 'code' | 'pass') => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setCopiedType(type);
    showToast(`${type === 'code' ? 'Kode login' : 'Sandi'} disalin ke clipboard!`);
    setTimeout(() => {
      setCopiedId(null);
      setCopiedType(null);
    }, 2000);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTraineeSelection = (userId: string) => {
    setSelectedTraineeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectAllTrainees = () => {
    const selectableIds = filteredUsers.filter((u) => u.role === 'trainee').map((u) => u.id);
    const areAllSelected =
      selectableIds.length > 0 && selectableIds.every((id) => selectedTraineeIds.includes(id));
    if (areAllSelected) {
      setSelectedTraineeIds((prev) => prev.filter((id) => !selectableIds.includes(id)));
    } else {
      setSelectedTraineeIds((prev) => Array.from(new Set([...prev, ...selectableIds])));
    }
  };

  const handleDeleteSelectedTrainees = async () => {
    const ids = selectedTraineeIds.filter((id) => trainees.some((user) => user.id === id));
    if (
      !ids.length ||
      !window.confirm(
        `Hapus ${ids.length} akun peserta yang dipilih? Tindakan ini tidak dapat dibatalkan.`
      )
    )
      return;

    setIsProcessingSelectedDelete(true);
    const result = await deleteTraineesByIds(ids);
    setIsProcessingSelectedDelete(false);
    if (result.success) setSelectedTraineeIds((prev) => prev.filter((id) => !ids.includes(id)));
    showToast(result.message);
  };

  const handleOpenClearModal = (role?: 'trainee' | 'mentor' | 'all') => {
    const chosenRole =
      role ||
      (activeRoleFilter === 'mentor'
        ? 'mentor'
        : activeRoleFilter === 'trainee'
        ? 'trainee'
        : 'all');
    setClearRoleTarget(chosenRole);
    setIsClearModalOpen(true);
  };

  const handleExecuteClear = async () => {
    setIsProcessingClear(true);
    const res = await deleteUsersByRole(clearRoleTarget);
    setIsProcessingClear(false);
    setIsClearModalOpen(false);
    showToast(res.message);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingFile(file);
    setImportError(null);
    setIsProcessingImport(true);

    const res = await parseUsersFromExcelFile(file, kejuruanList, importTargetRole);
    setIsProcessingImport(false);

    if (!res.success || !res.users) {
      setImportError(res.error || 'Gagal membaca file Excel.');
      setParsedImportUsers([]);
    } else {
      setParsedImportUsers(res.users);
      setImportError(null);
    }
  };

  const handleApplyImport = async () => {
    if (parsedImportUsers.length === 0) return;
    setIsProcessingImport(true);
    const result = await importUsers(parsedImportUsers);
    setIsProcessingImport(false);
    showToast(result.message);
    if (!result.success) {
      setImportError(result.message);
      return;
    }
    setIsImportModalOpen(false);
    setImportingFile(null);
    setParsedImportUsers([]);
  };

  const handleRegenerateCredentials = async (user: User) => {
    if (
      !window.confirm(
        `Acak ulang kode login dan sandi untuk ${user.name}? Kredensial lama tidak akan berlaku lagi.`
      )
    )
      return;
    const res = await regenerateUserCredentials(user.id);
    showToast(res.message || 'Kredensial berhasil diperbarui');
  };

  const handleDeleteUser = async (user: User) => {
    if (
      !window.confirm(
        `Hapus akun ${user.name} (${user.role === 'mentor' ? 'Mentor' : 'Peserta'})? Tindakan ini permanen.`
      )
    )
      return;
    const res = await deleteUser(user.id);
    showToast(res.message);
  };

  const allTraineesSelected = useMemo(() => {
    const selectable = filteredUsers.filter((u) => u.role === 'trainee');
    return selectable.length > 0 && selectable.every((u) => selectedTraineeIds.includes(u.id));
  }, [filteredUsers, selectedTraineeIds]);

  const targetCount = useMemo(() => {
    if (clearRoleTarget === 'trainee') return trainees.length;
    if (clearRoleTarget === 'mentor') return mentors.length;
    return trainees.length + mentors.length;
  }, [clearRoleTarget, trainees.length, mentors.length]);

  return (
    <div className="space-y-6 pb-12">
      <MobileHeaderStatus />

      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#123B59] text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-bold border border-white/20 animate-in fade-in slide-in-from-top-4 duration-300">
          {toastMessage}
        </div>
      )}

      {/* Header & Main Actions */}
      <TraineeHeaderActions
        currentUserRole={currentUser?.role}
        users={users}
        trainees={trainees}
        mentors={mentors}
        kejuruanList={kejuruanList}
        selectedTraineeCount={selectedTraineeIds.length}
        isProcessingSelectedDelete={isProcessingSelectedDelete}
        onOpenAddUser={() => setIsAddUserModalOpen(true)}
        onOpenAddKejuruan={() => setIsAddKjModalOpen(true)}
        onOpenImport={() => {
          setImportingFile(null);
          setParsedImportUsers([]);
          setImportError(null);
          setIsImportModalOpen(true);
        }}
        onDeleteSelectedTrainees={handleDeleteSelectedTrainees}
        onOpenClearAll={() => handleOpenClearModal('all')}
      />

      {/* Filter Tabs & Quick Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 bg-[#F4F6F8] p-1 rounded-xl border border-[#E4EAF0]">
            <button
              type="button"
              onClick={() => setActiveRoleFilter('all')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeRoleFilter === 'all'
                  ? 'bg-[#123B59] text-white shadow-xs'
                  : 'text-[#6F7F8D] hover:text-[#123B59]'
              }`}
            >
              Semua Akun ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveRoleFilter('trainee')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeRoleFilter === 'trainee'
                  ? 'bg-[#123B59] text-white shadow-xs'
                  : 'text-[#6F7F8D] hover:text-[#123B59]'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Peserta Magang ({trainees.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveRoleFilter('mentor')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeRoleFilter === 'mentor'
                  ? 'bg-[#123B59] text-white shadow-xs'
                  : 'text-[#6F7F8D] hover:text-[#123B59]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Instruktur Mentor ({mentors.length})</span>
            </button>
          </div>

          {currentUser?.role === 'admin' && activeRoleFilter === 'trainee' && trainees.length > 0 && (
            <button
              type="button"
              onClick={() => handleOpenClearModal('trainee')}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Hapus Semua Peserta ({trainees.length})</span>
            </button>
          )}

          {currentUser?.role === 'admin' && activeRoleFilter === 'mentor' && mentors.length > 0 && (
            <button
              type="button"
              onClick={() => handleOpenClearModal('mentor')}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Hapus Semua Mentor ({mentors.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Kejuruan & Search Filter Bar */}
      <div className="surface p-4 rounded-2xl border border-[#E4EAF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <span className="text-xs font-bold text-[#123B59]">Filter Kejuruan:</span>
          <select
            value={selectedKejuruan}
            onChange={(e) => setSelectedKejuruan(e.target.value)}
            className="max-w-full text-xs py-2 px-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none focus:border-[#4C83B5]"
          >
            <option value="all">Semua Program Kejuruan</option>
            {userKejuruanOptions.map((program) => (
              <option key={program.value} value={program.value}>
                {program.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#6F7F8D] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, NIM, atau kode 8-digit..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <TraineeTable
        users={filteredUsers}
        currentUserRole={currentUser?.role}
        selectedTraineeIds={selectedTraineeIds}
        onToggleSelectTrainee={toggleTraineeSelection}
        onSelectAllTrainees={selectAllTrainees}
        allTraineesSelected={allTraineesSelected}
        visiblePasswords={visiblePasswords}
        onTogglePasswordVisibility={togglePasswordVisibility}
        copiedId={copiedId}
        copiedType={copiedType}
        onCopy={copyToClipboard}
        onRegenerateCredentials={handleRegenerateCredentials}
        onDeleteUser={handleDeleteUser}
      />

      {/* Modals */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        kejuruanList={kejuruanList}
        mentors={mentors}
        onSubmit={async (userData) => {
          const res = await addUser(userData);
          showToast(res.message);
          return res;
        }}
      />

      <AddKejuruanModal
        isOpen={isAddKjModalOpen}
        onClose={() => setIsAddKjModalOpen(false)}
        mentors={mentors}
        kejuruanList={kejuruanList}
        onSubmit={async (kjData) => {
          const res = await addKejuruan(kjData);
          showToast(res.message);
          return res;
        }}
        onUpdate={async (id, kjData) => {
          const res = await updateKejuruan(id, kjData);
          showToast(res.message);
          return res;
        }}
      />

      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        kejuruanList={kejuruanList}
        importTargetRole={importTargetRole}
        onChangeTargetRole={setImportTargetRole}
        importingFile={importingFile}
        parsedImportUsers={parsedImportUsers}
        importError={importError}
        isProcessingImport={isProcessingImport}
        onFileChange={handleFileChange}
        onApplyImport={handleApplyImport}
      />

      <BatchDeleteModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        targetRole={clearRoleTarget}
        targetCount={targetCount}
        isProcessing={isProcessingClear}
        onConfirm={handleExecuteClear}
      />
    </div>
  );
};
