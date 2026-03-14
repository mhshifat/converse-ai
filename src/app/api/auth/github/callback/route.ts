import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';
import { getGitHubCallbackUrl } from '@/lib/auth-callback';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

async function getGitHubTokens(code: string) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth not configured');
  }
  const redirectUri = getGitHubCallbackUrl();
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub token exchange failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (data.error || !data.access_token) {
    throw new Error(data.error ?? 'No access token');
  }
  return data.access_token;
}

async function getGitHubProfile(accessToken: string) {
  const res = await fetch(GITHUB_USER_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch GitHub profile');
  return res.json() as Promise<{ id: number; login: string; name?: string; email?: string }>;
}

async function getGitHubPrimaryEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(GITHUB_EMAILS_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const emails = (await res.json()) as Array<{ email: string; primary: boolean }>;
  const primary = emails.find((e) => e.primary);
  return primary?.email ?? emails[0]?.email ?? null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const loginUrl = `${baseUrl.replace(/\/$/, '')}/login`;

  if (error) {
    return NextResponse.redirect(`${loginUrl}?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${loginUrl}?error=missing_code`);
  }

  try {
    const accessToken = await getGitHubTokens(code);
    const profile = await getGitHubProfile(accessToken);
    let email = profile.email ?? (await getGitHubPrimaryEmail(accessToken));
    if (!email) {
      return NextResponse.redirect(`${loginUrl}?error=no_email`);
    }
    email = email.toLowerCase();
    const githubId = String(profile.id);

    let user = await prisma.user.findFirst({
      where: { OR: [{ github_id: githubId }, { email }] },
      include: { tenant: true },
    });

    if (user) {
      if (!user.github_id) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { github_id: githubId, email_verified: true },
          include: { tenant: true },
        });
      }
    } else {
      const slug = `user-${nanoid(10)}`;
      const tenant = await prisma.tenant.create({
        data: { name: 'Personal', slug },
      });
      user = await prisma.user.create({
        data: {
          email,
          name: profile.name ?? profile.login ?? email.split('@')[0],
          role: 'merchant',
          tenant_id: tenant.id,
          github_id: githubId,
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

    const res = NextResponse.redirect(`${baseUrl.replace(/\/$/, '')}/dashboard`);
    res.cookies.set('last_auth_provider', 'github', {
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax',
    });
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'GitHub sign-in failed';
    return NextResponse.redirect(`${loginUrl}?error=${encodeURIComponent(message)}`);
  }
}
