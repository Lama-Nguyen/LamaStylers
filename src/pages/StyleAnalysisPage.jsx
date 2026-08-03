import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { getClothingItems } from '../services/wardrobeService'
import { getOutfits } from '../services/outfitService'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

import { callApi } from '../services/callApi'
import { db } from '../services/firebase'
import { StatsSkeleton } from '../components/SkeletonCard'
import { isCallableErrorCode } from '../services/errorMessages'
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'

const FORMAL_TYPES = ['Áo vest', 'Áo sơ mi', 'Quần tây', 'Váy công sở', 'Blazer']
const CASUAL_TYPES = ['Áo thun', 'Quần jeans', 'Quần short', 'Hoodie', 'Áo polo']
const SPORTY_TYPES = ['Áo thể thao', 'Quần thể thao', 'Giày thể thao']

const SIZE_GROUP_ORDER = [
  'XS','S','M','L','XL','XXL',
  '26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42',
  'Free size','Không rõ',
]

const COLOR_MAP = {
  'Đen':'#1a1a1a','Trắng':'#f5f5f5','Xám':'#9ca3af','Đỏ':'#ef4444',
  'Hồng':'#ec4899','Cam':'#f97316','Vàng':'#eab308','Xanh lá':'#22c55e',
  'Xanh dương':'#3b82f6','Xanh navy':'#1e3a5f','Tím':'#a855f7',
  'Nâu':'#92400e','Be':'#d4b483','Kem':'#fef3c7','Rêu':'#65a30d',
}
const FALLBACK_COLORS = ['#8B5CF6','#F43F5E','#F59E0B','#10B981','#3B82F6','#EC4899','#14B8A6']
const getColor = (name, idx) => COLOR_MAP[name] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]

const getCurrentTrend = () => {
  const m = new Date().getMonth() + 1
  const q = m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : 4
  return {
    1: { season:'Xuân', items:['Áo sơ mi','Quần tây','Blazer','Váy công sở'], colors:['Be','Kem','Hồng','Xanh lá'], keywords:['pastel','layer nhẹ','floral'] },
    2: { season:'Hè',   items:['Áo thun','Quần short','Váy công sở','Áo polo'], colors:['Trắng','Vàng','Cam','Xanh dương'], keywords:['tông sáng','vải nhẹ','minimalist'] },
    3: { season:'Thu',  items:['Áo khoác','Quần jeans','Hoodie','Blazer'], colors:['Nâu','Rêu','Be','Xám'], keywords:['earth tone','layer','oversized'] },
    4: { season:'Đông', items:['Áo vest','Quần tây','Áo khoác','Hoodie'], colors:['Đen','Xám','Xanh navy','Nâu'], keywords:['tông trầm','ấm','classic'] },
  }[q]
}

const SEASON_MAP = {
  spring: ['Áo sơ mi','Váy công sở','Blazer','Áo polo'],
  summer: ['Áo thun','Quần short','Áo polo'],
  autumn: ['Áo khoác','Hoodie','Quần jeans','Blazer'],
  winter: ['Áo vest','Quần tây','Áo khoác','Hoodie'],
}
const SEASON_LABELS = { spring:'🌸 Xuân', summer:'☀️ Hè', autumn:'🍂 Thu', winter:'❄️ Đông' }

const STYLE_DESC = {
  'Thanh lịch':    'Chuyên nghiệp, tinh tế — phù hợp văn phòng và sự kiện',
  'Casual':        'Thoải mái, năng động — lý tưởng cho cuộc sống hàng ngày',
  'Năng động':     'Khoẻ khoắn, hiện đại — thể hiện cá tính mạnh mẽ',
  'Đa phong cách': 'Linh hoạt, đa dạng — dễ dàng thích nghi mọi hoàn cảnh',
}

// Khớp đúng 11 giá trị STYLE_TAGS backend gán cho từng món khi phân tích ảnh
// (netlify/functions/lib/constants.js). Dùng để tổng hợp phong cách theo dữ liệu
// AI đã gán thật, thay vì chỉ đoán qua loại đồ — cho phép phát hiện phong cách lai.
const STYLE_TAG_LABELS = {
  'minimal':       'Tối giản',
  'casual':        'Casual',
  'smart-casual':  'Smart Casual',
  'streetwear':    'Streetwear',
  'preppy':        'Preppy',
  'workwear':      'Công sở',
  'techwear':      'Techwear',
  'vintage':       'Vintage',
  'athleisure':    'Athleisure',
  'bohemian':      'Bohemian',
  'classic':       'Cổ điển',
}
const STYLE_TAG_DESC = {
  'Tối giản':      'Đơn giản, sạch — ít chi tiết, tông màu trung tính',
  'Casual':        'Thoải mái, năng động — lý tưởng cho cuộc sống hàng ngày',
  'Smart Casual':  'Giữa lịch sự và thoải mái — linh hoạt cho nhiều hoàn cảnh',
  'Streetwear':    'Cá tính, phóng khoáng — ảnh hưởng văn hoá đường phố',
  'Preppy':        'Gọn gàng, học thuật — cảm hứng từ trường học Anh-Mỹ',
  'Công sở':       'Chuyên nghiệp, chỉn chu — phù hợp môi trường làm việc',
  'Techwear':      'Hiện đại, chức năng — chất liệu kỹ thuật, form khoẻ',
  'Vintage':       'Hoài cổ, độc đáo — form dáng và hoạ tiết thập niên cũ',
  'Athleisure':    'Thể thao pha đời thường — thoải mái mà vẫn thời trang',
  'Bohemian':      'Tự do, nghệ sĩ — hoạ tiết và chất liệu tự nhiên',
  'Cổ điển':       'Bền vững qua thời gian — không chạy theo xu hướng nhất thời',
}
// Với nhãn kiểu "X pha Y" (phong cách lai), ghép mô tả 2 vế lại thay vì cần
// liệt kê sẵn mọi tổ hợp (11 tag → 55 cặp, không thể liệt kê hết).
function describeStyleLabel(label) {
  if (!label) return ''
  if (STYLE_DESC[label]) return STYLE_DESC[label]
  if (STYLE_TAG_DESC[label]) return STYLE_TAG_DESC[label]
  if (label.includes(' pha ')) {
    const [a, b] = label.split(' pha ')
    const da = STYLE_TAG_DESC[a] || STYLE_DESC[a]
    const db_ = STYLE_TAG_DESC[b] || STYLE_DESC[b]
    if (da && db_) return `Kết hợp giữa ${a} (${da.split(' — ')[0].toLowerCase()}) và ${b} (${db_.split(' — ')[0].toLowerCase()})`
  }
  return 'Phong cách riêng, khó gói gọn trong 1 nhãn — càng thêm đồ, AI càng nhận diện rõ hơn'
}

const CHART_TABS = ['Loại', 'Màu', 'Size', 'Mùa', 'Dịp']
const OCCASION_TYPES = {
  'Đi làm':    ['Áo sơ mi','Quần tây','Áo vest','Blazer','Váy công sở'],
  'Casual':    ['Áo thun','Quần jeans','Hoodie','Áo polo','Quần short'],
  'Thể thao':  ['Áo thể thao','Quần thể thao','Giày thể thao'],
  'Tiệc tùng': ['Áo vest','Váy công sở','Blazer'],
}

const useCountUp = (target, duration = 800) => {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) return
    let cur = 0
    const step = target / (duration / 16)
    const t = setInterval(() => {
      cur += step
      if (cur >= target) { setVal(target); clearInterval(t) }
      else setVal(Math.floor(cur))
    }, 16)
    return () => clearInterval(t)
  }, [target, duration])
  return val
}

const useStyleHistory = (uid, currentStats) => {
  const [delta, setDelta] = useState(null)
  useEffect(() => {
    if (!uid || !currentStats) return
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const now  = new Date()
    const prev = new Date(now); prev.setMonth(prev.getMonth() - 1)
    const ref     = doc(db, 'users', uid, 'styleHistory', fmt(now))
    const prevRef = doc(db, 'users', uid, 'styleHistory', fmt(prev))
    const run = async () => {
      await setDoc(ref, { ...currentStats, savedAt: serverTimestamp() }, { merge: true })
      const snap = await getDoc(prevRef)
      if (snap.exists()) {
        const p = snap.data()
        setDelta({
          items:   currentStats.totalItems   - (p.totalItems   || 0),
          outfits: currentStats.totalOutfits - (p.totalOutfits || 0),
          match:   currentStats.hasMatchData && p.avgMatch != null
            ? currentStats.avgMatch - p.avgMatch : null,
        })
      }
    }
    run().catch(console.error)
  }, [uid, currentStats])
  return delta
}

const useShare = (ref) => useCallback(async () => {
  try {
    const h2c = (await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js')).default
    const canvas = await h2c(ref.current, { backgroundColor: '#0F0A1E', scale: 2 })
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'lama-style-analysis.png'
    a.click()
  } catch { alert('Không thể xuất ảnh lúc này.') }
}, [ref])

function AnimCount({ target }) {
  return <>{useCountUp(target)}</>
}

const DeltaBadge = ({ val, suffix = '' }) => {
  if (!val) return null
  const pos = val > 0
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 99, marginLeft: 4,
      background: pos ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
      color: pos ? '#10B981' : '#F43F5E',
    }}>{pos ? '+' : ''}{val}{suffix}</span>
  )
}

const EmptyState = ({ onNavigate }) => (
  <div style={{ textAlign: 'center', padding: '60px 24px' }}>
    <p style={{ fontSize: 56, marginBottom: 16 }}>👗</p>
    <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: '#F8F5FF', marginBottom: 8 }}>Tủ đồ đang trống</p>
    <p style={{ color: '#A598C7', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
      Thêm ít nhất 1 món đồ để xem<br />phân tích phong cách của bạn
    </p>
    <button className="btn-primary" onClick={onNavigate} style={{ width: 'auto', padding: '12px 28px' }}>
      + Thêm đồ đầu tiên
    </button>
  </div>
)

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.08) return null
  const R = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  return (
    <text x={cx + r * Math.cos(-midAngle * R)} y={cy + r * Math.sin(-midAngle * R)}
      fill="white" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 10, fontWeight: 600 }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

const AIInsight = ({ items, outfits, styleLabel, avgMatch, hasMatchData }) => {
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const analyze = async () => {
    setLoading(true); setResult(null); setErrorMsg('')
    try {
      // Chỉ gửi đúng field backend cần (khớp buildGenerateStyleInsightPrompt) —
      // gồm style_tags thật của từng món, để AI phân tích dựa trên dữ liệu đã có
      // sẵn thay vì đoán lại từ đầu.
      const leanItems = items.map(i => ({
        type:  i.type,
        color: typeof i.color === 'object' ? i.color?.primary : i.color,
        description: { style_tags: i.description?.style_tags || [] },
      }))
      const leanOutfits = outfits.map(o => ({
        title: o.title,
        color_harmony: { primary_colors: o.color_harmony?.primary_colors || [] },
      }))

      const data = await callApi('generateStyleInsight', { items: leanItems, outfits: leanOutfits }, { retry: false })
      setResult(data)
      setDone(true)
    } catch (e) {
      console.error('generateStyleInsight lỗi:', e)
      const msg = isCallableErrorCode(e, 'resource-exhausted')
        ? (e.message || 'Đã hết lượt phân tích hôm nay.')
        : 'Không thể kết nối AI lúc này. Thử lại sau.'
      setErrorMsg(msg)
    }
    finally { setLoading(false) }
  }

  return (
    <div className="card" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(244,63,94,0.08))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontFamily: 'Playfair Display, serif' }}>✨ AI Style Insight</h3>
        {!done
          ? <button onClick={analyze} disabled={loading || items.length === 0} style={{
              background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', border: 'none',
              borderRadius: 99, padding: '6px 14px', color: 'white', fontSize: 12,
              fontWeight: 600, cursor: 'pointer', opacity: loading || items.length === 0 ? 0.5 : 1,
            }}>{loading ? '✦ Đang phân tích...' : '✦ Phân tích ngay'}</button>
          : <button onClick={() => { setDone(false); setResult(null); setErrorMsg('') }}
              style={{ background: 'none', border: 'none', color: '#A598C7', fontSize: 12, cursor: 'pointer' }}>
              Phân tích lại
            </button>
        }
      </div>
      {!result && !loading && !errorMsg && <p style={{ color: '#6B5E8A', fontSize: 13, fontStyle: 'italic' }}>Nhấn để Hạ Vy phân tích phong cách của bạn ✨</p>}
      {loading && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="spinner" style={{ width: 18, height: 18 }} /><span style={{ color: '#A598C7', fontSize: 13 }}>Đang đọc tủ đồ của bạn...</span></div>}
      {errorMsg && <p style={{ color: '#F8F5FF', fontSize: 14, lineHeight: 1.7 }}>{errorMsg}</p>}
      {result && (
        <div>
          {result.style_conclusion && (
            <span style={{
              display: 'inline-block', fontSize: 12, fontWeight: 600, color: '#8B5CF6',
              background: 'rgba(139,92,246,0.15)', borderRadius: 99, padding: '3px 12px', marginBottom: 10,
            }}>{result.style_conclusion}</span>
          )}
          {result.description && <p style={{ color: '#F8F5FF', fontSize: 14, lineHeight: 1.7, margin: '0 0 10px' }}>{result.description}</p>}
          {Array.isArray(result.key_characteristics) && result.key_characteristics.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {result.key_characteristics.map((c, i) => (
                <span key={i} style={{ fontSize: 11, color: '#A598C7', border: '1px solid rgba(165,152,199,0.3)', borderRadius: 99, padding: '2px 10px' }}>{c}</span>
              ))}
            </div>
          )}
          {result.recommendations?.improvement_areas && (
            <p style={{ color: '#A598C7', fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
              💡 {result.recommendations.improvement_areas}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

const TrendScore = ({ items, colorData }) => {
  const trend = getCurrentTrend()
  const score = useMemo(() => {
    let pts = 0
    const total = trend.items.length + trend.colors.length
    trend.items.forEach(t => { if (items.some(i => i.type === t)) pts++ })
    trend.colors.forEach(c => { if (colorData.some(d => d.name === c)) pts++ })
    return Math.round((pts / total) * 100)
  }, [items, colorData, trend])
  const col = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#F43F5E'
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontFamily: 'Playfair Display, serif' }}>🔥 Trend {trend.season} {new Date().getFullYear()}</h3>
        <span style={{ fontSize: 22, fontWeight: 700, color: col }}>{score}%</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 99, height: 8, marginBottom: 12 }}>
        <div style={{ width: `${score}%`, height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${col}, ${col}aa)`, transition: 'width 1s ease' }} />
      </div>
      <p style={{ color: '#A598C7', fontSize: 12, marginBottom: 8 }}>
        Xu hướng: <span style={{ color: '#F8F5FF' }}>{trend.keywords.join(', ')}</span>
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {trend.items.map(t => {
          const has = items.some(i => i.type === t)
          return (
            <span key={t} style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 99,
              background: has ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
              color: has ? '#10B981' : '#6B5E8A',
              border: `1px solid ${has ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
            }}>{has ? '✓ ' : ''}{t}</span>
          )
        })}
      </div>
    </div>
  )
}

const VersatilitySection = ({ items, outfits }) => {
  const scored = useMemo(() => {
    if (outfits.length === 0) return []
    return items.map(item => {
      const count = outfits.filter(o => o.items?.includes(item.id)).length
      return { ...item, outfitCount: count, score: Math.round((count / outfits.length) * 100) }
    }).sort((a, b) => b.outfitCount - a.outfitCount)
  }, [items, outfits])
  if (scored.length === 0) return null
  const top3    = scored.slice(0, 3)
  const unused  = scored.filter(i => i.outfitCount === 0).slice(0, 3)
  return (
    <div className="card">
      <h3 style={{ fontSize: 16, fontFamily: 'Playfair Display, serif', marginBottom: 14 }}>⭐ Độ linh hoạt tủ đồ</h3>
      <p style={{ fontSize: 12, color: '#10B981', marginBottom: 8, fontWeight: 600 }}>🏆 Dùng nhiều nhất</p>
      {top3.map((item, i) => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: '#6B5E8A', width: 16 }}>#{i+1}</span>
          <span style={{ fontSize: 13, color: '#F8F5FF', flex: 1 }}>{item.name || item.type}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 99 }}>
              <div style={{ width: `${Math.min(item.score, 100)}%`, height: '100%', background: '#8B5CF6', borderRadius: 99 }} />
            </div>
            <span style={{ fontSize: 11, color: '#A78BFA', width: 28 }}>{item.outfitCount}x</span>
          </div>
        </div>
      ))}
      {unused.length > 0 && (
        <>
          <p style={{ fontSize: 12, color: '#F43F5E', marginBottom: 8, fontWeight: 600, marginTop: 12 }}>💤 Chưa được dùng</p>
          {unused.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#A598C7', flex: 1 }}>{item.name || item.type}</span>
              <span style={{ fontSize: 11, color: '#F43F5E' }}>0 outfit</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

const SeasonalCoverage = ({ items }) => {
  const coverage = useMemo(() => (
    Object.entries(SEASON_MAP).map(([key, types]) => {
      const count = items.filter(i => types.includes(i.type)).length
      const score = Math.min(100, Math.round((count / Math.max(types.length, 1)) * 100))
      return { key, label: SEASON_LABELS[key], score }
    })
  ), [items])
  const radarData = coverage.map(c => ({ subject: c.label.split(' ')[1], score: c.score }))
  return (
    <>
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="rgba(139,92,246,0.2)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#A598C7', fontSize: 12 }} />
          <Radar dataKey="score" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.25} />
        </RadarChart>
      </ResponsiveContainer>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
        {coverage.map(c => (
          <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13 }}>{c.label.split(' ')[0]}</span>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 99 }}>
              <div style={{ width: `${c.score}%`, height: '100%', borderRadius: 99,
                background: c.score >= 70 ? '#10B981' : c.score >= 40 ? '#F59E0B' : '#F43F5E' }} />
            </div>
            <span style={{ fontSize: 11, color: '#A598C7', width: 28 }}>{c.score}%</span>
          </div>
        ))}
      </div>
    </>
  )
}

export default function StyleAnalysisPage() {
  const { user } = useAuth()
  const [items, setItems]       = useState([])
  const [outfits, setOutfits]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [chartTab, setChartTab] = useState('Loại')
  const shareRef                = useRef(null)
  const share                   = useShare(shareRef)

  const load = useCallback(async () => {
    if (!user?.uid) return
    setLoading(true); setError('')
    try {
      const [i, o] = await Promise.all([getClothingItems(user.uid), getOutfits(user.uid)])
      setItems(i); setOutfits(o)
    } catch (e) {
      console.error('Lỗi tải dữ liệu:', e)
      setError('Không thể tải dữ liệu. Thử lại sau.')
    } finally { setLoading(false) }
  }, [user?.uid])

  useEffect(() => { load() }, [load])

  const typeData = useMemo(() => {
    const s = items.reduce((acc, i) => { if (i.type) acc[i.type] = (acc[i.type]||0)+1; return acc }, {})
    return Object.entries(s).map(([name,value]) => ({name,value})).sort((a,b)=>b.value-a.value).slice(0,6)
  }, [items])

  const colorData = useMemo(() => {
    const s = items.reduce((acc, i) => { if (i.color) acc[i.color] = (acc[i.color]||0)+1; return acc }, {})
    return Object.entries(s).map(([name,value]) => ({name,value})).sort((a,b)=>b.value-a.value).slice(0,5)
  }, [items])

  const sizeData = useMemo(() => {
    const s = {}
    for (const item of items) {
      const sz = item.size && item.size !== 'Không rõ' ? item.size : null
      if (!sz) continue
      s[sz] = (s[sz] || 0) + 1
    }
    const ordered = SIZE_GROUP_ORDER.filter(k => s[k]).map(k => ({ name: k, value: s[k] }))
    const others  = Object.entries(s).filter(([k]) => !SIZE_GROUP_ORDER.includes(k)).map(([name,value]) => ({name,value}))
    return [...ordered, ...others]
  }, [items])

  const dominantSize = useMemo(() => (
    sizeData.length ? sizeData.reduce((a,b) => b.value > a.value ? b : a).name : null
  ), [sizeData])

  const occasionData = useMemo(() => (
    Object.entries(OCCASION_TYPES).map(([label,types]) => ({
      name: label, value: items.filter(i => types.includes(i.type)).length,
    })).filter(d => d.value > 0)
  ), [items])

  const { avgMatch, hasMatchData } = useMemo(() => {
    const w = outfits.filter(o => typeof o.matchPercentage === 'number')
    if (!w.length) return { avgMatch: 0, hasMatchData: false }
    return { avgMatch: Math.round(w.reduce((s,o) => s+o.matchPercentage, 0)/w.length), hasMatchData: true }
  }, [outfits])

  const styleLabel = useMemo(() => {
    if (!items.length) return null

    // Nguồn chính: style_tags AI đã gán cho từng món lúc phân tích ảnh (11 tag,
    // xem lib/constants.js STYLE_TAGS) — chính xác hơn nhiều so với chỉ đoán qua
    // loại đồ, và cho phép phát hiện phong cách LAI (VD: Casual pha Streetwear)
    // thay vì bị ép về đúng 1 nhãn.
    const tagCounts = {}
    let itemsWithTags = 0
    items.forEach(i => {
      const tags = i.description?.style_tags
      if (Array.isArray(tags) && tags.length) {
        itemsWithTags++
        tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1 })
      }
    })

    // Chỉ dùng cách tính mới nếu đủ dữ liệu (ít nhất một nửa số món có style_tags,
    // tối thiểu 3 món) — tủ đồ cũ có thể chưa có field này.
    if (itemsWithTags >= Math.max(3, items.length * 0.5)) {
      const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])
      if (!sorted.length) return 'Đa phong cách'
      const [topTag, topCount] = sorted[0]
      const topLabel  = STYLE_TAG_LABELS[topTag] || topTag
      const topShare  = topCount / itemsWithTags
      const second    = sorted[1]
      const secondShare = second ? second[1] / itemsWithTags : 0
      const secondLabel = second ? (STYLE_TAG_LABELS[second[0]] || second[0]) : null

      // Phong cách lai: 2 tag đầu gần nhau (cách nhau dưới 15 điểm %) và tag thứ 2
      // vẫn chiếm tỉ trọng đáng kể (>= 25%) — tránh gọi "lai" khi tag thứ 2 chỉ lác đác vài món.
      if (second && (topShare - secondShare) < 0.15 && secondShare >= 0.25) {
        return `${topLabel} pha ${secondLabel}`
      }
      if (topShare >= 0.35) return topLabel
      return 'Đa phong cách'
    }

    // Fallback: chưa đủ món có style_tags — dùng cách đoán qua loại đồ như trước
    const f = items.filter(i => FORMAL_TYPES.includes(i.type)).length
    const c = items.filter(i => CASUAL_TYPES.includes(i.type)).length
    const s = items.filter(i => SPORTY_TYPES.includes(i.type)).length
    const t = items.length
    if (f/t > 0.5) return 'Thanh lịch'
    if (c/t > 0.5) return 'Casual'
    if (s/t > 0.4) return 'Năng động'
    if (f > c && f > s) return 'Thanh lịch'
    if (c > f && c > s) return 'Casual'
    return 'Đa phong cách'
  }, [items])

  const suggestions = useMemo(() => {
    const list = []
    if (!items.length) return ['Thêm món đồ đầu tiên để bắt đầu phân tích phong cách']
    if (items.length < 5) list.push('Thêm ít nhất 5 món để AI phối đồ đa dạng hơn')
    if (colorData.length <= 2) list.push('Tủ đồ đang thiên về ít màu — thử thêm màu tương phản')
    if (!items.some(i => i.type === 'Áo khoác')) list.push('Chưa có áo khoác — item linh hoạt cho mọi outfit')
    if (hasMatchData && avgMatch < 70) list.push('Match % còn thấp — thêm basic items màu trung tính')
    if (!hasMatchData && outfits.length === 0) list.push('Tạo outfit đầu tiên để xem chỉ số phối đồ')
    const noSize = items.filter(i => !i.size || i.size === 'Không rõ').length
    if (noSize > 0) list.push(`${noSize} món chưa có kích cỡ — thêm size giúp AI gợi ý outfit vừa vặn hơn`)
    if (!list.length) list.push('Tủ đồ của bạn đang rất ổn! Tiếp tục thêm các item phụ kiện')
    return list
  }, [items, colorData, avgMatch, hasMatchData, outfits])

  const currentStats = useMemo(() => ({
    totalItems: items.length, totalOutfits: outfits.length, avgMatch, hasMatchData, styleLabel,
  }), [items.length, outfits.length, avgMatch, hasMatchData, styleLabel])
  const delta = useStyleHistory(user?.uid, currentStats)

  if (loading) return <StatsSkeleton />

  if (error) return (
    <div style={{ paddingBottom: 80 }}>
      <div className="page-header"><h2>Phong cách của bạn</h2></div>
      <div style={{ textAlign: 'center', padding: 32 }}>
        <p style={{ color: '#F43F5E', fontSize: 14, marginBottom: 16 }}>{error}</p>
        {}
        <button onClick={load} className="btn-primary" style={{ padding: '10px 24px' }}>↺ Thử lại</button>
      </div>
    </div>
  )

  if (!items.length) return (
    <div style={{ paddingBottom: 80 }}>
      <div className="page-header"><h2>Phong cách của bạn</h2></div>
      <EmptyState onNavigate={() => window.location.hash = '#/wardrobe'} />
    </div>
  )

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Phong cách của bạn</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {}
          <button onClick={load} disabled={loading} title="Làm mới"
            style={{ background: 'none', border: 'none', color: '#8B5CF6', fontSize: 20, cursor: 'pointer', opacity: loading ? 0.4 : 1 }}>⟳</button>
          {}
          <button onClick={share} style={{
            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: 99, padding: '6px 12px', color: '#A78BFA', fontSize: 12, cursor: 'pointer',
          }}>📸 Lưu ảnh</button>
        </div>
      </div>

      <div ref={shareRef} style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { icon:'👗', label:'Tổng đồ',  val: items.length,    delta: delta?.items },
            { icon:'✨', label:'Outfits',   val: outfits.length,  delta: delta?.outfits },
            { icon:'💯', label:'Match TB',  val: hasMatchData ? avgMatch : null, delta: delta?.match, suffix:'%' },
          ].map(({ icon, label, val, delta: d, suffix='' }) => (
            <div key={label} className="card" style={{ textAlign: 'center', padding: 14 }}>
              <p style={{ fontSize: 24 }}>{icon}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#A78BFA' }}>
                {val === null ? 'N/A' : <><AnimCount target={val} />{suffix}</>}
                <DeltaBadge val={d} suffix={suffix} />
              </p>
              <p style={{ fontSize: 11, color: '#A598C7' }}>{label}</p>
            </div>
          ))}
        </div>

        {}
        {styleLabel && (
          <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(244,63,94,0.1))' }}>
            <p style={{ color: '#A598C7', fontSize: 13, marginBottom: 6 }}>Phong cách chủ đạo</p>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, marginBottom: 6,
              background: 'linear-gradient(135deg, #8B5CF6, #F43F5E)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {styleLabel}
            </p>
            <p style={{ color: '#A598C7', fontSize: 12 }}>{describeStyleLabel(styleLabel)}</p>
          </div>
        )}

        {}
        <AIInsight items={items} outfits={outfits} styleLabel={styleLabel}
          avgMatch={avgMatch} hasMatchData={hasMatchData} />

        {}
        <TrendScore items={items} colorData={colorData} />

        {}
        <div className="card">
          <div style={{ display: 'flex', background: '#0F0A1E', borderRadius: 10, padding: 3, marginBottom: 16, gap: 2 }}>
            {CHART_TABS.map(tab => (
              <button key={tab} onClick={() => setChartTab(tab)} style={{
                flex: 1, padding: '7px 2px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 500, transition: 'all 0.2s',
                background: chartTab === tab ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' : 'none',
                color: chartTab === tab ? 'white' : '#A598C7',
              }}>{tab}</button>
            ))}
          </div>

          {}
          {chartTab === 'Loại' && typeData.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={typeData} layout="vertical">
                <XAxis type="number" allowDecimals={false} tick={{ fill: '#A598C7', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#A598C7', fontSize: 11 }} width={70} />
                <Tooltip contentStyle={{ background: '#1A1230', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, color: '#F8F5FF' }} />
                <Bar dataKey="value" radius={[0,4,4,0]}>
                  {}
                  {typeData.map((entry, i) => <Cell key={entry.name} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {}
          {chartTab === 'Màu' && colorData.length > 0 && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={colorData} cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                    dataKey="value" paddingAngle={3} label={renderPieLabel} labelLine={false}>
                    {colorData.map((entry, i) => <Cell key={entry.name} fill={getColor(entry.name, i)} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1A1230', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, color: '#F8F5FF' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                {colorData.map((item, i) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                      background: getColor(item.name, i),
                      border: item.name === 'Trắng' ? '1px solid #444' : 'none' }} />
                    <span style={{ fontSize: 12, color: '#A598C7', flex: 1, minWidth: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </span>
                    <span style={{ fontSize: 12, color: '#A78BFA', flexShrink: 0 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {}
          {chartTab === 'Size' && (
            sizeData.length > 0 ? (
              <>
                {dominantSize && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#A78BFA', background: 'rgba(139,92,246,0.15)', padding: '3px 10px', borderRadius: 20 }}>
                      Phổ biến nhất: <strong>{dominantSize}</strong>
                    </span>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={Math.max(100, sizeData.length * 32)}>
                  <BarChart data={sizeData} layout="vertical" margin={{ right: 24 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fill: '#A598C7', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={52} tick={{ fill: '#F8F5FF', fontSize: 12, fontWeight: 600 }} />
                    <Tooltip formatter={v => [`${v} món`, 'Số lượng']}
                      contentStyle={{ background: '#1A1230', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, color: '#F8F5FF' }} />
                    <Bar dataKey="value" radius={[0,6,6,0]}>
                      {sizeData.map((entry, i) => <Cell key={entry.name} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : (
              <p style={{ textAlign: 'center', color: '#6B5E8A', fontSize: 13, padding: 24 }}>
                Chưa có thông tin size — thêm size khi upload đồ để xem phân bổ
              </p>
            )
          )}

          {}
          {chartTab === 'Mùa' && <SeasonalCoverage items={items} />}

          {}
          {chartTab === 'Dịp' && (
            occasionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={occasionData} layout="vertical">
                  <XAxis type="number" allowDecimals={false} tick={{ fill: '#A598C7', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#A598C7', fontSize: 11 }} width={70} />
                  <Tooltip contentStyle={{ background: '#1A1230', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, color: '#F8F5FF' }} />
                  <Bar dataKey="value" radius={[0,4,4,0]}>
                    {occasionData.map((entry, i) => <Cell key={entry.name} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ textAlign: 'center', color: '#6B5E8A', fontSize: 13, padding: 24 }}>
                Chưa đủ dữ liệu để phân tích theo dịp
              </p>
            )
          )}
        </div>

        {}
        <VersatilitySection items={items} outfits={outfits} />

        {}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(244,63,94,0.05))' }}>
          <h3 style={{ fontSize: 16, fontFamily: 'Playfair Display, serif', marginBottom: 10 }}>💡 Gợi ý cải thiện</h3>
          <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggestions.map((tip, i) => (
              <li key={i} style={{ color: '#A598C7', fontSize: 13 }}>{tip}</li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  )
}
