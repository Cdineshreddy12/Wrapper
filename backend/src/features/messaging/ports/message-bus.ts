export interface MessageBusPort {
  isConfigured(): boolean;
  initializeAtStartup(): Promise<boolean>;
  publishInterAppEvent(payload: {
    eventType: string;
    sourceApplication: string;
    targetApplication: string;
    tenantId: string;
    entityId: string;
    eventData?: Record<string, unknown>;
    publishedBy?: string;
    eventId?: string;
  }): Promise<{ success: boolean; eventId: string; routingKey: string; messageId: string }>;
  publishBroadcast(
    eventType: string,
    eventData: Record<string, unknown>,
    publishedBy?: string
  ): Promise<{ success: boolean; eventType: string }>;
  disconnect(): Promise<void>;
}
