import { amazonMQPublisher } from '../utils/amazon-mq-publisher.js';
import type { MessageBusPort } from '../ports/message-bus.js';

class AmazonMqMessageBusAdapter implements MessageBusPort {
  isConfigured(): boolean {
    return amazonMQPublisher.isConfigured();
  }

  initializeAtStartup(): Promise<boolean> {
    return amazonMQPublisher.initializeAtStartup();
  }

  publishInterAppEvent(payload: {
    eventType: string;
    sourceApplication: string;
    targetApplication: string;
    tenantId: string;
    entityId: string;
    eventData?: Record<string, unknown>;
    publishedBy?: string;
    eventId?: string;
  }): Promise<{ success: boolean; eventId: string; routingKey: string; messageId: string }> {
    return amazonMQPublisher.publishInterAppEvent(payload);
  }

  publishBroadcast(
    eventType: string,
    eventData: Record<string, unknown>,
    publishedBy = 'system'
  ): Promise<{ success: boolean; eventType: string }> {
    return amazonMQPublisher.publishBroadcast(eventType, eventData, publishedBy);
  }

  disconnect(): Promise<void> {
    return amazonMQPublisher.disconnect();
  }
}

let messageBus: MessageBusPort | null = null;

export function getMessageBus(): MessageBusPort {
  if (!messageBus) {
    messageBus = new AmazonMqMessageBusAdapter();
  }
  return messageBus;
}

export function setMessageBus(bus: MessageBusPort): void {
  messageBus = bus;
}

export function resetMessageBus(): void {
  messageBus = null;
}
