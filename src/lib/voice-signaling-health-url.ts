/**
 * HTTP URL to hit for signaling server keep-warm / health (e.g. Render GET /health).
 * Prefer VOICE_SIGNALING_HTTP_URL; else derive from NEXT_PUBLIC_VOICE_SIGNALING_WS_URL.
 */
export function resolveVoiceSignalingHealthUrl(): string | null {
  const explicit = process.env.VOICE_SIGNALING_HTTP_URL?.trim();
  if (explicit) {
    const u = explicit.replace(/\/+$/, '');
    return u.endsWith('/health') ? u : `${u}/health`;
  }

  const ws = process.env.NEXT_PUBLIC_VOICE_SIGNALING_WS_URL?.trim();
  if (!ws) return null;

  try {
    const u = new URL(ws);
    const httpProto = u.protocol === 'wss:' ? 'https:' : u.protocol === 'ws:' ? 'http:' : null;
    if (!httpProto) return null;
    const basePath = (u.pathname || '').replace(/\/+$/, '');
    return `${httpProto}//${u.host}${basePath}/health`;
  } catch {
    return null;
  }
}
