import EmailService from '../../../utils/email.js';
import type { EmailProviderPort } from '../ports/email-provider.js';

class BrevoEmailAdapter implements EmailProviderPort {
  async sendUserInvitation(payload: {
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
  }): Promise<unknown> {
    return EmailService.sendUserInvitation(payload);
  }

  async sendPaymentConfirmation(payload: {
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
  }): Promise<unknown> {
    return EmailService.sendPaymentConfirmation(payload);
  }

  async sendEmail(payload: {
    to: { email: string; name?: string }[] | { email: string; name?: string } | string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    attachments?: unknown[];
  }): Promise<unknown> {
    return EmailService.sendEmail(payload);
  }
}

let provider: EmailProviderPort | null = null;

export function getEmailProvider(): EmailProviderPort {
  if (!provider) {
    provider = new BrevoEmailAdapter();
  }
  return provider;
}

export function setEmailProvider(emailProvider: EmailProviderPort): void {
  provider = emailProvider;
}

export function resetEmailProvider(): void {
  provider = null;
}
