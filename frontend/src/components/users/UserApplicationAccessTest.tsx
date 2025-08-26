import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Database, CheckCircle, Activity } from 'lucide-react'

export function UserApplicationAccessTest() {
  console.log('🔍 UserApplicationAccessTest component rendering')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Application Access - TEST</h1>
          <p className="text-gray-600 mt-1">
            This is a test component to verify rendering works
          </p>
        </div>
        <Button variant="outline">
          Test Button
        </Button>
      </div>

      {/* Test Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">25</p>
                <p className="text-sm text-gray-600">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">5</p>
                <p className="text-sm text-gray-600">Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-gray-600">Configured Apps</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">75</p>
                <p className="text-sm text-gray-600">Total Access Grants</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Content */}
      <Card>
        <CardHeader>
          <CardTitle>Test Content</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            If you can see this content, the component is rendering correctly!
          </p>
          <div className="mt-4 p-4 bg-green-100 rounded-lg">
            <p className="text-green-800 font-medium">✅ Component is working!</p>
            <p className="text-green-700 text-sm mt-1">
              The issue was likely with the API calls or data loading.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
