import { NextRequest, NextResponse } from 'next/server';
import { checkVoiceSignalingHealth } from '@/lib/voice-signaling-health-check';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    return req.headers.get('authorization') === `Bearer ${secret}`;
  }
  /** Vercel Cron sets this when CRON_SECRET is not configured (spoofable — set CRON_SECRET in prod). */
  return req.headers.get('x-vercel-cron') === '1';
}

/**
 * Optional: periodic ping so a free-tier signaling host (e.g. Render) stays warm.
 * Prefer scheduling **cron-job.org** (or similar) against the signaling server’s `GET /health` directly.
 * Or call this route from an external cron with header `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await checkVoiceSignalingHealth();
  if (!result.configured) {
    return NextResponse.json(
      { ok: false, skipped: true, reason: result.message },
      { status: 200 }
    );
  }
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        httpStatus: result.httpStatus,
        latencyMs: result.latencyMs,
      },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true, latencyMs: result.latencyMs, checkedAt: result.checkedAt });
}
