/**
 * Base URL for OAuth redirect URIs (must be absolute).
 */
export function getAuthBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
  if (url) {
    return url.startsWith('http') ? url.replace(/\/$/, '') : `https://${url}`;
  }
  const port = process.env.PORT ?? 3000;
  return `http://localhost:${port}`;
}

export function getGoogleCallbackUrl(): string {
  return `${getAuthBaseUrl()}/api/auth/google/callback`;
}

export function getGitHubCallbackUrl(): string {
  return `${getAuthBaseUrl()}/api/auth/github/callback`;
}
