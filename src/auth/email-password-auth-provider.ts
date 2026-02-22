import { AuthProvider, AuthResult, AuthUser } from './auth-provider';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

export class EmailPasswordAuthProvider implements AuthProvider {
  async signIn(credentials: { email: string; password: string }): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { email: credentials.email } });
    if (!user) return { success: false, error: 'Invalid credentials' };
    const valid = await bcrypt.compare(credentials.password, user.password_hash);
    if (!valid) return { success: false, error: 'Invalid credentials' };
    // Example: assign permissions based on role
    let permissions: string[] = [];
    if (user.role === 'admin') {
      permissions = ['manage_agents', 'view_reports', 'manage_projects'];
    } else if (user.role === 'agent') {
      permissions = ['view_reports'];
    } else if (user.role === 'merchant') {
      permissions = ['manage_projects'];
    }
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenant_id,
        permissions,
      },
    };
  }

  async signUp(credentials: { email: string; password: string; name: string; tenantId: string }): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({ where: { email: credentials.email } });
    if (existing) return { success: false, error: 'Email already in use' };
    const password_hash = await bcrypt.hash(credentials.password, 10);
    const user = await prisma.user.create({
      data: {
        email: credentials.email,
        name: credentials.name,
        role: 'merchant',
        tenant_id: credentials.tenantId,
        password_hash,
      },
    });
    // Default permissions for merchant
    const permissions = ['manage_projects'];
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenant_id,
        permissions,
      },
    };
  }

  async getUserFromSession(sessionToken: string): Promise<AuthUser | null> {
    // TODO: Implement session lookup
    return null;
  }
}
