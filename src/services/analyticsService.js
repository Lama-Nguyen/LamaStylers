import { app } from './firebase'

export const EVENTS = {
  UPLOAD_ITEM:     'upload_item',
  GENERATE_OUTFIT: 'generate_outfit',
  UPGRADE_PREMIUM: 'upgrade_premium',
  CHAT_HAVY:       'chat_havy',
  FEEDBACK_SENT:   'feedback_sent',
  CREDIT_GRANTED:  'credit_granted',
  CREDIT_DEDUCTED: 'credit_deducted',
}

let _analytics = null
let _initAttempted = false

async function getAnalyticsInstance() {
  if (_analytics) return _analytics
  if (_initAttempted) return null

  _initAttempted = true

  if (!import.meta.env.PROD) return null

  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics')
    const supported = await isSupported()
    if (!supported) return null

    _analytics = getAnalytics(app)
    return _analytics
  } catch (e) {

    console.debug('Analytics không khởi tạo được:', e.message)
    return null
  }
}

export function trackEvent(eventName, params = {}) {
  getAnalyticsInstance().then(analytics => {
    if (!analytics) return
    import('firebase/analytics').then(({ logEvent }) => {
      logEvent(analytics, eventName, params)
    }).catch(() => {})
  }).catch(() => {})
}

export const trackSignup  = (method) => trackEvent('sign_up', { method })
export const trackLogin   = (method) => trackEvent('login',   { method })

export const trackFirstUpload  = (itemType) =>
  trackEvent(EVENTS.UPLOAD_ITEM, { is_first: true, item_type: itemType })

export const trackUploadItem   = (itemType) =>
  trackEvent(EVENTS.UPLOAD_ITEM, { is_first: false, item_type: itemType })

export const trackGenerateOutfit = (isPremium) =>
  trackEvent(EVENTS.GENERATE_OUTFIT, { is_premium: isPremium })

export const trackUpgradePremium = () =>
  trackEvent(EVENTS.UPGRADE_PREMIUM)

export const trackChatHavy = (msgCount) =>
  trackEvent(EVENTS.CHAT_HAVY, { message_count: msgCount })

export const trackFeedbackSent = () =>
  trackEvent(EVENTS.FEEDBACK_SENT)
