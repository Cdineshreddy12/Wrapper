# Notifications Feature

Real-time notification system with a bell icon, slide-out panel, and individual notification management.

## Directory Structure

```
notifications/
├── index.ts                                # Re-exports all components and types
├── types.ts                                # Notification, NotificationType, NotificationPriority
├── NotificationBell.tsx                    # Bell icon with unread count badge
├── NotificationItem.tsx                    # Single notification row (title, message, actions)
├── NotificationPanel.tsx                   # Slide-out panel listing notifications
├── NotificationManager.tsx                 # Composes bell + panel, wires to useNotifications
└── SeasonalCreditsCongratulatoryModal.tsx   # Congratulatory modal for seasonal credit awards
```

## Components

- **NotificationManager** — Top-level component that composes the bell and panel, connected to `useNotifications` hook for loading, marking as read, and dismissing
- **NotificationBell** — Header bell icon showing unread notification count; opens panel on click
- **NotificationPanel** — Slide-out panel with notification list and "Mark all read" action
- **NotificationItem** — Individual notification with title, message, timestamp, and read/dismiss actions
- **SeasonalCreditsCongratulatoryModal** — Celebratory modal shown when seasonal credits are awarded

## Key APIs

Notifications are fetched and managed through `@/services/notificationService` and `@/hooks/useNotifications`:

| Action | Endpoint |
|--------|----------|
| List | `GET /notifications` |
| Unread count | `GET /notifications/unread-count` |
| Mark read | `PUT /notifications/:id/read` |
| Dismiss | `PUT /notifications/:id/dismiss` |
| Mark all read | `PUT /notifications/mark-all-read` |
| Test | `POST /notifications/test` |

## Dependencies

- `@/hooks/useNotifications` — Notification data and actions
- `@/services/notificationService` — API service layer
