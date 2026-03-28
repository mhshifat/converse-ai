import 'server-only';

import crypto from 'crypto';

const TTL_SEC = 15 * 60;

function base64UrlEncodeBytes(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlEncodeJson(obj: object): string {
  return base64UrlEncodeBytes(Buffer.from(JSON.stringify(obj), 'utf8'));
}

/**
 * HS256 JWT for WebSocket `join` — same secret must be set on the signaling server (`VOICE_SIGNALING_JWT_SECRET`).
 */
export function signVoiceJoinToken(params: {
  conversationId: string;
  role: 'human' | 'customer';
  secret: string;
}): string {
  const header = base64UrlEncodeJson({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncodeJson({
    sub: params.conversationId,
    role: params.role,
    iat: now,
    exp: now + TTL_SEC,
  });
  const sig = crypto
    .createHmac('sha256', params.secret)
    .update(`${header}.${payload}`)
    .digest();
  const sigB64 = base64UrlEncodeBytes(sig);
  return `${header}.${payload}.${sigB64}`;
}

export function getVoiceSignalingJwtSecret(): string | undefined {
  return process.env.VOICE_SIGNALING_JWT_SECRET?.trim() || undefined;
}
