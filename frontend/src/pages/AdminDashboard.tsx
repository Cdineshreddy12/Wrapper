import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { InvitationManager } from '../components/admin/InvitationManager';
import { AdminPromotionManager } from '../components/admin/AdminPromotionManager';
import { Users, Mail, Crown, Settings } from 'lucide-react';

export default function AdminDashboard() {
  const [currentOrg, setCurrentOrg] = useState<string>('org_0e3615925db1d'); // Default org for demo

  // Debug logging
  useEffect(() => {
    console.log('🔄 AdminDashboard mounted with orgCode:', currentOrg);
  }, [currentOrg]);

  console.log('🎨 AdminDashboard rendering with orgCode:', currentOrg);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your organization, users, and invitations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Organization Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Current Organization:</span>
            <span className="text-sm text-muted-foreground">{currentOrg}</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentOrg('org_0e3615925db1d')}
            >
              Switch to ACME Details
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentOrg('org_c4b50210646662')}
            >
              Switch to Zopkit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="invitations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Invitations
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Admin Management
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Overview
          </TabsTrigger>
        </TabsList>

        {/* TEMPORARY: Show all content without tabs for debugging */}
        <div className="space-y-6">
          <div className="border-2 border-purple-300 p-4 bg-purple-50">
            <p className="text-purple-800 font-bold">DEBUG: Showing all content without tabs</p>
            <p>This should help identify if the issue is with tabs or the component</p>
          </div>
          
          {/* Invitations Section */}
          <div className="border-2 border-blue-300 p-4 bg-blue-50">
            <h3 className="text-lg font-bold text-blue-800 mb-2">Invitations Section</h3>
            <InvitationManager orgCode={currentOrg} />
          </div>
          
          {/* Users Section */}
          <div className="border-2 border-green-300 p-4 bg-green-50">
            <h3 className="text-lg font-bold text-green-800 mb-2">Users Section</h3>
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  User management features will be implemented here.
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Admin Management Section */}
          <div className="border-2 border-orange-300 p-4 bg-orange-50">
            <h3 className="text-lg font-bold text-orange-800 mb-2">Admin Management Section</h3>
            <AdminPromotionManager />
          </div>
        </div>

        {/* Original TabsContent (commented out for debugging) */}
        {/*
        <TabsContent value="invitations" className="space-y-6">
          <div className="border-2 border-red-300 p-4 bg-red-50">
            <p className="text-red-800 font-bold">DEBUG: Invitations Tab Content is Rendering</p>
            <p>Current Org: {currentOrg}</p>
            <p>Component should render below this debug box</p>
          </div>
          
          <div className="border-2 border-blue-300 p-4 bg-blue-50">
            <p className="text-blue-800 font-bold">TEST: About to render InvitationManager</p>
            <p>orgCode prop: {currentOrg}</p>
            <p>Component type: InvitationManager</p>
          </div>
          
          <InvitationManager orgCode={currentOrg} />
          
          <div className="border-2 border-green-300 p-4 bg-green-50">
            <p className="text-green-800 font-bold">TEST: InvitationManager should be above this</p>
            <p>If you see this, the component rendered</p>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                User management features will be implemented here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-6">
          <AdminPromotionManager />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  +2 from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  2 expiring soon
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1</div>
                <p className="text-xs text-muted-foreground">
                  Trial ends in 7 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold">System Health</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Good</div>
                <p className="text-xs text-muted-foreground">
                  All systems operational
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        */}
      </Tabs>
    </div>
  );
}
