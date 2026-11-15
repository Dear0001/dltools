'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import { createContext, useContext, type ReactNode } from 'react';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import type { InitialAccountData } from '@/lib/account-data';

const EMPTY: InitialAccountData = { preferences: null, recentToolIds: null };
const InitialAccountContext = createContext<InitialAccountData>(EMPTY);

/** Account data the server already rendered, so reads never show up in the browser's Network tab. */
export const useInitialAccountData = () => useContext(InitialAccountContext);

export default function AuthProvider({
  children,
  session,
  account = EMPTY,
}: {
  children: ReactNode;
  session: Session | null;
  account?: InitialAccountData;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      <InitialAccountContext.Provider value={account}>
        <LocaleProvider>{children}</LocaleProvider>
      </InitialAccountContext.Provider>
    </SessionProvider>
  );
}
