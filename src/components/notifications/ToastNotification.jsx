import { useState, useEffect, useCallback, useRef } from 'react'

let _addToast = null
export const setToastHandler = (fn) => { _addToast = fn }

export const showToast = {
  success: (msg, duration = 3000) => _addToast?.({ msg, type: 'success', duration }),
  error:   (msg, duration = 4000) => _addToast?.({ msg, type: 'error',   duration }),
  info:    (msg, duration = 3000) => _addToast?.({ msg, type: 'info',    duration }),
  warning: (msg, duration = 3500) => _addToast?.({ msg, type: 'warning', duration }),
}

const ICONS = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' }
const COLORS = {
  success: { bg: 'rgba(16,185,129,0.12)',  border: '#10B981', text: '#10B981' },
  error:   { bg: 'rgba(244,63,94,0.12)',   border: '#F43F5E', text: '#F43F5E' },
  info:    { bg: 'rgba(139,92,246,0.12)',  border: '#8B5CF6', text: '#A78BFA' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: '#F59E0B', text: '#F59E0B' },
}

const Toast = ({ id, msg, type, duration, onRemove }) => {
  const [phase, setPhase]   = useState('enter')
  const timerRef            = useRef(null)
  const c = COLORS[type] || COLORS.info

  useEffect(() => {
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => setPhase('visible'))
      return () => cancelAnimationFrame(r2)
    })
    return () => cancelAnimationFrame(r1)
  }, [])

  const startTimer = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setPhase('exit')
      setTimeout(() => onRemove(id), 320)
    }, duration)
  }, [id, duration, onRemove])

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  useEffect(() => {
    if (phase === 'visible') startTimer()
    return () => stopTimer()
  }, [phase, startTimer, stopTimer])

  const dismiss = useCallback(() => {
    stopTimer()
    setPhase('exit')
    setTimeout(() => onRemove(id), 320)
  }, [id, onRemove, stopTimer])

  const transform = phase === 'visible' ? 'translateX(0)' : 'translateX(110%)'
  const opacity   = phase === 'visible' ? 1 : 0

  return (
    <div
      onClick={dismiss}

      onMouseEnter={stopTimer}
      onMouseLeave={() => { if (phase === 'visible') startTimer() }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 8,
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        transform,
        opacity,
        transition: phase === 'exit'
          ? 'transform 0.28s ease-in, opacity 0.28s ease-in'
          : 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease-out',
        minWidth: 260, maxWidth: 340,
        willChange: 'transform, opacity',
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>{ICONS[type]}</span>
      <span style={{ fontSize: 14, color: '#F8F5FF', flex: 1, lineHeight: 1.4 }}>{msg}</span>
      <span style={{ color: c.text, fontSize: 18, flexShrink: 0 }}>×</span>
    </div>
  )
}

export const ToastProvider = () => {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback(({ msg, type, duration }) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, msg, type, duration }])
  }, [])

  useEffect(() => {
    setToastHandler(add)
    return () => setToastHandler(null)
  }, [add])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 90,

      right: 16,
      left: 'auto',
      transform: 'none',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      pointerEvents: 'none',

      width: 'min(340px, calc(100vw - 32px))',
      overflow: 'hidden',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <Toast {...t} onRemove={remove} />
        </div>
      ))}
    </div>
  )
}
