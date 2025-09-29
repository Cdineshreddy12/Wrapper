import { Card, CardContent } from "../ui"

export function MetricCard({
    title,
    value,
    icon: Icon,
    trend,
    color,
    isLoading
  }: {
    title: string
    value: string | number
    icon: any
    trend: string
    color: string
    isLoading: boolean
  }) {
    const colorClasses = {
      blue: 'text-blue-600 bg-blue-100',
      green: 'text-green-600 bg-green-100',
      purple: 'text-purple-600 bg-purple-100',
      yellow: 'text-yellow-600 bg-yellow-100'
    }
  
    if (isLoading) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          </CardContent>
        </Card>
      )
    }
  
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{trend} from last month</p>
            </div>
            <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }