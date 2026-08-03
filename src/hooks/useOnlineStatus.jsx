import { createContext, useContext, useEffect, useState } from 'react'

const OnlineStatusContext = createContext(true)

export function OnlineStatusProvider({ children }) {

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline  = () => { clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => setIsOnline(true), 200) }
    const handleOffline = () => { clearTimeout(debounceRef.current); setIsOnline(false) }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <OnlineStatusContext.Provider value={isOnline}>
      {children}
    </OnlineStatusContext.Provider>
  )
}

export function useOnlineStatus() {
  return useContext(OnlineStatusContext)
}

export function useRequireOnline() {
  const isOnline = useOnlineStatus()
  const requireOnline = () => {
    if (!isOnline) {
      throw new Error('Không có kết nối mạng. Vui lòng kiểm tra lại và thử lại.')
    }
  }
  return { isOnline, requireOnline }
}
