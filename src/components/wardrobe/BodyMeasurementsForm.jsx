import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { saveBodyMeasurements } from '../../services/userService'

const FIELDS = [
  { key: 'height',   label: 'Chiều cao (cm)',        placeholder: '165' },
  { key: 'weight',   label: 'Cân nặng (kg)',          placeholder: '55'  },
  { key: 'chest',    label: 'Vòng ngực (cm)',          placeholder: '88'  },
  { key: 'waist',    label: 'Vòng eo (cm)',            placeholder: '68'  },
  { key: 'hips',     label: 'Vòng hông (cm)',          placeholder: '95'  },
  { key: 'inseam',   label: 'Dài chân trong (cm)',    placeholder: '75'  },
  { key: 'shoulder', label: 'Rộng vai (cm)',           placeholder: '38'  },
  { key: 'sleeve',   label: 'Dài tay (cm)',            placeholder: '58'  },
]

export default function BodyMeasurementsForm({ onSaved, isSettings = false }) {
  const { user, profile, refreshProfile } = useAuth()
  const [data, setData] = useState({
    height:   profile?.height   || '',
    weight:   profile?.weight   || '',
    chest:    profile?.chest    || '',
    waist:    profile?.waist    || '',
    hips:     profile?.hips     || '',
    inseam:   profile?.inseam   || '',
    shoulder: profile?.shoulder || '',
    sleeve:   profile?.sleeve   || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!data.height || !data.weight || !data.chest || !data.waist || !data.hips) {
      return setError('Vui lòng điền ít nhất: chiều cao, cân nặng, ngực, eo, hông')
    }
    setLoading(true)
    try {
      await saveBodyMeasurements(user.uid, data)
      await refreshProfile()
      setSaved(true)
      setTimeout(() => onSaved && onSaved(), 800)
    } catch (e) {
      console.error('Lưu số đo cơ thể thất bại:', e)
      setError('Lưu thất bại. Thử lại.')
    }
    finally { setLoading(false) }
  }

  return (
    <div>
      {!isSettings && (
        <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <p style={{ color: '#A78BFA', fontSize: 13 }}>
            ✦ Nhập số đo để AI phối đồ chính xác hơn. 5 trường đầu là bắt buộc.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="label" style={{ fontSize: 12 }}>{label}</label>
            <input className="input-field" type="number" placeholder={placeholder}
              value={data[key]} onChange={e => setData(d => ({ ...d, [key]: e.target.value }))} />
          </div>
        ))}
      </div>

      {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}

      <button className="btn-primary" onClick={handleSave} disabled={loading}>
        {loading ? 'Đang lưu...' : saved ? '✓ Đã lưu!' : 'Lưu số đo'}
      </button>

      {!isSettings && (
        <button className="btn-secondary" onClick={() => onSaved && onSaved()}
          style={{ marginTop: 10 }}>
          Bỏ qua lần này
        </button>
      )}
    </div>
  )
}
