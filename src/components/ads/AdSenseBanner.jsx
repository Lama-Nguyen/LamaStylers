import { useEffect, useState } from 'react'

const PUBLISHER_ID = import.meta.env.VITE_ADSENSE_PUBLISHER_ID || ''
const IS_TEST_MODE = import.meta.env.VITE_ADSENSE_TEST_MODE === 'true'

export const AdSenseBanner = ({ adSlot, format = 'auto', style = {} }) => {
  const [failed, setFailed] = useState(false)

  if (!PUBLISHER_ID) return null

  useEffect(() => {
    let cancelled = false
    let attempts  = 0
    const MAX     = 6

    const tryPush = () => {
      if (cancelled) return
      try {
        if (window.adsbygoogle) { window.adsbygoogle.push({}); return }
      } catch (e) {
        console.error('AdSense push error:', e)
        setFailed(true)
        return
      }
      attempts++
      if (attempts >= MAX) { setFailed(true); return }
      setTimeout(tryPush, 300 * attempts)
    }

    tryPush()
    return () => { cancelled = true }
  }, [])

  if (failed) return null

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', ...style }}
      data-ad-client={PUBLISHER_ID}
      data-ad-slot={adSlot}
      data-ad-format={format}
      data-full-width-responsive="true"
      {...(IS_TEST_MODE ? { 'data-adtest': 'on' } : {})}
    />
  )
}

export const isAdSenseConfigured = () => Boolean(PUBLISHER_ID)
