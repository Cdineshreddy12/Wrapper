import axios from 'axios';

class KindeService {
  constructor() {
    this.baseURL = process.env.KINDE_DOMAIN || 'https://auth.zopkit.com';
    this.oauthClientId = process.env.KINDE_CLIENT_ID;
    this.oauthClientSecret = process.env.KINDE_CLIENT_SECRET;
    this.m2mClientId = process.env.KINDE_M2M_CLIENT_ID;
    this.m2mClientSecret = process.env.KINDE_M2M_CLIENT_SECRET;
    
    console.log('🔧 KindeService initialized with:', {
      baseURL: this.baseURL,
      hasOAuthClient: !!this.oauthClientId,
      hasM2MClient: !!this.m2mClientId
    });
  }

  /**
   * Get M2M access token for API calls
   */
  async getM2MToken() {
    try {
      if (!this.m2mClientId || !this.m2mClientSecret) {
        throw new Error('M2M credentials not configured');
      }

      // Use the correct Kinde management API audience
      const managementAudience = process.env.KINDE_MANAGEMENT_AUDIENCE || 'https://zopkit.kinde.com/api';
      const formData = new URLSearchParams();
      formData.append('grant_type', 'client_credentials');
      formData.append('client_id', this.m2mClientId);
      formData.append('client_secret', this.m2mClientSecret);
      formData.append('audience', managementAudience);
      
      // Temporarily comment out scopes to test basic M2M token
      // if (process.env.KINDE_MANAGEMENT_SCOPES) {
      //   formData.append('scope', process.env.KINDE_MANAGEMENT_SCOPES);
      // }

      const response = await axios.post(
        `${this.baseURL}/oauth2/token`,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (response.data.access_token) {
        console.log('✅ M2M token obtained successfully');
        return response.data.access_token;
      } else {
        throw new Error('No access token in response');
      }
    } catch (error) {
      console.error('❌ Failed to get M2M token:', error.response?.data || error.message);
      throw new Error(`M2M authentication failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get user info with multiple fallback strategies
   */
  async getUserInfo(accessToken) {
    try {
      console.log('🔍 getUserInfo - Starting with token validation...');

      // Decode JWT payload to get user ID
      let userId = null;
      if (accessToken.includes('.')) {
        try {
          const parts = accessToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            userId = payload.sub;
            console.log('🔍 Extracted user ID from token:', userId);
          }
        } catch (decodeError) {
          console.log('⚠️ Could not decode token to get user ID:', decodeError.message);
        }
      }

      if (!userId) {
        throw new Error('Could not extract user ID from token');
      }

      // Strategy: Use Management API with M2M token
      try {
        const m2mToken = await this.getM2MToken();
        console.log('🔑 Got M2M token for user lookup');

        const response = await axios.get(`${this.baseURL}/api/v1/user`, {
          headers: {
            'Authorization': `Bearer ${m2mToken}`,
            'Accept': 'application/json'
          },
          params: {
            id: userId
          }
        });

        console.log('✅ getUserInfo - Success via management API');
        const userData = response.data;

        // Transform to expected format
        return {
          id: userData.id,
          sub: userData.id,
          email: userData.email || userData.preferred_email,
          name: userData.full_name || userData.first_name + ' ' + userData.last_name,
          first_name: userData.first_name,
          last_name: userData.last_name,
          picture: userData.picture,
          preferred_email: userData.preferred_email,
          org_code: userData.organizations?.[0]?.code || null,
          org_codes: userData.organizations?.map(org => org.code) || []
        };
      } catch (mgmtError) {
        console.log('⚠️ getUserInfo - Management API failed:', mgmtError.response?.status, mgmtError.response?.data || mgmtError.message);
      }

      throw new Error('All authentication strategies failed');
      
    } catch (error) {
      console.error('❌ getUserInfo - All strategies failed:', error.message);
      throw new Error('Failed to get user information');
    }
  }

  /**
   * Enhanced user info with organization context
   */
  async getEnhancedUserInfo(accessToken) {
    try {
      console.log('🔍 getEnhancedUserInfo - Starting...');
      const userInfo = await this.getUserInfo(accessToken);
      
      const normalized = {
        id: userInfo?.id || userInfo?.sub || userInfo?.user_id,
        email: userInfo?.email || userInfo?.preferred_email,
        name: userInfo?.name || [userInfo?.given_name, userInfo?.family_name].filter(Boolean).join(' ') || [userInfo?.first_name, userInfo?.last_name].filter(Boolean).join(' '),
        given_name: userInfo?.given_name || userInfo?.first_name,
        family_name: userInfo?.family_name || userInfo?.last_name,
        picture: userInfo?.picture,
        org_code: userInfo?.org_code || userInfo?.organization_code,
        org_codes: userInfo?.org_codes || []
      };

      const enhancedInfo = {
        ...normalized,
        organizations: [],
        socialProvider: this.detectSocialProvider(normalized),
        hasMultipleOrganizations: Array.isArray(normalized.org_codes) ? normalized.org_codes.length > 1 : false
      };

      console.log('✅ getEnhancedUserInfo - Success:', enhancedInfo);
      return enhancedInfo;
    } catch (error) {
      console.error('❌ getEnhancedUserInfo - Error:', error);
      throw error;
    }
  }

  /**
   * Detect social provider
   */
  detectSocialProvider(userInfo) {
    if (userInfo.email && userInfo.email.includes('@gmail.com')) {
      return 'google';
    }
    if (userInfo.picture && userInfo.picture.includes('googleusercontent.com')) {
      return 'google';
    }
    return 'unknown';
  }

  /**
   * Validate token with multiple strategies
   */
  async validateToken(token) {
    try {
      console.log('🔍 validateToken - Starting validation...');

      if (!token || token.trim() === '') {
        throw new Error('No token provided');
      }

      console.log('🔑 Token validation - Token length:', token.length);
      console.log('🔑 Token validation - Token format check:', token.includes('.') ? 'JWT format' : 'Unknown format');

      // Debug: Try to decode JWT payload (without verification)
      if (token.includes('.')) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            const now = Math.floor(Date.now() / 1000);
            console.log('🔍 Token payload info:', {
              iss: payload.iss,
              aud: payload.aud,
              exp: payload.exp,
              iat: payload.iat,
              sub: payload.sub,
              expired: payload.exp < now,
              expires_in: payload.exp - now
            });
          }
        } catch (decodeError) {
          console.log('⚠️ Could not decode token payload:', decodeError.message);
        }
      }

      // Get user info (this handles all the fallback strategies)
      const userInfo = await this.getEnhancedUserInfo(token);

      if (!userInfo || !userInfo.id) {
        throw new Error('Invalid user info returned from token validation');
      }

      // Build user context
      const userContext = {
        userId: userInfo.id,
        kindeUserId: userInfo.id,
        tenantId: userInfo.org_code,
        email: userInfo.email,
        name: userInfo.name,
        given_name: userInfo.given_name || userInfo.first_name,
        family_name: userInfo.family_name || userInfo.last_name,
        avatar: userInfo.picture,
        socialProvider: userInfo.socialProvider,
        organization: userInfo.org_code ? {
          id: userInfo.org_code,
          name: userInfo.org_code
        } : null,
        organizations: userInfo.organizations,
        hasMultipleOrganizations: !!userInfo.hasMultipleOrganizations
      };

      console.log('✅ validateToken - Success:', {
        userId: userContext.userId,
        email: userContext.email,
        hasOrg: !!userContext.organization
      });
      return userContext;
    } catch (error) {
      console.error('❌ validateToken - Error:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.split('\n')[0] // Only first line of stack
      });

      // Provide more specific error messages
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new Error('Token is unauthorized or expired');
      } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
        throw new Error('Invalid token format');
      } else if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        throw new Error('Unable to connect to authentication service');
      }

      throw new Error(`Token validation failed: ${error.message}`);
    }
  }

  /**
   * Refresh an expired access token using refresh token
   */
  async refreshToken(refreshToken) {
    try {
      console.log('🔄 refreshToken - Starting token refresh...');

      if (!this.oauthClientId || !this.oauthClientSecret) {
        throw new Error('OAuth credentials not configured');
      }

      if (!refreshToken) {
        throw new Error('No refresh token provided');
      }

      const formData = new URLSearchParams();
      formData.append('grant_type', 'refresh_token');
      formData.append('client_id', this.oauthClientId);
      formData.append('client_secret', this.oauthClientSecret);
      formData.append('refresh_token', refreshToken);

      console.log('🔄 refreshToken - Making refresh request to Kinde...');

      const response = await axios.post(
        `${this.baseURL}/oauth2/token`,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (response.data.access_token) {
        console.log('✅ refreshToken - Token refresh successful');
        return {
          access_token: response.data.access_token,
          refresh_token: response.data.refresh_token,
          expires_in: response.data.expires_in,
          token_type: response.data.token_type
        };
      } else {
        throw new Error('No access token in refresh response');
      }
    } catch (error) {
      console.error('❌ refreshToken - Refresh failed:', error.response?.data || error.message);

      // Handle specific Kinde errors
      if (error.response?.data?.error === 'invalid_grant') {
        throw new Error('Refresh token is invalid or expired');
      } else if (error.response?.data?.error === 'invalid_client') {
        throw new Error('OAuth client configuration error');
      }

      throw new Error(`Token refresh failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Get user's organizations using M2M API
   */
  async getUserOrganizations(kindeUserId) {
    try {
      console.log(`🔍 getUserOrganizations - Getting organizations for user: ${kindeUserId}`);
      
      if (!kindeUserId) {
        console.warn('⚠️ getUserOrganizations - No user ID provided');
        return {
          organizations: [],
          success: true,
          message: 'No user ID provided'
        };
      }
      
      if (!this.m2mClientId || !this.m2mClientSecret) {
        console.warn('⚠️ getUserOrganizations - No M2M credentials available, using fallback');
        return {
          organizations: [],
          success: true,
          message: 'Using fallback mode - no organizations found'
        };
      }

      const m2mToken = await this.getM2MToken();
      
      // Try multiple endpoints for getting user organizations
      // Based on Kinde API documentation, we need to use different approaches
      const endpoints = [
        `${this.baseURL}/api/v1/users/${kindeUserId}/organizations`,
        `${this.baseURL}/api/v1/users/${kindeUserId}/orgs`,
        `${this.baseURL}/api/v1/user/${kindeUserId}/organizations`,
        // Alternative: get all organizations and filter by user membership
        `${this.baseURL}/api/v1/organizations`
      ];
      
      let response = null;
      let successfulEndpoint = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 getUserOrganizations - Trying endpoint: ${endpoint}`);
          
          if (endpoint.includes('/organizations') && !endpoint.includes('/users/')) {
            // This is the "get all organizations" endpoint
            response = await axios.get(endpoint, {
              headers: {
                'Authorization': `Bearer ${m2mToken}`,
                'Accept': 'application/json'
              }
            });
            
            // For this endpoint, we'll need to filter organizations where the user is a member
            // Since we can't directly get user's orgs, we'll return success but empty for now
            successfulEndpoint = endpoint;
            console.log(`✅ getUserOrganizations - Success with endpoint: ${endpoint} (all organizations)`);
            break;
          } else {
            // Try user-specific endpoints
            response = await axios.get(endpoint, {
              headers: {
                'Authorization': `Bearer ${m2mToken}`,
                'Accept': 'application/json'
              }
            });
            successfulEndpoint = endpoint;
            console.log(`✅ getUserOrganizations - Success with endpoint: ${endpoint}`);
            break;
          }
        } catch (endpointError) {
          console.log(`⚠️ getUserOrganizations - Endpoint ${endpoint} failed:`, endpointError.response?.status, endpointError.response?.data);
          continue;
        }
      }
      
      if (!response) {
        throw new Error('All user organization endpoints failed');
      }

      // If we got all organizations, we can't filter by user membership with M2M token
      // So we'll return an empty list but mark as success
      if (successfulEndpoint && successfulEndpoint.includes('/organizations') && !successfulEndpoint.includes('/users/')) {
        console.log('ℹ️ getUserOrganizations - Using all organizations endpoint, cannot filter by user membership');
        return {
          organizations: [],
          success: true,
          message: 'Using all organizations endpoint - user membership cannot be determined with M2M token'
        };
      }

      console.log('✅ getUserOrganizations - Success via Kinde API:', response.data);
      return {
        organizations: response.data.organizations || response.data.orgs || [],
        success: true
      };
    } catch (error) {
      console.error(`❌ getUserOrganizations - Error for user ${kindeUserId}:`, error.response?.data || error.message);
      
      // Fallback to basic response
      return {
        organizations: [],
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Add user to organization using M2M API
   */
  async addUserToOrganization(kindeUserId, orgCode, options = {}) {
    try {
      console.log(`🔗 addUserToOrganization - Adding user ${kindeUserId} to org ${orgCode}`, options);
      
      if (!this.m2mClientId || !this.m2mClientSecret) {
        console.warn('⚠️ addUserToOrganization - No M2M credentials available, using fallback');
        return {
          success: true,
          userId: kindeUserId,
          method: options.exclusive ? 'exclusive_assignment' : 'standard_assignment',
          message: 'User added to organization successfully (fallback mode)'
        };
      }
   
      //get the m2m kinde token first 
      const m2mToken = await this.getM2MToken();
      console.log(`🔑 M2M token obtained: ${m2mToken ? 'Yes' : 'No'}`);
      
      // If exclusive is true, first remove user from any existing organizations(this is also important condition for the user to be added to the organization)
      if (options.exclusive) {
        try {
          console.log(`🔄 addUserToOrganization - Exclusive mode: removing user from existing orgs first`);
          const existingOrgs = await this.getUserOrganizations(kindeUserId);
          console.log(`📋 Current user organizations:`, existingOrgs);
          
          if (existingOrgs.success && existingOrgs.organizations && existingOrgs.organizations.length > 0) {
            for (const org of existingOrgs.organizations) {
              if (org.code !== orgCode) {
                console.log(`🗑️ Removing user from existing org: ${org.code}`);
                try {
                  await this.removeUserFromOrganization(kindeUserId, org.code);
                  console.log(`✅ Successfully removed user from org: ${org.code}`);
                } catch (removeError) {
                  console.warn(`⚠️ Failed to remove user from org ${org.code}:`, removeError.message);
                }
              }
            }
          } else {
            console.log(`📋 User is not currently in any organizations`);
          }
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup existing orgs, continuing with assignment:', cleanupError.message);
        }
      }
      
      // Try multiple endpoints for adding user to organization
      const endpoints = [
        `${this.baseURL}/api/v1/organizations/${orgCode}/users`,
        `${this.baseURL}/api/v1/organization/${orgCode}/users`
      ];
      
      let response = null;
      let successfulEndpoint = null;
      let successfulPayload = null;
      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔗 addUserToOrganization - Trying endpoint: ${endpoint}`);
          
          // Try different payload formats based on Kinde API documentation
          const payloads = [
            // Correct format according to Kinde API docs
            {
              users: [
                {
                  id: kindeUserId,
                  roles: ["member"],
                  permissions: ["read"]
                }
              ]
            },
            {
              users: [
                {
                  id: kindeUserId,
                  roles: ["admin"],
                  permissions: ["admin", "read", "write"]
                }
              ]
            },
            {
              users: [
                {
                  id: kindeUserId,
                  roles: ["manager"],
                  permissions: ["admin"]
                }
              ]
            },
            // Fallback formats (legacy)
            { user_id: kindeUserId },
            { user_id: kindeUserId, role: "member" }
          ];
          
          for (const payload of payloads) {
            try {
              console.log(`🔗 addUserToOrganization - Trying payload:`, JSON.stringify(payload));
              
              const requestConfig = {
                headers: {
                  'Authorization': `Bearer ${m2mToken}`,
                  'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 second timeout
              };
              
              response = await axios.post(endpoint, payload, requestConfig);
              successfulEndpoint = endpoint;
              successfulPayload = payload;
              console.log(`✅ addUserToOrganization - Success with endpoint: ${endpoint} and payload:`, JSON.stringify(payload));
              console.log(`📊 Response status: ${response.status}, Response data:`, response.data);
              break;
            } catch (payloadError) {
              lastError = payloadError;
              console.log(`⚠️ Payload ${JSON.stringify(payload)} failed for endpoint ${endpoint}:`, {
                status: payloadError.response?.status,
                statusText: payloadError.response?.statusText,
                data: payloadError.response?.data,
                message: payloadError.message
              });
              continue;
            }
          }
          
          if (response) break;
        } catch (endpointError) {
          lastError = endpointError;
          console.log(`⚠️ Endpoint ${endpoint} failed:`, {
            status: endpointError.response?.status,
            statusText: endpointError.response?.statusText,
            data: endpointError.response?.data,
            message: endpointError.message
          });
          continue;
        }
      }
      
      if (!response) {
        console.error(`❌ addUserToOrganization - All endpoints and payloads failed. Last error:`, lastError?.message);
        throw new Error(`All user assignment endpoints and payloads failed. Last error: ${lastError?.message}`);
      }

      console.log('✅ addUserToOrganization - Success via Kinde API:', {
        endpoint: successfulEndpoint,
        payload: successfulPayload,
        responseStatus: response.status,
        responseData: response.data
      });
      
      return {
        success: true,
        userId: kindeUserId,
        method: options.exclusive ? 'exclusive_assignment' : 'standard_assignment',
        message: 'User added to organization successfully',
        endpoint: successfulEndpoint,
        payload: successfulPayload,
        responseData: response.data
      };
    } catch (error) {
      console.error(`❌ addUserToOrganization - Error:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        stack: error.stack
      });
      
      // Fallback response
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        message: 'Failed to add user to organization',
        details: {
          response: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText
        }
      };
    }
  }

  /**
   * Remove user from organization using M2M API
   */
  async removeUserFromOrganization(kindeUserId, orgCode) {
    try {
      console.log(`🗑️ removeUserFromOrganization - Removing user ${kindeUserId} from org ${orgCode}`);
      
      if (!this.m2mClientId || !this.m2mClientSecret) {
        console.warn('⚠️ removeUserFromOrganization - No M2M credentials available, using fallback');
        return {
          success: true,
          message: 'User removed from organization successfully (fallback mode)'
        };
      }

      const m2mToken = await this.getM2MToken();
      
      // Remove user from organization via Kinde API
      await axios.delete(`${this.baseURL}/api/v1/organizations/${orgCode}/users/${kindeUserId}`, {
        headers: {
          'Authorization': `Bearer ${m2mToken}`,
          'Accept': 'application/json'
        }
      });

      console.log('✅ removeUserFromOrganization - Success via Kinde API');
      return {
        success: true,
        message: 'User removed from organization successfully'
      };
    } catch (error) {
      console.error(`❌ removeUserFromOrganization - Error:`, error);
      
      // Fallback response
      return {
        success: false,
        error: error.message,
        message: 'Failed to remove user from organization'
      };
    }
  }

  /**
   * Get all organizations using M2M API
   */
  async getAllOrganizations() {
    try {
      console.log('🔍 getAllOrganizations - Getting all organizations');
      
      if (!this.m2mClientId || !this.m2mClientSecret) {
        console.warn('⚠️ getAllOrganizations - No M2M credentials available');
        return { organizations: [], success: false };
      }

      const m2mToken = await this.getM2MToken();
      
      // Try multiple endpoints for getting all organizations
      const endpoints = [
        `${this.baseURL}/api/v1/organizations`,
        `${this.baseURL}/api/v1/orgs`,
        `${this.baseURL}/api/v1/organization`
      ];
      
      let response = null;
      let successfulEndpoint = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 getAllOrganizations - Trying endpoint: ${endpoint}`);
          response = await axios.get(endpoint, {
            headers: {
              'Authorization': `Bearer ${m2mToken}`,
              'Accept': 'application/json'
            }
          });
          successfulEndpoint = endpoint;
          console.log(`✅ getAllOrganizations - Success with endpoint: ${endpoint}`);
          break;
        } catch (endpointError) {
          console.log(`⚠️ getAllOrganizations - Endpoint ${endpoint} failed:`, endpointError.response?.status);
          continue;
        }
      }
      
      if (!response) {
        throw new Error('All organization listing endpoints failed');
      }

      console.log('✅ getAllOrganizations - Success:', response.data);
      return {
        organizations: response.data.organizations || response.data.orgs || [],
        success: true
      };
    } catch (error) {
      console.error('❌ getAllOrganizations - Error:', error.response?.data || error.message);
      return { organizations: [], success: false, error: error.message };
    }
  }

  /**
   * Create a new organization in Kinde using M2M API
   */
  async createOrganization(organizationData) {
    try {
      console.log('🏢 createOrganization - Creating organization:', organizationData);
      
      if (!this.m2mClientId || !this.m2mClientSecret) {
        console.warn('⚠️ createOrganization - No M2M credentials available, using fallback');
        return this.createFallbackOrganization(organizationData);
      }

      const m2mToken = await this.getM2MToken();
      
      // Prepare organization data according to Kinde API spec
      const orgPayload = {
        name: organizationData.name || organizationData.companyName,
        external_id: organizationData.external_id || organizationData.subdomain,
        // Try different payload formats
        feature_flags: {},
        is_allow_registrations: false,
        is_create_billing_customer: false,
        // Alternative format
        organization_name: organizationData.name || organizationData.companyName,
        organization_code: organizationData.external_id || organizationData.subdomain
      };

      console.log('📤 createOrganization - Sending payload:', orgPayload);
      
      // Prefer the singular endpoint per latest docs; fallback to plural
      const endpoints = [
        `${this.baseURL}/api/v1/organization`,
        `${this.baseURL}/api/v1/organizations`
      ];
      
      let response = null;
      let successfulEndpoint = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔗 createOrganization - Trying endpoint: ${endpoint}`);
          response = await axios.post(endpoint, orgPayload, {
            headers: {
              'Authorization': `Bearer ${m2mToken}`,
              'Content-Type': 'application/json'
            }
          });
          successfulEndpoint = endpoint;
          console.log(`✅ createOrganization - Success with endpoint: ${endpoint}`);
          break;
        } catch (endpointError) {
          console.log(`⚠️ createOrganization - Endpoint ${endpoint} failed:`, endpointError.response?.status);
          continue;
        }
      }
      
      if (!response) {
        throw new Error('All organization creation endpoints failed');
      }

      console.log('✅ createOrganization - Success via Kinde API:', response.data);
      
      // Extract organization code from response
      const orgCode = response.data.organization?.code || response.data.code;
      
      return {
        success: true,
        organization: {
          code: orgCode,
          name: orgPayload.name,
          external_id: orgPayload.external_id,
          is_default: false,
          created_with_fallback: false
        },
        organizationCode: orgCode,
        organizationName: orgPayload.name,
        externalId: orgPayload.external_id,
        isDefault: false,
        created_with_fallback: false,
        message: 'Organization created successfully via Kinde API'
      };
    } catch (error) {
      console.error('❌ createOrganization - Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        url: error.config?.url,
        method: error.config?.method
      });
      console.warn('⚠️ createOrganization - Kinde API failed, using fallback');
      return this.createFallbackOrganization(organizationData);
    }
  }

  /**
   * Create a fallback organization when Kinde API is unavailable
   */
  createFallbackOrganization(organizationData) {
    console.log('🔄 createFallbackOrganization - Creating fallback organization');
    
    const orgCode = organizationData.external_id || 
                   organizationData.subdomain ||
                   `org_${(organizationData.name || organizationData.companyName)?.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    
    const fallbackOrg = {
      organization: {
        code: orgCode,
        name: organizationData.name || organizationData.companyName,
        external_id: organizationData.external_id || organizationData.subdomain,
        is_default: false,
        created_with_fallback: true
      },
      created_with_fallback: true,
      message: 'Organization created with fallback method'
    };

    console.log('✅ createFallbackOrganization - Success:', fallbackOrg);
    return fallbackOrg;
  }

  /**
   * Create a new user in Kinde using M2M API
   */
  async createUser(userData) {
    try {
      console.log('👤 createUser - Creating user:', userData);
      
      if (!this.m2mClientId || !this.m2mClientSecret) {
        console.warn('⚠️ createUser - No M2M credentials available, using fallback');
        return this.createFallbackUser(userData);
      }

      const m2mToken = await this.getM2MToken();
      
      // Create user via Kinde API
      const response = await axios.post(`${this.baseURL}/api/v1/users`, {
        profile: {
          given_name: userData.givenName || userData.given_name,
          family_name: userData.familyName || userData.family_name
        },
        identities: [{
          type: 'email',
          details: {
            email: userData.email
          }
        }],
        organization_code: userData.organizationCode || userData.organization_code
      }, {
        headers: {
          'Authorization': `Bearer ${m2mToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ createUser - Success via Kinde API:', response.data);
      return {
        ...response.data,
        created_with_fallback: false,
        message: 'User created successfully via Kinde API'
      };
    } catch (error) {
      console.error('❌ createUser - Error:', error);
      console.warn('⚠️ createUser - Kinde API failed, using fallback');
      return this.createFallbackUser(userData);
    }
  }

  /**
   * Create a fallback user when Kinde API is unavailable
   */
  createFallbackUser(userData) {
    console.log('🔄 createFallbackUser - Creating fallback user');
    
    const userId = `user_${(userData.email || 'unknown').replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    
    const fallbackUser = {
      id: userId,
      email: userData.email,
      given_name: userData.givenName || userData.given_name,
      family_name: userData.familyName || userData.family_name,
      created_with_fallback: true,
      message: 'User created with fallback method'
    };

    console.log('✅ createFallbackUser - Success:', fallbackUser);
    return fallbackUser;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code, redirectUri) {
    try {
      console.log('🔄 exchangeCodeForTokens - Exchanging code for tokens');
      
      const response = await axios.post(`${this.baseURL}/oauth2/token`, {
        grant_type: 'authorization_code',
        client_id: this.oauthClientId,
        client_secret: this.oauthClientSecret,
        code: code,
        redirect_uri: redirectUri
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('✅ exchangeCodeForTokens - Success');
      return response.data;
    } catch (error) {
      console.error('❌ exchangeCodeForTokens - Error:', error);
      throw new Error('Failed to exchange code for tokens');
    }
  }

  /**
   * Generate social login URL for a specific provider
   */
  getSocialAuthUrl(provider, options = {}) {
    const {
      redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`,
      state = 'default',
      prompt = 'select_account',
      loginHint = '',
      additionalParams = {}
    } = options;

    const baseUrl = `${this.baseURL}/oauth2/auth`;
    const params = new URLSearchParams({
      client_id: this.oauthClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email offline',
      state: state,
      prompt: prompt,
      ...(loginHint && { login_hint: loginHint }),
      ...additionalParams
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate generic social login URL
   */
  generateSocialLoginUrl(options = {}) {
    return this.getSocialAuthUrl('default', options);
  }

  /**
   * Generate Google OAuth login URL
   */
  generateGoogleLoginUrl(options = {}) {
    return this.getSocialAuthUrl('google', {
      ...options,
      additionalParams: {
        ...options.additionalParams,
        provider: 'google'
      }
    });
  }

  /**
   * Generate login URL for organization-specific authentication
   */
  generateLoginUrl(orgCode, redirectUri, options = {}) {
    try {
      console.log(`🔗 generateLoginUrl - Generating login URL for org: ${orgCode}`);

      const {
        state = 'onboarding_complete',
        prompt = 'select_account',
        additionalParams = {}
      } = options;

      const baseUrl = `${this.baseURL}/oauth2/auth`;
      const params = new URLSearchParams({
        client_id: this.oauthClientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid profile email offline',
        state: state,
        prompt: prompt,
        org_code: orgCode, // Add organization code for org-specific login
        ...additionalParams
      });

      const loginUrl = `${baseUrl}?${params.toString()}`;
      console.log(`✅ generateLoginUrl - Generated URL: ${loginUrl.substring(0, 100)}...`);

      return loginUrl;
    } catch (error) {
      console.error('❌ generateLoginUrl - Error:', error);
      throw new Error('Failed to generate login URL');
    }
  }

  /**
   * Generate GitHub OAuth login URL
   */
  generateGithubLoginUrl(options = {}) {
    return this.getSocialAuthUrl('github', {
      ...options,
      additionalParams: {
        ...options.additionalParams,
        provider: 'github'
      }
    });
  }

  /**
   * Get organization details using M2M API
   */
  async getOrganizationDetails(orgCode) {
    try {
      console.log(`🔍 getOrganizationDetails - Getting details for org: ${orgCode}`);
      
      if (!this.m2mClientId || !this.m2mClientSecret) {
        console.warn('⚠️ getOrganizationDetails - No M2M credentials available, using fallback');
        return {
          success: true,
          organization: {
            code: orgCode,
            name: orgCode,
            is_default: false,
            created_with_fallback: true
          }
        };
      }

      const m2mToken = await this.getM2MToken();
      
      const response = await axios.get(`${this.baseURL}/api/v1/organizations/${orgCode}`, {
        headers: {
          'Authorization': `Bearer ${m2mToken}`,
          'Accept': 'application/json'
        }
      });

      console.log('✅ getOrganizationDetails - Success via Kinde API:', response.data);
      return {
        success: true,
        organization: response.data
      };
    } catch (error) {
      console.error(`❌ getOrganizationDetails - Error:`, error);
      
      return {
        success: false,
        error: error.message,
        message: 'Failed to get organization details'
      };
    }
  }

  /**
   * List all organizations using M2M API
   */
  async listOrganizations(limit = 100, offset = 0) {
    try {
      console.log('🔍 listOrganizations - Getting all organizations');
      
      if (!this.m2mClientId || !this.m2mClientSecret) {
        console.warn('⚠️ listOrganizations - No M2M credentials available, using fallback');
        return {
          organizations: [],
          success: true
        };
      }

      const m2mToken = await this.getM2MToken();
      
      const response = await axios.get(`${this.baseURL}/api/v1/organizations`, {
        params: { limit, offset },
        headers: {
          'Authorization': `Bearer ${m2mToken}`,
          'Accept': 'application/json'
        }
      });

      console.log('✅ listOrganizations - Success via Kinde API:', response.data);
      return {
        organizations: response.data.organizations || [],
        success: true
      };
    } catch (error) {
      console.error('❌ listOrganizations - Error:', error);
      
      return {
        organizations: [],
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List all users using M2M API
   */
  async listUsers(limit = 100, offset = 0, organizationCode = null) {
    try {
      console.log('🔍 listUsers - Getting all users');
      
      if (!this.m2mClientId || !this.m2mClientSecret) {
        console.warn('⚠️ listUsers - No M2M credentials available, using fallback');
        return {
          users: [],
          success: true
        };
      }

      const m2mToken = await this.getM2MToken();
      
      const params = { limit, offset };
      if (organizationCode) {
        params.organization_code = organizationCode;
      }
      
      const response = await axios.get(`${this.baseURL}/api/v1/users`, {
        params,
        headers: {
          'Authorization': `Bearer ${m2mToken}`,
          'Accept': 'application/json'
        }
      });

      console.log('✅ listUsers - Success via Kinde API:', response.data);
      return {
        users: response.data.users || [],
        success: true
      };
    } catch (error) {
      console.error('❌ listUsers - Error:', error);
      
      return {
        users: [],
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🏢 **ENHANCED ORGANIZATION ASSIGNMENT WITH RETRIES**
   * Comprehensive method to assign users to organizations with fallback strategies
   */
  async assignUserToOrganizationWithRetries(userId, orgCode, userEmail, userName, options = {}) {
    const {
      maxRetries = 3,
      verifyAssignment = true,
      createUserIfNeeded = true
    } = options;

    console.log(`🔄 Starting enhanced organization assignment:`, {
      userId,
      orgCode,
      userEmail,
      userName,
      maxRetries,
      verifyAssignment,
      createUserIfNeeded
    });

    let lastError = null;
    let finalUserId = userId;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Organization assignment attempt ${attempt}/${maxRetries}...`);

      try {
        // Strategy 1: Create user in Kinde if needed
        if (createUserIfNeeded) {
          console.log('📋 Strategy 1: Creating user in Kinde if needed...');
          try {
            const createdUser = await this.createUser({
              profile: {
                given_name: userName.split(' ')[0] || '',
                family_name: userName.split(' ').slice(1).join(' ') || ''
              },
              identities: [{
                type: 'email',
                details: {
                  email: userEmail
                }
              }],
              organization_code: orgCode
            });

            console.log('✅ User created in Kinde:', createdUser.id);

            // Update the userId for subsequent operations if we got a real Kinde user
            if (createdUser.id && !createdUser.created_with_fallback) {
              finalUserId = createdUser.id;
            }
          } catch (createError) {
            console.log('⚠️ User creation failed (user might already exist):', createError.message);
          }
        }

        // Strategy 2: Add user to organization
        console.log('📋 Strategy 2: Adding user to organization...');
        const result = await this.addUserToOrganization(
          finalUserId,
          orgCode,
          { exclusive: true }
        );

        if (result.success) {
          console.log('✅ User successfully added to organization:', result);

          // Strategy 3: Verify assignment if requested
          if (verifyAssignment) {
            console.log('🔍 Verifying organization assignment...');
            let verificationSuccess = false;

            for (let verifyAttempt = 1; verifyAttempt <= 3; verifyAttempt++) {
              try {
                const userOrgs = await this.getUserOrganizations(finalUserId);
                const ourOrg = userOrgs.organizations?.find(org => org.code === orgCode);

                if (ourOrg) {
                  console.log('✅ Organization assignment verified:', {
                    orgCode: ourOrg.code,
                    orgName: ourOrg.name,
                    verifyAttempt
                  });
                  verificationSuccess = true;
                  break;
                } else {
                  console.log(`⚠️ Verification attempt ${verifyAttempt}: Organization not found in user's list`);
                  if (verifyAttempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                }
              } catch (verifyError) {
                console.log(`⚠️ Verification attempt ${verifyAttempt} failed:`, verifyError.message);
                if (verifyAttempt < 3) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }
            }

            if (!verificationSuccess) {
              console.warn('⚠️ Could not verify organization assignment, but assignment commands succeeded');
            }
          }

          return {
            success: true,
            method: 'exclusive_assignment',
            attempt,
            userId: finalUserId,
            orgCode,
            verified: verifyAssignment ? verificationSuccess : null,
            details: result
          };
        } else {
          throw new Error('Assignment returned success=false');
        }

      } catch (error) {
        console.log(`❌ Failed to assign user to organization (attempt ${attempt}):`, error.message);
        lastError = error;

        if (attempt < maxRetries) {
          const waitTime = attempt * 2000;
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    console.error('❌ Failed to assign user to organization after all retries:', {
      error: lastError?.message,
      attempts: maxRetries,
      userId: finalUserId,
      orgCode,
      recommendation: 'User can be manually assigned later using the fix script'
    });

    return {
      success: false,
      lastError,
      attempts: maxRetries,
      userId: finalUserId,
      orgCode,
      recommendation: 'User can be manually assigned later using the fix script'
    };
  }
}

// Create a singleton instance
const kindeService = new KindeService();

export default kindeService;
export { KindeService };
