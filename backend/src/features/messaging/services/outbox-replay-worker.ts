import { EventTrackingService } from './event-tracking-service.js';

let replayWorkerStarted = false;

export function startOutboxReplayWorker(): void {
  if (replayWorkerStarted) return;
  replayWorkerStarted = true;

  const intervalMs = Number(process.env.OUTBOX_REPLAY_INTERVAL_MS || 30000);
  const batchSize = Number(process.env.OUTBOX_REPLAY_BATCH_SIZE || 100);
  const maxRetries = Number(process.env.OUTBOX_MAX_RETRIES || 10);

  const runReplay = async () => {
    try {
      const replayed = await EventTrackingService.replayPendingEvents(batchSize, maxRetries);
      if (replayed > 0) {
        console.log(`🔁 Outbox replay worker republished ${replayed} event(s)`);
      }
    } catch (error: any) {
      console.error('❌ Outbox replay worker failed:', error?.message || error);
    }
  };

  setImmediate(() => {
    void runReplay();
  });

  const timer = setInterval(() => {
    void runReplay();
  }, intervalMs);

  if (typeof (timer as any).unref === 'function') {
    (timer as any).unref();
  }
}
