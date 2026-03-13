import { beforeEach, describe, expect, it, vi } from 'vitest';

const { emailServiceMock } = vi.hoisted(() => ({
  emailServiceMock: {
    sendUserInvitation: vi.fn(async () => ({ ok: true })),
    sendPaymentConfirmation: vi.fn(async () => ({ ok: true })),
    sendEmail: vi.fn(async () => ({ messageId: 'm1' })),
  },
}));

vi.mock('../../../utils/email.js', () => ({
  default: emailServiceMock,
}));

import { getEmailProvider, resetEmailProvider, setEmailProvider } from './brevo-adapter.js';

describe('brevo-adapter', () => {
  beforeEach(() => {
    resetEmailProvider();
    vi.clearAllMocks();
  });

  it('sends invitations through the email provider port', async () => {
    const provider = getEmailProvider();

    await provider.sendUserInvitation({
      email: 'test@example.com',
      tenantName: 'Acme',
      roleName: 'Admin',
      invitationToken: 'token',
      invitedByName: 'Owner',
    });

    expect(emailServiceMock.sendUserInvitation).toHaveBeenCalledTimes(1);
  });

  it('allows replacing provider for isolated service tests', async () => {
    const customProvider = {
      sendUserInvitation: vi.fn(async () => ({ mock: true })),
      sendPaymentConfirmation: vi.fn(async () => ({ mock: true })),
      sendEmail: vi.fn(async () => ({ mock: true })),
    };
    setEmailProvider(customProvider);

    const provider = getEmailProvider();
    const result = await provider.sendEmail({
      to: 'user@example.com',
      subject: 'Hello',
      htmlContent: '<p>Hi</p>',
    });

    expect(customProvider.sendEmail).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ mock: true });
  });
});
