import React, { ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

export interface TableColumn<T = any> {
  key: string;
  label: string;
  width?: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
}

export interface TableAction<T = any> {
  key: string;
  label: string;
  icon: React.ElementType;
  onClick: (item: T) => void;
  disabled?: (item: T) => boolean;
  destructive?: boolean;
  separator?: boolean;
}

export interface ReusableTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];
  selectable?: boolean;
  selectedItems?: Set<string>;
  onSelectionChange?: (selectedItems: Set<string>) => void;
  getItemId: (item: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function ReusableTable<T = any>({
  data,
  columns,
  actions = [],
  selectable = false,
  selectedItems = new Set(),
  onSelectionChange,
  getItemId,
  loading = false,
  emptyMessage = 'No data available',
  className = ''
}: ReusableTableProps<T>) {
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      onSelectionChange(new Set(data.map(getItemId)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    
    const newSelection = new Set(selectedItems);
    if (checked) {
      newSelection.add(itemId);
    } else {
      newSelection.delete(itemId);
    }
    onSelectionChange(newSelection);
  };

  const isAllSelected = data.length > 0 && selectedItems.size === data.length;
  const isPartiallySelected = selectedItems.size > 0 && selectedItems.size < data.length;

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border w-full max-w-full ${className}`}>
      <div className="overflow-x-auto w-full" style={{ maxWidth: '100%' }}>
        <table style={{ minWidth: 'max-content', width: 'max-content' }}>
          {/* Header - Sticky */}
          <thead className="bg-gray-50 border-b sticky top-0 z-10">
            <tr>
              {selectable && (
                <th className="p-4 text-left w-12 min-w-[3rem]">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    className={isPartiallySelected ? 'data-[state=checked]:bg-blue-500' : ''}
                  />
                </th>
              )}
              
              {columns.map((column) => (
                <th 
                  key={column.key} 
                  className="p-4 text-left font-medium text-gray-700 whitespace-nowrap"
                  style={{ width: column.width || 'auto', minWidth: column.width || '150px' }}
                >
                  {column.label}
                </th>
              ))}
              
              {actions.length > 0 && (
                <th className="p-4 text-center font-medium text-gray-700 w-16 min-w-[4rem]">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {data.map((item) => {
              const itemId = getItemId(item);
              const isSelected = selectedItems.has(itemId);
              
              return (
                <tr 
                  key={itemId}
                  className="hover:bg-gray-50 transition-colors border-b last:border-b-0"
                >
                  {selectable && (
                    <td className="p-4 w-12 min-w-[3rem]">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectItem(itemId, checked as boolean)}
                        aria-label={`Select item ${itemId}`}
                      />
                    </td>
                  )}
                  
                  {columns.map((column) => (
                    <td key={column.key} className="p-4 whitespace-nowrap">
                      <div className="min-w-0">
                        {column.render ? column.render(item) : (
                          <span className="truncate block">{(item as any)[column.key]}</span>
                        )}
                      </div>
                    </td>
                  ))}
                  
                  {actions.length > 0 && (
                    <td className="p-4 text-center w-16 min-w-[4rem]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="bottom" className="z-50">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          {actions.map((action, index) => (
                            <React.Fragment key={action.key}>
                              {action.separator && index > 0 && <DropdownMenuSeparator />}
                              <DropdownMenuItem 
                                onClick={() => action.onClick(item)}
                                disabled={action.disabled?.(item)}
                                className={action.destructive ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : ''}
                              >
                                <action.icon className="w-4 h-4 mr-2" />
                                {action.label}
                              </DropdownMenuItem>
                            </React.Fragment>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ReusableTable; 