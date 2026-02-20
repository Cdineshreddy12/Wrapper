# Messaging Feature

Amazon MQ (RabbitMQ)-based messaging infrastructure for inter-application events, job queues, and event tracking. This feature has no HTTP routes — it provides services and utilities consumed by other features.

## Directory Structure

```
messaging/
├── index.ts                                  # Feature exports
├── services/
│   ├── amazon-mq-consumer.ts                 # Event consumer from wrapper-events queue
│   ├── amazon-mq-job-queue.ts                # Job queue (immediate/bulk/scheduled)
│   ├── event-tracking-service.ts             # Event tracking with zero-db-success policy
│   └── inter-app-event-service.ts            # Inter-app event publishing and tracking
└── utils/
    └── amazon-mq-publisher.ts                # Amazon MQ publisher (topic + fanout exchanges)
```

## Endpoints

This feature does not define any HTTP routes. It is used internally by other features (credits, notifications, roles, organizations, etc.).

## Services

| Service | Description |
|---------|-------------|
| **AmazonMQConsumer** | Consumes from `wrapper-events` queue; handles event types: `user.created`, `user.deactivated`, `credit.allocated`, `org.created`, `role.*`. Acknowledges via InterAppEventService; retries then DLQ on failure |
| **AmazonMQJobQueue** | Job queue over Amazon MQ with exchange/queue declarations for immediate, bulk, and scheduled jobs. Used for notification processing. Supports add, schedule, cancel, and stats |
| **EventTrackingService** | Tracks published events with "zero-db-success" policy — only failed events are stored in DB. Provides event status, unacknowledged events, sync health metrics, and cleanup |
| **InterAppEventService** | High-level event API: publishEvent (via Amazon MQ), trackPublishedEvent, acknowledgeInterAppEvent, getCommunicationMatrix (tenant event counts and success rates by source/target app) |

## Utilities

| Utility | Description |
|---------|-------------|
| **AmazonMQPublisher** | Single publisher for Amazon MQ: topic exchange `inter-app-events`, fanout `inter-app-broadcast`. Publishes role, user, org, credit, and org-assignment events to applications. Handles routing keys, reconnection, and status |
