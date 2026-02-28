import { toast } from 'sonner';

type ErrorWithData = Error & { data?: { correlationId?: string } };

/**
 * Show an error toast. If the error has a correlationId (e.g. from tRPC),
 * display it and add a "Copy ID" action so users can copy it for support.
 */
export function toastTrpcError(err: unknown, fallbackMessage = 'Something went wrong'): void {
  const message = err instanceof Error ? err.message : fallbackMessage;
  const data = err && typeof err === 'object' && 'data' in err ? (err as ErrorWithData).data : undefined;
  const correlationId = typeof data?.correlationId === 'string' ? data.correlationId : undefined;

  toast.error(message, {
    description: correlationId ? `Correlation ID: ${correlationId}` : undefined,
    action: correlationId
      ? {
          label: 'Copy ID',
          onClick: () => {
            void navigator.clipboard.writeText(correlationId);
            toast.success('Correlation ID copied');
          },
        }
      : undefined,
  });
}
