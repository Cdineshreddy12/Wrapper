type EmailRecipient = { email: string; name?: string };

export interface EmailProviderPort {
  sendUserInvitation(payload: {
    email: string;
    tenantName: string;
    roleName: string;
    invitationToken: string;
    invitedByName: string;
    message?: string;
    invitedDate?: Date | string;
    expiryDate?: Date | string;
    organizations?: string[];
    locations?: string[];
    primaryOrganizationName?: string;
  }): Promise<unknown>;
  sendPaymentConfirmation(payload: {
    tenantId: string;
    userEmail: string;
    userName?: string;
    paymentType: string;
    amount: number;
    currency: string;
    transactionId?: string;
    planName?: string;
    billingCycle?: string;
    creditsAdded?: number;
    sessionId?: string;
  }): Promise<unknown>;
  sendEmail(payload: {
    to: EmailRecipient[] | EmailRecipient | string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    attachments?: unknown[];
  }): Promise<unknown>;
}
