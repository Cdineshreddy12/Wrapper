import React, { useState } from 'react'
import { User, PermissionItem } from '../../data/mockPermissions'
import { useEnhancedDragDrop } from './EnhancedDragDropProvider'

interface UserCardProps {
  user: User
  permissions: PermissionItem[]
  onPermissionDrop?: (user: User, permission: PermissionItem) => void
  onPermissionRemove?: (user: User, permissionId: string) => void
  isSelected?: boolean
  onSelect?: (user: User) => void
  className?: string
}

export function UserCard({ 
  user, 
  permissions,
  onPermissionDrop,
  onPermissionRemove,
  isSelected = false,
  onSelect,
  className = ''
}: UserCardProps) {
  const { draggedItem, isDragging } = useEnhancedDragDrop()
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedItem?.type === 'permission') {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (draggedItem?.type === 'permission' && onPermissionDrop) {
      onPermissionDrop(user, draggedItem.data)
    }
  }

  const canReceivePermission = draggedItem?.type === 'permission' && 
    !user.assignedPermissions.includes(draggedItem.data.id) &&
    !user.restrictedPermissions.includes(draggedItem.data.id)

  const getStatusColor = () => {
    if (!user.isActive) return 'bg-gray-100 text-gray-600'
    return 'bg-green-100 text-green-700'
  }

  const getStatusText = () => {
    if (!user.isActive) return 'Inactive'
    return 'Active'
  }

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => onSelect?.(user)}
      className={`
        relative bg-white rounded-xl border-2 p-6 transition-all duration-200
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200'}
        ${isDragOver && canReceivePermission ? 'border-green-400 bg-green-50 shadow-lg scale-105' : ''}
        ${isDragOver && !canReceivePermission ? 'border-red-400 bg-red-50' : ''}
        ${!user.isActive ? 'opacity-70' : ''}
        hover:shadow-md cursor-pointer
        ${className}
      `}
    >
      {/* Drop zone indicator */}
      {isDragOver && (
        <div className="absolute inset-0 rounded-xl border-2 border-dashed pointer-events-none">
          {canReceivePermission ? (
            <div className="flex items-center justify-center h-full">
              <div className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-medium">
                Drop to assign permission
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-medium">
                Permission already assigned
              </div>
            </div>
          )}
        </div>
      )}

      {/* User header */}
      <div className="flex items-start gap-4">
        <div className="relative">
          <img 
            src={user.avatar} 
            alt={user.name}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
            user.isActive ? 'bg-green-500' : 'bg-gray-400'
          }`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{user.name}</h3>
          <p className="text-sm text-gray-600 truncate">{user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">{user.role}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">{user.department}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          <span className="text-xs text-gray-500">
            {formatLastActive(user.lastActive)}
          </span>
        </div>
      </div>

      {/* Permissions summary */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Permissions</span>
          <span className="text-xs text-gray-500">
            {user.assignedPermissions.length} assigned
          </span>
        </div>

        {/* Permission badges */}
        <div className="mt-2 space-y-2">
          {user.assignedPermissions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {user.assignedPermissions.slice(0, 3).map(permId => {
                const perm = permissions.find(p => p.id === permId)
                if (!perm) return null
                
                return (
                  <div 
                    key={permId}
                    className="group relative flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-lg text-xs"
                  >
                    <span>{perm.icon}</span>
                    <span className="truncate max-w-20">{perm.action}</span>
                    {onPermissionRemove && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onPermissionRemove(user, permId)
                        }}
                        className="opacity-0 group-hover:opacity-100 ml-1 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )
              })}
              {user.assignedPermissions.length > 3 && (
                <div className="bg-gray-100 text-gray-500 px-2 py-1 rounded-lg text-xs">
                  +{user.assignedPermissions.length - 3} more
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-3 text-gray-400 text-xs">
              No permissions assigned
            </div>
          )}

          {/* Inherited permissions indicator */}
          {user.inheritedPermissions.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <span>⬇️</span>
              <span>{user.inheritedPermissions.length} inherited from role</span>
            </div>
          )}

          {/* Restricted permissions indicator */}
          {user.restrictedPermissions.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <span>🚫</span>
              <span>{user.restrictedPermissions.length} restricted</span>
            </div>
          )}
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
        </div>
      )}
    </div>
  )
} 