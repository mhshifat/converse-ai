import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';
import { getGoogleCallbackUrl } from '@/lib/auth-callback';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

async function getGoogleTokens(code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth not configured');
  }
  const redirectUri = getGoogleCallbackUrl();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Google token exchange failed: ' + res.status);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function getGoogleProfile(accessToken: string) {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: 'Bearer ' + accessToken },
  });
  if (!res.ok) throw new Error('Failed to fetch Google profile');
  return res.json() as Promise<{ id: string; email: string; name?: string }>;
}

function getLoginUrl() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return base.replace(/\/$/, '') + '/login';
}

function getDashboardUrl() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return base.replace(/\/$/, '') + '/dashboard';
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(getLoginUrl() + '?error=' + encodeURIComponent(error));
  }
  if (!code) {
    return NextResponse.redirect(getLoginUrl() + '?error=missing_code');
  }

  try {
    const accessToken = await getGoogleTokens(code);
    const profile = await getGoogleProfile(accessToken);
    if (!profile.email) {
      return NextResponse.redirect(getLoginUrl() + '?error=no_email');
    }
    const email = profile.email.toLowerCase();

    let user = await prisma.user.findFirst({
      where: { OR: [{ google_id: profile.id }, { email }] },
      include: { tenant: true },
    });

    if (user) {
      if (!user.google_id) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { google_id: profile.id, email_verified: true },
          include: { tenant: true },
        });
      }
    } else {
      const slug = 'user-' + nanoid(10);
      const tenant = await prisma.tenant.create({
        data: { name: 'Personal', slug },
      });
      user = await prisma.user.create({
        data: {
          email,
          name: profile.name ?? profile.email.split('@')[0],
          role: 'merchant',
          tenant_id: tenant.id,
          google_id: profile.id,
          email_verified: true,
        },
        include: { tenant: true },
      });
    }

    const permissions = user.role === 'admin' ? ['manage_agents', 'view_reports', 'manage_projects'] : user.role === 'agent' ? ['view_reports'] : ['manage_projects'];
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenant_id,
      permissions,
    };
    await session.save();

    const res = NextResponse.redirect(getDashboardUrl());
    res.cookies.set('last_auth_provider', 'google', {
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax',
    });
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Google sign-in failed';
    return NextResponse.redirect(getLoginUrl() + '?error=' + encodeURIComponent(message));
  }
}
