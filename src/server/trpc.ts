import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import type { SessionUser } from '../lib/session';

function getCorrelationIdFromCause(cause: unknown): string | undefined {
  if (cause && typeof cause === 'object' && 'correlationId' in cause) {
    const id = (cause as { correlationId?: string }).correlationId;
    return typeof id === 'string' ? id : undefined;
  }
  return undefined;
}

export const t = initTRPC.context<{ user: SessionUser | null }>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const correlationId = getCorrelationIdFromCause(error.cause);
    return {
      ...shape,
      data: {
        ...shape.data,
        ...(correlationId && { correlationId }),
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.user) {
    throw new Error('Unauthorized');
  }
  return opts.next({ ctx: { ...opts.ctx, user: opts.ctx.user } });
});

export function roleProcedure(roles: string[]) {
  return protectedProcedure.use(async (opts) => {
    const user = opts.ctx.user as SessionUser;
    if (!roles.includes(user.role)) {
      throw new Error('Forbidden: insufficient role');
    }
    return opts.next();
  });
}

export function permissionProcedure(permissions: string[]) {
  // For future: check user permissions from DB or session
  return protectedProcedure.use(async (opts) => {
    // Example: user.permissions = ['manage_agents', 'view_reports']
    const user = opts.ctx.user as SessionUser & { permissions?: string[] };
    if (!user.permissions || !permissions.every((p) => user.permissions!.includes(p))) {
      throw new Error('Forbidden: insufficient permissions');
    }
    return opts.next();
  });
}
