/**
 * 🔐 **COMPREHENSIVE USER APPLICATION ACCESS MANAGER**
 * Complete interface for managing user access to applications based on subscription tiers
 * with external sync capabilities
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { 
  Users, 
  Shield, 
  RefreshCw, 
  Settings, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Download,
  Upload,
  Eye,
  EyeOff,
  Search,
  User,
  Building,
  Clock,
  Activity
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';

interface User {
  userId: string;
  email: string;
  name: string;
  avatar?: string;
  title?: string;
  department?: string;
  isActive: boolean;
  isTenantAdmin: boolean;
  lastActiveAt?: string;
  lastLoginAt?: string;
  onboardingCompleted: boolean;
  applicationAccess: ApplicationAccess[];
  totalApplications: number;
  hasAnyAccess: boolean;
}

interface ApplicationAccess {
  appId: string;
  appCode: string;
  appName: string;
  description: string;
  icon: string;
  baseUrl: string;
  status: string;
  isCore: boolean;
  modules: ModuleAccess[];
  permissions: Permission[];
}

interface ModuleAccess {
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  permissions: string[];
  grantedAt: string;
  expiresAt?: string;
}

interface Permission {
  permissionId: string;
  permissions: string[];
  grantedAt: string;
  expiresAt?: string;
}

interface SyncResult {
  success: boolean;
  userCount: number;
  error?: string;
  warning?: string;
  syncedAt: string;
  applicationUrl?: string;
  statusCode?: number;
  response?: any;
}

interface AccessSummary {
  totalUsers: number;
  enabledApplications: number;
  usersWithAccess: number;
  usersWithoutAccess: number;
  applicationUsage: Array<{
    appId: string;
    appCode: string;
    appName: string;
    userCount: number;
  }>;
}

export default function ComprehensiveUserApplicationManager() {
  const { orgCode: orgCodeFromUrl } = useParams();
  const { user, getOrganization } = useKindeAuth();
  const authUser = useAuthStore(state => state.user);
  // Fallback: extract org from URL path even if route isn't /org/:orgCode
  const orgFromPath = typeof window !== 'undefined'
    ? (window.location.pathname.match(/^\/org\/([^/]+)/)?.[1] || undefined)
    : undefined;
  
  // Get organization from Kinde using the proper method
  const [kindeOrgCode, setKindeOrgCode] = useState<string | undefined>(undefined);
  
  const effectiveOrgCode = orgFromPath || orgCodeFromUrl || kindeOrgCode || authUser?.tenantId || undefined;
  const [resolvedOrgCode, setResolvedOrgCode] = useState<string | undefined>(effectiveOrgCode);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterApp, setFilterApp] = useState<string>('all');
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<AccessSummary | null>(null);
  const [syncing, setSyncing] = useState<{ [appCode: string]: boolean }>({});
  const [syncResults, setSyncResults] = useState<{ [key: string]: SyncResult }>({});
  const [dryRun, setDryRun] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    async function resolveOrg() {
      try {
        // Get Kinde organization
        const kindeOrg = await getOrganization();
        if (mounted && kindeOrg) {
          // Handle both object and string return types
          if (typeof kindeOrg === 'object' && kindeOrg !== null) {
            setKindeOrgCode((kindeOrg as any).orgCode || (kindeOrg as any).id);
          } else if (typeof kindeOrg === 'string') {
            setKindeOrgCode(kindeOrg);
          }
        }
        
        // If we already have an org code, use it
        if (effectiveOrgCode && mounted) {
          setResolvedOrgCode(effectiveOrgCode);
          return;
        }
        // Ask backend to provide org from authenticated session
        const resp = await api.get('/subscriptions/debug-auth');
        const serverOrg: string | undefined = resp?.data?.kindeOrgId || resp?.data?.organization?.id;
        if (mounted) {
          setResolvedOrgCode(serverOrg);
        }
      } catch (e) {
        console.warn('⚠️ Failed to resolve orgCode from server:', e);
      }
    }
    resolveOrg();
    return () => { mounted = false };
  }, [orgFromPath, orgCodeFromUrl, kindeOrgCode, authUser?.tenantId, getOrganization]);

  console.log('🎯 ComprehensiveUserApplicationManager component rendered!');
  console.log('🏢 orgCode from URL params:', orgCodeFromUrl);
  console.log('🛣️ orgCode from path:', orgFromPath);
  console.log('🪪 orgCode from Kinde user:', kindeOrgCode);
  console.log('🗂️ orgCode from auth store (tenantId):', authUser?.tenantId);
  console.log('✅ effectiveOrgCode:', effectiveOrgCode);
  console.log('🧭 resolvedOrgCode (final):', resolvedOrgCode);
  
  // Computed properties
  const uniqueApps = React.useMemo(() => {
    const apps = new Set<string>();
    users.forEach(user => {
      user.applicationAccess.forEach(app => {
        apps.add(app.appCode);
      });
    });
    return Array.from(apps);
  }, [users]);

  const filteredUsers = React.useMemo(() => {
    let filtered = users;
    
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterApp !== 'all') {
      filtered = filtered.filter(user => 
        user.applicationAccess.some(app => app.appCode === filterApp)
      );
    }
    
    if (!showInactiveUsers) {
      filtered = filtered.filter(user => user.isActive);
    }

    return filtered;
  }, [users, searchTerm, filterApp, showInactiveUsers]);

  // Data transformation functions
  const transformClassificationToUsers = (classificationData: any): User[] => {
    console.log('🔄 Transforming classification data to users...');
    console.log('🔍 Input data structure:', {
      byUser: classificationData.byUser,
      byApplication: classificationData.byApplication,
      summary: classificationData.summary
    });
    
    const byUser = classificationData.byUser || {};
    const byApplication = classificationData.byApplication || {};
    
    console.log('🔍 byUser keys:', Object.keys(byUser));
    console.log('🔍 byApplication keys:', Object.keys(byApplication));
    
    // If byUser has data, use it directly (this is the primary case)
    if (Object.keys(byUser).length > 0) {
      console.log('✅ Using byUser data directly');
      const users = Object.entries(byUser).map(([userId, userData]: [string, any]) => {
        console.log(`🔍 Processing user ${userId}:`, userData);
        
        // Get allowed apps for this user
        const allowedApps = userData.allowedApps || [];
        console.log(`🔍 User ${userId} allowed apps:`, allowedApps);
        
        return {
          userId,
          email: userData.email || '',
          name: userData.name || '',
          avatar: userData.avatar || '',
          title: userData.title || '',
          department: userData.department || '',
          isActive: userData.isActive !== false,
          isTenantAdmin: userData.isTenantAdmin || false,
          lastActiveAt: userData.lastActiveAt || '',
          lastLoginAt: userData.lastLoginAt || '',
          onboardingCompleted: userData.onboardingCompleted !== false,
          applicationAccess: allowedApps.map((appCode: string) => ({
            appId: appCode,
            appCode,
            appName: getAppDisplayName(appCode),
            description: getAppDescription(appCode),
            icon: getAppIcon(appCode),
            baseUrl: getAppUrl(appCode),
            status: 'active',
            isCore: true,
            modules: [],
            permissions: []
          })),
          totalApplications: allowedApps.length,
          hasAnyAccess: allowedApps.length > 0
        };
      });
      
      console.log('✅ Transformed users from byUser:', users.length);
      return users;
    }
    
    // Fallback: If byUser is empty but byApplication has data, create users from application data
    if (Object.keys(byApplication).length > 0) {
      console.log('⚠️ byUser is empty, creating users from application data...');
      
      // Get unique users from all applications
      const allUsers = new Set();
      Object.values(byApplication).forEach((appData: any) => {
        if (appData.users && Array.isArray(appData.users)) {
          appData.users.forEach((user: any) => {
            if (user.userId) {
              allUsers.add(user.userId);
            }
          });
        }
      });
      
      console.log('🔍 Found users in byApplication:', Array.from(allUsers));
      
      // Create user objects from actual user data
      const users: User[] = [];
      
      Array.from(allUsers).forEach(userId => {
        // Find which applications this user has access to
        const userApps = Object.keys(byApplication).filter((appCode: string) => {
          const appData = byApplication[appCode];
          return appData.users && appData.users.some((u: any) => u.userId === userId);
        });
        
        // Get user details from the first app that has this user
        let userDetails: any = {};
        Object.values(byApplication).forEach((appData: any) => {
          if (appData.users && Array.isArray(appData.users)) {
            const foundUser = appData.users.find((u: any) => u.userId === userId);
            if (foundUser && !userDetails.userId) {
              userDetails = foundUser;
            }
          }
        });
        
        users.push({
          userId: userId as string,
          email: userDetails.email || '',
          name: userDetails.name || '',
          avatar: userDetails.avatar || '',
          title: userDetails.title || '',
          department: userDetails.department || '',
          isActive: userDetails.isActive !== false,
          isTenantAdmin: userDetails.isTenantAdmin || false,
          lastActiveAt: userDetails.lastActiveAt || '',
          lastLoginAt: userDetails.lastLoginAt || '',
          onboardingCompleted: userDetails.onboardingCompleted !== false,
          applicationAccess: userApps.map((appCode: string) => ({
            appId: appCode,
            appCode,
            appName: getAppDisplayName(appCode),
            description: getAppDescription(appCode),
            icon: getAppIcon(appCode),
            baseUrl: getAppUrl(appCode),
            status: 'active',
            isCore: true,
            modules: [],
            permissions: []
          })),
          totalApplications: userApps.length,
          hasAnyAccess: userApps.length > 0
        });
      });
      
      console.log('✅ Created users from application data:', users.length);
      return users;
    }
    
    console.log('⚠️ No user data found in either byUser or byApplication');
    return [];
  };

  // Helper methods for app information
  const getAppDisplayName = (appCode: string): string => {
    const appNames: Record<string, string> = {
      'crm': 'Customer Relationship Management',
      'hr': 'Human Resources Management',
      'affiliate': 'Affiliate Management',
      'system': 'System Administration'
    };
    return appNames[appCode] || appCode.toUpperCase();
  };

  const getAppDescription = (appCode: string): string => {
    const appDescriptions: Record<string, string> = {
      'crm': 'Complete CRM solution for managing customers, deals, and sales pipeline',
      'hr': 'Complete HR solution for employee management and payroll',
      'affiliate': 'Manage affiliate partners and commission tracking',
      'system': 'System administration and user management'
    };
    return appDescriptions[appCode] || `${appCode.toUpperCase()} Application`;
  };

  const getAppIcon = (appCode: string): string => {
    const appIcons: Record<string, string> = {
      'crm': '🎫',
      'hr': '👥',
      'affiliate': '🤝',
      'system': '⚙️'
    };
    return appIcons[appCode] || '🔧';
  };

  const getAppUrl = (appCode: string): string => {
    const appUrls: Record<string, string> = {
      'crm': 'https://crm.zopkit.com',
      'hr': 'http://localhost:3003',
      'affiliate': 'http://localhost:3004',
      'system': 'http://localhost:3000'
    };
    return appUrls[appCode] || '';
  };

  const transformClassificationToSummary = (classificationData: any): AccessSummary => {
    console.log('🔄 Transforming classification data to summary...');
    console.log('🔍 Summary input data:', {
      byApplication: classificationData.byApplication,
      summary: classificationData.summary
    });
    
    // Use byApplication data since that's what the backend provides
    const byApplication = classificationData.byApplication || {};
    const summary = classificationData.summary || {};
    
    // Count applications from byApplication
    const enabledApplications = Object.keys(byApplication).length;
    
    // Calculate total users from byApplication data
    let totalUsers = summary.totalUsers || 0;
    if (totalUsers === 0 && Object.keys(byApplication).length > 0) {
      // Count unique users across all applications
      const allUsers = new Set();
      Object.values(byApplication).forEach((appData: any) => {
        if (appData.users && Array.isArray(appData.users)) {
          appData.users.forEach((user: any) => {
            if (user.userId) {
              allUsers.add(user.userId);
            }
          });
        }
      });
      totalUsers = allUsers.size;
    }
    
    // Create application usage from byApplication data
    const applicationUsage = Object.entries(byApplication).map(([appCode, appData]: [string, any]) => ({
      appId: appCode,
      appCode,
      appName: getAppDisplayName(appCode),
      userCount: appData.totalUsers || (appData.users ? appData.users.length : 0)
    }));
    
    // Calculate users with access from application breakdown
    const usersWithAccess = summary.applicationBreakdown ? 
      Object.values(summary.applicationBreakdown).reduce((sum: number, count: any) => sum + (count || 0), 0) : 
      totalUsers;
    
    const result = {
      totalUsers,
      enabledApplications,
      usersWithAccess,
      usersWithoutAccess: 0,
      applicationUsage
    };
    
    console.log('✅ Transformed summary:', result);
    return result;
  };

  useEffect(() => {
    console.log('🎯 useEffect triggered, calling loadData...');
    loadData();
  }, [showInactiveUsers, filterApp]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading user application data...');
      
      // Use the classification endpoint to get user application data
      console.log('🔄 Calling /user-sync/classification endpoint...');
      
      // First try the classification endpoint
      let classificationResponse;
      try {
        classificationResponse = await api.get('/user-sync/classification');
        console.log('✅ Classification endpoint response received');
      } catch (error) {
        console.error('❌ Classification endpoint failed, trying alternative...');
        // Fallback to user-applications endpoint if classification fails
        try {
          const fallbackResponse = await api.get('/user-applications/users');
          console.log('✅ Fallback endpoint response received');
          
          if (fallbackResponse.status === 200 && fallbackResponse.data.success) {
            // Transform fallback data to match expected structure
            const fallbackData = fallbackResponse.data.data;
            const transformedUsers = fallbackData.map((user: any) => ({
              userId: user.userId || user.id,
              email: user.email || '',
              name: user.name || '',
              avatar: user.avatar || '',
              title: user.title || '',
              department: user.department || '',
              isActive: user.isActive !== false,
              isTenantAdmin: user.isTenantAdmin || false,
              lastActiveAt: user.lastActiveAt || '',
              lastLoginAt: user.lastLoginAt || '',
              onboardingCompleted: user.onboardingCompleted !== false,
              applicationAccess: user.applicationAccess || [],
              totalApplications: user.applicationAccess ? user.applicationAccess.length : 0,
              hasAnyAccess: user.hasAnyAccess || false
            }));
            
            const transformedSummary = {
              totalUsers: fallbackData.length,
              enabledApplications: fallbackData.filter((u: any) => u.hasAnyAccess).length,
              usersWithAccess: fallbackData.filter((u: any) => u.hasAnyAccess).length,
              usersWithoutAccess: fallbackData.filter((u: any) => !u.hasAnyAccess).length,
              applicationUsage: []
            };
            
            setUsers(transformedUsers);
            setSummary(transformedSummary);
            return;
          }
        } catch (fallbackError) {
          console.error('❌ Both endpoints failed:', fallbackError);
        }
        
        // If all endpoints fail, throw the original error
        throw error;
      }

      console.log('📡 API Response:', {
        status: classificationResponse.status,
        statusText: classificationResponse.statusText,
        hasData: !!classificationResponse.data,
        dataKeys: classificationResponse.data ? Object.keys(classificationResponse.data) : []
      });

      if (classificationResponse.status === 200) {
        const classificationData = classificationResponse.data;
        
        console.log('✅ Data loaded successfully:', {
          success: classificationData.success,
          message: classificationData.message,
          hasData: !!classificationData.data,
          dataKeys: classificationData.data ? Object.keys(classificationData.data) : []
        });
        
        // Transform the data to match our component's expected structure
        if (classificationData.data && classificationData.success) {
          console.log('🔍 Raw backend data structure:', {
            keys: Object.keys(classificationData.data),
            byApplication: classificationData.data.byApplication,
            byUser: classificationData.data.byUser,
            summary: classificationData.data.summary
          });
          
          // Log the actual data content for debugging
          console.log('🔍 Full backend data:', JSON.stringify(classificationData.data, null, 2));
          console.log('🔍 Raw response object:', classificationResponse);
          console.log('🔍 Response data type:', typeof classificationResponse.data);
          console.log('🔍 Response data keys:', Object.keys(classificationResponse.data || {}));
          
          console.log('🔄 Starting data transformation...');
          const transformedUsers = transformClassificationToUsers(classificationData.data);
          const transformedSummary = transformClassificationToSummary(classificationData.data);
          
          console.log('✅ Data transformed successfully:', {
            usersCount: transformedUsers.length,
            summary: transformedSummary
          });
          
          console.log('🔄 Setting state with transformed data...');
          setUsers(transformedUsers);
          setSummary(transformedSummary);
          console.log('✅ State updated successfully');
        } else {
          console.log('⚠️ No data to transform or API returned error');
          console.log('API Response:', classificationData);
          setUsers([]);
          setSummary(null);
        }
      } else {
        console.error('❌ API call failed:', {
          status: classificationResponse.status,
          statusText: classificationResponse.statusText
        });
        
        // Set empty data to show the UI structure
        setUsers([]);
        setSummary(null);
      }
    } catch (error) {
      console.error('💥 Error loading user application data:', error);
      // Set empty data to show the UI structure
      setUsers([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToApplication = async (appCode: string, userIds?: string[]) => {
    try {
      setSyncing(prev => ({ ...prev, [appCode]: true }));
      
      const syncPayload = {
        syncType: 'full',
        orgCode: resolvedOrgCode,
        forceUpdate: true
      };
      
      console.log(`🔄 Syncing to ${appCode} with payload:`, syncPayload);
      
      // Use the working user-sync endpoint with proper payload
      const response = await api.post(`/user-sync/sync/application/${appCode}`, syncPayload);

      if (response.status === 200) {
        const result = response.data;
        setSyncResults(prev => ({
          ...prev,
          [appCode]: result.data
        }));
        
        // Refresh data after successful sync
        loadData();
      }
    } catch (error) {
      console.error(`Error syncing to ${appCode}:`, error);
    } finally {
      setSyncing(prev => ({ ...prev, [appCode]: false }));
    }
  };

  const handleBulkSync = async () => {
    try {
      setSyncing(prev => ({ ...prev, 'bulk': true }));
      
      const response = await api.post('/user-sync/sync', { 
        syncType: 'full',
        orgCode: resolvedOrgCode,
        forceUpdate: true,
        dryRun 
      });

      if (response.status === 200) {
        const result = response.data;
        setSyncResults(result.data.applicationResults || {});
        
        if (!dryRun) {
          loadData();
        }
      }
    } catch (error) {
      console.error('Error in bulk sync:', error);
    } finally {
      setSyncing(prev => ({ ...prev, 'bulk': false }));
    }
  };

  const handleSyncUser = async (userId: string, appCodes?: string[]) => {
    try {
      setSyncing(prev => ({ ...prev, 'bulk': true }));
      
      const response = await api.post(`/user-sync/sync/user/${userId}`, {
        syncType: 'update',
        orgCode: resolvedOrgCode,
        forceUpdate: true
      });

      if (response.status === 200) {
        const result = response.data;
        // Update sync results for each app
        if (result.data && result.data.syncResults) {
          Object.entries(result.data.syncResults).forEach(([appCode, syncResult]: [string, any]) => {
            setSyncResults(prev => ({
              ...prev,
              [`${appCode}_${userId}`]: syncResult
            }));
          });
        }
        
        // Refresh data after successful sync
        loadData();
      }
    } catch (error) {
      console.error(`Error syncing user ${userId}:`, error);
    } finally {
      setSyncing(prev => ({ ...prev, 'bulk': false }));
    }
  };



  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'would_sync': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading user application data...</span>
      </div>
    );
  }

  // Show component structure even when no data
  const hasData = users.length > 0 || summary;

  return (
    <div className="space-y-6">


      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Application Access</h1>
          <p className="text-gray-600 mt-1">
            Manage user access to applications based on subscription tiers and sync to external systems
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync All
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Sync All Users</DialogTitle>
                <DialogDescription>
                  Sync all users to their accessible applications
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="dry-run"
                    checked={dryRun}
                    onCheckedChange={setDryRun}
                  />
                  <label htmlFor="dry-run" className="text-sm">
                    Dry run (preview only)
                  </label>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setSyncDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      handleBulkSync();
                      setSyncDialogOpen(false);
                    }}
                    disabled={syncing['bulk']}
                  >
                    {syncing['bulk'] ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    {dryRun ? 'Preview Sync' : 'Start Sync'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{summary.totalUsers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Applications</p>
                  <p className="text-2xl font-bold">{summary.enabledApplications}</p>
                </div>
                <Shield className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Configured Apps</p>
                  <p className="text-2xl font-bold">{summary.enabledApplications}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Access Grants</p>
                  <p className="text-2xl font-bold">{summary.totalUsers}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterApp} onValueChange={setFilterApp}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by application" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Applications</SelectItem>
                {uniqueApps.map(app => (
                  <SelectItem key={app} value={app}>
                    {app.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="show-inactive"
                checked={showInactiveUsers}
                onCheckedChange={setShowInactiveUsers}
              />
              <label htmlFor="show-inactive" className="text-sm">
                Show inactive users
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users & Access</TabsTrigger>
          <TabsTrigger value="sync-results">Sync Results</TabsTrigger>
          <TabsTrigger value="application-stats">Application Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {!hasData ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No data available</p>
                <p className="text-sm text-gray-500 mb-4">This could be because:</p>
                <ul className="text-sm text-gray-500 text-left max-w-md mx-auto space-y-1">
                  <li>• Backend server is not running</li>
                  <li>• API endpoints are not accessible</li>
                  <li>• No users exist in the system</li>
                  <li>• Authentication issues</li>
                </ul>
                <Button 
                  onClick={loadData} 
                  className="mt-4"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Loading Data
                </Button>
              </CardContent>
            </Card>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No users found matching your criteria.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map(user => (
                <Card key={user.userId} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* User Header */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleUserExpansion(user.userId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            {user.avatar ? (
                              <img 
                                src={user.avatar} 
                                alt={user.name}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <User className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{user.name}</h3>
                              {user.isTenantAdmin && (
                                <Badge variant="secondary">Admin</Badge>
                              )}
                              {!user.isActive && (
                                <Badge variant="destructive">Inactive</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{user.email}</p>
                            {user.title && (
                              <p className="text-xs text-gray-500">{user.title}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {user.totalApplications} apps
                            </p>
                            <p className="text-xs text-gray-500">
                              {user.hasAnyAccess ? 'Has access' : 'No access'}
                            </p>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSyncUser(user.userId);
                            }}
                            disabled={syncing['bulk'] || !user.hasAnyAccess}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          
                          {expandedUsers.has(user.userId) ? (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded User Details */}
                    {expandedUsers.has(user.userId) && (
                      <div className="border-t bg-gray-50 p-4">
                        <div className="space-y-4">
                          {/* User Info */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-gray-600">Department</p>
                              <p>{user.department || 'Not specified'}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-600">Last Active</p>
                              <p>{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-600">Last Login</p>
                              <p>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-600">Onboarding</p>
                              <p>{user.onboardingCompleted ? 'Completed' : 'Pending'}</p>
                            </div>
                          </div>

                          <Separator />

                          {/* Application Access */}
                          <div>
                            <h4 className="font-medium mb-3">Application Access</h4>
                            {user.applicationAccess.length === 0 ? (
                              <p className="text-gray-600 text-sm">No application access granted</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {user.applicationAccess.map(app => (
                                  <div key={app.appId} className="border rounded-lg p-3 bg-white">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-lg">{app.icon}</span>
                                        <div>
                                          <p className="font-medium text-sm">{app.appName}</p>
                                          <p className="text-xs text-gray-500">{app.appCode}</p>
                                        </div>
                                      </div>
                                      
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleSyncToApplication(app.appCode, [user.userId])}
                                        disabled={syncing[app.appCode] || !user.hasAnyAccess}
                                      >
                                        <RefreshCw className="w-3 h-3" />
                                      </Button>
                                    </div>
                                    
                                    {app.modules.length > 0 && (
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium text-gray-600">Modules:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {app.modules.map(module => (
                                            <Badge key={module.moduleId} variant="outline" className="text-xs">
                                              {module.moduleCode}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sync-results" className="space-y-4">
          {!hasData ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <p className="text-gray-600">No data available. Load user data first to see sync results.</p>
              </CardContent>
            </Card>
          ) : Object.keys(syncResults).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No sync results yet. Start a sync operation to see results here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(syncResults).map(([appCode, result]) => (
                <Card key={appCode}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {appCode.toUpperCase()} Sync Result
                        </CardTitle>
                        <CardDescription>
                          {result.syncedAt ? new Date(result.syncedAt).toLocaleString() : 'No timestamp'} • {result.userCount || 0} users
                        </CardDescription>
                      </div>
                      
                      <Badge variant={result.success ? 'default' : 'destructive'}>
                        {result.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      {result.error && (
                        <Alert variant="destructive">
                          <AlertDescription>{result.error}</AlertDescription>
                        </Alert>
                      )}
                      
                      {result.warning && (
                        <Alert variant="default">
                          <AlertDescription>{result.warning}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Status:</span>
                          <span className={`ml-2 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                            {result.success ? 'Success' : 'Failed'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Users:</span>
                          <span className="ml-2">{result.userCount || 0}</span>
                        </div>
                        <div>
                          <span className="font-medium">Synced At:</span>
                          <span className="ml-2">{result.syncedAt ? new Date(result.syncedAt).toLocaleString() : 'N/A'}</span>
                        </div>
                        {result.applicationUrl && (
                          <div>
                            <span className="font-medium">App URL:</span>
                            <span className="ml-2 text-blue-600">{result.applicationUrl}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="application-stats" className="space-y-4">
          {!hasData ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <p className="text-gray-600">No data available. Load user data first to see application statistics.</p>
              </CardContent>
            </Card>
          ) : summary && summary.applicationUsage ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.applicationUsage.map(app => (
                <Card key={app.appId}>
                  <CardHeader>
                    <CardTitle className="text-lg">{app.appName}</CardTitle>
                    <CardDescription>{app.appCode}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold">{app.userCount}</p>
                        <p className="text-sm text-gray-600">Active Users</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Usage Rate</span>
                          <span>{Math.round((app.userCount / (summary.totalUsers || 1)) * 100)}%</span>
                        </div>
                        <Progress 
                          value={(app.userCount / (summary.totalUsers || 1)) * 100} 
                          className="w-full"
                        />
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleSyncToApplication(app.appCode)}
                        disabled={syncing[app.appCode] || !user.hasAnyAccess}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync to {app.appCode.toUpperCase()}
                                              </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No application usage data available.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
      </Tabs>
    </div>
  );
}
