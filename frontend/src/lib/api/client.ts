import axios, { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'
import { config } from '@/lib/config'

const API_BASE_URL = config.API_URL

let kindeTokenGetter: (() => Promise<string | null>) | null = null;

export const setKindeTokenGetter = (getter: () => Promise<string | null>) => {
  kindeTokenGetter = getter;
};

const isValidJWT = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  if (token.length < 20) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    return header && typeof header === 'object' && header.alg;
  } catch (e) {
    return false;
  }
};

/**
 * Get authentication token from the Kinde SDK only.
 * Tokens are never read from localStorage/sessionStorage/cookies by JS — cookies
 * are httpOnly and sent automatically via withCredentials. The Bearer header is set
 * from the Kinde SDK's in-memory token for cases where cookie flow doesn't apply.
 */
export const getKindeToken = async (): Promise<string | null> => {
  if (kindeTokenGetter) {
    try {
      const token = await kindeTokenGetter();
      if (token && isValidJWT(token)) {
        return token;
      }
    } catch (error) {
      logger.debug('Kinde SDK getToken() failed:', error);
    }
  }

  return null;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(async (config) => {
  const authToken = await getKindeToken();
  
  if (authToken) {
    if (!config.headers) config.headers = {} as any;
    config.headers['Authorization'] = `Bearer ${authToken}`;
  } else {
    if (config.headers?.Authorization === 'Bearer' || config.headers?.Authorization === '') {
      delete config.headers.Authorization;
    }
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status !== 401) {
      logger.error('🚨 API Error:', {
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method,
        data: error.response?.data
      })
    }

    if (error.response?.status === 401) {
      logger.debug('Authentication required — session may have expired')
    }

    if (error.response?.status === 200 && (error.response?.data as any)?.subscriptionExpired) {
      const responseData = error.response.data as any
      
      if (responseData?.code === 'TRIAL_EXPIRED' || responseData?.code === 'SUBSCRIPTION_EXPIRED') {
        logger.debug('🚫 Trial/Subscription expired response intercepted:', responseData)
        
        const expiredData = {
          expired: true,
          expiredAt: new Date().toISOString(),
          isTrialExpired: responseData.isTrialExpired,
          isSubscriptionExpired: responseData.isSubscriptionExpired,
          trialEnd: responseData.data?.trialEnd,
          currentPeriodEnd: responseData.data?.currentPeriodEnd,
          expiredDate: responseData.data?.expiredDate,
          expiredDuration: responseData.data?.expiredDuration,
          plan: responseData.data?.plan,
          message: responseData.message,
          immediate: responseData.immediate,
          code: responseData.code
        }
        
        localStorage.setItem('trialExpired', JSON.stringify(expiredData))
        
        const lastEmitted = localStorage.getItem('trialExpiredEventEmitted')
        const now = Date.now()
        
        if (!lastEmitted || (now - parseInt(lastEmitted)) > 5000) {
          localStorage.setItem('trialExpiredEventEmitted', now.toString())
          
          window.dispatchEvent(new CustomEvent('apiTrialExpired', { 
            detail: responseData 
          }))
          
          window.dispatchEvent(new CustomEvent('trialExpired', { 
            detail: expiredData 
          }))
        }
        
        return Promise.reject(error)
      }
    }

    if (error.response?.status && error.response.status >= 500) {
      logger.error('🚨 Server error intercepted:', error.response.status)
      
      const trialExpired = localStorage.getItem('trialExpired')
      if (!trialExpired) {
        toast.error('Server temporarily unavailable. Please try again in a moment.', {
          duration: 4000,
          position: 'top-center'
        })
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
