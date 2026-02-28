import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';

/**
 * Clears the session cookie and redirects (e.g. after DB reset or invalid user/tenant).
 * Query param: then=/login (default) or any path.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const then = searchParams.get('then') ?? '/login';

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.destroy();

  const res = NextResponse.redirect(new URL(then, req.url));
  res.cookies.set(sessionOptions.cookieName, '', {
    maxAge: 0,
    path: '/',
    sameSite: sessionOptions.cookieOptions?.sameSite ?? 'lax',
    secure: sessionOptions.cookieOptions?.secure ?? false,
  });
  return res;
}
