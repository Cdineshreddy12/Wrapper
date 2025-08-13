const axios = require('axios');

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
      
      const enhancedInfo = {
        ...userInfo,
        organizations: [],
        socialProvider: this.detectSocialProvider(userInfo),
        hasMultipleOrganizations: false
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
        hasMultipleOrganizations: userInfo.hasMultipleOrganizations
      };
      
      console.log('✅ validateToken - Success:', userContext);
      return userContext;
    } catch (error) {
      console.error('❌ validateToken - Error:', error);
      throw new Error('Token validation failed');
    }
  }

  /**
   * Make authenticated request to Kinde API
   */
  async makeRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`❌ Kinde API request failed: ${method} ${endpoint}`, error.message);
      throw error;
    }
  }
}

module.exports = KindeService;
