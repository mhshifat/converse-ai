import { nanoid } from 'nanoid';
import nodemailer from 'nodemailer';
import { prisma } from '../../lib/prisma';

const VERIFICATION_TYPE = 'email_verification';
const TOKEN_EXPIRY_HOURS = 24;

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
}

function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.SYSTEM_SMTP_HOST ?? process.env.SMTP_HOST;
  const portRaw = process.env.SYSTEM_SMTP_PORT ?? process.env.SMTP_PORT;
  const port = portRaw ? Number(portRaw) : undefined;
  const user = process.env.SYSTEM_SMTP_USER ?? process.env.SMTP_USER;
  const pass = process.env.SYSTEM_SMTP_PASSWORD ?? process.env.SMTP_PASS;
  const secure = process.env.SYSTEM_SMTP_SECURE ?? process.env.SMTP_SECURE;
  if (host && port !== undefined && !Number.isNaN(port)) {
    return nodemailer.createTransport({
      host,
      port,
      secure: secure === 'true',
      auth: user && pass ? { user, pass } : undefined,
    });
  }
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    return nodemailer.createTransport({
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      auth: {
        user: `postmaster@${process.env.MAILGUN_DOMAIN}`,
        pass: process.env.MAILGUN_API_KEY,
      },
    });
  }
  return null;
}

export async function createVerificationToken(userId: string): Promise<string> {
  const token = nanoid(32);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);
  await prisma.verification_token.upsert({
    where: {
      user_id_type: { user_id: userId, type: VERIFICATION_TYPE },
    },
    create: { user_id: userId, token, type: VERIFICATION_TYPE, expires_at: expiresAt },
    update: { token, expires_at: expiresAt },
  });
  return token;
}

export async function sendVerificationEmail(email: string, token: string): Promise<{ sent: boolean; error?: string }> {
  const baseUrl = getBaseUrl();
  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const from =
    process.env.VERIFICATION_EMAIL_FROM ??
    process.env.SYSTEM_SMTP_FROM_EMAIL ??
    process.env.SMTP_USER ??
    'noreply@localhost';

  const transporter = getTransporter();
  if (!transporter) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[Verification] No SMTP configured. Verification link:', verifyUrl);
    }
    return { sent: false, error: 'Email not configured' };
  }

  try {
    await transporter.sendMail({
      from,
      to: email,
      subject: 'Verify your email - ConverseAI',
      text: `Please verify your email by opening this link:\n\n${verifyUrl}\n\nThis link expires in ${TOKEN_EXPIRY_HOURS} hours.`,
      html: `
        <p>Please verify your email by clicking the link below:</p>
        <p><a href="${verifyUrl}">Verify my email</a></p>
        <p>This link expires in ${TOKEN_EXPIRY_HOURS} hours.</p>
        <p>If you didn't create an account, you can ignore this email.</p>
      `,
    });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email';
    return { sent: false, error: message };
  }
}

export async function verifyEmailToken(token: string): Promise<{ success: boolean; error?: string }> {
  const record = await prisma.verification_token.findFirst({
    where: { token, type: VERIFICATION_TYPE },
    include: { user: true },
  });
  if (!record) {
    return { success: false, error: 'Invalid or expired verification link' };
  }
  if (record.expires_at < new Date()) {
    await prisma.verification_token.delete({ where: { id: record.id } });
    return { success: false, error: 'Verification link has expired' };
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.user_id },
      data: { email_verified: true, email_verified_at: new Date() },
    }),
    prisma.verification_token.delete({ where: { id: record.id } }),
  ]);
  return { success: true };
}
