import { NextResponse } from 'next/server';
import { getGitHubCallbackUrl } from '@/lib/auth-callback';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';

export function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'GitHub sign-in is not configured' },
      { status: 503 }
    );
  }
  const redirectUri = getGitHubCallbackUrl();
  const scope = encodeURIComponent('read:user user:email');
  const state = Math.random().toString(36).slice(2);
  const url = `${GITHUB_AUTH_URL}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
  return NextResponse.redirect(url);
}
