import React, { useState } from 'react'
import { PermissionItem } from '../../data/mockPermissions'
import { useEnhancedDragDrop } from './EnhancedDragDropProvider'

interface PermissionCardProps {
  permission: PermissionItem
  isSelected?: boolean
  isAssigned?: boolean
  isRestricted?: boolean
  isInherited?: boolean
  onSelect?: (permission: PermissionItem) => void
  className?: string
}

export function PermissionCard({ 
  permission, 
  isSelected = false,
  isAssigned = false,
  isRestricted = false,
  isInherited = false,
  onSelect,
  className = ''
}: PermissionCardProps) {
  const { startDrag, endDrag, isDragging, isMultiSelectMode } = useEnhancedDragDrop()
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    startDrag({
      type: 'permission',
      data: permission
    })
    
    // Set drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
    dragImage.style.transform = 'rotate(5deg)'
    dragImage.style.opacity = '0.8'
    dragImage.style.pointerEvents = 'none'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 50, 20)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  const handleDragEnd = () => {
    endDrag()
    setIsDragOver(false)
  }

  const getLevelBadgeColor = () => {
    switch (permission.level) {
      case 'basic': return 'bg-green-100 text-green-800 border-green-200'
      case 'advanced': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'admin': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = () => {
    if (isRestricted) return { icon: '🚫', color: 'text-red-500', tooltip: 'Restricted' }
    if (isAssigned) return { icon: '✅', color: 'text-green-500', tooltip: 'Assigned' }
    if (isInherited) return { icon: '⬇️', color: 'text-blue-500', tooltip: 'Inherited from role' }
    return null
  }

  const statusIcon = getStatusIcon()

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onSelect?.(permission)}
      className={`
        group relative bg-white rounded-xl border-2 p-4 cursor-grab 
        transition-all duration-200 hover:shadow-lg
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200'}
        ${isDragging ? 'opacity-50' : ''}
        ${isRestricted ? 'opacity-60 grayscale' : ''}
        ${className}
      `}
      style={{
        transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
        borderColor: isSelected ? permission.color : undefined
      }}
    >
      {/* Selection checkbox for multi-select mode */}
      {isMultiSelectMode && (
        <div className="absolute top-2 left-2">
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={() => onSelect?.(permission)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
        </div>
      )}

      {/* Status indicator */}
      {statusIcon && (
        <div 
          className={`absolute top-2 right-2 text-lg ${statusIcon.color}`}
          title={statusIcon.tooltip}
        >
          {statusIcon.icon}
        </div>
      )}

      {/* Permission icon and info */}
      <div className="flex items-start gap-3">
        <div 
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg"
          style={{ backgroundColor: permission.color + '20', border: `2px solid ${permission.color}30` }}
        >
          {permission.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
            {permission.name}
          </h3>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            {permission.description}
          </p>
          
          {/* Category and level */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500 truncate">
              {permission.category}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${getLevelBadgeColor()}`}>
              {permission.level}
            </span>
          </div>
        </div>
      </div>

      {/* Dependencies indicator */}
      {permission.dependencies && permission.dependencies.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>🔗</span>
            <span>Requires: {permission.dependencies.length} permission{permission.dependencies.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Drag handle */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-gray-400 text-xs">⋮⋮</div>
      </div>

      {/* Hover glow effect */}
      <div 
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"
        style={{ backgroundColor: permission.color }}
      />
    </div>
  )
} 