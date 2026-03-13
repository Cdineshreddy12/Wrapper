import kindeService from '../services/kinde-service.js';
import type { IdentityProviderPort } from '../ports/identity-provider.js';

class KindeIdentityAdapter implements IdentityProviderPort {
  get baseURL(): string {
    return kindeService.baseURL;
  }

  getSocialAuthUrl(provider: string, options = {}): string {
    return kindeService.getSocialAuthUrl(provider, options);
  }

  generateLoginUrl(orgCode: string, redirectUri: string, options = {}): string {
    return kindeService.generateLoginUrl(orgCode, redirectUri, options);
  }

  exchangeCodeForTokens(code: string, redirectUri: string): Promise<Record<string, unknown>> {
    return kindeService.exchangeCodeForTokens(code, redirectUri);
  }

  getEnhancedUserInfo(
    accessToken: string
  ): Promise<
    {
      id?: string;
      email?: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      first_name?: string;
      last_name?: string;
      picture?: string;
      org_code?: string;
      org_codes?: string[];
      organizations: unknown[];
      socialProvider: string;
      hasMultipleOrganizations: boolean;
    }
  > {
    return kindeService.getEnhancedUserInfo(accessToken);
  }

  getUserInfo(accessToken: string): Promise<Record<string, unknown>> {
    return kindeService.getUserInfo(accessToken);
  }

  refreshToken(refreshToken: string): Promise<Record<string, unknown>> {
    return kindeService.refreshToken(refreshToken);
  }

  addUserToOrganization(
    kindeUserId: string,
    orgCode: string,
    options = {}
  ): Promise<Record<string, unknown>> {
    return kindeService.addUserToOrganization(kindeUserId, orgCode, options);
  }
}

let provider: IdentityProviderPort | null = null;

export function getIdentityProvider(): IdentityProviderPort {
  if (!provider) {
    provider = new KindeIdentityAdapter();
  }
  return provider;
}

export function setIdentityProvider(identityProvider: IdentityProviderPort): void {
  provider = identityProvider;
}

export function resetIdentityProvider(): void {
  provider = null;
}
