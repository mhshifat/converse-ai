import * as conversationService from '@/server/services/conversation-service';
import { z } from 'zod';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const bodySchema = z.object({
  apiKey: z.string().min(1),
  customerId: z.string().min(1),
  channel: z.enum(['text', 'call']),
  content: z.string().min(1),
  attachmentUrl: z.string().url().optional(),
  conversationId: z.string().uuid().optional(),
});

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    parsed = bodySchema.parse(json);
  } catch {
    return Response.json(
      { error: 'Invalid request body' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      try {
        if (parsed.conversationId) {
          const result = await conversationService.sendMessage(
            parsed.conversationId,
            parsed.content,
            'customer',
            parsed.attachmentUrl,
            {
              onAgentDelta: (chunk) => {
                send({ type: 'delta', text: chunk });
              },
            }
          );
          if (!result) {
            send({ type: 'error', message: 'Conversation not found or ended' });
            return;
          }
          send({ type: 'done', result });
        } else {
          const result = await conversationService.sendFirstMessage(
            parsed.apiKey,
            parsed.customerId,
            parsed.channel,
            parsed.content,
            {
              attachmentUrl: parsed.attachmentUrl,
              onAgentDelta: (chunk) => {
                send({ type: 'delta', text: chunk });
              },
            }
          );
          if (!result) {
            send({ type: 'error', message: 'Chat unavailable' });
            return;
          }
          send({ type: 'done', result });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream failed';
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  const headers = new Headers(CORS_HEADERS);
  headers.set('Content-Type', 'text/event-stream; charset=utf-8');
  headers.set('Cache-Control', 'no-cache, no-transform');
  headers.set('Connection', 'keep-alive');
  headers.set('X-Accel-Buffering', 'no');

  return new Response(stream, { headers });
}
