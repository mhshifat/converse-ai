import { NextResponse } from 'next/server';
import { getGoogleCallbackUrl } from '@/lib/auth-callback';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'Google sign-in is not configured' },
      { status: 503 }
    );
  }
  const redirectUri = getGoogleCallbackUrl();
  const scope = encodeURIComponent('openid email profile');
  const state = Math.random().toString(36).slice(2);
  const url = `${GOOGLE_AUTH_URL}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
  return NextResponse.redirect(url);
}
