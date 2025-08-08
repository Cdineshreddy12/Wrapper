import React, { useState } from 'react'
import {
  StatCard,
  DataTable,
  Modal,
  PageHeader,
  StatusBadge,
  UserStatusBadge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/components/ui'
import {
  Users,
  Activity,
  Crown,
  Clock,
  Plus,
  Edit,
  Trash2,
  Eye,
  Mail
} from 'lucide-react'

// Example data
const sampleUsers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    isActive: true,
    onboardingCompleted: true,
    isTenantAdmin: false,
    department: 'Engineering',
    lastLogin: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    isActive: true,
    onboardingCompleted: false,
    isTenantAdmin: true,
    department: 'Marketing',
    lastLogin: new Date('2024-01-14')
  },
  {
    id: '3',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    isActive: false,
    onboardingCompleted: true,
    isTenantAdmin: false,
    department: 'Sales',
    lastLogin: new Date('2024-01-10')
  }
];

// Example 1: Dashboard with StatCards
export function DashboardExample() {
  const stats = [
    {
      title: "Total Users",
      value: 150,
      icon: Users,
      iconColor: "text-blue-600",
      trend: { value: "+12%", isPositive: true, label: "vs last month" }
    },
    {
      title: "Active Users",
      value: 142,
      icon: Activity,
      iconColor: "text-green-600",
      trend: { value: "+5%", isPositive: true, label: "vs last week" }
    },
    {
      title: "Admins",
      value: 8,
      icon: Crown,
      iconColor: "text-purple-600"
    },
    {
      title: "Pending Setup",
      value: 8,
      icon: Clock,
      iconColor: "text-orange-600",
      trend: { value: "-2", isPositive: false, label: "users" }
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your organization's metrics and activity"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Quick Action
          </Button>
        }
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>
    </div>
  )
}

// Example 2: Users Table with DataTable
export function UsersTableExample() {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const columns = [
    {
      key: 'user',
      label: 'User',
      searchable: true,
      render: (user: any) => (
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarFallback>
              {user.name.split(' ').map((n: string) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (user: any) => (
        <UserStatusBadge 
          isActive={user.isActive}
          onboardingCompleted={user.onboardingCompleted}
        />
      )
    },
    {
      key: 'role',
      label: 'Role',
      render: (user: any) => (
        <div className="flex items-center space-x-2">
          {user.isTenantAdmin && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              <Crown className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'department',
      label: 'Department',
      render: (user: any) => user.department || '-'
    },
    {
      key: 'lastLogin',
      label: 'Last Login',
      render: (user: any) => user.lastLogin 
        ? user.lastLogin.toLocaleDateString()
        : 'Never'
    }
  ];

  const actions = [
    {
      key: 'view',
      label: 'View Details',
      icon: Eye,
      onClick: (user: any) => {
        setCurrentUser(user)
        setShowModal(true)
      }
    },
    {
      key: 'edit',
      label: 'Edit User',
      icon: Edit,
      onClick: (user: any) => console.log('Edit user:', user)
    },
    {
      key: 'delete',
      label: 'Delete User',
      icon: Trash2,
      variant: 'destructive' as const,
      separator: true,
      onClick: (user: any) => console.log('Delete user:', user)
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage team members, roles, and access across your organization"
        icon={Users}
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        }
      />

      <DataTable
        data={sampleUsers}
        columns={columns}
        actions={actions}
        selectable
        selectedItems={selectedUsers}
        onSelectionChange={setSelectedUsers}
        getItemId={(user) => user.id}
        title="Team Members"
        description="All users in your organization"
        emptyMessage="No users found. Start by inviting your first team member."
      />

      {/* User Details Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="User Details"
        size="lg"
      >
        {currentUser && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {currentUser.name.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{currentUser.name}</h3>
                <p className="text-muted-foreground">{currentUser.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <UserStatusBadge 
                    isActive={currentUser.isActive}
                    onboardingCompleted={currentUser.onboardingCompleted}
                  />
                  {currentUser.isTenantAdmin && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      <Crown className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Department</p>
                <p className="text-sm text-muted-foreground">{currentUser.department}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Last Login</p>
                <p className="text-sm text-muted-foreground">
                  {currentUser.lastLogin.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// Example 3: Status Badge Variations
export function StatusBadgeExamples() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Status Badge Examples"
        description="Various status badge implementations"
      />
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Status Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="success" />
              <StatusBadge status="warning" />
              <StatusBadge status="error" />
              <StatusBadge status="info" />
              <StatusBadge status="pending" />
              <StatusBadge status="active" />
              <StatusBadge status="inactive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custom Status Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="success" label="Completed" icon={Clock} />
              <StatusBadge status="warning" label="In Review" />
              <StatusBadge status="error" label="Failed" />
              <StatusBadge status="info" label="Processing" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Status Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <UserStatusBadge isActive={true} onboardingCompleted={true} />
              <UserStatusBadge isActive={true} onboardingCompleted={false} />
              <UserStatusBadge isActive={false} onboardingCompleted={true} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Example 4: Complete Page Layout
export function CompletePageExample() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header Section */}
          <PageHeader
            title="Modern Dashboard"
            description="Built with reusable ShadCN components"
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Dashboard' }
            ]}
            actions={
              <div className="flex items-center space-x-2">
                <Button variant="outline">
                  Export Data
                </Button>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Item
                </Button>
              </div>
            }
          />

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue"
              value="$45,231"
              icon={Activity}
              iconColor="text-green-600"
              trend={{ value: "+20.1%", isPositive: true, label: "from last month" }}
            />
            <StatCard
              title="Active Users"
              value={2350}
              icon={Users}
              iconColor="text-blue-600"
              trend={{ value: "+12%", isPositive: true }}
            />
            <StatCard
              title="Conversions"
              value="12.5%"
              icon={TrendingUp}
              iconColor="text-purple-600"
              trend={{ value: "-2.4%", isPositive: false }}
            />
            <StatCard
              title="Support Tickets"
              value={89}
              icon={Mail}
              iconColor="text-orange-600"
            />
          </div>

          {/* Content Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <UsersTableExample />
            </div>
            <div>
              <StatusBadgeExamples />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default {
  DashboardExample,
  UsersTableExample,
  StatusBadgeExamples,
  CompletePageExample
} 