import type { DefaultSession } from 'next-auth';
import type { AppRole } from '@/lib/auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      roles: AppRole[];
      publisherTownIds: string[];
      adminTownIds: string[];
    };
  }
}