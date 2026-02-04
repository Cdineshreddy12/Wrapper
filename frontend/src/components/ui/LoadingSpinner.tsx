import { ZopkitRoundLoader } from '@/components/common/ZopkitRoundLoader'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const loaderSize = size === 'sm' ? 'xs' : size === 'lg' ? 'xl' : 'md'
  return <ZopkitRoundLoader size={loaderSize} className={className} />
} 