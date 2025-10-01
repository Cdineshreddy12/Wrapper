import { Card, CardContent, Skeleton } from "../ui"
import { Flex } from "./Page"
import { Typography } from "./Typography"

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
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/3" />
          </CardContent>
        </Card>
      )
    }
  
    return (
      <Card>
        <CardContent className="p-6">
          <Flex align="center" justify="between">
            <div className="space-y-2">
              <Typography variant='lead'>{title}</Typography>
              <Typography variant='h3'>{value}</Typography>
              <Typography variant='muted'>{trend} from last month</Typography>
            </div>
            <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
              <Icon className="w-6 h-6" />
            </div>
          </Flex>
        </CardContent>
      </Card>
    )
  }