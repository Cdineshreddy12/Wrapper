import React, { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { 
  Users, 
  Shield, 
  Copy, 
  Trash2, 
  Eye,
  Plus,
  Save,
  RotateCcw,
  Zap,
  Crown,
  User,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { usePermissions } from '@/hooks/usePermissions'
import toast from 'react-hot-toast'

interface Permission {
  id: string
  name: string
  description: string
  type: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'pay'
  level: 'basic' | 'advanced' | 'admin'
}

const DragDropPermissionManager: React.FC = () => {
  const {
    applications,
    users,
    templates,
    loading,
    getUserPermissions,
    applyTemplate,
    togglePermission,
    clearUserPermissions,
    saveChanges,
    resetChanges,
    getChangesCount,
    userHasChanges
  } = usePermissions()

  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // Transform templates for display
  const displayTemplates = templates.map(template => ({
    ...template,
    permissions: template.permissions.flatMap(templatePerm => {
      const app = applications.find(a => a.appCode === templatePerm.appCode)
      const module = app?.modules.find(m => m.moduleCode === templatePerm.moduleCode)
      
      if (!app || !module) return []
      
      return templatePerm.permissions.map(permission => ({
        id: `${app.appId}.${module.moduleId}.${permission}`,
        name: `${app.appName}: ${permission} ${module.moduleName}`,
        description: `${permission} access to ${module.moduleName} in ${app.appName}`,
        type: permission as Permission['type'],
        level: getPermissionLevel(permission)
      }))
    })
  }))

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    // Handle template to user assignment
    if (source.droppableId.startsWith('template-') && destination.droppableId.startsWith('user-')) {
      const templateId = draggableId
      const userId = destination.droppableId.replace('user-', '')
      
      assignTemplateToUser(userId, templateId)
      return
    }

    // Handle permission to user assignment
    if (source.droppableId === 'available-permissions' && destination.droppableId.startsWith('user-')) {
      const permissionId = draggableId
      const userId = destination.droppableId.replace('user-', '')
      
      addPermissionToUser(userId, permissionId)
      return
    }

    // Handle removing permission from user
    if (source.droppableId.startsWith('user-') && destination.droppableId === 'remove-zone') {
      const userId = source.droppableId.replace('user-', '')
      const permissionId = draggableId
      
      removePermissionFromUser(userId, permissionId)
      return
    }
  }

  const assignTemplateToUser = async (userId: string, templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    try {
      await applyTemplate(userId, templateId, true)
      toast.success(`Applied ${template.name} template to ${users.find(u => u.userId === userId)?.name}`)
    } catch (error) {
      toast.error('Failed to apply template')
    }
  }

  const addPermissionToUser = (userId: string, permissionId: string) => {
    // Parse permission ID: appId.moduleId.permission
    const [appId, moduleId, permission] = permissionId.split('.')
    if (!appId || !moduleId || !permission) return

    togglePermission(userId, appId, moduleId, permission)
    toast.success(`Added permission to ${users.find(u => u.userId === userId)?.name}`)
  }

  const removePermissionFromUser = (userId: string, permissionId: string) => {
    // Parse permission ID: appId.moduleId.permission
    const [appId, moduleId, permission] = permissionId.split('.')
    if (!appId || !moduleId || !permission) return

    togglePermission(userId, appId, moduleId, permission)
    toast.success(`Removed permission from ${users.find(u => u.userId === userId)?.name}`)
  }

  const handleSaveChanges = async () => {
    try {
      setSaving(true)
      await saveChanges()
    } catch (error) {
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const getPermissionIcon = (type: Permission['type']) => {
    const iconMap = {
      view: <Eye className="h-3 w-3" />,
      create: <Plus className="h-3 w-3" />,
      edit: <User className="h-3 w-3" />,
      delete: <Trash2 className="h-3 w-3" />,
      approve: <Shield className="h-3 w-3" />,
      export: <Copy className="h-3 w-3" />,
      pay: <Zap className="h-3 w-3" />
    }
    return iconMap[type]
  }

  const getPermissionLevel = (permission: string): Permission['level'] => {
    if (['delete', 'approve', 'pay', 'process'].includes(permission)) return 'admin'
    if (['salary', 'calculate', 'reject'].includes(permission)) return 'advanced'
    return 'basic'
  }

  const getPermissionLevelColor = (level: Permission['level']) => {
    const colorMap = {
      basic: 'bg-green-100 text-green-700',
      advanced: 'bg-yellow-100 text-yellow-700',
      admin: 'bg-red-100 text-red-700'
    }
    return colorMap[level]
  }

  // Convert user permissions to display format
  const getUserDisplayPermissions = (userId: string) => {
    const userPerms = getUserPermissions(userId)
    return userPerms.flatMap(userPerm => 
      userPerm.permissions.map(permission => ({
        id: `${userPerm.appId}.${userPerm.moduleId}.${permission}`,
        name: `${userPerm.appName}: ${permission} ${userPerm.moduleName}`,
        description: `${permission} access to ${userPerm.moduleName} in ${userPerm.appName}`,
        type: permission as Permission['type'],
        level: getPermissionLevel(permission)
      }))
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading permissions...</span>
        </div>
      </div>
    )
  }

  const changesCount = getChangesCount()

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Drag & Drop Permission Manager</h2>
            <p className="text-gray-600">Easily assign permission templates and individual permissions to users</p>
          </div>
          <div className="flex gap-2">
            {changesCount > 0 && (
              <Button variant="outline" onClick={resetChanges} disabled={saving}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Changes
              </Button>
            )}
            <Button onClick={handleSaveChanges} disabled={saving || changesCount === 0}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes ({changesCount})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>How to use:</strong> Drag permission templates onto users for quick setup, or drag individual permissions 
            from templates to users for custom access. Drop permissions on the remove zone to revoke access.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Templates Panel */}
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Permission Templates
              </CardTitle>
              <CardDescription>
                Pre-configured permission sets for common roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayTemplates.map(template => (
                  <Droppable key={template.id} droppableId={`template-${template.id}`}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`border rounded-lg p-4 transition-colors ${
                          snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                        }`}
                      >
                        <Draggable draggableId={template.id} index={0}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <Badge className={template.color}>
                                  {template.name}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {template.permissions.length} permissions
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                              
                              {/* Template Permissions Preview */}
                              <Droppable droppableId={`template-permissions-${template.id}`}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className="space-y-1"
                                  >
                                    {template.permissions.slice(0, 3).map((permission, index) => (
                                      <Draggable 
                                        key={permission.id} 
                                        draggableId={permission.id} 
                                        index={index}
                                      >
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={`flex items-center gap-2 p-2 bg-white rounded border text-xs ${
                                              snapshot.isDragging ? 'shadow-lg' : ''
                                            }`}
                                          >
                                            {getPermissionIcon(permission.type)}
                                            <span className="flex-1 truncate">{permission.name}</span>
                                            <Badge className={`text-xs ${getPermissionLevelColor(permission.level)}`}>
                                              {permission.level}
                                            </Badge>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {template.permissions.length > 3 && (
                                      <div className="text-xs text-gray-500 text-center py-1">
                                        +{template.permissions.length - 3} more permissions
                                      </div>
                                    )}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </div>
                          )}
                        </Draggable>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Users Panel */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Permissions
              </CardTitle>
              <CardDescription>
                Current permission assignments for each user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {users.map(user => {
                  const userPermissions = getUserDisplayPermissions(user.userId)
                  
                  return (
                    <Droppable key={user.userId} droppableId={`user-${user.userId}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`border rounded-lg p-4 min-h-[200px] transition-colors ${
                            snapshot.isDraggingOver ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
                          } ${userHasChanges(user.userId) ? 'ring-2 ring-blue-200' : ''}`}
                        >
                          {/* User Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">
                                  {user.name.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-sm">{user.name}</div>
                                <div className="text-xs text-gray-500">{user.email}</div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {userHasChanges(user.userId) && (
                                <Badge variant="outline" className="text-xs">
                                  Modified
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => clearUserPermissions(user.userId)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* User Permissions */}
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {userPermissions.map((permission, index) => (
                              <Draggable 
                                key={`${user.userId}-${permission.id}`} 
                                draggableId={`${user.userId}-${permission.id}`} 
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`flex items-center gap-2 p-2 bg-white rounded border text-xs ${
                                      snapshot.isDragging ? 'shadow-lg' : ''
                                    }`}
                                  >
                                    {getPermissionIcon(permission.type)}
                                    <span className="flex-1 truncate">{permission.name}</span>
                                    <Badge className={`text-xs ${getPermissionLevelColor(permission.level)}`}>
                                      {permission.level}
                                    </Badge>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            
                            {userPermissions.length === 0 && (
                              <div className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-200 rounded">
                                Drop permissions or templates here
                              </div>
                            )}
                          </div>
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Remove Zone */}
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <Droppable droppableId="remove-zone">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    snapshot.isDraggingOver 
                      ? 'border-red-400 bg-red-50 text-red-700' 
                      : 'border-red-200 text-red-500'
                  }`}
                >
                  <Trash2 className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Remove Permission</p>
                  <p className="text-sm opacity-75">Drag permissions here to revoke access</p>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </CardContent>
        </Card>
      </div>
    </DragDropContext>
  )
}

export default DragDropPermissionManager 