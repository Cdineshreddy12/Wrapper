import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { userSyncAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, Clock, Database } from 'lucide-react'

interface TestResult {
  endpoint: string
  status: 'pending' | 'success' | 'error'
  message: string
  data?: any
  timestamp?: Date
}

export default function TestUserSyncAPIs() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)

  const updateTestResult = (endpoint: string, status: TestResult['status'], message: string, data?: any) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.endpoint === endpoint)
      const newResult: TestResult = {
        endpoint,
        status,
        message,
        data,
        timestamp: new Date()
      }
      
      if (existing) {
        return prev.map(r => r.endpoint === endpoint ? newResult : r)
      } else {
        return [...prev, newResult]
      }
    })
  }

  const runSingleTest = async (
    endpoint: string, 
    testFn: () => Promise<any>, 
    description: string
  ) => {
    updateTestResult(endpoint, 'pending', 'Testing...')
    
    try {
      const result = await testFn()
      updateTestResult(
        endpoint, 
        'success', 
        `✅ ${description} - Success`, 
        result
      )
      return { success: true, data: result }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error'
      updateTestResult(
        endpoint, 
        'error', 
        `❌ ${description} - ${errorMessage}`, 
        error.response?.data
      )
      return { success: false, error: errorMessage }
    }
  }

  const runAllTests = async () => {
    setIsRunningTests(true)
    setTestResults([])
    
    const tests = [
      {
        endpoint: 'GET /user-sync/classification',
        description: 'Get user classification',
        testFn: () => userSyncAPI.getUserClassification()
      },
      {
        endpoint: 'GET /user-sync/classification/crm',
        description: 'Get CRM users',
        testFn: () => userSyncAPI.getUsersForApplication('crm')
      },
      {
        endpoint: 'GET /user-sync/status',
        description: 'Get sync status',
        testFn: () => userSyncAPI.getSyncStatus()
      },
      {
        endpoint: 'POST /user-sync/sync/all (dry run)',
        description: 'Dry run sync all users',
        testFn: () => userSyncAPI.syncAllUsers({ dryRun: true })
      },
      {
        endpoint: 'POST /user-sync/test-connectivity',
        description: 'Test application connectivity',
        testFn: () => userSyncAPI.testConnectivity()
      }
    ]

    let successCount = 0
    let errorCount = 0

    for (const test of tests) {
      const result = await runSingleTest(test.endpoint, test.testFn, test.description)
      if (result.success) {
        successCount++
      } else {
        errorCount++
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsRunningTests(false)
    
    if (errorCount === 0) {
      toast.success(`🎉 All ${successCount} API tests passed!`)
    } else {
      toast.error(`⚠️ ${errorCount} tests failed, ${successCount} passed`)
    }
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error': return <XCircle className="h-5 w-5 text-red-600" />
      case 'pending': return <Clock className="h-5 w-5 text-yellow-600 animate-spin" />
      default: return null
    }
  }

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">User Sync API Testing</h1>
          <p className="text-gray-600 mb-6">
            Test all user classification and sync API endpoints to verify they're working correctly
          </p>
          
          <Button 
            onClick={runAllTests} 
            disabled={isRunningTests}
            size="lg"
            className="mb-6"
          >
            <Database className="h-5 w-5 mr-2" />
            {isRunningTests ? 'Running Tests...' : 'Run All API Tests'}
          </Button>
        </div>

        {/* Summary */}
        {testResults.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Test Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Badge className="bg-green-100 text-green-800">
                  ✅ Passed: {testResults.filter(r => r.status === 'success').length}
                </Badge>
                <Badge className="bg-red-100 text-red-800">
                  ❌ Failed: {testResults.filter(r => r.status === 'error').length}
                </Badge>
                <Badge className="bg-yellow-100 text-yellow-800">
                  ⏳ Running: {testResults.filter(r => r.status === 'pending').length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Results */}
        <div className="space-y-4">
          {testResults.map((result, index) => (
            <Card key={result.endpoint}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <CardTitle className="text-lg">{result.endpoint}</CardTitle>
                      <CardDescription>
                        {result.timestamp && `Tested at ${result.timestamp.toLocaleTimeString()}`}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getStatusColor(result.status)}>
                    {result.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 mb-3">{result.message}</p>
                
                {result.data && result.status === 'success' && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                      View Response Data
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-48">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
                
                {result.data && result.status === 'error' && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-red-600 hover:text-red-800">
                      View Error Details
                    </summary>
                    <pre className="mt-2 p-3 bg-red-50 rounded text-xs overflow-auto max-h-48">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* API Documentation */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Available API Endpoints</CardTitle>
            <CardDescription>
              All user sync and classification endpoints that have been implemented
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Classification Endpoints:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• GET /api/user-sync/classification</li>
                    <li>• GET /api/user-sync/classification/:appCode</li>
                    <li>• GET /api/user-sync/user/:userId/access</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Sync Endpoints:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• POST /api/user-sync/sync/all</li>
                    <li>• POST /api/user-sync/sync/application/:appCode</li>
                    <li>• POST /api/user-sync/sync/user/:userId</li>
                    <li>• POST /api/user-sync/refresh/:userId</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Status & Testing:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• GET /api/user-sync/status</li>
                    <li>• POST /api/user-sync/test-connectivity</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
