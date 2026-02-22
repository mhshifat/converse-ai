import { getIronSession } from 'iron-session';
import { sessionOptions, SessionUser } from '../lib/session';
import { NextRequest } from 'next/server';

export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  // @ts-ignore
  const session = await getIronSession(req, { ...sessionOptions, cookieName: sessionOptions.cookieName });
  return session.user || null;
}

export async function setSessionUser(req: any, res: any, user: SessionUser) {
  // @ts-ignore
  const session = await getIronSession(req, res, sessionOptions);
  session.user = user;
  await session.save();
}

export async function destroySession(req: any, res: any) {
  // @ts-ignore
  const session = await getIronSession(req, res, sessionOptions);
  session.destroy();
}
