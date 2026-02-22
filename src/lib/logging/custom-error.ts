// CustomError: For user-friendly and developer error separation
export class CustomError extends Error {
  public correlationId: string;
  public userMessage: string;
  public meta?: Record<string, unknown>;

  constructor({
    message,
    userMessage,
    correlationId,
    meta,
  }: {
    message: string;
    userMessage: string;
    correlationId: string;
    meta?: Record<string, unknown>;
  }) {
    super(message);
    this.correlationId = correlationId;
    this.userMessage = userMessage;
    this.meta = meta;
  }
}
