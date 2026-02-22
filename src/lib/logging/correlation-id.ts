// CorrelationId: Generates and attaches correlation IDs for tracing
import { randomUUID } from 'crypto';

export function generateCorrelationId(): string {
  return randomUUID();
}

export function getCorrelationIdFromRequest(req: Request): string | undefined {
  return req.headers.get('x-correlation-id') || undefined;
}
