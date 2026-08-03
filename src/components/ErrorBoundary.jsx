import React from 'react'
import { captureException } from '../lib/sentry.js'

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) { return { hasError: true, error } }

  componentDidCatch(error, info) {
    captureException(error, { extra: { componentStack: info.componentStack } })
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{ padding:'32px 16px', textAlign:'center', background:'#1A1230', color:'#F8F5FF', minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <p style={{ fontSize:48, marginBottom:16 }}>💔</p>
        <h2 style={{ marginBottom:8 }}>Có lỗi xảy ra</h2>
        <p style={{ color:'#A598C7', marginBottom:24, maxWidth:320 }}>
          Chúng tôi đã ghi lại lỗi này. Vui lòng tải lại trang để tiếp tục.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding:'10px 24px', background:'#8B5CF6', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:14, fontWeight:600 }}
        >
          Tải lại trang
        </button>
        {import.meta.env.DEV && (
          <pre style={{ marginTop:32, padding:16, background:'#0F0A1E', borderRadius:8, overflow:'auto', maxWidth:'90vw', color:'#F43F5E', fontSize:11, textAlign:'left' }}>
            {this.state.error?.toString()}
          </pre>
        )}
      </div>
    )
  }
}

export default ErrorBoundary
