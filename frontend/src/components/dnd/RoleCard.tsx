import React, { useState } from 'react'
import { CustomRole } from '../../data/kindeIntegratedData'
import { useEnhancedDragDrop } from './EnhancedDragDropProvider'

interface RoleCardProps {
  role: CustomRole
  isSelected?: boolean
  isTemplate?: boolean
  onSelect?: (role: CustomRole) => void
  onClone?: (role: CustomRole) => void
  onEdit?: (role: CustomRole) => void
  onAssignToUser?: (role: CustomRole, userId: string) => void
  className?: string
}

export function RoleCard({ 
  role, 
  isSelected = false,
  isTemplate = false,
  onSelect,
  onClone,
  onEdit,
  onAssignToUser,
  className = ''
}: RoleCardProps) {
  const { startDrag, endDrag, isDragging, isMultiSelectMode, draggedItem } = useEnhancedDragDrop()
  const [isDragOver, setIsDragOver] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    startDrag({
      type: 'role',
      data: role
    })
    
    // Custom drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
    dragImage.style.transform = 'rotate(3deg)'
    dragImage.style.opacity = '0.9'
    dragImage.style.pointerEvents = 'none'
    dragImage.style.background = `linear-gradient(135deg, ${role.color}20, ${role.color}40)`
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 80, 40)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  const handleDragEnd = () => {
    endDrag()
    setIsDragOver(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedItem?.type === 'permission' || draggedItem?.type === 'restriction') {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (draggedItem?.type === 'permission') {
      // Add permission to role
      console.log('Add permission to role:', draggedItem.data, role)
    } else if (draggedItem?.type === 'restriction') {
      // Add restriction to role
      console.log('Add restriction to role:', draggedItem.data, role)
    }
  }

  const getInheritanceChain = () => {
    if (!role.parentRoles?.length) return []
    return role.parentRoles
  }

  const getAutoAssignmentText = () => {
    const rules = role.autoAssignmentRules
    if (!rules.department && !rules.jobTitle) return 'Manual assignment'
    
    const parts = []
    if (rules.department) parts.push(`Dept: ${rules.department.join(', ')}`)
    if (rules.jobTitle) parts.push(`Title: ${rules.jobTitle.join(', ')}`)
    return parts.join(' • ')
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => onSelect?.(role)}
      className={`
        group relative bg-white rounded-xl border-2 p-6 cursor-grab 
        transition-all duration-200 hover:shadow-xl min-h-[180px]
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200'}
        ${isDragOver ? 'border-green-400 bg-green-50 scale-105' : ''}
        ${isDragging ? 'opacity-50' : ''}
        ${isTemplate ? 'border-dashed border-purple-300 bg-purple-50' : ''}
        ${className}
      `}
      style={{
        background: isDragOver ? 'linear-gradient(135deg, #f0fdf4, #ecfdf5)' : 
                   isTemplate ? 'linear-gradient(135deg, #faf5ff, #f3e8ff)' : 
                   'linear-gradient(135deg, #ffffff, #fafafa)'
      }}
    >
      {/* Drop zone indicator */}
      {isDragOver && (
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-green-400 bg-green-50/80 pointer-events-none z-10">
          <div className="flex items-center justify-center h-full">
            <div className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
              {draggedItem?.type === 'permission' ? 'Add Permission to Role' : 'Add Restriction to Role'}
            </div>
          </div>
        </div>
      )}

      {/* Selection checkbox for multi-select mode */}
      {isMultiSelectMode && (
        <div className="absolute top-3 left-3 z-20">
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={() => onSelect?.(role)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
        </div>
      )}

      {/* Template badge */}
      {isTemplate && (
        <div className="absolute top-3 right-3">
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
            Template
          </span>
        </div>
      )}

      {/* Role header */}
      <div className="flex items-start gap-4">
        <div 
          className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl border-2 shadow-sm"
          style={{ 
            backgroundColor: role.color + '20', 
            borderColor: role.color + '40',
            color: role.color
          }}
        >
          {role.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">
            {role.name}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {role.description}
          </p>
          
          {/* Role type and category */}
          <div className="flex items-center gap-2">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {role.type}
            </span>
            {isTemplate && (
              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                {role.templateCategory}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Role statistics */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">{role.permissions.length}</div>
          <div className="text-xs text-gray-500">Permissions</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">{role.userCount}</div>
          <div className="text-xs text-gray-500">Users</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">
            {Object.keys(role.restrictions).length}
          </div>
          <div className="text-xs text-gray-500">Restrictions</div>
        </div>
      </div>

      {/* Inheritance chain */}
      {getInheritanceChain().length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-600">⬇️</span>
            <span className="text-gray-600">Inherits from:</span>
            <div className="flex flex-wrap gap-1">
              {getInheritanceChain().slice(0, 2).map(parentId => (
                <span key={parentId} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                  {parentId}
                </span>
              ))}
              {getInheritanceChain().length > 2 && (
                <span className="text-xs text-gray-500">
                  +{getInheritanceChain().length - 2}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auto-assignment rules */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500 mb-1">Auto-assignment:</div>
        <div className="text-xs text-gray-700">
          {getAutoAssignmentText()}
        </div>
      </div>

      {/* Approval workflow */}
      {role.approvalWorkflow.required && (
        <div className="mt-2">
          <div className="flex items-center gap-1 text-xs text-orange-600">
            <span>✋</span>
            <span>Requires approval from {role.approvalWorkflow.approvers.join(', ')}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-2">
          {onClone && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClone(role)
              }}
              className="bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-gray-200 text-xs"
              title="Clone role"
            >
              📋
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(role)
              }}
              className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200 text-xs"
              title="Edit role"
            >
              ✏️
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowDetails(!showDetails)
            }}
            className="bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-gray-200 text-xs"
            title="View details"
          >
            👁️
          </button>
        </div>
      </div>

      {/* Drag handle */}
      <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-gray-400 text-xs">⋮⋮</div>
      </div>

      {/* Hover glow effect */}
      <div 
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"
        style={{ 
          background: `linear-gradient(135deg, ${role.color}20, ${role.color}40)`
        }}
      />

      {/* Details overlay */}
      {showDetails && (
        <div className="absolute inset-0 bg-white rounded-xl p-4 z-30 shadow-xl border-2 border-gray-200">
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-semibold text-gray-900">Role Details</h4>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowDetails(false)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="font-medium">Created:</span> {new Date(role.createdAt).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Type:</span> {role.type}
            </div>
            {role.inheritanceRules.inheritAll && (
              <div>
                <span className="font-medium">Inheritance:</span> Full inheritance enabled
              </div>
            )}
            <div>
              <span className="font-medium">Permissions:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {role.permissions.slice(0, 3).map(perm => (
                  <span key={perm} className="bg-gray-100 px-1 py-0.5 rounded">
                    {perm.split('.').pop()}
                  </span>
                ))}
                {role.permissions.length > 3 && (
                  <span className="text-gray-500">+{role.permissions.length - 3}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 