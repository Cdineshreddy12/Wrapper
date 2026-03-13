import type {
  AddUserToOrgOptions,
  LoginUrlOptions,
  SocialAuthOptions,
  UserInfoNormalized,
} from '../services/kinde-service.js';

export interface IdentityProviderPort {
  baseURL: string;
  getSocialAuthUrl(provider: string, options?: SocialAuthOptions): string;
  generateLoginUrl(orgCode: string, redirectUri: string, options?: LoginUrlOptions): string;
  exchangeCodeForTokens(code: string, redirectUri: string): Promise<Record<string, unknown>>;
  getEnhancedUserInfo(
    accessToken: string
  ): Promise<UserInfoNormalized & { organizations: unknown[]; socialProvider: string; hasMultipleOrganizations: boolean }>;
  getUserInfo(accessToken: string): Promise<Record<string, unknown>>;
  refreshToken(refreshToken: string): Promise<Record<string, unknown>>;
  addUserToOrganization(
    kindeUserId: string,
    orgCode: string,
    options?: AddUserToOrgOptions
  ): Promise<Record<string, unknown>>;
}
