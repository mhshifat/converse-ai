import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData, type SessionUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { Logger } from '@/lib/logging/logger';

/**
 * Returns the session user only if they (and their tenant) still exist in the DB.
 * Use this to avoid trusting stale sessions after a DB reset or user/tenant deletion.
 * On any DB/Prisma error, returns null so the app can still render (e.g. homepage as unauthenticated).
 */
export async function getValidatedSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.user) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        tenant_id: true,
        email: true,
        name: true,
        role: true,
        tenant: { select: { id: true } },
      },
    });
    if (!user?.tenant) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      role: user.role,
      tenantId: user.tenant_id,
    };
  } catch (error) {
    Logger.log({
      level: 'error',
      message: 'getValidatedSessionUser: Prisma/DB error, treating as unauthenticated',
      error,
    });
    return null;
  }
}
