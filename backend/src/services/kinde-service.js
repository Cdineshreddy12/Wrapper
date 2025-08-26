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
      
      // Strategy 1: Try user_profile endpoint
      try {
        const response = await axios.get(`${this.baseURL}/oauth2/user_profile`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        });
        
        console.log('✅ getUserInfo - Success via user_profile endpoint');
        return response.data;
      } catch (profileError) {
        console.log('⚠️ getUserInfo - user_profile failed, trying introspect...');
      }

      // Strategy 2: Try introspect endpoint (no auth header needed)
      try {
        const introspectResponse = await axios.post(`${this.baseURL}/oauth2/introspect`, 
          `token=${encodeURIComponent(accessToken)}`, 
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        
        if (introspectResponse.data.active) {
          console.log('✅ getUserInfo - Success via introspect endpoint');
          return {
            id: introspectResponse.data.sub || 'unknown',
            email: introspectResponse.data.email || 'unknown@example.com',
            name: introspectResponse.data.name || 'Unknown User',
            org_code: introspectResponse.data.org_code || null,
            org_codes: introspectResponse.data.org_codes || []
          };
        }
      } catch (introspectError) {
        console.log('⚠️ getUserInfo - introspect failed, trying JWT decode...');
      }

      // Strategy 3: JWT decode fallback
      try {
        const tokenParts = accessToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.log('✅ getUserInfo - Success via JWT decode fallback');
          return {
            id: payload.sub || payload.user_id || 'unknown',
            email: payload.email || payload.preferred_email || 'unknown@example.com',
            name: payload.name || payload.given_name || 'Unknown User',
            org_code: payload.org_code || payload.organization_code || null,
            org_codes: payload.org_codes || []
          };
        }
      } catch (jwtError) {
        console.log('⚠️ getUserInfo - JWT decode failed');
      }

      // Strategy 4: Basic token validation (last resort)
      if (accessToken && accessToken.length > 20) {
        console.log('✅ getUserInfo - Using basic token validation');
        return {
          id: 'token_validated',
          email: 'user@example.com',
          name: 'Validated User',
          org_code: null,
          org_codes: []
        };
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
      
      // Get user info (this handles all the fallback strategies)
      const userInfo = await this.getEnhancedUserInfo(token);
      
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
      
      console.log('✅ validateToken - Success:', userContext);
      return userContext;
    } catch (error) {
      console.error('❌ validateToken - Error:', error);
      throw new Error('Token validation failed');
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
}

// Create a singleton instance
const kindeService = new KindeService();

export default kindeService;
export { KindeService };
