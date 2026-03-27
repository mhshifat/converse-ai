import { NextRequest, NextResponse } from 'next/server';
import { generateCorrelationId } from '@/lib/logging/correlation-id';
import { Logger } from '@/lib/logging/logger';

/**
 * TEMPORARY — remove this route after debugging Vercel OAuth env.
 *
 * - Only responds in production (`NODE_ENV === 'production'`).
 * - Set `OAUTH_ENV_DEBUG_TOKEN` in Vercel (any random string), redeploy.
 * - Call: `curl -H "Authorization: Bearer YOUR_TOKEN" https://your-app.vercel.app/api/debug/oauth-env`
 *
 * Logs and returns whether each var is non-empty (never logs or returns values).
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    return new NextResponse(null, { status: 404 });
  }

  const expected = process.env.OAUTH_ENV_DEBUG_TOKEN;
  if (!expected) {
    return new NextResponse(null, { status: 404 });
  }

  const auth = request.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  const queryToken = request.nextUrl.searchParams.get('token')?.trim() ?? null;
  const token = bearer ?? queryToken;
  if (!token || token !== expected) {
    return new NextResponse(null, { status: 404 });
  }

  const correlationId = generateCorrelationId();
  const flags = {
    githubClientIdSet: Boolean(process.env.GITHUB_CLIENT_ID?.trim()),
    githubClientSecretSet: Boolean(process.env.GITHUB_CLIENT_SECRET?.trim()),
    googleClientIdSet: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
    googleClientSecretSet: Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim()),
  };

  Logger.log({
    level: 'info',
    message: 'debug.oauth-env (temporary): OAuth-related env presence only',
    correlationId,
    meta: flags,
  });

  return NextResponse.json({ correlationId, ...flags });
}
