import axios from 'axios';
import 'dotenv/config';

class KindeService {
  constructor() {
    // Handle cases where KINDE_DOMAIN might include https://
    const domain = process.env.KINDE_DOMAIN?.replace(/^https?:\/\//, '');
    this.baseURL = `https://${domain}`;
    
    // Use M2M credentials for management API
    this.clientId = process.env.KINDE_M2M_CLIENT_ID;
    this.clientSecret = process.env.KINDE_M2M_CLIENT_SECRET;
    
    // Regular OAuth credentials for user auth
    this.oauthClientId = process.env.KINDE_CLIENT_ID;
    this.oauthClientSecret = process.env.KINDE_CLIENT_SECRET;
    
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // Debug logging to check environment variables
    console.log('🔍 Kinde Environment Variables:');
    console.log('KINDE_DOMAIN:', process.env.KINDE_DOMAIN);
    console.log('KINDE_M2M_CLIENT_ID:', process.env.KINDE_M2M_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('KINDE_M2M_CLIENT_SECRET:', process.env.KINDE_M2M_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('KINDE_CLIENT_ID:', process.env.KINDE_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('baseURL:', this.baseURL);
  }

  // Get management API token using M2M credentials
  async getAccessToken() {
    // Check if M2M credentials are properly configured
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Kinde M2M credentials not properly configured');
    }

    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(`${this.baseURL}/oauth2/token`, {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        audience: `${this.baseURL}/api`
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 minute buffer

      console.log('✅ Kinde M2M token obtained successfully');
      return this.accessToken;
    } catch (error) {
      console.error('🚨 Kinde M2M API Error Details:');
      console.error('Status:', error.response?.status);
      console.error('Status Text:', error.response?.statusText);
      console.error('Error Data:', error.response?.data);
      console.error('Request URL:', `${this.baseURL}/oauth2/token`);
      throw new Error(`Failed to get Kinde access token: ${error.response?.data?.error || error.message}`);
    }
  }

  // Make authenticated API request
  async makeRequest(method, endpoint, data = null) {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios({
        method,
        url: `${this.baseURL}/api/v1${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data
      });

      return response.data;
    } catch (error) {
      console.error(`Kinde API error (${method} ${endpoint}):`, error.response?.data || error.message);
      
      // Create a new error with the response data preserved
      const kindeError = new Error(`Kinde API request failed: ${error.response?.data?.message || error.message}`);
      kindeError.response = error.response; // Preserve original response for error detection
      
      throw kindeError;
    }
  }

  // Create organization in Kinde
  async createOrganization(organizationData) {
    return await this.makeRequest('POST', '/organization', organizationData);
  }

  // Get organization by code
  async getOrganization(orgCode) {
    return await this.makeRequest('GET', `/organization?code=${orgCode}`);
  }

  // Create user in Kinde with organization (legacy method - use createKindeUser instead)
  async createUser(userData) {
    const data = {
      profile: {
        given_name: userData.profile?.given_name,
        family_name: userData.profile?.family_name,
      },
      identities: [
        {
          type: 'email',
          details: {
            email: userData.identities?.[0]?.details?.email
          }
        }
      ]
    };

    // DON'T add organization_code here - we'll handle organization assignment separately
    // This prevents automatic assignment to any default organization
    console.log('🔄 Creating user without automatic organization assignment');

    const result = await this.makeRequest('POST', '/user', data);
    console.log('✅ User created:', result?.id);
    
    // If organization_code was provided, assign user to that specific organization
    if (userData.organization_code && result?.id) {
      console.log(`🔄 Assigning user ${result.id} to organization ${userData.organization_code}`);
      try {
        await this.addUserToOrganization(result.id, userData.organization_code, { exclusive: false });
        console.log('✅ User assigned to specific organization only');
      } catch (assignError) {
        console.warn('⚠️ Failed to assign user to organization during creation:', assignError.message);
        // Don't fail user creation if organization assignment fails
      }
    }

    return result;
  }

  // Get user by ID
  async getUser(userId) {
    return await this.makeRequest('GET', `/users/${userId}`);
  }

  // Get all users
  async getUsers() {
    return await this.makeRequest('GET', '/users');
  }

  // Update user
  async updateUser(userId, userData) {
    return await this.makeRequest('PATCH', `/users/${userId}`, userData);
  }

  // Delete user
  async deleteUser(userId) {
    return await this.makeRequest('DELETE', `/users/${userId}`);
  }

  // Create role
  async createRole(roleData) {
    return await this.makeRequest('POST', '/roles', roleData);
  }

  // Get roles
  async getRoles() {
    return await this.makeRequest('GET', '/roles');
  }

  // Update role
  async updateRole(roleId, roleData) {
    return await this.makeRequest('PATCH', `/roles/${roleId}`, roleData);
  }

  // Delete role
  async deleteRole(roleId) {
    return await this.makeRequest('DELETE', `/roles/${roleId}`);
  }

  // Create permission
  async createPermission(permissionData) {
    return await this.makeRequest('POST', '/permissions', permissionData);
  }

  // Get permissions
  async getPermissions() {
    return await this.makeRequest('GET', '/permissions');
  }

  // Update permission
  async updatePermission(permissionId, permissionData) {
    return await this.makeRequest('PATCH', `/permissions/${permissionId}`, permissionData);
  }

  // Delete permission
  async deletePermission(permissionId) {
    return await this.makeRequest('DELETE', `/permissions/${permissionId}`);
  }

  // Assign role to user
  async assignRoleToUser(userId, roleData) {
    return await this.makeRequest('POST', `/users/${userId}/roles`, roleData);
  }

  // Remove role from user
  async removeRoleFromUser(userId, roleId) {
    return await this.makeRequest('DELETE', `/users/${userId}/roles/${roleId}`);
  }

  // Get user roles
  async getUserRoles(userId) {
    return await this.makeRequest('GET', `/users/${userId}/roles`);
  }

  // Get user permissions
  async getUserPermissions(userId) {
    return await this.makeRequest('GET', `/users/${userId}/permissions`);
  }

  // Generate social login URL with enhanced parameters
  generateSocialLoginUrl(options = {}) {
    const {
      orgCode = null,
      redirectUri = null,
      state = null,
      connectionId = null, // For specific social provider
      prompt = null, // 'login', 'consent', 'select_account'
      loginHint = null, // Email hint for login
      domainHint = null, // Domain hint for organization discovery
      additionalParams = {}
    } = options;

    const params = new URLSearchParams({
      client_id: this.oauthClientId,
      response_type: 'code',
      scope: 'openid profile email'
    });

    // Add organization code if provided
    if (orgCode) {
      params.append('org_code', orgCode);
    }

    // Add redirect URI
    if (redirectUri) {
      params.append('redirect_uri', redirectUri);
    }

    // Add state for CSRF protection
    if (state) {
      params.append('state', state);
    }

    // Add connection ID for specific social provider
    if (connectionId) {
      params.append('connection_id', connectionId);
    }

    // Add prompt parameter
    if (prompt) {
      params.append('prompt', prompt);
    }

    // Add login hint
    if (loginHint) {
      params.append('login_hint', loginHint);
    }

    // Add domain hint for organization discovery
    if (domainHint) {
      params.append('domain_hint', domainHint);
    }

    // Add any additional parameters
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, value);
      }
    });

    return `${this.baseURL}/oauth2/auth?${params.toString()}`;
  }

  // Generate login URL (legacy method, now uses generateSocialLoginUrl)
  generateLoginUrl(orgCode = null, redirectUri = null) {
    return this.generateSocialLoginUrl({ orgCode, redirectUri });
  }

  // Generate Google OAuth URL
  generateGoogleLoginUrl(options = {}) {
    return this.generateSocialLoginUrl({
      ...options,
      connectionId: 'google', // Kinde's Google connection identifier
      additionalParams: {
        // Force Google account selector
        prompt: 'select_account',
        ...options.additionalParams
      }
    });
  }

  // Generate GitHub OAuth URL
  generateGithubLoginUrl(options = {}) {
    return this.generateSocialLoginUrl({
      ...options,
      connectionId: 'github', // Kinde's GitHub connection identifier
    });
  }

  // Generate Microsoft OAuth URL
  generateMicrosoftLoginUrl(options = {}) {
    return this.generateSocialLoginUrl({
      ...options,
      connectionId: 'microsoft', // Kinde's Microsoft connection identifier
      additionalParams: {
        // Force Microsoft account selector
        prompt: 'select_account',
        ...options.additionalParams
      }
    });
  }

  // Generate Apple OAuth URL
  generateAppleLoginUrl(options = {}) {
    return this.generateSocialLoginUrl({
      ...options,
      connectionId: 'apple', // Kinde's Apple connection identifier
    });
  }

  // Generate LinkedIn OAuth URL
  generateLinkedInLoginUrl(options = {}) {
    return this.generateSocialLoginUrl({
      ...options,
      connectionId: 'linkedin', // Kinde's LinkedIn connection identifier
    });
  }

  // Generate logout URL
  generateLogoutUrl(redirectUri = null) {
    const params = new URLSearchParams();
    
    if (redirectUri) {
      params.append('redirect_uri', redirectUri);
    }

    return `${this.baseURL}/logout?${params.toString()}`;
  }

  // Exchange code for tokens
  async exchangeCodeForTokens(code, redirectUri) {
    try {
      const response = await axios.post(`${this.baseURL}/oauth2/token`, {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: this.oauthClientId,
        client_secret: this.oauthClientSecret
      }, {
          headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error.response?.data || error.message);
      throw new Error(`Failed to exchange authorization code: ${error.response?.data?.error_description || error.message}`);
    }
  }

  // Get user info from token
  async getUserInfo(accessToken) {
    try {
      console.log('🔍 getUserInfo - Making request to Kinde user_profile endpoint...');
      console.log('🔍 getUserInfo - Token preview:', accessToken?.substring(0, 20) + '...');
      console.log('🔍 getUserInfo - Base URL:', this.baseURL);
      
      const response = await axios.get(`${this.baseURL}/oauth2/user_profile`, {
          headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log('✅ getUserInfo - Raw response from Kinde:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ getUserInfo - Error getting user info:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        headers: error.config?.headers
      });
      
      if (error.response?.status === 403) {
        console.error('🚫 getUserInfo - 403 Forbidden: Token may be invalid, expired, or lack proper scope');
        console.error('🔍 getUserInfo - Check if token is from the correct Kinde domain and has user:read scope');
      }
      
      throw new Error('Failed to get user information');
    }
  }

  // Enhanced user info retrieval with organization context
  async getEnhancedUserInfo(accessToken) {
    try {
      console.log('🔍 getEnhancedUserInfo - Starting...');
      const userInfo = await this.getUserInfo(accessToken);
      
      console.log('🔍 getEnhancedUserInfo - Retrieved userInfo:', userInfo);
      
      // Add additional context like organization membership
      const enhancedInfo = {
        ...userInfo,
        organizations: [],
        socialProvider: this.detectSocialProvider(userInfo),
        hasMultipleOrganizations: false
      };

      console.log('🔍 getEnhancedUserInfo - Enhanced info before org lookup:', enhancedInfo);

      // If user has organizations, fetch them
      if (userInfo.org_codes && userInfo.org_codes.length > 0) {
        console.log('🔍 getEnhancedUserInfo - Found org_codes:', userInfo.org_codes);
        enhancedInfo.hasMultipleOrganizations = userInfo.org_codes.length > 1;
        
        // Fetch organization details for each org
        for (const orgCode of userInfo.org_codes) {
          try {
            console.log(`🔍 getEnhancedUserInfo - Fetching org details for: ${orgCode}`);
            const orgDetails = await this.getOrganization(orgCode);
            console.log(`✅ getEnhancedUserInfo - Got org details for ${orgCode}:`, orgDetails);
            enhancedInfo.organizations.push(orgDetails);
          } catch (error) {
            console.warn(`❌ getEnhancedUserInfo - Failed to fetch organization details for ${orgCode}:`, error.message);
          }
        }
      } else {
        console.log('🔍 getEnhancedUserInfo - No org_codes found in user info');
      }

      console.log('✅ getEnhancedUserInfo - Final enhanced info:', enhancedInfo);
      return enhancedInfo;
    } catch (error) {
      console.error('❌ getEnhancedUserInfo - Error getting enhanced user info:', error);
      throw error;
    }
  }

  // Detect social provider from user info
  detectSocialProvider(userInfo) {
    if (userInfo.email && userInfo.email.includes('@gmail.com')) {
      return 'google';
    }
    if (userInfo.picture && userInfo.picture.includes('googleusercontent.com')) {
      return 'google';
    }
    if (userInfo.picture && userInfo.picture.includes('github.com')) {
      return 'github';
    }
    if (userInfo.picture && userInfo.picture.includes('linkedin.com')) {
      return 'linkedin';
    }
    if (userInfo.picture && userInfo.picture.includes('microsoft.com')) {
      return 'microsoft';
    }
    return 'unknown';
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    try {
      const response = await axios.post(`${this.baseURL}/oauth2/token`, {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.oauthClientId,
        client_secret: this.oauthClientSecret
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error('Failed to refresh token');
    }
  }

  // Verify JWT token
  async verifyToken(token) {
    try {
      // Use Authorization header instead of POST body - Kinde expects it in the header
      const response = await axios.post(`${this.baseURL}/oauth2/introspect`, {
        client_id: this.oauthClientId,
        client_secret: this.oauthClientSecret
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error verifying token:', error.response?.data || error.message);
      throw new Error('Failed to verify token');
    }
  }

  // Validate token and get user info (for auth middleware)
  async validateToken(token) {
    try {
      console.log('🔍 validateToken - Starting token validation...');
      
      // Decode JWT token to see what's inside (without verification)
      let jwtPayload = null;
      try {
        const tokenParts = token.split('.');
        console.log('🔍 validateToken - Token parts count:', tokenParts.length);
        console.log('🔍 validateToken - Token format check:', {
          isStandardJWT: tokenParts.length === 3,
          firstPart: tokenParts[0]?.substring(0, 20) + '...',
          secondPart: tokenParts[1]?.substring(0, 20) + '...',
          thirdPart: tokenParts[2]?.substring(0, 20) + '...'
        });
        
        if (tokenParts.length === 3 && tokenParts[1]) {
          // Standard JWT format - decode the payload
          const base64Payload = tokenParts[1];
          const jsonPayload = Buffer.from(base64Payload, 'base64').toString();
          console.log('🔍 validateToken - Decoded JSON string:', jsonPayload);
          jwtPayload = JSON.parse(jsonPayload);
          console.log('🔍 validateToken - JWT payload:', jwtPayload);
          console.log('🔍 validateToken - JWT org_code:', jwtPayload.org_code);
          console.log('🔍 validateToken - JWT sub (user ID):', jwtPayload.sub);
        } else {
          console.log('⚠️ validateToken - Token is not standard JWT format, skipping JWT decode');
        }
      } catch (decodeError) {
        console.error('❌ validateToken - Failed to decode JWT:', decodeError);
        console.log('🔍 validateToken - Will continue with user info API call...');
      }

      // Skip introspection and directly get user info - if token is invalid, this will fail
      // This is more efficient and avoids potential introspection endpoint issues
      const userInfo = await this.getEnhancedUserInfo(token);
      
      console.log('🔍 validateToken - Building user context from userInfo...');
      
      // Try to extract tenant/organization ID from multiple sources
      // Priority: userInfo, then JWT payload as fallback
      const orgCode = userInfo.org_code || 
                     userInfo.organization_code || 
                     userInfo.org_codes?.[0] ||
                     jwtPayload?.org_code; // Fallback to JWT
                     
      const orgName = userInfo.org_name || 
                     userInfo.organization_name || 
                     jwtPayload?.org_name ||
                     orgCode;
      
      console.log('🔍 validateToken - Organization extraction:', {
        'userInfo.org_code': userInfo.org_code,
        'userInfo.organization_code': userInfo.organization_code,
        'userInfo.org_codes': userInfo.org_codes,
        'userInfo.org_name': userInfo.org_name,
        'jwtPayload.org_code': jwtPayload?.org_code,
        'jwtPayload.org_name': jwtPayload?.org_name,
        'extracted orgCode': orgCode,
        'extracted orgName': orgName
      });
      
      const userContext = {
        userId: userInfo.id || jwtPayload?.sub,
        kindeUserId: userInfo.id || jwtPayload?.sub, // Add this for consistency
        tenantId: orgCode, // Map org_code to tenantId
        email: userInfo.email || userInfo.preferred_email,
        name: userInfo.given_name && userInfo.family_name 
          ? `${userInfo.given_name} ${userInfo.family_name}`
          : userInfo.name || userInfo.email || userInfo.preferred_email,
        given_name: userInfo.given_name || userInfo.first_name,
        family_name: userInfo.family_name || userInfo.last_name,
        avatar: userInfo.picture,
        socialProvider: userInfo.socialProvider,
        organization: orgCode ? {
          id: orgCode,
          name: orgName
        } : null,
        organizations: userInfo.organizations,
        hasMultipleOrganizations: userInfo.hasMultipleOrganizations
      };
      
      console.log('✅ validateToken - Final user context created:', userContext);
      return userContext;
    } catch (error) {
      console.error('❌ validateToken - Error validating token:', error);
      throw new Error('Token validation failed');
    }
  }

  // Get organization users
  async getOrganizationUsers(orgCode) {
    return await this.makeRequest('GET', `/organization?code=${orgCode}&expand=users`);
  }

  // Get user organizations
  async getUserOrganizations(userId) {
    try {
      // Get all organizations and find which ones the user belongs to
      const orgsResponse = await this.makeRequest('GET', '/organizations');
      const userOrganizations = [];
      
      if (orgsResponse.organizations && orgsResponse.organizations.length > 0) {
        for (const org of orgsResponse.organizations) {
          try {
            // Check if user is in this organization
            const orgUsersResponse = await this.makeRequest('GET', `/organizations/${org.code}/users`);
            
            if (orgUsersResponse.organization_users) {
              const userInOrg = orgUsersResponse.organization_users.find(user => user.id === userId);
              if (userInOrg) {
                userOrganizations.push(org);
              }
            }
          } catch (error) {
            console.warn(`⚠️ Error checking user in organization ${org.code}:`, error.message);
            continue;
          }
        }
      }
      
      return { organizations: userOrganizations };
    } catch (error) {
      console.warn(`⚠️ Error getting user organizations:`, error.message);
      return { organizations: [] };
    }
  }

  // Invite user to organization
  async inviteUserToOrganization(email, orgCode, roleKey = null) {
    const data = {
      email,
      organization_code: orgCode
    };

    if (roleKey) {
      data.role_key = roleKey;
    }

    return await this.makeRequest('POST', '/organization/invitations', data);
  }

    /**
   * Add user to organization with proper user lookup and creation
   */
  async addUserToOrganization(userIdentifier, orgCode, options = {}) {
    const { exclusive = false } = options;
    
    try {
      console.log(`🔄 Adding user to organization: {
        userIdentifier: '${userIdentifier}',
        orgCode: '${orgCode}',
        exclusive: ${exclusive}
      }`);

      await this.getAccessToken();
      
      // Step 1: Get or create the user and get their actual Kinde user ID
      let actualUserId = userIdentifier;
      
      if (userIdentifier.includes('@')) {
        console.log(`🔍 Looking up user by email: ${userIdentifier}`);
        
        try {
          // Try to find existing user
          const users = await this.makeRequest('GET', `/users?email=${encodeURIComponent(userIdentifier)}`);
          
          if (users.users && users.users.length > 0) {
            actualUserId = users.users[0].id;
            console.log(`✅ Found existing user: ${actualUserId}`);
          } else {
            console.log(`🔄 User not found, creating new user...`);
            
            // Create user if not found
            const newUser = await this.createKindeUser({
              email: userIdentifier,
              given_name: 'User',
              family_name: 'User'
            });
            
            actualUserId = newUser.id;
            console.log(`✅ Created new user: ${actualUserId}`);
          }
        } catch (lookupError) {
          console.log(`⚠️ User lookup failed: ${lookupError.message}`);
          
          // Try to create user anyway
          try {
            const newUser = await this.createKindeUser({
              email: userIdentifier,
              given_name: 'User',
              family_name: 'User'
            });
            actualUserId = newUser.id;
            console.log(`✅ Created new user after lookup failure: ${actualUserId}`);
          } catch (createError) {
            console.log(`❌ Failed to create user: ${createError.message}`);
            throw createError;
          }
        }
      }
      
      // Step 2: Add user to organization using their actual Kinde user ID
      console.log(`🔄 Adding user ${actualUserId} to organization ${orgCode}...`);
      
      // If exclusive mode is requested, ensure user is ONLY in this organization
      if (exclusive) {
        console.log(`🎯 Exclusive mode: Ensuring user is ONLY in organization ${orgCode}...`);
        
        try {
          // First, get user's current organizations
          const userOrgs = await this.getUserOrganizations(actualUserId);
          console.log(`📋 User is currently in organizations: ${JSON.stringify(userOrgs.organizations?.map(org => org.code) || [])}`);
          
          // Remove from all other organizations
          if (userOrgs.organizations && userOrgs.organizations.length > 0) {
            for (const org of userOrgs.organizations) {
              if (org.code !== orgCode) {
                try {
                  console.log(`🔄 Removing user from unwanted organization: ${org.code}`);
                  await this.removeUserFromOrganization(actualUserId, org.code);
                  console.log(`✅ Removed from ${org.code}`);
                } catch (removeError) {
                  console.warn(`⚠️ Failed to remove from ${org.code}:`, removeError.message);
                }
              }
            }
          }
          
          // Check if user is already in the target organization
          const isAlreadyInTarget = userOrgs.organizations?.some(org => org.code === orgCode);
          
          if (!isAlreadyInTarget) {
            console.log(`🔄 Adding user to target organization: ${orgCode}`);
            const directResponse = await this.makeRequest('POST', `/organizations/${orgCode}/users`, {
      users: [{
                id: actualUserId
      }]
            });
            console.log(`✅ Successfully added user to organization: ${JSON.stringify(directResponse)}`);
            return { success: true, method: 'exclusive_direct', response: directResponse, userId: actualUserId };
          } else {
            console.log(`✅ User already in target organization, only removed from others`);
            return { success: true, method: 'exclusive_cleanup', userId: actualUserId, message: 'User was already in target org, removed from others' };
          }
          
        } catch (exclusiveError) {
          console.warn(`⚠️ Exclusive mode failed, falling back to regular assignment: ${exclusiveError.message}`);
          // Fall through to regular assignment
        }
      }
      
      // Regular (non-exclusive) assignment
      const directResponse = await this.makeRequest('POST', `/organizations/${orgCode}/users`, {
        users: [{
          id: actualUserId
        }]
      });

      console.log(`✅ Successfully added user to organization: ${JSON.stringify(directResponse)}`);
      return { success: true, method: 'direct', response: directResponse, userId: actualUserId };

    } catch (error) {
      console.log(`❌ Organization assignment failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a user in Kinde or convert subscriber to user
   */
  async createKindeUser(userDetails) {
    await this.getAccessToken();
    
    const userData = {
      profile: {
        given_name: userDetails.given_name || userDetails.name?.split(' ')[0] || '',
        family_name: userDetails.family_name || userDetails.name?.split(' ').slice(1).join(' ') || ''
      },
      identities: [{
        type: 'email',
        details: {
          email: userDetails.email
        }
      }]
    };

    console.log(`🔄 Creating user in Kinde: ${JSON.stringify(userData)}`);
    
    try {
      // Try to create user normally
      const response = await this.makeRequest('POST', '/user', userData);
      console.log(`✅ User created in Kinde: ${JSON.stringify(response)}`);
      return response;
    } catch (error) {
      // If user exists as subscriber, try to convert them
      if (error.message.includes('email already exists') || error.message.includes('subscriber')) {
        console.log(`🔄 User exists as subscriber, attempting to convert to user...`);
        
        try {
          // Try to find and convert the subscriber
          const convertResponse = await this.makeRequest('POST', '/subscribers/convert', {
            email: userDetails.email,
            given_name: userDetails.given_name || '',
            family_name: userDetails.family_name || ''
          });
          console.log(`✅ Subscriber converted to user: ${JSON.stringify(convertResponse)}`);
          return convertResponse;
        } catch (convertError) {
          console.log(`⚠️ Failed to convert subscriber: ${convertError.message}`);
          
          // As a last resort, try to get the existing user
          try {
            const users = await this.makeRequest('GET', `/users?email=${encodeURIComponent(userDetails.email)}`);
            if (users.users && users.users.length > 0) {
              console.log(`✅ Found existing user: ${JSON.stringify(users.users[0])}`);
              return users.users[0];
            }
          } catch (searchError) {
            console.log(`⚠️ Failed to find existing user: ${searchError.message}`);
          }
          
          throw convertError;
        }
      }
      throw error;
    }
  }

  /**
   * Get user details from database
   */
  async getUserDetailsFromDatabase(kindeUserId) {
    // This would need to be implemented based on your database structure
    // For now, return null to indicate we don't have the details
    console.log(`⚠️ getUserDetailsFromDatabase not implemented for user: ${kindeUserId}`);
    return null;
  }

  // Remove user from organization
  async removeUserFromOrganization(userId, orgCode) {
    // Use the organization users endpoint with operation: delete
    return await this.makeRequest('PATCH', `/organizations/${orgCode}/users`, {
      users: [{
        id: userId,
        operation: 'delete'
      }]
    });
  }

  // Set user organization roles
  async setUserOrganizationRoles(userId, orgCode, roleIds) {
    return await this.makeRequest('PUT', `/users/${userId}/organizations/${orgCode}/roles`, {
      role_ids: roleIds
    });
  }

  // Check if user exists in organization
  async checkUserInOrganization(email, orgCode) {
    try {
      const orgUsers = await this.makeRequest('GET', `/organizations/${orgCode}/users`);
      const userExists = orgUsers.users?.some(user => 
        user.email?.toLowerCase() === email.toLowerCase()
      );
      return { exists: userExists, user: userExists ? orgUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase()) : null };
    } catch (error) {
      console.error('Error checking user in organization:', error);
      // If we can't check, assume user doesn't exist to allow invitation
      return { exists: false, user: null };
    }
  }

  // Get users in organization
  async getOrganizationMembers(orgCode) {
    try {
      return await this.makeRequest('GET', `/organizations/${orgCode}/users`);
    } catch (error) {
      console.error('Error getting organization members:', error);
      return { users: [] };
    }
  }

  // Add user to organization with roles
  async addUserToOrganizationWithRoles(userId, orgCode, roleIds = []) {
    try {
      // First add user to organization
      await this.addUserToOrganization(userId, orgCode);
      
      // Then assign roles if provided
      if (roleIds && roleIds.length > 0) {
        await this.setUserOrganizationRoles(userId, orgCode, roleIds);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error adding user to organization with roles:', error);
      throw error;
    }
  }

  // Remove role from user (organization-specific)
  async removeRoleFromUserInOrganization(userId, orgCode, roleId) {
    try {
      // Get current user roles in organization
      const userRoles = await this.makeRequest('GET', `/users/${userId}/organizations/${orgCode}/roles`);
      const currentRoleIds = userRoles.roles?.map(role => role.id) || [];
      
      // Remove the specific role
      const updatedRoleIds = currentRoleIds.filter(id => id !== roleId);
      
      // Update user roles (this replaces all roles)
      return await this.setUserOrganizationRoles(userId, orgCode, updatedRoleIds);
    } catch (error) {
      console.error('Error removing role from user in organization:', error);
      throw error;
    }
  }

  // Get user roles in organization
  async getUserOrganizationRoles(userId, orgCode) {
    try {
      return await this.makeRequest('GET', `/users/${userId}/organizations/${orgCode}/roles`);
    } catch (error) {
      console.error('Error getting user organization roles:', error);
      return { roles: [] };
    }
  }

  // Generate auth URL for organization (for login)
  getAuthUrl(orgCode, redirectUri, options = {}) {
    return this.generateSocialLoginUrl({
      orgCode,
      redirectUri,
      ...options
    });
  }

  // Generate social auth URL with provider-specific optimizations
  getSocialAuthUrl(provider, options = {}) {
    const methodMap = {
      'google': 'generateGoogleLoginUrl',
      'github': 'generateGithubLoginUrl',
      'microsoft': 'generateMicrosoftLoginUrl',
      'apple': 'generateAppleLoginUrl',
      'linkedin': 'generateLinkedInLoginUrl'
    };

    const method = methodMap[provider.toLowerCase()];
    if (method && typeof this[method] === 'function') {
      return this[method](options);
    }

    // Fallback to generic social login
    return this.generateSocialLoginUrl({
      connectionId: provider,
      ...options
    });
  }

  // Ensure user is ONLY in the specified organization (removes from all others)
  async ensureUserInSingleOrganization(userId, targetOrgCode) {
    try {
      console.log(`🎯 Ensuring user ${userId} is ONLY in organization ${targetOrgCode}`);
      
      // Get user's current organizations
      const userOrgs = await this.getUserOrganizations(userId);
      
      if (!userOrgs.organizations) {
        console.log('📋 User has no organizations, adding to target org');
        await this.addUserToOrganization(userId, targetOrgCode, [], false); // non-exclusive since no orgs exist
        return { success: true, removedOrgs: [], addedToTarget: true };
      }

      const currentOrgCodes = userOrgs.organizations.map(org => org.code);
      console.log(`📋 User is currently in organizations: [${currentOrgCodes.join(', ')}]`);

      // Check if user is already only in the target organization
      if (currentOrgCodes.length === 1 && currentOrgCodes[0] === targetOrgCode) {
        console.log('✅ User is already only in the target organization');
        return { success: true, removedOrgs: [], addedToTarget: false, alreadyCorrect: true };
      }

      const removedOrgs = [];
      
      // Remove from all organizations except target
      for (const org of userOrgs.organizations) {
        if (org.code !== targetOrgCode) {
          try {
            console.log(`🔄 Removing user from unwanted organization: ${org.code}`);
            await this.removeUserFromOrganization(userId, org.code);
            removedOrgs.push(org.code);
            console.log(`✅ Removed from ${org.code}`);
          } catch (removeError) {
            console.warn(`⚠️ Failed to remove from ${org.code}:`, removeError.message);
          }
        }
      }

      // Add to target organization if not already there
      let addedToTarget = false;
      if (!currentOrgCodes.includes(targetOrgCode)) {
        try {
          console.log(`🔄 Adding user to target organization: ${targetOrgCode}`);
          await this.addUserToOrganization(userId, targetOrgCode, [], false); // non-exclusive since we already cleaned up
          addedToTarget = true;
          console.log(`✅ Added to ${targetOrgCode}`);
        } catch (addError) {
          console.error(`❌ Failed to add to target organization ${targetOrgCode}:`, addError.message);
          throw addError;
        }
      }

      return { success: true, removedOrgs, addedToTarget };

    } catch (error) {
      console.error('❌ Failed to ensure user in single organization:', error);
      throw error;
    }
  }

  // Create organization with enhanced options
  async createOrganizationWithOptions(organizationData, options = {}) {
    const {
      setAsDefault = false,
      enableSocialConnections = true,
      defaultRoles = []
    } = options;

    try {
      // Create the organization
      const organization = await this.createOrganization(organizationData);
      
      // Perform additional setup if needed
      if (setAsDefault && organizationData.adminUserId) {
        await this.addUserToOrganization(
          organizationData.adminUserId, 
          organization.code,
          defaultRoles
        );
      }

      return organization;
    } catch (error) {
      console.error('Error creating organization with options:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const kindeService = new KindeService();

export default kindeService;
export { KindeService };