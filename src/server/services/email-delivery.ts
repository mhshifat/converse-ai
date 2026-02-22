import nodemailer from 'nodemailer';

export interface EmailDeliveryConfig {
  from?: string;
  to?: string;
  /** SMTP: host, port, user, pass */
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  secure?: boolean;
  /** Mailgun-style: apiKey + domain → use Mailgun SMTP */
  apiKey?: string;
  domain?: string;
}

/**
 * Send compiled conversation data via email.
 * Supports SMTP (host/port/user/pass) or Mailgun-style (apiKey + domain).
 */
export async function sendCompiledDataEmail(
  config: EmailDeliveryConfig,
  data: Record<string, unknown>,
  subject = 'ConverseAI: Conversation data'
): Promise<void> {
  const to = config.to ?? config.from;
  if (!to) {
    throw new Error('Email integration missing "to" or "from"');
  }

  const transporter = buildTransporter(config);
  const from = config.from ?? (config.user ?? `noreply@${config.domain ?? 'localhost'}`);

  await transporter.sendMail({
    from,
    to,
    subject,
    text: JSON.stringify(data, null, 2),
    html: `<pre style="font-family:sans-serif;white-space:pre-wrap;">${escapeHtml(JSON.stringify(data, null, 2))}</pre>`,
  });
}

function buildTransporter(config: EmailDeliveryConfig): nodemailer.Transporter {
  if (config.host && config.port !== undefined) {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? config.port === 465,
      auth:
        config.user && config.pass
          ? { user: config.user, pass: config.pass }
          : undefined,
    });
  }
  if (config.apiKey && config.domain) {
    return nodemailer.createTransport({
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      auth: {
        user: `postmaster@${config.domain}`,
        pass: config.apiKey,
      },
    });
  }
  throw new Error(
    'Email integration needs either SMTP (host, port, user, pass) or Mailgun (apiKey, domain)'
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
