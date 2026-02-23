// error-utils: Helper to handle and format errors for UI and logging (per note.md)
import { Logger } from './logger';
import { CustomError } from './custom-error';

export function handleError({
  error,
  correlationId,
  context,
}: {
  error: unknown;
  correlationId: string;
  context?: string;
}): { userMessage: string; correlationId: string } {
  if (error instanceof CustomError) {
    Logger.log({
      level: 'error',
      message: context ?? error.message,
      correlationId: error.correlationId,
      error,
      meta: error.meta,
    });
    return { userMessage: error.userMessage, correlationId: error.correlationId };
  }
  const contextMessage = context ?? (error instanceof Error ? error.message : 'Unexpected error');
  Logger.log({
    level: 'error',
    message: contextMessage,
    correlationId,
    error,
  });
  return {
    userMessage: 'Something went wrong. Please try again or contact support with the correlation ID.',
    correlationId,
  };
}
