import { getIronSession } from 'iron-session';
import { sessionOptions, SessionUser } from '../../lib/session';
import { cookies } from 'next/headers';

export async function requireAuth(): Promise<SessionUser> {
  const cookieStore = await cookies();
  const session = await getIronSession(cookieStore, sessionOptions);
  if (!session.user) {
    throw new Error('Unauthorized');
  }
  return session.user;
}
