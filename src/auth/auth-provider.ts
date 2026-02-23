// AuthProvider interface for pluggable authentication
export interface AuthProvider {
  signIn(credentials: Record<string, unknown>): Promise<AuthResult>;
  signUp(credentials: Record<string, unknown>): Promise<AuthResult>;
  getUserFromSession(sessionToken: string): Promise<AuthUser | null>;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  tenantId: string;
  permissions?: string[];
}
