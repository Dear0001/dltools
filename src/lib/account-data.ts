import { auth } from '../../auth';
import { prisma } from '@/lib/prisma';

export type InitialAccountData = {
  preferences: { theme: string; locale: string } | null;
  recentToolIds: string[] | null;
};

const DEFAULT_PREFERENCES = { theme: 'alabaster-paper', locale: 'kh' };

/** Reads the signed-in user's session, preferences and recents on the server so the browser never fetches them. */
export async function getInitialAccountData() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { session, account: { preferences: null, recentToolIds: null } satisfies InitialAccountData };
  }

  const [preferences, recents] = await Promise.all([
    prisma.userPreferences.findUnique({ where: { userId }, select: { theme: true, locale: true } }),
    prisma.recentTool.findMany({
      where: { userId },
      orderBy: { lastOpenedAt: 'desc' },
      take: 8,
      select: { toolId: true },
    }),
  ]);

  return {
    session,
    account: {
      preferences: preferences ?? DEFAULT_PREFERENCES,
      recentToolIds: recents.map(({ toolId }) => toolId),
    } satisfies InitialAccountData,
  };
}
