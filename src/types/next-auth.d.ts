import '@/types/next-auth';
import type { DefaultSession } from '@/types/next-auth';

declare module '@/types/next-auth' {
  interface Session {
    user: {
      id: string;
    } & NonNullable<DefaultSession['user']>;
  }
}
