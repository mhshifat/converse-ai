// SmsChannelProvider: Example pluggable SMS channel
import { ChannelProvider } from './channel-provider';

export class SmsChannelProvider implements ChannelProvider {
  async startSession({ customerId, agentId, channel, metadata }) {
    // TODO: Integrate with SMS service (Twilio, etc.)
    return { sessionId: `sms-${Date.now()}` };
  }
  async sendMessage({ sessionId, message }) {
    // TODO: Send SMS
  }
  async endSession(sessionId: string) {
    // TODO: End SMS session if needed
  }
}
