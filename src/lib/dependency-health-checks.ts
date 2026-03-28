import { prisma } from '@/lib/prisma';
import { checkVoiceSignalingHealth } from '@/lib/voice-signaling-health-check';

export type ServiceDependencyId =
  | 'database'
  | 'groq'
  | 'voice_signaling'
  | 'cloudinary'
  | 'resend_email'
  | 'twilio_sms';

export type ServiceDependencyCheck = {
  id: ServiceDependencyId;
  name: string;
  description: string;
} & (
  | { configured: false; ok: false; message: string; checkedAt: string }
  | { configured: true; ok: true; latencyMs: number; checkedAt: string }
  | {
      configured: true;
      ok: false;
      latencyMs?: number;
      error: string;
      httpStatus?: number;
      checkedAt: string;
    }
);

function nowIso() {
  return new Date().toISOString();
}

async function checkDatabase(): Promise<ServiceDependencyCheck> {
  const checkedAt = nowIso();
  const name = 'Database';
  const description = 'Core data: projects, conversations, and sessions.';
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      id: 'database',
      name,
      description,
      configured: true,
      ok: true,
      latencyMs: Date.now() - started,
      checkedAt,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Query failed';
    return {
      id: 'database',
      name,
      description,
      configured: true,
      ok: false,
      latencyMs: Date.now() - started,
      error: msg,
      checkedAt,
    };
  }
}

async function checkGroq(): Promise<ServiceDependencyCheck> {
  const checkedAt = nowIso();
  const name = 'AI & voice';
  const description = 'Chat, optional embeddings, transcription, and speech synthesis.';
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    return {
      id: 'groq',
      name,
      description,
      configured: false,
      ok: false,
      message: 'GROQ_API_KEY is not set.',
      checkedAt,
    };
  }
  const started = Date.now();
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
      headers: { Authorization: `Bearer ${key}` },
    });
    const latencyMs = Date.now() - started;
    const text = await res.text();
    if (!res.ok) {
      return {
        id: 'groq',
        name,
        description,
        configured: true,
        ok: false,
        latencyMs,
        httpStatus: res.status,
        error: text.trim().slice(0, 200) || res.statusText || `HTTP ${res.status}`,
        checkedAt,
      };
    }
    return {
      id: 'groq',
      name,
      description,
      configured: true,
      ok: true,
      latencyMs,
      checkedAt,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    return {
      id: 'groq',
      name,
      description,
      configured: true,
      ok: false,
      latencyMs: Date.now() - started,
      error: message,
      checkedAt,
    };
  }
}

async function checkCloudinary(): Promise<ServiceDependencyCheck | null> {
  const provider = (process.env.UPLOAD_PROVIDER ?? 'cloudinary').toLowerCase();
  if (provider !== 'cloudinary') return null;

  const checkedAt = nowIso();
  const name = 'Media uploads';
  const description = 'Logos and chat attachments.';
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    return {
      id: 'cloudinary',
      name,
      description,
      configured: false,
      ok: false,
      message:
        'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or change UPLOAD_PROVIDER).',
      checkedAt,
    };
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const started = Date.now();
  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/image?max_results=1`,
      {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
        headers: { Authorization: `Basic ${auth}` },
      }
    );
    const latencyMs = Date.now() - started;
    const text = await res.text();
    if (!res.ok) {
      return {
        id: 'cloudinary',
        name,
        description,
        configured: true,
        ok: false,
        latencyMs,
        httpStatus: res.status,
        error: text.trim().slice(0, 200) || `HTTP ${res.status}`,
        checkedAt,
      };
    }
    return {
      id: 'cloudinary',
      name,
      description,
      configured: true,
      ok: true,
      latencyMs,
      checkedAt,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    return {
      id: 'cloudinary',
      name,
      description,
      configured: true,
      ok: false,
      latencyMs: Date.now() - started,
      error: message,
      checkedAt,
    };
  }
}

async function checkResend(): Promise<ServiceDependencyCheck | null> {
  const provider = (process.env.EMAIL_PROVIDER ?? 'nodemailer').toLowerCase();
  if (provider !== 'resend') return null;
  const key = process.env.RESEND_API_KEY?.trim();

  const checkedAt = nowIso();
  const name = 'Transactional email';
  const description = 'System and delivery email when configured.';
  if (!key) {
    return {
      id: 'resend_email',
      name,
      description,
      configured: false,
      ok: false,
      message: 'EMAIL_PROVIDER is resend but RESEND_API_KEY is not set.',
      checkedAt,
    };
  }

  const started = Date.now();
  try {
    const res = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
      headers: { Authorization: `Bearer ${key}` },
    });
    const latencyMs = Date.now() - started;
    const text = await res.text();
    if (!res.ok) {
      return {
        id: 'resend_email',
        name,
        description,
        configured: true,
        ok: false,
        latencyMs,
        httpStatus: res.status,
        error: text.trim().slice(0, 200) || `HTTP ${res.status}`,
        checkedAt,
      };
    }
    return {
      id: 'resend_email',
      name,
      description,
      configured: true,
      ok: true,
      latencyMs,
      checkedAt,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    return {
      id: 'resend_email',
      name,
      description,
      configured: true,
      ok: false,
      latencyMs: Date.now() - started,
      error: message,
      checkedAt,
    };
  }
}

async function checkTwilio(): Promise<ServiceDependencyCheck | null> {
  const provider = (process.env.SMS_PROVIDER ?? '').toLowerCase();
  if (provider !== 'twilio') return null;

  const checkedAt = nowIso();
  const name = 'SMS delivery';
  const description = 'Outbound SMS when your project uses an SMS provider.';
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!accountSid || !authToken) {
    return {
      id: 'twilio_sms',
      name,
      description,
      configured: false,
      ok: false,
      message: 'SMS_PROVIDER is twilio but TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is missing.',
      checkedAt,
    };
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const started = Date.now();
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}.json`,
      {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(12_000),
        headers: { Authorization: `Basic ${auth}` },
      }
    );
    const latencyMs = Date.now() - started;
    const text = await res.text();
    if (!res.ok) {
      return {
        id: 'twilio_sms',
        name,
        description,
        configured: true,
        ok: false,
        latencyMs,
        httpStatus: res.status,
        error: text.trim().slice(0, 200) || `HTTP ${res.status}`,
        checkedAt,
      };
    }
    return {
      id: 'twilio_sms',
      name,
      description,
      configured: true,
      ok: true,
      latencyMs,
      checkedAt,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    return {
      id: 'twilio_sms',
      name,
      description,
      configured: true,
      ok: false,
      latencyMs: Date.now() - started,
      error: message,
      checkedAt,
    };
  }
}

async function checkVoiceSignalingAsDependency(): Promise<ServiceDependencyCheck> {
  const checkedAt = nowIso();
  const name = 'Live voice signaling';
  const description = 'Real-time call setup for live human voice during handoff.';
  const r = await checkVoiceSignalingHealth();
  if (!r.configured) {
    return {
      id: 'voice_signaling',
      name,
      description,
      configured: false,
      ok: false,
      message: r.message,
      checkedAt: r.checkedAt,
    };
  }
  if (r.ok) {
    return {
      id: 'voice_signaling',
      name,
      description,
      configured: true,
      ok: true,
      latencyMs: r.latencyMs,
      checkedAt: r.checkedAt,
    };
  }
  return {
    id: 'voice_signaling',
    name,
    description,
    configured: true,
    ok: false,
    latencyMs: r.latencyMs,
    httpStatus: r.httpStatus,
    error: r.error,
    checkedAt: r.checkedAt,
  };
}

export type DependenciesStatusPayload = {
  services: ServiceDependencyCheck[];
  summaryCheckedAt: string;
};

/**
 * Run all relevant dependency checks in parallel (server-side).
 * Optional integrations (Cloudinary, Resend, Twilio) only appear when configured or explicitly enabled via env.
 */
export async function checkAllServiceDependencies(): Promise<DependenciesStatusPayload> {
  const [database, groq, voice, cloudinary, resend, twilio] = await Promise.all([
    checkDatabase(),
    checkGroq(),
    checkVoiceSignalingAsDependency(),
    checkCloudinary(),
    checkResend(),
    checkTwilio(),
  ]);

  const services: ServiceDependencyCheck[] = [database, groq, voice];
  if (cloudinary) services.push(cloudinary);
  if (resend) services.push(resend);
  if (twilio) services.push(twilio);

  return { services, summaryCheckedAt: nowIso() };
}
