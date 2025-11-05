import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import api from '@/lib/api';
import { useUserContext } from './UserContextProvider';

export interface EntityScope {
  scope: 'tenant' | 'entity' | 'none';
  entityIds: string[];
  isUnrestricted: boolean;
  responsibilities?: any[];
  userEmail?: string;
}

interface EntityScopeContextType {
  entityScope: EntityScope | null;
  loading: boolean;
  canAccessEntity: (entityId: string) => boolean;
  isTenantAdmin: boolean;
  isEntityAdmin: boolean;
  refreshEntityScope: () => Promise<void>;
}

const EntityScopeContext = createContext<EntityScopeContextType | null>(null);

interface EntityScopeProviderProps {
  children: ReactNode;
}

export const EntityScopeProvider: React.FC<EntityScopeProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useUserContext();
  const location = useLocation();
  const [entityScope, setEntityScope] = useState<EntityScope | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEntityScope = useCallback(async () => {
    // Skip API calls during onboarding - user hasn't set up organization yet
    const isOnboardingPage = location.pathname === '/onboarding' || location.pathname.startsWith('/onboarding/');
    if (isOnboardingPage) {
      console.log('🚫 EntityScopeProvider: Skipping entity scope fetch during onboarding');
      setEntityScope({
        scope: 'none',
        entityIds: [],
        isUnrestricted: false
      });
      setLoading(false);
      return;
    }

    if (!isAuthenticated || !user) {
      setEntityScope(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Fetching entity scope...');

      const response = await api.get('/admin/entity-scope');
      
      if (response.data.success) {
        const scope = response.data.scope;
        setEntityScope(scope);
        
        console.log('✅ Entity scope loaded:', {
          scope: scope.scope,
          entityCount: scope.entityIds?.length || 0,
          isUnrestricted: scope.isUnrestricted
        });
      } else {
        console.error('❌ Failed to fetch entity scope:', response.data);
        setEntityScope({
          scope: 'none',
          entityIds: [],
          isUnrestricted: false
        });
      }
    } catch (error: any) {
      console.error('❌ Error fetching entity scope:', error);
      
      // On error, default to no access
      setEntityScope({
        scope: 'none',
        entityIds: [],
        isUnrestricted: false
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, location.pathname]);

  // Fetch entity scope when user changes
  useEffect(() => {
    fetchEntityScope();
  }, [fetchEntityScope]);

  const canAccessEntity = useCallback((entityId: string): boolean => {
    if (!entityScope) return false;
    if (entityScope.isUnrestricted) return true;
    return entityScope.entityIds.includes(entityId);
  }, [entityScope]);

  const refreshEntityScope = useCallback(async () => {
    await fetchEntityScope();
  }, [fetchEntityScope]);

  const value: EntityScopeContextType = {
    entityScope,
    loading,
    canAccessEntity,
    isTenantAdmin: entityScope?.isUnrestricted || false,
    isEntityAdmin: entityScope?.scope === 'entity',
    refreshEntityScope
  };

  return (
    <EntityScopeContext.Provider value={value}>
      {children}
    </EntityScopeContext.Provider>
  );
};

export const useEntityScope = (): EntityScopeContextType => {
  const context = useContext(EntityScopeContext);
  if (!context) {
    throw new Error('useEntityScope must be used within EntityScopeProvider');
  }
  return context;
};

export default EntityScopeProvider;

