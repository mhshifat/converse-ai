import { IronSessionOptions } from 'iron-session';

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  tenantId: string;
  permissions?: string[];
}

export interface SessionData {
  user?: SessionUser;
}

const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    'SESSION_SECRET is required and must be at least 32 characters. Add it to .env (e.g. SESSION_SECRET=your-long-random-string).'
  );
}

export const sessionOptions: IronSessionOptions = {
  password: secret,
  cookieName: 'converseai_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
};
