import { useState, useRef, useEffect } from 'react'

import { callApi } from '../../services/callApi'
import { useAuth } from '../../hooks/useAuth.jsx'
import { analyzeClothingImage, saveClothingItem, resizeImage, CLOTHING_TYPES, SEASONS, OCCASIONS } from '../../services/wardrobeService'
import { hasBodyMeasurements } from '../../services/userService'
import { toVietnameseErrorMessage } from '../../services/errorMessages'
import { useGenerationCredits } from '../ads/AdManager'
import { useOnlineStatus } from '../../hooks/useOnlineStatus.jsx'
import BodyMeasurementsForm from './BodyMeasurementsForm'
import LiveCamera from './LiveCamera'

import CategoryClothingForm from './CategoryClothingForm'

const STEPS = { SOURCE: 0, CAMERA: 4, ANALYZE: 1, BODY: 2, CATEGORY: 5, DETAILS: 3 }

const SHOE_SIZES = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', 'Không rõ']
const FREE_SIZE_ONLY = ['Free size', 'Không rõ']
const LETTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Không rõ']

const SIZE_BY_TYPE = {
  'Áo thun':    LETTER_SIZES,
  'Áo sơ mi':   LETTER_SIZES,
  'Áo polo':    LETTER_SIZES,
  'Áo khoác':   LETTER_SIZES,
  'Áo hoodie':  LETTER_SIZES,
  'Áo len':     LETTER_SIZES,
  'Áo ba lỗ':   LETTER_SIZES,
  'Áo blazer':  LETTER_SIZES,
  'Quần jeans': ['26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', 'XS', 'S', 'M', 'L', 'XL', 'Không rõ'],
  'Quần tây':   ['26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', 'XS', 'S', 'M', 'L', 'XL', 'Không rõ'],
  'Quần short': LETTER_SIZES,
  'Quần jogger':  LETTER_SIZES,
  'Quần legging': LETTER_SIZES,
  'Chân váy':   LETTER_SIZES,
  'Váy':        LETTER_SIZES,
  'Đầm':        LETTER_SIZES,
  'Đồ ngủ':       LETTER_SIZES,
  'Đồ bộ ở nhà':  LETTER_SIZES,

  'Giày':       SHOE_SIZES,
  'Dép/Sandal': SHOE_SIZES,

  'Túi xách':   FREE_SIZE_ONLY,
  'Mũ/Nón':     FREE_SIZE_ONLY,
  'Phụ kiện':   FREE_SIZE_ONLY,
}
const DEFAULT_SIZES = LETTER_SIZES

export const SIZE_REFERENCE_CM = {
  'XS': { chest: '78-82', waist: '58-62' },
  'S':  { chest: '82-86', waist: '62-66' },
  'M':  { chest: '86-90', waist: '66-70' },
  'L':  { chest: '90-94', waist: '70-74' },
  'XL': { chest: '94-98', waist: '74-78' },
  'XXL':{ chest: '98-102', waist: '78-82' },
}

export default function AddClothingModal({ onClose }) {
  const { user, profile, isPremium } = useAuth()
  const { credits, consume, add } = useGenerationCredits('analyzeClothing')

  const isOnline = useOnlineStatus()

  const [step, setStep]           = useState(STEPS.SOURCE)

  const [aiData, setAiData]       = useState(null)
  const [measurements, setMeasurements] = useState(null)
  const [imageFile, setImageFile] = useState(null)

  const [imageSource, setImageSource] = useState(null)
  const [preview, setPreview]     = useState(null)
  const [analysis, setAnalysis]   = useState(null)
  const [analysisType, setAnalysisType] = useState(null)
  const [enhancing, setEnhancing] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [savedItemId, setSavedItemId] = useState(null)
  const [itemData, setItemData]   = useState({
    type: '', color: '', pattern: 'Trơn', material: 'không rõ', fit: 'regular', size: '',

    season: 'Bất kỳ', occasion: 'Bất kỳ',
  })
  const fileRef   = useRef()
  const cameraRef = useRef()

  const previewUrlRef = useRef(null)

  const processIncomingFile = async (file, source) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)

    let resizedFile = file
    try {
      resizedFile = await resizeImage(file)
    } catch {

      resizedFile = file
    }

    const url = URL.createObjectURL(resizedFile)
    previewUrlRef.current = url
    setImageFile(resizedFile)
    setImageSource(source)
    setPreview(url)
    setError('')
    setAnalysis(null)
    setAnalysisType(null)
    setStep(STEPS.ANALYZE)
  }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    await processIncomingFile(file, 'gallery')
    e.target.value = ''
  }

  const handleLiveCameraCapture = async (file) => {
    await processIncomingFile(file, 'camera-live')
  }

  const handleCameraFallbackFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    await processIncomingFile(file, 'camera-native')
    e.target.value = ''
  }

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  const handleQuickAnalyze = async () => {

    if (!isOnline) {
      setError('Không có kết nối mạng. Vui lòng kiểm tra lại và thử lại.')
      return
    }

    if (!consume()) {
      setError('⚠️ Đã hết lượt dùng AI hôm nay. Bạn vẫn có thể điền thông tin thủ công bên dưới.')
      setStep(hasBodyMeasurements(profile) ? STEPS.DETAILS : STEPS.BODY)
      return
    }

    setLoading(true)
    setError('')
    try {

      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = (e) => resolve(e.target.result.split(',')[1])
        reader.onerror = ()  => reject(new Error('Không đọc được file ảnh'))
        reader.readAsDataURL(imageFile)
      })
      const result = await analyzeClothingImage(base64)
      setAnalysis(result)
      const normalizedResult = { ...result }
      if (normalizedResult.type === 'Không xác định') {
        normalizedResult.type = ''
      }
      setItemData(d => ({ ...d, ...normalizedResult }))

      setAiData(normalizedResult)
      setAnalysisType('quick')

      if (!hasBodyMeasurements(profile)) {
        setStep(STEPS.BODY)
      } else {
        setStep(STEPS.CATEGORY)
      }
    } catch (e) {

      add(1)
      setError(toVietnameseErrorMessage(e, 'Không thể phân tích ảnh. Vui lòng thử lại.') + ' (Lượt dùng đã được hoàn lại)')
    } finally {
      setLoading(false)
    }
  }

  const handleDetailedAnalyze = async () => {
    if (!isPremium) return

    if (!isOnline) {
      setError('Không có kết nối mạng. Vui lòng kiểm tra lại và thử lại.')
      return
    }

    if (!consume()) {
      setError('⚠️ Đã hết lượt dùng AI hôm nay.')
      return
    }

    let creditsConsumedThisRun = 1

    setLoading(true)
    setError('')
    try {

      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = (e) => resolve(e.target.result.split(',')[1])
        reader.onerror = ()  => reject(new Error('Không đọc được file ảnh'))
        reader.readAsDataURL(imageFile)
      })

      const result = await analyzeClothingImage(base64)
      setAnalysis(result)

      const normalizedResult = { ...result }
      if (normalizedResult.type === 'Không xác định') {
        normalizedResult.type = ''
        setError('⚠️ AI chưa nhận diện được loại quần áo, vui lòng chọn tay ở mục "Loại" bên dưới.')
      }
      setItemData(d => ({ ...d, ...normalizedResult }))

      if (!consume()) {
        setError('⚠️ Hết lượt AI — dùng kết quả phân tích nhanh.')
        setAnalysisType('quick')
      } else {
        creditsConsumedThisRun = 2
        await doEnhance(normalizedResult)
        setAnalysisType('detailed')
      }
      setStep(hasBodyMeasurements(profile) ? STEPS.DETAILS : STEPS.BODY)
    } catch (e) {

      add(creditsConsumedThisRun)
      setError(toVietnameseErrorMessage(e, 'Không thể phân tích ảnh. Vui lòng thử lại.') + ' (Lượt dùng đã được hoàn lại)')
    } finally {
      setLoading(false)
    }
  }

  function matchToOption(aiValue, options) {
    if (!aiValue) return null
    const normalized = String(aiValue).toLowerCase()
    return options.find(opt =>
      opt !== 'Bất kỳ' && normalized.includes(opt.toLowerCase())
    ) || null
  }

  const doEnhance = async (baseAnalysis) => {

    if (!isOnline) {
      setError('Không có kết nối mạng. Vui lòng kiểm tra lại và thử lại.')
      return
    }

    setEnhancing(true)
    try {
      const result = await callApi('enhanceClothingAnalysis', {
        itemId:     savedItemId || '_preview',

        isPreview:  !savedItemId,
        type:     baseAnalysis.type     || itemData.type,
        color:    baseAnalysis.color    || itemData.color,
        pattern:  baseAnalysis.pattern  || itemData.pattern,
        material: baseAnalysis.material || itemData.material,
        fit:      baseAnalysis.fit      || itemData.fit,
      }, { retry: false })
      if (result?.enhancedMetadata) {
        setAnalysis(prev => ({ ...prev, enhancedMetadata: result.enhancedMetadata }))
        setAnalysisType('detailed')

        const matchedSeason   = matchToOption(result.enhancedMetadata.season, SEASONS)
        const matchedOccasion = matchToOption(result.enhancedMetadata.occasion, OCCASIONS)
        setItemData(d => ({
          ...d,
          ...(matchedSeason   ? { season: matchedSeason }     : {}),
          ...(matchedOccasion ? { occasion: matchedOccasion } : {}),
        }))
      }
    } catch (e) {

      console.error('Enhance thất bại:', e.message)
      setAnalysisType('quick')
      setError('⚠️ Phân tích Chi tiết thất bại, đã dùng kết quả Phân tích Nhanh thay thế. (Lượt Phân tích Chi tiết hôm nay có thể đã bị trừ)')
    } finally {
      setEnhancing(false)
    }
  }

  const handleCategorySave = (measurementsData) => {
    setMeasurements(measurementsData)

    if (measurementsData.type) setItemData(d => ({ ...d, type: measurementsData.type }))
    if (measurementsData.color) setItemData(d => ({ ...d, color: measurementsData.color }))
    setStep(STEPS.DETAILS)
  }

  const handleSave = async () => {
    if (!itemData.type || !itemData.color) {
      setError('Vui lòng điền ít nhất Loại và Màu sắc')
      return
    }
    if (loading) return

    if (!isOnline) {
      setError('Không có kết nối mạng. Vui lòng kiểm tra lại và thử lại.')
      return
    }
    setLoading(true)
    try {
      const id = await saveClothingItem(user.uid, {
        ...itemData,
        analysisType: analysisType || 'manual',
        enhancedMetadata: analysis?.enhancedMetadata || null,

        measurements: measurements || null,
        category: measurements?.category || null,
        display_name: measurements?.display_name || itemData.type || null,
        custom_type: measurements?.custom_type || null,
      }, imageFile)
      setSavedItemId(id)
      onClose()
    } catch (e) {

      setError(toVietnameseErrorMessage(e, 'Không thể lưu món đồ. Vui lòng thử lại.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <h3 style={{ margin:0, fontSize:17 }}>Thêm món đồ</h3>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        {}
        {step === STEPS.SOURCE && (
          <div style={s.body}>
            <p style={s.hint}>Chọn ảnh món đồ của bạn</p>
            <div style={s.srcRow}>
              <button onClick={() => fileRef.current.click()} style={s.srcBtn}>📁 Thư viện</button>
              {}
              <button onClick={() => { setError(''); setStep(STEPS.CAMERA) }} style={{ ...s.srcBtn, position: 'relative' }}>
                📷 Camera
                <span style={s.accuracyBadge}>✓ Chuẩn màu</span>
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            {}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleCameraFallbackFile} style={{ display: 'none' }} />
          </div>
        )}

        {}
        {step === STEPS.CAMERA && (
          <div style={s.body}>
            <LiveCamera
              onCapture={handleLiveCameraCapture}
              onFallbackToFileInput={() => { setStep(STEPS.SOURCE); cameraRef.current?.click() }}
              onClose={() => setStep(STEPS.SOURCE)}
            />
          </div>
        )}

        {}
        {step === STEPS.ANALYZE && (
          <div style={s.body}>
            {preview && <img src={preview} alt="" style={s.preview}
              onError={e => { e.target.style.display='none' }}/>}
            {}
            {imageSource && imageSource !== 'camera-live' && (
              <p style={s.galleryHint}>
                💡 Ảnh này chưa qua kiểm tra ánh sáng — màu sắc AI đọc được
                có thể không chính xác nếu ảnh chụp dưới đèn vàng hoặc thiếu sáng.
              </p>
            )}
            <p style={s.hint}>Chọn chế độ phân tích:</p>

            <div style={s.analyzeRow}>
              {}
              {}
              <button
                onClick={handleQuickAnalyze}
                disabled={loading || !isOnline}
                style={{
                  ...s.analyzeBtn,
                  background: isOnline ? 'linear-gradient(135deg,#8B5CF6,#7C3AED)' : 'rgba(255,255,255,0.06)',
                  opacity: isOnline ? 1 : 0.6,
                  cursor: isOnline ? 'pointer' : 'not-allowed',
                }}
              >
                {!isOnline ? '📡 Mất mạng' : loading ? '⏳ Đang phân tích...' : '⚡ Phân tích Nhanh'}
                <span style={s.analyzeSub}>5 trường cơ bản • Miễn phí</span>
              </button>

              {}
              {}
              <div style={{ position:'relative' }}>
                <button
                  onClick={handleDetailedAnalyze}
                  disabled={loading || !isPremium || !isOnline}
                  style={{
                    ...s.analyzeBtn,
                    background: (isPremium && isOnline)
                      ? 'linear-gradient(135deg,#F59E0B,#EF4444)'
                      : 'rgba(255,255,255,0.06)',
                    opacity: (isPremium && isOnline) ? 1 : 0.6,
                    cursor: (isPremium && isOnline) ? 'pointer' : 'not-allowed',
                  }}
                >
                  {!isOnline ? '📡 Mất mạng' : loading && isPremium ? '⏳ Đang phân tích...' : '🔬 Phân tích Chi tiết'}
                  <span style={s.analyzeSub}>
                    {!isOnline ? '' : isPremium ? 'Style · Dịp · Mùa · Tags' : '🔒 Chỉ Premium'}
                  </span>
                </button>
                {!isPremium && (
                  <div style={s.premiumTooltip}>Nâng cấp Premium để dùng</div>
                )}
              </div>
            </div>

            <button onClick={() => { setError(''); setStep(hasBodyMeasurements(profile) ? STEPS.DETAILS : STEPS.BODY) }} style={s.skipBtn}>
              Bỏ qua, tự điền thủ công →
            </button>
          </div>
        )}

        {}
        {step === STEPS.BODY && (
          <div style={s.body}>
            <BodyMeasurementsForm
              profile={profile}
              onSaved={() => { setError(''); setStep(STEPS.CATEGORY) }}
              onSkip={() => { setError(''); setStep(STEPS.CATEGORY) }}
            />
          </div>
        )}

        {}
        {step === STEPS.CATEGORY && (
          <div style={{ ...s.body, gap: 0 }}>
            <CategoryClothingForm
              category={aiData?.category || 'tops'}
              initialData={aiData || {}}
              onSave={handleCategorySave}
              onCancel={() => setStep(STEPS.DETAILS)}
            />
          </div>
        )}

        {}
        {step === STEPS.DETAILS && (
          <div style={s.body}>
            {preview && (
              <div style={{ position:'relative', marginBottom:12 }}>
                <img src={preview} alt="" style={{ ...s.preview, marginBottom:0 }}
                  onError={e => { e.target.style.display='none' }}/>
                {}
                {analysisType && (
                  <span style={{
                    ...s.badge,
                    background: analysisType === 'detailed' ? 'rgba(245,158,11,0.9)' : 'rgba(139,92,246,0.9)',
                  }}>
                    {analysisType === 'detailed' ? '🔬 Chi tiết' : '⚡ Nhanh'}
                    {enhancing && ' (đang nâng cấp...)'}
                  </span>
                )}
              </div>
            )}

            {}
            {analysisType === 'quick' && isPremium && !enhancing && (
              <button
                onClick={() => { if (!enhancing && !loading) doEnhance(analysis || {}) }}
                style={{ ...s.skipBtn, color:'#F59E0B', borderColor:'rgba(245,158,11,.3)', marginBottom:8 }}
              >
                🔬 Nâng cấp lên Chi tiết →
              </button>
            )}
            {enhancing && <p style={{ color:'#F59E0B', fontSize:13, textAlign:'center' }}>🔬 Đang phân tích chi tiết...</p>}

            {}
            {[
              { label:'Loại', key:'type', type:'combo', opts:CLOTHING_TYPES.filter(t => t !== 'Tất cả') },
              { label:'Màu sắc', key:'color', type:'text' },
              { label:'Họa tiết', key:'pattern', type:'text' },
              { label:'Chất liệu', key:'material', type:'text' },
              { label:'Form dáng', key:'fit', type:'text' },
              { label:'Kích cỡ', key:'size', type:'select',
                opts: SIZE_BY_TYPE[itemData.type] || DEFAULT_SIZES },

              { label:'Mùa', key:'season', type:'select', opts: SEASONS },
              { label:'Dịp sử dụng', key:'occasion', type:'select', opts: OCCASIONS },
            ].map(field => (
              <div key={field.key} style={s.field}>
                <label style={s.label}>{field.label}</label>
                {field.type === 'select' ? (
                  <select value={itemData[field.key]} onChange={e => setItemData(d=>({...d,[field.key]:e.target.value}))} style={s.input}>
                    <option value="">-- Chọn --</option>
                    {(field.opts||[]).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === 'combo' ? (

                  <>
                    <input
                      type="text"
                      list={`${field.key}-suggestions`}
                      value={itemData[field.key] || ''}
                      onChange={e => setItemData(d=>({...d,[field.key]:e.target.value}))}
                      placeholder="Chọn hoặc tự nhập loại khác..."
                      style={s.input}
                    />
                    <datalist id={`${field.key}-suggestions`}>
                      {(field.opts||[]).map(o => <option key={o} value={o} />)}
                    </datalist>
                  </>
                ) : (
                  <input type="text" value={itemData[field.key] || ''} onChange={e => setItemData(d=>({...d,[field.key]:e.target.value}))} style={s.input}/>
                )}

                {}
                {field.key === 'size' && SIZE_REFERENCE_CM[itemData.size] && (
                  <p style={{ fontSize: 11, color: '#6B5E8A', marginTop: 4 }}>
                    📏 Tham khảo: ngực {SIZE_REFERENCE_CM[itemData.size].chest}cm ·
                    eo {SIZE_REFERENCE_CM[itemData.size].waist}cm
                    <span style={{ display: 'block', marginTop: 2, fontStyle: 'italic' }}>
                      (số liệu ước lượng chung — mỗi shop có thể may lệch 5-6cm,
                      nếu biết số đo thật của món đồ, ghi vào ô "Số đo thực tế" bên dưới)
                    </span>
                  </p>
                )}
              </div>
            ))}

            {}
            <div style={s.field}>
              <label style={s.label}>
                Số đo thực tế (cm) <span style={{ color:'#6B5E8A', fontWeight:400 }}>— tuỳ chọn, nếu bạn tự đo</span>
              </label>
              <input
                type="text"
                value={itemData.actualMeasurementCm || ''}
                onChange={e => setItemData(d=>({...d, actualMeasurementCm: e.target.value}))}
                placeholder="vd: ngực 92cm, dài 68cm"
                style={s.input}
              />
            </div>

            {}
            {analysis?.enhancedMetadata && (
              <div style={s.enhancedBox}>
                <p style={{ color:'#F59E0B', fontWeight:600, marginBottom:8, fontSize:13 }}>🔬 Kết quả phân tích chi tiết</p>
                {analysis.enhancedMetadata.style    && <p style={s.enhancedRow}>✦ Phong cách: {analysis.enhancedMetadata.style}</p>}
                {analysis.enhancedMetadata.occasion && <p style={s.enhancedRow}>✦ Dịp: {analysis.enhancedMetadata.occasion}</p>}
                {analysis.enhancedMetadata.season   && <p style={s.enhancedRow}>✦ Mùa: {analysis.enhancedMetadata.season}</p>}
                {analysis.enhancedMetadata.tags?.length > 0 && (
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6 }}>
                    {analysis.enhancedMetadata.tags.map(tag => (
                      <span key={tag} style={s.tag}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {}
            <button onClick={handleSave} disabled={loading || !isOnline} className="btn-primary" style={{ marginTop:16, opacity: !isOnline ? 0.6 : 1, cursor: !isOnline ? 'not-allowed' : 'pointer' }}>
              {!isOnline ? '📡 Mất kết nối mạng' : loading ? '⏳ Đang lưu...' : '💾 Lưu món đồ'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  overlay:   { position:'fixed', inset:0, background:'rgba(0,0,0,.7)', backdropFilter:'blur(4px)', zIndex:3000, display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'0 0 80px' },
  modal:     { background:'#1A1230', border:'1px solid rgba(139,92,246,.25)', borderRadius:20, width:'100%', maxWidth:420, maxHeight:'80vh', overflow:'hidden', display:'flex', flexDirection:'column' },
  header:    { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', borderBottom:'1px solid rgba(139,92,246,.12)' },
  closeBtn:  { background:'none', border:'none', color:'#6B5E8A', fontSize:20, cursor:'pointer' },
  body:      { flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:12, scrollbarWidth:'none' },
  errorBox:  { background:'rgba(244,63,94,.1)', border:'1px solid rgba(244,63,94,.3)', borderRadius:10, padding:'10px 14px', margin:'0 16px', fontSize:13, color:'#F43F5E' },
  hint:      { color:'#A598C7', fontSize:14, margin:0, textAlign:'center' },
  srcRow:    { display:'flex', gap:10 },
  srcBtn:    { flex:1, background:'rgba(255,255,255,.06)', border:'1px solid rgba(139,92,246,.2)', borderRadius:12, padding:'14px 10px', color:'#F8F5FF', fontSize:14, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6 },

  accuracyBadge: { position:'absolute', top:-8, right:-6, background:'#10B981', color:'#fff', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:50, whiteSpace:'nowrap' },

  galleryHint: { background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.2)', borderRadius:10, padding:'8px 12px', color:'#F59E0B', fontSize:12, margin:0, lineHeight:1.4 },
  preview:   { width:'100%', height:180, objectFit:'contain', borderRadius:12, background:'rgba(255,255,255,.04)', marginBottom:4 },
  analyzeRow:{ display:'flex', flexDirection:'column', gap:10 },
  analyzeBtn:{ border:'none', borderRadius:14, padding:'14px 16px', color:'#fff', fontWeight:600, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4, width:'100%' },
  analyzeSub:{ fontSize:11, opacity:.8, fontWeight:400 },
  skipBtn:   { background:'none', border:'1px solid rgba(139,92,246,.2)', borderRadius:10, padding:'8px 14px', color:'#A598C7', fontSize:12, cursor:'pointer', textAlign:'center' },
  badge:     { position:'absolute', top:8, right:8, fontSize:11, fontWeight:700, color:'#fff', padding:'3px 10px', borderRadius:50, backdropFilter:'blur(4px)' },
  premiumTooltip: { position:'absolute', top:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)', background:'#241848', border:'1px solid rgba(245,158,11,.3)', borderRadius:8, padding:'6px 12px', fontSize:11, color:'#F59E0B', whiteSpace:'nowrap', zIndex:10, pointerEvents:'none' },
  field:     { display:'flex', flexDirection:'column', gap:4 },
  label:     { fontSize:12, color:'#A598C7' },
  input:     { background:'rgba(255,255,255,.06)', border:'1px solid rgba(139,92,246,.2)', borderRadius:10, padding:'10px 13px', color:'#F8F5FF', fontSize:14, outline:'none', fontFamily:'inherit', colorScheme:'dark' },
  enhancedBox:{ background:'rgba(245,158,11,.07)', border:'1px solid rgba(245,158,11,.25)', borderRadius:12, padding:'12px 14px' },
  enhancedRow:{ color:'#A598C7', fontSize:13, margin:'3px 0' },
  tag:       { background:'rgba(139,92,246,.2)', border:'1px solid rgba(139,92,246,.3)', borderRadius:50, padding:'3px 10px', fontSize:11, color:'#A78BFA' },
}
