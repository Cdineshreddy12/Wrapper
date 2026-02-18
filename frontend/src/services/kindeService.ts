import { api } from '../lib/api';
import { logger } from '@/lib/logger';

// Types for Kinde service
export interface CreateOrganizationRequest {
  companyName: string;
  subdomain: string;
  adminEmail: string;
  adminName: string;
  kindeUserId?: string;
}

export interface CreateOrganizationResponse {
  success: boolean;
  organization?: {
    tenantId: string;
    companyName: string;
    subdomain: string;
  };
  dashboardUrl?: string;
  error?: string;
  message?: string;
}

export interface CreateUserRequest {
  email: string;
  givenName: string;
  familyName: string;
  organizationCode: string;
}

export interface CreateUserResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    givenName: string;
    familyName: string;
  };
  error?: string;
  message?: string;
}

export interface OrganizationInfo {
  code: string;
  name: string;
  external_id?: string;
  is_default: boolean;
  created_with_fallback?: boolean;
}

export interface UserInfo {
  id: string;
  email: string;
  given_name: string;
  family_name: string;
  created_with_fallback?: boolean;
}

export interface AddUserToOrgRequest {
  userId: string;
  orgCode: string;
  exclusive?: boolean;
}

export interface RemoveUserFromOrgRequest {
  userId: string;
  orgCode: string;
}

class KindeService {
  private readonly baseURL: string;

  constructor() {
    // Align with api client: VITE_API_URL has /api; backend root is without /api for direct calls
    const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
    this.baseURL = apiBase.replace(/\/api\/?$/, '') || 'http://localhost:3000';
  }

  /**
   * Create a new organization
   */
  async createOrganization(data: CreateOrganizationRequest): Promise<CreateOrganizationResponse> {
    try {
      logger.debug('🏢 KindeService.createOrganization - Creating organization:', data);

      const response = await api.post('/auth/setup-organization', {
        companyName: data.companyName,
        subdomain: data.subdomain,
        kindeUserId: data.kindeUserId,
        email: data.adminEmail,
        name: data.adminName
      });

      logger.debug('✅ KindeService.createOrganization - Success:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('❌ KindeService.createOrganization - Error:', error);
      
      // Handle different error types
      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.error || 'Organization creation failed',
          message: error.response.data.message || error.message
        };
      }
      
      return {
        success: false,
        error: 'Organization creation failed',
        message: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Create a new user in an organization
   */
  async createUser(data: CreateUserRequest): Promise<CreateUserResponse> {
    try {
      logger.debug('👤 KindeService.createUser - Creating user:', data);

      const response = await api.post('/auth/create-user', {
        email: data.email,
        givenName: data.givenName,
        familyName: data.familyName,
        organizationCode: data.organizationCode
      });

      logger.debug('✅ KindeService.createUser - Success:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('❌ KindeService.createUser - Error:', error);
      
      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.error || 'User creation failed',
          message: error.response.data.message || error.message
        };
      }
      
      return {
        success: false,
        error: 'User creation failed',
        message: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(): Promise<{ organizations: OrganizationInfo[]; success: boolean }> {
    try {
      logger.debug('🔍 KindeService.getUserOrganizations - Getting user organizations');

      const response = await api.get('/auth/user-organizations');
      
      logger.debug('✅ KindeService.getUserOrganizations - Success:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('❌ KindeService.getUserOrganizations - Error:', error);
      
      return {
        organizations: [],
        success: false
      };
    }
  }

  /**
   * Add user to organization
   */
  async addUserToOrganization(userId: string, orgCode: string, options: { exclusive?: boolean } = {}): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      logger.debug('🔗 KindeService.addUserToOrganization - Adding user to organization:', { userId, orgCode, options });

      const response = await api.post('/auth/add-user-to-organization', {
        userId,
        orgCode,
        exclusive: options.exclusive || false
      });

      logger.debug('✅ KindeService.addUserToOrganization - Success:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('❌ KindeService.addUserToOrganization - Error:', error);
      
      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.error || 'Failed to add user to organization',
          message: error.response.data.message || error.message
        };
      }
      
      return {
        success: false,
        error: 'Failed to add user to organization',
        message: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Remove user from organization
   */
  async removeUserFromOrganization(userId: string, orgCode: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      logger.debug('🗑️ KindeService.removeUserFromOrganization - Removing user from organization:', { userId, orgCode });

      const response = await api.post('/auth/remove-user-from-organization', {
        userId,
        orgCode
      });

      logger.debug('✅ KindeService.removeUserFromOrganization - Success:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('❌ KindeService.removeUserFromOrganization - Error:', error);
      
      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.error || 'Failed to remove user from organization',
          message: error.response.data.message || error.message
        };
      }
      
      return {
        success: false,
        error: 'Failed to remove user from organization',
        message: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Get organization details
   */
  async getOrganizationDetails(orgCode: string): Promise<{ success: boolean; organization?: OrganizationInfo; error?: string }> {
    try {
      logger.debug('🔍 KindeService.getOrganizationDetails - Getting organization details:', orgCode);

      const response = await api.get(`/auth/organization/${orgCode}`);
      
      logger.debug('✅ KindeService.getOrganizationDetails - Success:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('❌ KindeService.getOrganizationDetails - Error:', error);
      
      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.error || 'Failed to get organization details',
          message: error.response.data.message || error.message
        };
      }
      
      return {
        success: false,
        error: 'Failed to get organization details',
        message: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * List all organizations (admin function)
   */
  async listOrganizations(limit: number = 100, offset: number = 0): Promise<{ success: boolean; organizations?: OrganizationInfo[]; error?: string }> {
    try {
      logger.debug('🔍 KindeService.listOrganizations - Getting all organizations');

      const response = await api.get('/auth/organizations', {
        params: { limit, offset }
      });
      
      logger.debug('✅ KindeService.listOrganizations - Success:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('❌ KindeService.listOrganizations - Error:', error);
      
      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.error || 'Failed to list organizations',
          message: error.response.data.message || error.message
        };
      }
      
      return {
        success: false,
        error: 'Failed to list organizations',
        message: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * List all users (admin function)
   */
  async listUsers(limit: number = 100, offset: number = 0, organizationCode?: string): Promise<{ success: boolean; users?: UserInfo[]; error?: string }> {
    try {
      logger.debug('🔍 KindeService.listUsers - Getting all users');

      const params: any = { limit, offset };
      if (organizationCode) {
        params.organizationCode = organizationCode;
      }

      const response = await api.get('/auth/users', { params });
      
      logger.debug('✅ KindeService.listUsers - Success:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('❌ KindeService.listUsers - Error:', error);
      
      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.error || 'Failed to list users',
          message: error.response.data.message || error.message
        };
      }
      
      return {
        success: false,
        error: 'Failed to list users',
        message: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<{ success: boolean; user?: UserInfo; error?: string }> {
    try {
      logger.debug('🔍 KindeService.getUserById - Getting user:', userId);

      const response = await api.get(`/auth/users/${userId}`);
      
      logger.debug('✅ KindeService.getUserById - Success:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('❌ KindeService.getUserById - Error:', error);
      
      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.error || 'Failed to get user',
          message: error.response.data.message || error.message
        };
      }
      
      return {
        success: false,
        error: 'Failed to get user',
        message: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, userData: Partial<UserInfo>): Promise<{ success: boolean; user?: UserInfo; error?: string }> {
    try {
      logger.debug('🔄 KindeService.updateUser - Updating user:', { userId, userData });

      const response = await api.put(`/auth/users/${userId}`, userData);
      
      logger.debug('✅ KindeService.updateUser - Success:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('❌ KindeService.updateUser - Error:', error);
      
      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.error || 'Failed to update user',
          message: error.response.data.message || error.message
        };
      }
      
      return {
        success: false,
        error: 'Failed to update user',
        message: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      logger.debug('🗑️ KindeService.deleteUser - Deleting user:', userId);

      const response = await api.delete(`/auth/users/${userId}`);
      
      logger.debug('✅ KindeService.deleteUser - Success:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('❌ KindeService.deleteUser - Error:', error);
      
      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.error || 'Failed to delete user',
          message: error.response.data.message || error.message
        };
      }
      
      return {
        success: false,
        error: 'Failed to delete user',
        message: error.message || 'Unknown error occurred'
      };
    }
  }
}

// Export singleton instance
export const kindeService = new KindeService();

// Also export the class for testing purposes
export { KindeService };
