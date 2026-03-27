import { generateCorrelationId } from '@/lib/logging/correlation-id';
import { handleError } from '@/lib/logging/error-utils';
import { Logger } from '@/lib/logging/logger';

export type OAuthCallbackProvider = 'google' | 'github';

function oauthNotConfiguredMessage(provider: OAuthCallbackProvider): string {
  return provider === 'github' ? 'GitHub OAuth not configured' : 'Google OAuth not configured';
}

/**
 * Builds a /login redirect after OAuth callback failure.
 * Never places raw Prisma/stack traces in the query string (per note.md).
 */
export function buildLoginRedirectForOAuthCallbackFailure(
  loginUrl: string,
  caught: unknown,
  context: string,
  provider: OAuthCallbackProvider
): string {
  if (
    caught instanceof Error &&
    caught.message === oauthNotConfiguredMessage(provider)
  ) {
    const correlationId = generateCorrelationId();
    Logger.log({
      level: 'error',
      message: `${context}: OAuth credentials missing`,
      correlationId,
      error: caught,
    });
    const params = new URLSearchParams({
      error: 'oauth_not_configured',
      provider,
      correlation_id: correlationId,
    });
    return `${loginUrl}?${params.toString()}`;
  }

  const correlationId = generateCorrelationId();
  handleError({ error: caught, correlationId, context });
  const params = new URLSearchParams({
    error: 'oauth_failed',
    correlation_id: correlationId,
  });
  return `${loginUrl}?${params.toString()}`;
}
