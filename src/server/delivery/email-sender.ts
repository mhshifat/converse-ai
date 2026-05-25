/**
 * Pluggable email sending. Swap implementation via EMAIL_PROVIDER env (e.g. 'nodemailer' | 'resend' | 'bytloop').
 * Credentials and server config come from env; integration config only supplies optional to/from overrides.
 */

import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

export interface IEmailSender {
  send(options: SendEmailOptions): Promise<void>;
}

/** Nodemailer-backed sender using SYSTEM_SMTP_* or SMTP_* or Mailgun env vars */
class NodemailerEmailSender implements IEmailSender {
  private getTransporter(): nodemailer.Transporter {
    const host = process.env.SYSTEM_SMTP_HOST ?? process.env.SMTP_HOST;
    const portRaw = process.env.SYSTEM_SMTP_PORT ?? process.env.SMTP_PORT;
    const port = portRaw ? Number(portRaw) : undefined;
    const user = process.env.SYSTEM_SMTP_USER ?? process.env.SMTP_USER;
    const pass = process.env.SYSTEM_SMTP_PASSWORD ?? process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS;
    const secureRaw = process.env.SYSTEM_SMTP_SECURE ?? process.env.SMTP_SECURE;
    const secure = secureRaw === 'true';
    if (host && port !== undefined && !Number.isNaN(port)) {
      return nodemailer.createTransport({
        host,
        port,
        secure: secure ?? port === 465,
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
    throw new Error(
      'Email not configured. Set SYSTEM_SMTP_HOST/SYSTEM_SMTP_PORT (or SMTP_*) or MAILGUN_API_KEY/MAILGUN_DOMAIN.'
    );
  }

  async send(options: SendEmailOptions): Promise<void> {
    const transporter = this.getTransporter();
    const from =
      options.from ??
      process.env.SYSTEM_SMTP_FROM_EMAIL ??
      process.env.EMAIL_FROM ??
      process.env.SMTP_USER ??
      'noreply@localhost';
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html ?? options.text,
    });
  }
}

/** Resend API sender – set EMAIL_PROVIDER=resend and RESEND_API_KEY */
class ResendEmailSender implements IEmailSender {
  async send(options: SendEmailOptions): Promise<void> {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not set');
    const from = options.from ?? process.env.EMAIL_FROM ?? 'onboarding@resend.dev';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        text: options.text,
        html: options.html ?? options.text,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend send failed: ${res.status} ${err}`);
    }
  }
}

/** Bytloop API sender – set EMAIL_PROVIDER=bytloop, BYTLOOP_MAIL_KEY, and BYTLOOP_MAIL_FROM (or EMAIL_FROM). */
class BytloopEmailSender implements IEmailSender {
  async send(options: SendEmailOptions): Promise<void> {
    const key = process.env.BYTLOOP_MAIL_KEY;
    if (!key) throw new Error('BYTLOOP_MAIL_KEY is not set');
    const url = process.env.BYTLOOP_MAIL_URL ?? 'https://mail.bytloop.com/api/v1/emails';
    const from =
      options.from ?? process.env.BYTLOOP_MAIL_FROM ?? process.env.EMAIL_FROM ?? '';
    if (!from) {
      throw new Error(
        "Bytloop: no 'from' address — set BYTLOOP_MAIL_FROM or EMAIL_FROM env var"
      );
    }
    // Bytloop's click tracker host has been observed pointing at localhost in
    // some deployments, silently breaking every link. Disabled by default; set
    // BYTLOOP_TRACK_CLICKS=true to opt back in once their tracker is verified.
    const trackClicks = process.env.BYTLOOP_TRACK_CLICKS === 'true';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        text: options.text,
        html: options.html ?? options.text,
        // Multiple field names because Bytloop's SDK versions are inconsistent
        // about which one wins; sending all three is harmless.
        trackClicks,
        track_clicks: trackClicks,
        tracking: { clicks: trackClicks, opens: trackClicks },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(
        `Bytloop mail API error (${res.status} ${res.statusText}): ${err || '<empty body>'}`
      );
    }
  }
}

let cachedSender: IEmailSender | null = null;

export function getEmailSender(): IEmailSender {
  if (cachedSender) return cachedSender;
  const provider = (process.env.EMAIL_PROVIDER ?? 'nodemailer').toLowerCase();
  if (provider === 'resend') {
    cachedSender = new ResendEmailSender();
  } else if (provider === 'bytloop') {
    cachedSender = new BytloopEmailSender();
  } else {
    cachedSender = new NodemailerEmailSender();
  }
  return cachedSender;
}

/** For tests or swapping at runtime */
export function setEmailSender(sender: IEmailSender | null): void {
  cachedSender = sender;
}
