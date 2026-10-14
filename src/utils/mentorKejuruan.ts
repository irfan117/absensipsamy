import { Kejuruan, User } from '../types';

export const getMentorKejuruanIds = (user: User, kejuruanList: Kejuruan[]): string[] => {
  if (user.role !== 'mentor') return [];
  const normalizedMentorName = user.name.trim().toLocaleLowerCase('id-ID');
  return [...new Set([
    ...kejuruanList
      .filter((program) => {
        const normalizedProgramMentor = program.mentorName?.trim().toLocaleLowerCase('id-ID') || '';
        return program.mentorId === user.id ||
          (!!normalizedProgramMentor && (
            normalizedProgramMentor.includes(normalizedMentorName) ||
            normalizedMentorName.includes(normalizedProgramMentor)
          ));
      })
      .map(program => program.id),
    ...(user.kejuruanId && kejuruanList.some(program => program.id === user.kejuruanId)
      ? [user.kejuruanId]
      : []),
  ])];
};
