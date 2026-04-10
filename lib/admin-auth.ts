import type { NextAuthOptions, Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

function getRequiredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function getAllowedAdminEmails(): string[] {
  const value = process.env.ADMIN_ALLOWED_EMAILS?.trim();
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(
    getRequiredEnv('GOOGLE_CLIENT_ID') &&
      getRequiredEnv('GOOGLE_CLIENT_SECRET') &&
      getRequiredEnv('NEXTAUTH_SECRET')
  );
}

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const allowedEmails = getAllowedAdminEmails();

  if (allowedEmails.length > 0) {
    return allowedEmails.includes(normalizedEmail);
  }

  return normalizedEmail.endsWith('@gmail.com');
}

export const adminAuthOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 12,
  },
  pages: {
    signIn: '/admin',
    error: '/admin',
  },
  callbacks: {
    async signIn({ profile }) {
      return isAllowedAdminEmail(profile?.email);
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getAdminSession(): Promise<Session | null> {
  if (!isAdminAuthConfigured()) {
    return null;
  }

  const session = await getServerSession(adminAuthOptions);
  if (!isAllowedAdminEmail(session?.user?.email)) {
    return null;
  }

  return session;
}

export async function hasAdminSession(): Promise<boolean> {
  return Boolean(await getAdminSession());
}