let Sentry = null

export async function initFrontendSentry() {
  try {
    const s = await import('@sentry/react')
    Sentry = s
    s.init({
      dsn: import.meta.env.VITE_SENTRY_DSN_FRONTEND,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      beforeSend(event) { return event },
    })
  } catch (_) {

    console.warn('[Sentry] Not installed. Add @sentry/react to enable error tracking.')
  }
}

export function captureException(error, context = {}) {
  Sentry?.captureException(error, context)
}

export function captureUserAction(action, error, context = {}) {
  Sentry?.captureException(error, {
    tags: { user_action: action, ...context.tags },
    extra: context.extra,
  })
}

export default { initFrontendSentry, captureException, captureUserAction }
