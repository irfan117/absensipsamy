import { Kejuruan, User } from '../types';

export const getMentorKejuruanIds = (user: User, kejuruanList: Kejuruan[]): string[] => {
  if (user.role !== 'mentor') return [];
  return [...new Set([
    ...(user.kejuruanId && kejuruanList.some(program => program.id === user.kejuruanId) ? [user.kejuruanId] : []),
    ...kejuruanList.filter(program => program.mentorId === user.id).map(program => program.id),
  ])];
};
