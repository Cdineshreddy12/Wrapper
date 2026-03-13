import { beforeEach, describe, expect, it, vi } from 'vitest';

const { kindeServiceMock } = vi.hoisted(() => ({
  kindeServiceMock: {
    baseURL: 'https://auth.example.com',
    getSocialAuthUrl: vi.fn(() => 'https://auth.example.com/oauth2/auth'),
    generateLoginUrl: vi.fn(() => 'https://auth.example.com/login'),
    exchangeCodeForTokens: vi.fn(async () => ({ access_token: 'token' })),
    getEnhancedUserInfo: vi.fn(async () => ({
      id: 'u1',
      organizations: [],
      socialProvider: 'google',
      hasMultipleOrganizations: false,
    })),
    getUserInfo: vi.fn(async () => ({ id: 'u1' })),
    refreshToken: vi.fn(async () => ({ access_token: 'new-token' })),
    addUserToOrganization: vi.fn(async () => ({ success: true })),
  },
}));

vi.mock('../services/kinde-service.js', () => ({
  default: kindeServiceMock,
}));

import { getIdentityProvider, resetIdentityProvider, setIdentityProvider } from './kinde-adapter.js';

describe('kinde-adapter', () => {
  beforeEach(() => {
    resetIdentityProvider();
    vi.clearAllMocks();
  });

  it('delegates calls to kinde service through the port', async () => {
    const provider = getIdentityProvider();
    const result = await provider.getUserInfo('access-token');

    expect(kindeServiceMock.getUserInfo).toHaveBeenCalledWith('access-token');
    expect(result).toEqual({ id: 'u1' });
  });

  it('supports test-time replacement via setIdentityProvider', async () => {
    const customProvider = {
      baseURL: 'mock://identity',
      getSocialAuthUrl: vi.fn(() => 'mock://social'),
      generateLoginUrl: vi.fn(() => 'mock://login'),
      exchangeCodeForTokens: vi.fn(async () => ({ access_token: 'mock' })),
      getEnhancedUserInfo: vi.fn(async () => ({ organizations: [], socialProvider: 'mock', hasMultipleOrganizations: false })),
      getUserInfo: vi.fn(async () => ({ id: 'mock-user' })),
      refreshToken: vi.fn(async () => ({ access_token: 'mock-refresh' })),
      addUserToOrganization: vi.fn(async () => ({ success: true })),
    };

    setIdentityProvider(customProvider);
    const provider = getIdentityProvider();
    const result = await provider.getUserInfo('anything');

    expect(customProvider.getUserInfo).toHaveBeenCalledWith('anything');
    expect(result).toEqual({ id: 'mock-user' });
  });
});
