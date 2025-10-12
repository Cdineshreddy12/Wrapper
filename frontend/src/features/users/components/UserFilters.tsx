import React from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from '@/components/ui';

interface UserFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterApp: string;
  onFilterAppChange: (value: string) => void;
  showInactiveUsers: boolean;
  onShowInactiveUsersChange: (value: boolean) => void;
  uniqueApps: string[];
}

export function UserFilters({
  searchTerm,
  onSearchChange,
  filterApp,
  onFilterAppChange,
  showInactiveUsers,
  onShowInactiveUsersChange,
  uniqueApps
}: UserFiltersProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={filterApp} onValueChange={onFilterAppChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by application" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Applications</SelectItem>
              {uniqueApps.map(app => (
                <SelectItem key={app} value={app}>
                  {app.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="show-inactive"
              checked={showInactiveUsers}
              onCheckedChange={onShowInactiveUsersChange}
            />
            <label htmlFor="show-inactive" className="text-sm">
              Show inactive users
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}