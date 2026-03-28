import { resolveVoiceSignalingHealthUrl } from '@/lib/voice-signaling-health-url';

export type VoiceSignalingHealthResult =
  | {
      configured: false;
      ok: false;
      message: string;
      checkedAt: string;
    }
  | {
      configured: true;
      ok: true;
      latencyMs: number;
      checkedAt: string;
    }
  | {
      configured: true;
      ok: false;
      latencyMs?: number;
      error: string;
      httpStatus?: number;
      checkedAt: string;
    };

/**
 * GET the signaling server's HTTP /health (same URL logic as the cron keep-warm route).
 */
export async function checkVoiceSignalingHealth(): Promise<VoiceSignalingHealthResult> {
  const checkedAt = new Date().toISOString();
  const healthUrl = resolveVoiceSignalingHealthUrl();
  if (!healthUrl) {
    return {
      configured: false,
      ok: false,
      message:
        'No voice signaling URL is configured (set NEXT_PUBLIC_VOICE_SIGNALING_WS_URL or VOICE_SIGNALING_HTTP_URL).',
      checkedAt,
    };
  }

  const started = Date.now();
  try {
    const res = await fetch(healthUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: 'text/plain' },
    });
    const latencyMs = Date.now() - started;
    const text = await res.text();
    if (!res.ok) {
      return {
        configured: true,
        ok: false,
        latencyMs,
        httpStatus: res.status,
        error: text.trim().slice(0, 200) || `HTTP ${res.status}`,
        checkedAt,
      };
    }
    return { configured: true, ok: true, latencyMs, checkedAt };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    return {
      configured: true,
      ok: false,
      latencyMs: Date.now() - started,
      error: message,
      checkedAt,
    };
  }
}
