/**
 * Fire webhook events (conversation.created, message.sent) to configured webhook integrations.
 */
import { prisma } from '@/lib/prisma';

type WebhookEvent = 'conversation.created' | 'message.sent';

async function getWebhookIntegrations(tenantId: string, event: WebhookEvent) {
  const integrations = await prisma.integration.findMany({
    where: {
      tenant_id: tenantId,
      type: 'webhook',
    },
  });
  return integrations.filter((i) => {
    const config = i.config as { url?: string; events?: string[] };
    const events = config?.events ?? ['conversation.created', 'message.sent'];
    return events.includes(event) && config?.url;
  });
}

export async function fireWebhook(
  tenantId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  const integrations = await getWebhookIntegrations(tenantId, event);
  const body = {
    ...payload,
    event,
    timestamp: new Date().toISOString(),
  };
  await Promise.all(
    integrations.map(async (i) => {
      const url = (i.config as { url: string }).url;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          console.error(`[Webhook] ${event} to ${url} failed: ${res.status}`);
        }
      } catch (err) {
        console.error(`[Webhook] ${event} to ${url} error:`, err instanceof Error ? err.message : err);
      }
    })
  );
}
