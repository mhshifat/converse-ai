import pino from 'pino';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  correlationId?: string;
  error?: unknown;
  meta?: Record<string, unknown>;
}

function toPinoLevel(level: LogLevel): pino.Level {
  return level as pino.Level;
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error));
}

const isDev = process.env.NODE_ENV !== 'production';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss.l',
        ignore: 'pid,hostname',
        messageFormat: '{msg}',
        errorLikeObjectKeys: ['err'],
      },
    },
  }),
  base: { pid: process.pid },
});

export class Logger {
  static log({ level, message, correlationId, error, meta }: LogEntry): void {
    const bindings: Record<string, unknown> = {
      ...(correlationId && { correlationId }),
      ...(meta && Object.keys(meta).length > 0 && meta),
    };

    if (error !== undefined) {
      const err = normalizeError(error);
      // Log original error (message + stack) for debugging; pino serializes err with message, stack, type
      pinoLogger[toPinoLevel(level)](
        {
          ...bindings,
          err,
        },
        message
      );
    } else {
      pinoLogger[toPinoLevel(level)](bindings, message);
    }
  }
}
