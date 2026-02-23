import { TRPCError } from '@trpc/server';
import { generateCorrelationId } from '../lib/logging/correlation-id';
import { handleError } from '../lib/logging/error-utils';

/**
 * Throws TRPCError with NOT_FOUND and correlationId in cause (client can read for support).
 */
export function throwNotFound(context: string, userMessage: string): never {
  const correlationId = generateCorrelationId();
  throwNotFoundWithId(correlationId, userMessage);
}

/**
 * Same as throwNotFound but uses the given correlationId (e.g. from withCorrelationError).
 */
export function throwNotFoundWithId(correlationId: string, userMessage: string): never {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: userMessage,
    cause: { correlationId },
  });
}

/**
 * Throws TRPCError with BAD_REQUEST and correlationId (e.g. validation errors).
 */
export function throwBadRequestWithId(correlationId: string, userMessage: string): never {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: userMessage,
    cause: { correlationId },
  });
}

/**
 * Wraps procedure logic: on thrown error, logs with handleError (original message + stack)
 * and rethrows TRPCError with user-friendly message and correlationId in cause.
 */
export async function withCorrelationError<T>(
  context: string,
  fn: (correlationId: string) => Promise<T>
): Promise<T> {
  const correlationId = generateCorrelationId();
  try {
    return await fn(correlationId);
  } catch (error: unknown) {
    if (error instanceof TRPCError) throw error;
    const { userMessage, correlationId: cid } = handleError({
      error,
      correlationId,
      context,
    });
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: userMessage,
      cause: { correlationId: cid, original: error },
    });
  }
}
