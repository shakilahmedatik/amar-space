import { createLogger } from "@omniheaven/logger";
import type { WSContext } from "hono/ws";

const log = createLogger("websocket-hub");

// Tenant channel subscribers: Map<channel, Set<WSContext>>
const channels = new Map<string, Set<WSContext>>();

/**
 * Subscribes a WebSocket client to a tenant-scoped channel.
 */
export function subscribeToChannel(channel: string, ws: WSContext): void {
  let subscribers = channels.get(channel);
  if (!subscribers) {
    subscribers = new Set();
    channels.set(channel, subscribers);
  }
  subscribers.add(ws);
  log.debug({ channel, totalSubscribers: subscribers.size }, "Client subscribed to channel");
}

/**
 * Removes a WebSocket client from all channels on disconnect.
 */
export function removeClient(ws: WSContext): void {
  for (const [channel, subscribers] of channels.entries()) {
    subscribers.delete(ws);
    if (subscribers.size === 0) {
      channels.delete(channel);
    }
  }
}

export type OmniHeavenRealtimeEvent =
  | {
      type: "booking.created";
      data: { bookingId: string; roomNumber?: string; customerName: string; amount: string };
    }
  | {
      type: "payment.confirmed";
      data: { paymentId: string; billId?: string; amount: string; method: string };
    }
  | {
      type: "ticket.created";
      data: { ticketId: string; flatNumber?: string; title: string; priority: string };
    }
  | { type: "notice.broadcast"; data: { noticeId: string; title: string; effectiveDate: string } };

/**
 * Broadcasts a real-time event to all connected clients in a tenant's organization channel.
 */
export function broadcastToTenant(organizationId: string, event: OmniHeavenRealtimeEvent): void {
  const channel = `org:${organizationId}`;
  const subscribers = channels.get(channel);

  if (!subscribers || subscribers.size === 0) {
    return;
  }

  const payload = JSON.stringify({
    channel,
    timestamp: new Date().toISOString(),
    ...event,
  });

  for (const client of subscribers) {
    try {
      client.send(payload);
    } catch (err) {
      log.warn({ err }, "Failed to send websocket payload to client");
      subscribers.delete(client);
    }
  }
}
