// error-utils: Helper to handle and format errors for UI and logging
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
      message: context || error.message,
      correlationId: error.correlationId,
      error,
      meta: error.meta,
    });
    return { userMessage: error.userMessage, correlationId: error.correlationId };
  }
  Logger.log({
    level: 'error',
    message: context || (error as Error).message,
    correlationId,
    error: error as Error,
  });
  return {
    userMessage: 'An unexpected error occurred. Please contact support with the correlation ID.',
    correlationId,
  };
}
