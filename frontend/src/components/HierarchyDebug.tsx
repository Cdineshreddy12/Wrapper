import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bug,
  CheckCircle,
  XCircle,
  RefreshCw,
  Network,
  Shield,
  Database,
  AlertTriangle,
  Info,
  MapPin
} from 'lucide-react';

interface HierarchyDebugProps {
  tenantId: string;
  makeRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
}

export function HierarchyDebug({ tenantId, makeRequest }: HierarchyDebugProps) {
  const [debugResults, setDebugResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runDebugTest = async (testName: string, testFunction: () => Promise<any>) => {
    setLoading(true);
    try {
      const result = await testFunction();
      setDebugResults(prev => ({
        ...prev,
        [testName]: { success: true, data: result, timestamp: new Date() }
      }));
    } catch (error: any) {
      setDebugResults(prev => ({
        ...prev,
        [testName]: {
          success: false,
          error: error.message,
          status: error.status,
          timestamp: new Date()
        }
      }));
    }
    setLoading(false);
  };

  const testHierarchyEndpoint = async () => {
    console.log('🧪 Testing hierarchy endpoint...');
    const response = await makeRequest(`/entities/hierarchy/${tenantId}`, {
      headers: { 'X-Application': 'crm' }
    });
    return response;
  };

  const testEntityList = async () => {
    console.log('🧪 Testing entity list endpoint...');
    const response = await makeRequest(`/entities/tenant/${tenantId}?entityType=organization`, {
      headers: { 'X-Application': 'crm' }
    });
    return response;
  };

  const testLocationList = async () => {
    console.log('🧪 Testing location list endpoint...');
    const response = await makeRequest(`/entities/tenant/${tenantId}?entityType=location`, {
      headers: { 'X-Application': 'crm' }
    });
    return response;
  };

  const testCreditEndpoint = async () => {
    console.log('🧪 Testing credit endpoint...');
    const response = await makeRequest('/credits/current', {
      headers: { 'X-Application': 'crm' }
    });
    return response;
  };

  const getTestStatus = (testName: string) => {
    const result = debugResults[testName];
    if (!result) return null;

    return result.success ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Success
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    );
  };

  const renderTestResult = (testName: string) => {
    const result = debugResults[testName];
    if (!result) return null;

    return (
      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Result:</span>
          {getTestStatus(testName)}
        </div>

        {result.success ? (
          <div className="space-y-1">
            <div className="text-xs text-gray-600">
              <strong>Response:</strong> {JSON.stringify(result.data, null, 2)}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-xs text-red-600">
              <strong>Error:</strong> {result.error}
            </div>
            {result.status && (
              <div className="text-xs text-gray-600">
                <strong>Status:</strong> {result.status}
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 mt-2">
          <strong>Timestamp:</strong> {result.timestamp.toLocaleTimeString()}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-orange-600" />
          Hierarchy Debug Tools
        </CardTitle>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Use these tools to debug hierarchy loading issues. Each test will show detailed request/response information.
          </AlertDescription>
        </Alert>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="tests" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tests">API Tests</TabsTrigger>
            <TabsTrigger value="results">Test Results</TabsTrigger>
            <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
          </TabsList>

          <TabsContent value="tests" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Network className="w-4 h-4" />
                      Hierarchy Endpoint
                    </span>
                    {getTestStatus('hierarchy')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600 mb-3">
                    Tests the main hierarchy endpoint that might be failing.
                  </p>
                  <Button
                    onClick={() => runDebugTest('hierarchy', testHierarchyEndpoint)}
                    disabled={loading}
                    size="sm"
                    className="w-full"
                  >
                    {loading ? <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> : null}
                    Test Hierarchy API
                  </Button>
                  {renderTestResult('hierarchy')}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Entity List
                    </span>
                    {getTestStatus('entities')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600 mb-3">
                    Tests if basic entity retrieval works (fallback method).
                  </p>
                  <Button
                    onClick={() => runDebugTest('entities', testEntityList)}
                    disabled={loading}
                    size="sm"
                    className="w-full"
                  >
                    {loading ? <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> : null}
                    Test Entity List
                  </Button>
                  {renderTestResult('entities')}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location List
                    </span>
                    {getTestStatus('locations')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600 mb-3">
                    Tests location retrieval to ensure data access works.
                  </p>
                  <Button
                    onClick={() => runDebugTest('locations', testLocationList)}
                    disabled={loading}
                    size="sm"
                    className="w-full"
                  >
                    {loading ? <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> : null}
                    Test Location List
                  </Button>
                  {renderTestResult('locations')}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Authentication
                    </span>
                    {getTestStatus('auth')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600 mb-3">
                    Tests if authentication is working for API calls.
                  </p>
                  <Button
                    onClick={() => runDebugTest('auth', testCreditEndpoint)}
                    disabled={loading}
                    size="sm"
                    className="w-full"
                  >
                    {loading ? <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> : null}
                    Test Auth
                  </Button>
                  {renderTestResult('auth')}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Test Results Summary</h3>

              {Object.keys(debugResults).length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No tests have been run yet. Go to the "API Tests" tab to run diagnostic tests.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(debugResults).map(([testName, result]: [string, any]) => (
                    <Card key={testName}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between text-sm">
                          <span className="capitalize">{testName} Test</span>
                          {getTestStatus(testName)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs text-gray-600">
                          <div><strong>Status:</strong> {result.success ? '✅ Success' : '❌ Failed'}</div>
                          <div><strong>Time:</strong> {result.timestamp.toLocaleTimeString()}</div>
                          {result.success ? (
                            <div><strong>Response Size:</strong> {JSON.stringify(result.data).length} chars</div>
                          ) : (
                            <div><strong>Error:</strong> {result.error}</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="troubleshooting" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Troubleshooting Guide</h3>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>If hierarchy fails but other tests pass:</strong><br />
                  The issue is likely with the hierarchy building logic, not authentication.
                  Check if database triggers are properly applied.
                </AlertDescription>
              </Alert>

              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>If all API tests fail with 401:</strong><br />
                  Authentication token is missing or invalid. Check browser console for auth errors.
                </AlertDescription>
              </Alert>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>If entity/location tests pass but hierarchy fails:</strong><br />
                  Database triggers may not be applied. Run the SQL setup script.
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Quick Fix Steps:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Check browser Network tab for failed requests</li>
                  <li>Verify you're logged in and authenticated</li>
                  <li>Run database trigger setup if hierarchy fails</li>
                  <li>Check server logs for detailed error messages</li>
                  <li>Try refreshing the page and clearing browser cache</li>
                </ol>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
