import { NextRequest, NextResponse } from 'next/server';
import { resolveVoiceSignalingHealthUrl } from '@/lib/voice-signaling-health-url';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    return req.headers.get('authorization') === `Bearer ${secret}`;
  }
  /** Vercel Cron sets this when CRON_SECRET is not configured (spoofable — set CRON_SECRET in prod). */
  return req.headers.get('x-vercel-cron') === '1';
}

/**
 * Periodic ping so a free-tier signaling host (e.g. Render) stays warm.
 * Schedule: Vercel Cron (vercel.json) or any external cron hitting this URL with CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const healthUrl = resolveVoiceSignalingHealthUrl();
  if (!healthUrl) {
    return NextResponse.json(
      { ok: false, skipped: true, reason: 'No signaling URL configured' },
      { status: 200 }
    );
  }

  try {
    const res = await fetch(healthUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: 'text/plain' },
    });
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, status: res.status, body: text.slice(0, 200) },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, healthUrl, response: text.slice(0, 80) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'fetch failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
