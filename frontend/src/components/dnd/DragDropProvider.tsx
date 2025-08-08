import React, { createContext, useContext, useState, ReactNode } from 'react'
import { PermissionItem, User } from '../../data/mockPermissions'

interface DragItem {
  type: 'permission' | 'user' | 'role'
  data: any
}

interface DragDropContextType {
  draggedItem: DragItem | null
  setDraggedItem: (item: DragItem | null) => void
  isDragging: boolean
  draggedPermissions: PermissionItem[]
  setDraggedPermissions: (permissions: PermissionItem[]) => void
  selectedUsers: User[]
  setSelectedUsers: (users: User[]) => void
  isMultiSelectMode: boolean
  setMultiSelectMode: (enabled: boolean) => void
}

const DragDropContext = createContext<DragDropContextType | undefined>(undefined)

export function DragDropProvider({ children }: { children: ReactNode }) {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null)
  const [draggedPermissions, setDraggedPermissions] = useState<PermissionItem[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [isMultiSelectMode, setMultiSelectMode] = useState(false)

  const isDragging = draggedItem !== null

  return (
    <DragDropContext.Provider value={{
      draggedItem,
      setDraggedItem,
      isDragging,
      draggedPermissions,
      setDraggedPermissions,
      selectedUsers,
      setSelectedUsers,
      isMultiSelectMode,
      setMultiSelectMode
    }}>
      {children}
    </DragDropContext.Provider>
  )
}

export function useDragDrop() {
  const context = useContext(DragDropContext)
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider')
  }
  return context
} 