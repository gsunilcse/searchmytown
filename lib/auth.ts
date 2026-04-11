import type { DefaultSession, NextAuthOptions, Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getAccessProfileByEmail } from '@/lib/user-access';

export type AppRole = 'publisher' | 'townadmin' | 'super-admin';
export type LoginRole = 'publisher' | 'townadmin' | 'superadmin';

export type AppViewer = {
  isAuthenticated: boolean;
  email: string | null;
  name: string | null;
  roles: AppRole[];
  publisherTownIds: string[];
  adminTownIds: string[];
};

type SessionUser = DefaultSession['user'] & {
  roles: AppRole[];
  publisherTownIds: string[];
  adminTownIds: string[];
};

function getRequiredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

export function getConfiguredSuperAdminEmail(): string | null {
  const configuredValue = process.env.SUPER_ADMIN_EMAILS?.trim() || process.env.ADMIN_ALLOWED_EMAILS?.trim();
  if (!configuredValue) {
    return null;
  }

  return (
    configuredValue
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .find(Boolean) ?? null
  );
}

async function getUserAccess(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const configuredSuperAdminEmail = getConfiguredSuperAdminEmail();
  const isSuperAdmin = configuredSuperAdminEmail === normalizedEmail;
  const accessProfile = await getAccessProfileByEmail(normalizedEmail);
  const publisherTownIds = accessProfile?.publisherTownIds ?? [];
  const adminTownIds = isSuperAdmin ? [] : accessProfile?.townAdminTownIds ?? [];
  const roles: AppRole[] = [];

  if (publisherTownIds.length > 0) {
    roles.push('publisher');
  }

  if (adminTownIds.length > 0) {
    roles.push('townadmin');
  }

  if (isSuperAdmin || accessProfile?.superAdminApproved) {
    roles.push('super-admin');
  }

  return {
    roles,
    publisherTownIds,
    adminTownIds,
  };
}

export function isAuthConfigured(): boolean {
  return Boolean(
    getRequiredEnv('GOOGLE_CLIENT_ID') &&
      getRequiredEnv('GOOGLE_CLIENT_SECRET') &&
      getRequiredEnv('NEXTAUTH_SECRET')
  );
}

export function sanitizeCallbackPath(value: string | null | undefined, fallbackPath = '/login'): string {
  if (!value) {
    return fallbackPath;
  }

  if (!value.startsWith('/')) {
    return fallbackPath;
  }

  if (value.startsWith('//')) {
    return fallbackPath;
  }

  return value;
}

export const authOptions: NextAuthOptions = {
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
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.email) {
        return false;
      }

      return isEmailAuthorizedForOAuth(profile.email);
    },
    async session({ session }) {
      if (!session.user?.email) {
        return session;
      }

      const access = await getUserAccess(session.user.email);
      const nextUser: SessionUser = {
        ...session.user,
        roles: access.roles,
        publisherTownIds: access.publisherTownIds,
        adminTownIds: access.adminTownIds,
      };

      return {
        ...session,
        user: nextUser,
      };
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function isEmailAuthorizedForOAuth(email: string): Promise<boolean> {
  const access = await getUserAccess(email);
  return access.roles.length > 0;
}

export async function canAuthenticateRole(email: string, role: LoginRole, townId?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return {
      allowed: false,
      message: 'Provide the email address that was approved for this role.',
    };
  }

  const access = await getUserAccess(normalizedEmail);

  if (role === 'superadmin') {
    return access.roles.includes('super-admin')
      ? { allowed: true, message: 'Superadmin access verified.' }
      : {
          allowed: false,
          message: 'This email is not the manually configured superadmin account.',
        };
  }

  if (role === 'townadmin') {
    if (!access.roles.includes('townadmin')) {
      return {
        allowed: false,
        message: 'Townadmin access is not approved for this email yet.',
      };
    }

    if (townId && !access.adminTownIds.includes(townId) && !access.roles.includes('super-admin')) {
      return {
        allowed: false,
        message: 'This townadmin account is not approved for the selected town.',
      };
    }

    return { allowed: true, message: 'Townadmin access verified.' };
  }

  if (!access.roles.includes('publisher')) {
    return {
      allowed: false,
      message: 'Publisher access is not approved for this email yet.',
    };
  }

  if (townId && !access.publisherTownIds.includes(townId)) {
    return {
      allowed: false,
      message: 'This publisher account is not approved for the selected town.',
    };
  }

  return { allowed: true, message: 'Publisher access verified.' };
}

export async function getAppSession(): Promise<Session | null> {
  if (!isAuthConfigured()) {
    return null;
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return null;
  }

  return session;
}

export async function getAppViewer(): Promise<AppViewer> {
  const session = await getAppSession();
  return getViewerFromSession(session);
}

export function getViewerFromSession(session: Session | null): AppViewer {
  const user = session?.user as SessionUser | undefined;

  return {
    isAuthenticated: Boolean(user?.email),
    email: user?.email ?? null,
    name: user?.name ?? null,
    roles: user?.roles ?? [],
    publisherTownIds: user?.publisherTownIds ?? [],
    adminTownIds: user?.adminTownIds ?? [],
  };
}

export function hasRole(viewer: AppViewer, role: AppRole): boolean {
  return viewer.roles.includes(role);
}

export function canPublish(viewer: AppViewer, townId?: string): boolean {
  if (!hasRole(viewer, 'publisher')) {
    return false;
  }

  if (!townId) {
    return viewer.publisherTownIds.length > 0;
  }

  return viewer.publisherTownIds.includes(townId);
}

export function canAccessAdmin(viewer: AppViewer): boolean {
  return hasRole(viewer, 'townadmin') || hasRole(viewer, 'super-admin');
}

export function canManageAllTowns(viewer: AppViewer): boolean {
  return hasRole(viewer, 'super-admin');
}

export function canReviewAdminRequests(viewer: AppViewer): boolean {
  return hasRole(viewer, 'super-admin');
}

export function canModerateTown(viewer: AppViewer, townId: string): boolean {
  return hasRole(viewer, 'super-admin') || viewer.adminTownIds.includes(townId);
}