import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { BACKEND_STATUS_EVENT, NETWORK_QUALITY_EVENT } from '@/lib/api/client'

export function NetworkQualityBanner() {
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false)
  const [slowRequestCount, setSlowRequestCount] = useState(0)
  const [isBackendDown, setIsBackendDown] = useState(false)

  useEffect(() => {
    const handleOffline = () => setIsOffline(true)
    const handleOnline = () => setIsOffline(false)
    const handleNetworkQuality = (event: Event) => {
      const detail = (event as CustomEvent<{ slowRequestCount?: number }>).detail
      setSlowRequestCount(detail?.slowRequestCount ?? 0)
    }
    const handleBackendStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ isBackendDown?: boolean }>).detail
      setIsBackendDown(detail?.isBackendDown === true)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    window.addEventListener(NETWORK_QUALITY_EVENT, handleNetworkQuality as EventListener)
    window.addEventListener(BACKEND_STATUS_EVENT, handleBackendStatus as EventListener)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener(NETWORK_QUALITY_EVENT, handleNetworkQuality as EventListener)
      window.removeEventListener(BACKEND_STATUS_EVENT, handleBackendStatus as EventListener)
    }
  }, [])

  const showBackendDownBanner = !isOffline && isBackendDown
  const showSlowBanner = !isOffline && !showBackendDownBanner && slowRequestCount > 0
  if (!isOffline && !showSlowBanner && !showBackendDownBanner) return null

  return (
    <div className="fixed top-0 inset-x-0 z-[110] flex justify-center pointer-events-none">
      <div
        className={`mt-2 pointer-events-auto rounded-md px-4 py-2 shadow-lg text-sm font-medium border ${
          isOffline
            ? 'bg-red-50 text-red-700 border-red-200'
            : showBackendDownBanner
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}
      >
        <span className="inline-flex items-center gap-2">
          {isOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
          {isOffline
            ? 'You are offline. Some features may not work.'
            : showBackendDownBanner
            ? 'Backend is temporarily unavailable. It will be up soon.'
            : 'Poor connection detected. Requests may take longer than usual.'}
        </span>
      </div>
    </div>
  )
}

export default NetworkQualityBanner
