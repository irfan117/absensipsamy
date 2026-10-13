import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Kejuruan } from '../types';
import { INITIAL_KEJURUAN } from '../data/mockData';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface UserContextType {
  users: User[];
  kejuruanList: Kejuruan[];
  refreshUsers: () => Promise<void>;
  addUser: (userData: Omit<User, 'id'>) => Promise<{ success: boolean; message: string; user?: User }>;
  updateUser: (id: string, updates: Partial<User>) => Promise<{ success: boolean; message: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; message: string }>;
  deleteUsersByRole: (roleTarget: 'trainee' | 'mentor' | 'all') => Promise<{ success: boolean; message: string }>;
  deleteTraineesByIds: (ids: string[]) => Promise<{ success: boolean; message: string }>;
  addKejuruan: (kjData: Omit<Kejuruan, 'id'>) => void;
  importUsers: (usersToImport: Partial<User>[]) => Promise<{ success: boolean; count?: number; message: string }>;
  regenerateUserCredentials: (userId: string) => Promise<{ loginCode: string; password: string; success: boolean; message?: string }>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { jwtToken } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [kejuruanList, setKejuruanList] = useState<Kejuruan[]>(INITIAL_KEJURUAN);

  const refreshUsers = async () => {
    if (!jwtToken) return;
    try {
      const res = await api.getUsers();
      if (res.success && Array.isArray(res.users)) {
        setUsers(res.users);
      }
    } catch (err) {
      console.warn('API getUsers failed:', err);
    }
  };

  useEffect(() => {
    if (jwtToken) {
      void refreshUsers();
    }
  }, [jwtToken]);

  const addUser = async (userData: Omit<User, 'id'>) => {
    try {
      const res = await api.createUser(userData);
      if (res.success && res.user) {
        setUsers((prev) => [res.user!, ...prev.filter((u) => u.id !== res.user!.id)]);
      }
      return res;
    } catch {
      return { success: false, message: 'Gagal menambah pengguna baru.' };
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      const res = await api.updateUser(id, updates);
      if (res.success && res.user) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...res.user } : u)));
      }
      return res;
    } catch {
      return { success: false, message: 'Gagal memperbarui data pengguna.' };
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const res = await api.deleteUser(userId);
      if (res.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
      return res;
    } catch {
      return { success: false, message: 'Gagal menghapus pengguna.' };
    }
  };

  const deleteUsersByRole = async (roleTarget: 'trainee' | 'mentor' | 'all') => {
    try {
      const res = await api.deleteUsersByRole(roleTarget);
      if (res.success) {
        setUsers((prev) =>
          prev.filter((u) => {
            if (roleTarget === 'trainee') return u.role !== 'trainee';
            if (roleTarget === 'mentor') return u.role !== 'mentor';
            return u.role === 'admin';
          })
        );
      }
      return res;
    } catch {
      return { success: false, message: 'Gagal menghapus pengguna secara massal.' };
    }
  };

  const deleteTraineesByIds = async (ids: string[]) => {
    try {
      const res = await api.deleteTraineesByIds(ids);
      if (res.success) {
        setUsers((prev) => prev.filter((u) => !ids.includes(u.id)));
      }
      return res;
    } catch {
      return { success: false, message: 'Gagal menghapus peserta terpilih.' };
    }
  };

  const addKejuruan = (kjData: Omit<Kejuruan, 'id'>) => {
    const newKj: Kejuruan = { ...kjData, id: `kj-${Date.now()}` };
    setKejuruanList((prev) => [...prev, newKj]);
  };

  const importUsers = async (usersToImport: Partial<User>[]) => {
    try {
      const res = await api.importUsers(usersToImport);
      if (res.success) {
        await refreshUsers();
      }
      return res;
    } catch {
      return { success: false, message: 'Gagal mengimpor pengguna.' };
    }
  };

  const regenerateUserCredentials = async (userId: string) => {
    try {
      const res = await api.regenerateUserCredentials(userId);
      if (res.success) {
        setUsers((prev =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, loginCode: res.loginCode, password: res.password, plainPassword: res.password }
              : u
          )
        ));
      }
      return res;
    } catch {
      return {
        loginCode: '',
        password: '',
        success: false,
        message: 'Gagal mengacak ulang kredensial.',
      };
    }
  };

  return (
    <UserContext.Provider
      value={{
        users,
        kejuruanList,
        refreshUsers,
        addUser,
        updateUser,
        deleteUser,
        deleteUsersByRole,
        deleteTraineesByIds,
        addKejuruan,
        importUsers,
        regenerateUserCredentials,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUsers = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUsers harus digunakan di dalam UserProvider');
  return ctx;
};

export default UserContext;