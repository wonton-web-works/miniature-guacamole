import { NextRequest } from 'next/server';
import { detectChanges } from '@/lib/data/change-detector';

const POLL_INTERVAL = 5000;
const HEARTBEAT_INTERVAL = 30000;

export async function GET(_request: NextRequest): Promise<Response> {
  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval>;
  let heartbeatId: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat
      controller.enqueue(
        encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`)
      );

      // Poll for changes
      intervalId = setInterval(() => {
        try {
          const changes = detectChanges();
          for (const change of changes) {
            const event = {
              type: change.type,
              data: change.data,
              timestamp: new Date().toISOString(),
            };
            controller.enqueue(
              encoder.encode(`event: ${change.type}\ndata: ${JSON.stringify(event)}\n\n`)
            );
          }
        } catch {
          // Silently handle errors during polling
        }
      }, POLL_INTERVAL);

      // Send periodic heartbeats
      heartbeatId = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`)
          );
        } catch {
          // Connection may be closed
        }
      }, HEARTBEAT_INTERVAL);
    },
    cancel() {
      clearInterval(intervalId);
      clearInterval(heartbeatId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
