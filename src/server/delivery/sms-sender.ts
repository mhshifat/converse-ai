/**
 * Pluggable SMS sending. Swap implementation via SMS_PROVIDER env (e.g. 'twilio').
 * Credentials come from env; integration config only supplies optional to/from overrides.
 */

export interface SendSmsOptions {
  to: string;
  body: string;
  from?: string;
}

export interface ISmsSender {
  send(options: SendSmsOptions): Promise<void>;
}

/** Twilio-backed sender – set SMS_PROVIDER=twilio, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM */
class TwilioSmsSender implements ISmsSender {
  private getAuth(): { accountSid: string; authToken: string } {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      throw new Error('SMS not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    }
    return { accountSid, authToken };
  }

  async send(options: SendSmsOptions): Promise<void> {
    const from = options.from ?? process.env.TWILIO_FROM;
    if (!from) throw new Error('SMS from number required. Set TWILIO_FROM or pass in integration config.');
    const { accountSid, authToken } = this.getAuth();
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${auth}`,
        },
        body: new URLSearchParams({
          To: options.to,
          From: from,
          Body: options.body,
        }).toString(),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Twilio send failed: ${res.status} ${err}`);
    }
  }
}

/** No-op when no SMS provider configured */
class NoopSmsSender implements ISmsSender {
  async send(): Promise<void> {
    // no-op; SMS provider not configured
  }
}

let cachedSender: ISmsSender | null = null;

export function getSmsSender(): ISmsSender {
  if (cachedSender) return cachedSender;
  const provider = (process.env.SMS_PROVIDER ?? '').toLowerCase();
  if (provider === 'twilio') {
    cachedSender = new TwilioSmsSender();
  } else {
    cachedSender = new NoopSmsSender();
  }
  return cachedSender;
}

export function setSmsSender(sender: ISmsSender | null): void {
  cachedSender = sender;
}
