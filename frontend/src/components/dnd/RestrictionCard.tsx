import React, { useState } from 'react'
import { GranularRestriction } from '../../data/kindeIntegratedData'
import { useEnhancedDragDrop } from './EnhancedDragDropProvider'

interface RestrictionCardProps {
  restriction: GranularRestriction
  isSelected?: boolean
  isActive?: boolean
  onSelect?: (restriction: GranularRestriction) => void
  onConfigure?: (restriction: GranularRestriction, config: any) => void
  className?: string
}

export function RestrictionCard({ 
  restriction, 
  isSelected = false,
  isActive = false,
  onSelect,
  onConfigure,
  className = ''
}: RestrictionCardProps) {
  const { startDrag, endDrag, isDragging, isMultiSelectMode } = useEnhancedDragDrop()
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [configValue, setConfigValue] = useState(restriction.defaultValue)

  const handleDragStart = (e: React.DragEvent) => {
    startDrag({
      type: 'restriction',
      data: restriction
    })
    
    // Custom drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
    dragImage.style.transform = 'rotate(-2deg)'
    dragImage.style.opacity = '0.9'
    dragImage.style.pointerEvents = 'none'
    dragImage.style.background = restriction.color + '20'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 60, 25)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  const handleDragEnd = () => {
    endDrag()
  }

  const getCategoryBadgeColor = () => {
    switch (restriction.category) {
      case 'financial': return 'bg-green-100 text-green-800 border-green-200'
      case 'temporal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'geographical': return 'bg-red-100 text-red-800 border-red-200'
      case 'data_privacy': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'workflow': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'security': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const renderConfigInput = () => {
    if (!restriction.configurable) return null

    switch (restriction.type) {
      case 'value_limit':
        return (
          <input
            type="number"
            value={configValue}
            onChange={(e) => setConfigValue(Number(e.target.value))}
            min={restriction.validation.min}
            max={restriction.validation.max}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            placeholder="Enter limit..."
          />
        )
      case 'time_based':
        return (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              value={configValue?.start || '09:00'}
              onChange={(e) => setConfigValue(prev => ({ ...prev, start: e.target.value }))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <input
              type="time"
              value={configValue?.end || '17:00'}
              onChange={(e) => setConfigValue(prev => ({ ...prev, end: e.target.value }))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        )
      case 'action_frequency':
        return (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={configValue?.daily || 100}
              onChange={(e) => setConfigValue(prev => ({ ...prev, daily: Number(e.target.value) }))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Daily"
            />
            <input
              type="number"
              value={configValue?.hourly || 10}
              onChange={(e) => setConfigValue(prev => ({ ...prev, hourly: Number(e.target.value) }))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Hourly"
            />
          </div>
        )
      default:
        return (
          <input
            type="text"
            value={JSON.stringify(configValue)}
            onChange={(e) => {
              try {
                setConfigValue(JSON.parse(e.target.value))
              } catch {}
            }}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            placeholder="Enter configuration..."
          />
        )
    }
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onSelect?.(restriction)}
      className={`
        group relative bg-white rounded-xl border-2 p-5 cursor-grab 
        transition-all duration-200 hover:shadow-lg min-h-[140px]
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200'}
        ${isActive ? 'bg-green-50 border-green-300' : ''}
        ${isDragging ? 'opacity-50' : ''}
        ${className}
      `}
    >
      {/* Selection checkbox for multi-select mode */}
      {isMultiSelectMode && (
        <div className="absolute top-3 left-3">
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={() => onSelect?.(restriction)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
        </div>
      )}

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-3 right-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        </div>
      )}

      {/* Restriction icon and info */}
      <div className="flex items-start gap-4">
        <div 
          className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl border-2"
          style={{ 
            backgroundColor: restriction.color + '20', 
            borderColor: restriction.color + '40',
            color: restriction.color
          }}
        >
          {restriction.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
            {restriction.name}
          </h3>
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            {restriction.description}
          </p>
          
          {/* Category and type */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs px-2 py-1 rounded-full border ${getCategoryBadgeColor()}`}>
              {restriction.category}
            </span>
            <span className="text-xs text-gray-500 capitalize">
              {restriction.type.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Configuration section */}
      {restriction.configurable && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {!isConfiguring ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Current: {JSON.stringify(configValue).slice(0, 30)}...
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsConfiguring(true)
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Configure
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-700">Configure Restriction:</div>
              {renderConfigInput()}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onConfigure?.(restriction, configValue)
                    setIsConfiguring(false)
                  }}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                >
                  Apply
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfigValue(restriction.defaultValue)
                    setIsConfiguring(false)
                  }}
                  className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Affected actions */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500 mb-1">Affects:</div>
        <div className="flex flex-wrap gap-1">
          {restriction.affectedActions.slice(0, 2).map(action => (
            <span key={action} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {action.split('.').pop()}
            </span>
          ))}
          {restriction.affectedActions.length > 2 && (
            <span className="text-xs text-gray-500">
              +{restriction.affectedActions.length - 2} more
            </span>
          )}
        </div>
      </div>

      {/* Drag handle */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-gray-400 text-xs">⋮⋮</div>
      </div>

      {/* Hover glow effect */}
      <div 
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
        style={{ backgroundColor: restriction.color }}
      />
    </div>
  )
} 