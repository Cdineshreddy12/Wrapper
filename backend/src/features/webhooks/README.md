# Webhooks Feature

Stripe webhook forwarding, generic external webhook handling, and webhook reliability processing with retries, logging, and stats.

## Directory Structure

```
webhooks/
├── index.ts                          # Feature exports (webhookRoutes, WebhookProcessor)
├── routes/
│   └── webhooks.ts                   # Webhook endpoints
└── utils/
    └── webhook-processor.ts          # WebhookProcessor for reliability and stats
```

## Endpoints (`/api/webhooks`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/stripe` | Forwards to subscriptions webhook handler (307 redirect) |
| POST | `/external/:service` | Generic handler for external service webhooks (logs and acknowledges) |
| GET | `/health` | Health check for webhook handler |

## Utilities

| Utility | Description |
|---------|-------------|
| **WebhookProcessor** | Reliability wrapper: `processWithReliability` runs a processor with up to 3 retries and exponential backoff. Failure logging to `webhookLogs` table. Stats (counts by status for last N hours). Retention cleanup (delete logs older than N days) |
