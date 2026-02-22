// ChannelProviderFactory: Selects channel provider (email, discord, sms, etc.)
import { ChannelProvider } from './channel-provider';
import { EmailChannelProvider } from './email-channel-provider';
import { DiscordChannelProvider } from './discord-channel-provider';
import { SmsChannelProvider } from './sms-channel-provider';

export class ChannelProviderFactory {
  static getProvider(type: 'email' | 'discord' | 'sms'): ChannelProvider {
    switch (type) {
      case 'email':
        return new EmailChannelProvider();
      case 'discord':
        return new DiscordChannelProvider();
      case 'sms':
        return new SmsChannelProvider();
      default:
        throw new Error('Unknown channel provider type');
    }
  }
}
