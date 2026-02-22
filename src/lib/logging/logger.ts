// Logger: Simple logger with correlation ID and error stack
export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  correlationId?: string;
  error?: Error;
  meta?: Record<string, unknown>;
}

export class Logger {
  static log({ level, message, correlationId, error, meta }: LogEntry) {
    const base = `[${level.toUpperCase()}]${correlationId ? ` [cid:${correlationId}]` : ''}`;
    if (error) {
      // Show full error and stack for dev
      // In prod, send to Sentry or similar
      // eslint-disable-next-line no-console
      console.error(`${base} ${message}\n${error.message}\n${error.stack}`);
    } else {
      // eslint-disable-next-line no-console
      console[level](`${base} ${message}`, meta || '');
    }
  }
}
