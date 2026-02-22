import { AuthProvider } from './auth-provider';
import { EmailPasswordAuthProvider } from './email-password-auth-provider';
// Future: import { GoogleAuthProvider } from './google-auth-provider';
// Future: import { GithubAuthProvider } from './github-auth-provider';

export class AuthProviderFactory {
  static getProvider(type: 'email' /* | 'google' | 'github' */): AuthProvider {
    switch (type) {
      case 'email':
        return new EmailPasswordAuthProvider();
      // case 'google':
      //   return new GoogleAuthProvider();
      // case 'github':
      //   return new GithubAuthProvider();
      default:
        throw new Error('Unknown auth provider type');
    }
  }
}
