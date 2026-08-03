import { useState, useRef, useEffect, useCallback } from 'react'

const MIN_BRIGHTNESS = 60

const COLOR_CAST_THRESHOLD = 35

const SAMPLE_INTERVAL_MS = 400

export default function LiveCamera({ onCapture, onFallbackToFileInput, onClose }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const sampleTimerRef = useRef(null)

  const [status, setStatus]         = useState('starting')
  const [brightness, setBrightness] = useState(null)
  const [colorCast, setColorCast]   = useState(null)
  const [errorMsg, setErrorMsg]     = useState('')

  useEffect(() => {
    let cancelled = false

    const start = async () => {

      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setStatus('error')
          setErrorMsg('Trình duyệt không hỗ trợ camera trực tiếp.')
        }
        return
      }

      try {

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        })
        if (cancelled) {

          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setStatus('live')
      } catch (e) {

        console.warn('getUserMedia thất bại, fallback về input file:', e)
        if (!cancelled) {
          setStatus('error')
          setErrorMsg('Không thể mở camera trực tiếp trên thiết bị này.')
        }
      }
    }

    start()
    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      if (sampleTimerRef.current) clearInterval(sampleTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (status !== 'live') return

    const sample = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.videoWidth === 0) return

      const SAMPLE_SIZE = 64
      canvas.width = SAMPLE_SIZE
      canvas.height = SAMPLE_SIZE
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(video, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)

      let data
      try {
        data = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data
      } catch {

        return
      }

      let sumR = 0, sumG = 0, sumB = 0
      const pixelCount = data.length / 4
      for (let i = 0; i < data.length; i += 4) {
        sumR += data[i]
        sumG += data[i + 1]
        sumB += data[i + 2]
      }
      const avgR = sumR / pixelCount
      const avgG = sumG / pixelCount
      const avgB = sumB / pixelCount
      const avgBrightness = (avgR + avgG + avgB) / 3

      setBrightness(avgBrightness)

      const diff = avgR - avgB
      if (Math.abs(diff) < COLOR_CAST_THRESHOLD) {
        setColorCast(null)
      } else {
        setColorCast(diff > 0 ? 'warm' : 'cool')
      }
    }

    sampleTimerRef.current = setInterval(sample, SAMPLE_INTERVAL_MS)
    return () => clearInterval(sampleTimerRef.current)
  }, [status])

  const handleCapture = useCallback(() => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return

    const captureCanvas = document.createElement('canvas')
    captureCanvas.width = video.videoWidth
    captureCanvas.height = video.videoHeight
    const ctx = captureCanvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    captureCanvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
        onCapture(file)
      },
      'image/jpeg',
      0.9
    )
  }, [onCapture])

  const brightnessOk = brightness === null || brightness >= MIN_BRIGHTNESS
  const canCapture = status === 'live' && brightnessOk

  if (status === 'error') {
    return (
      <div style={styles.fallbackBox}>
        <p style={styles.fallbackIcon}>📷</p>
        <p style={styles.fallbackText}>{errorMsg}</p>
        <p style={styles.fallbackSub}>Dùng camera mặc định của điện thoại thay thế nhé.</p>
        <button onClick={onFallbackToFileInput} style={styles.fallbackBtn}>
          Mở Camera →
        </button>
        <button onClick={onClose} style={styles.cancelLink}>Huỷ</button>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.videoWrap}>
        <video ref={videoRef} playsInline muted style={styles.video} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {status === 'starting' && (
          <div style={styles.loadingOverlay}>
            <div className="spinner" />
            <p style={styles.loadingText}>Đang mở camera...</p>
          </div>
        )}

        {status === 'live' && (
          <>
            {}
            <div style={styles.frameGuide}>
              <div style={{ ...styles.corner, ...styles.cornerTL }} />
              <div style={{ ...styles.corner, ...styles.cornerTR }} />
              <div style={{ ...styles.corner, ...styles.cornerBL }} />
              <div style={{ ...styles.corner, ...styles.cornerBR }} />
            </div>

            {}
            <div style={styles.hintBar}>
              {!brightnessOk && (
                <span style={styles.warnBadge}>
                  🔦 Quá tối — di chuyển ra nơi sáng hơn
                </span>
              )}
              {brightnessOk && colorCast === 'warm' && (
                <span style={styles.warnBadgeSoft}>
                  💡 Ánh sáng hơi vàng — màu có thể không chính xác, cân nhắc chụp gần cửa sổ
                </span>
              )}
              {brightnessOk && colorCast === 'cool' && (
                <span style={styles.warnBadgeSoft}>
                  💡 Ánh sáng hơi lạnh — màu có thể không chính xác
                </span>
              )}
              {brightnessOk && !colorCast && (
                <span style={styles.okBadge}>✓ Ánh sáng tốt</span>
              )}
            </div>
          </>
        )}
      </div>

      <p style={styles.instruction}>Đặt món đồ vừa khung, ánh sáng tự nhiên cho màu chuẩn nhất</p>

      <div style={styles.controlRow}>
        <button onClick={onClose} style={styles.closeBtn}>Huỷ</button>
        <button
          onClick={handleCapture}
          disabled={!canCapture}
          style={{ ...styles.captureBtn, opacity: canCapture ? 1 : 0.4 }}
        >
          <span style={styles.captureBtnInner} />
        </button>
        {}
        <div style={{ width: 60 }} />
      </div>
    </div>
  )
}

const styles = {
  container: {

    position: 'fixed', inset: 0, zIndex: 1500,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 12, padding: '16px 16px calc(16px + env(safe-area-inset-bottom))',
    background: '#0F0A1E',
  },
  videoWrap: {

    position: 'relative', width: '100%', maxWidth: 480,
    aspectRatio: '1/1', maxHeight: '55vh',
    background: '#000', borderRadius: 16, overflow: 'hidden',
  },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  loadingOverlay: {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(0,0,0,.4)',
  },
  loadingText: { color: '#F8F5FF', fontSize: 13 },

  frameGuide: { position: 'absolute', inset: '12%', pointerEvents: 'none' },
  corner: { position: 'absolute', width: 28, height: 28, border: '3px solid rgba(139,92,246,0.9)' },
  cornerTL: { top: 0, left: 0, borderRight: 'none', borderBottom: 'none', borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderLeft: 'none', borderBottom: 'none', borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderRight: 'none', borderTop: 'none', borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderLeft: 'none', borderTop: 'none', borderBottomRightRadius: 8 },

  hintBar: { position: 'absolute', bottom: 10, left: 10, right: 10, display: 'flex', justifyContent: 'center' },
  warnBadge: {
    background: 'rgba(244,63,94,0.92)', color: '#fff', fontSize: 12, fontWeight: 600,
    padding: '6px 12px', borderRadius: 50, textAlign: 'center', backdropFilter: 'blur(4px)',
  },
  warnBadgeSoft: {
    background: 'rgba(245,158,11,0.92)', color: '#fff', fontSize: 11, fontWeight: 600,
    padding: '6px 12px', borderRadius: 50, textAlign: 'center', backdropFilter: 'blur(4px)',
  },
  okBadge: {
    background: 'rgba(16,185,129,0.9)', color: '#fff', fontSize: 12, fontWeight: 600,
    padding: '5px 12px', borderRadius: 50, backdropFilter: 'blur(4px)',
  },

  instruction: { color: '#A598C7', fontSize: 12, textAlign: 'center', margin: 0 },

  controlRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  closeBtn: { width: 60, background: 'none', border: 'none', color: '#A598C7', fontSize: 14, cursor: 'pointer' },
  captureBtn: {
    width: 64, height: 64, borderRadius: '50%', border: '4px solid #8B5CF6',
    background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer',
  },
  captureBtnInner: { width: 48, height: 48, borderRadius: '50%', background: '#8B5CF6' },

  fallbackBox: { textAlign: 'center', padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  fallbackIcon: { fontSize: 40, margin: 0 },
  fallbackText: { color: '#F8F5FF', fontSize: 14, margin: 0 },
  fallbackSub: { color: '#A598C7', fontSize: 12, margin: '0 0 12px' },
  fallbackBtn: {
    background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)', border: 'none', borderRadius: 12,
    padding: '12px 24px', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
  },
  cancelLink: { background: 'none', border: 'none', color: '#6B5E8A', fontSize: 12, marginTop: 8, cursor: 'pointer' },
}
