import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../hooks/useAuth.jsx'
import { logout, changePassword, deleteAccount, AUTH_ERROR_MESSAGES } from '../services/authService'
import BodyMeasurementsForm from '../components/wardrobe/BodyMeasurementsForm'
import { setGeminiApiKey, getGeminiApiKey, setVisionApiKey, getVisionApiKey, testApiKeys } from '../services/apiKeyService'
import { updateAvatar } from '../services/userService'
import { showToast } from '../components/notifications/ToastNotification'
import { MBQRPayment } from '../components/payment/MBQRPayment'
import { SupportAdBlock } from '../components/settings/SupportAdBlock'
import GiftCodeInput from '../components/settings/GiftCodeInput'

const PREMIUM_PACKAGES = [
  { id: 'monthly',   name: '1 tháng', price: 25000,  days: 30,  desc: '30 ngày Premium',       popular: false, savings: null  },
  { id: 'quarterly', name: '3 tháng', price: 70000,  days: 92,  desc: '92 ngày · tiết kiệm 7%', popular: false, savings: '7%'  },
  { id: 'yearly',    name: '1 năm',   price: 250000, days: 365, desc: '365 ngày · tiết kiệm 17%', popular: true, savings: '17%' },
]

export default function SettingsPage() {

  const { user, profile, isPremium, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [section, setSection] = useState(() => searchParams.get('section') || null)
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [apiKeys, setApiKeys] = useState({ gemini: '', vision: '' })
  const [apiTestStatus, setApiTestStatus] = useState(null)
  const [apiTestLoading, setApiTestLoading] = useState(false)
  const [apiSaveSuccess, setApiSaveSuccess] = useState(false)
  const [selectedPkg, setSelectedPkg] = useState(null)
  const [showPayment, setShowPayment] = useState(false)
  const [retryKey, setRetryKey]       = useState(0)

  useEffect(() => {
    setApiKeys({ gemini: getGeminiApiKey() || '', vision: getVisionApiKey() || '' })
  }, [])

  const handleBuyPremium = (pkg) => {
    setSelectedPkg(pkg)
    setShowPayment(true)
  }

  const handlePaymentSuccess = (data) => {
    setShowPayment(false)
    showToast.success(`🎉 Premium ${data?.packageName || selectedPkg?.name} đã được kích hoạt!`)
    setSelectedPkg(null)

  }

  const handleCancelPayment = () => {
    setShowPayment(false)
    setSelectedPkg(null)
  }

  const handleLogout = async () => { await logout(); navigate('/') }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setAvatarUploading(true)
    try {

      await updateAvatar(user.uid, file)
      await refreshProfile()
      showToast.success('✅ Đã cập nhật ảnh đại diện')
    } catch (err) {
      showToast.error(err.message || 'Không thể cập nhật ảnh đại diện')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleChangePassword = async () => {
    setPwError('')
    if (pwForm.newPw !== pwForm.confirm) return setPwError('Mật khẩu mới không khớp')
    if (pwForm.newPw.length < 6) return setPwError('Mật khẩu cần ít nhất 6 ký tự')
    setLoading(true)
    try {
      await changePassword(pwForm.current, pwForm.newPw)
      setPwSuccess(true)
      setPwForm({ current: '', newPw: '', confirm: '' })
      setTimeout(() => setPwSuccess(false), 3000)
    } catch (e) {

      setPwError(AUTH_ERROR_MESSAGES[e.code] || 'Lỗi. Thử lại.')
    } finally { setLoading(false) }
  }

  const [deleteModal, setDeleteModal] = useState(false)
  const [deletePw, setDeletePw]       = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [delReqTypes, setDelReqTypes]     = useState({ wardrobe: false, payment: false, all: false })
  const [delReqNote, setDelReqNote]       = useState('')
  const [delReqLoading, setDelReqLoading] = useState(false)
  const [delReqSent, setDelReqSent]       = useState(false)

  const handleDelReqToggle = (key) =>
    setDelReqTypes(prev => ({ ...prev, [key]: !prev[key] }))

  const handleSubmitDelReq = async () => {
    if (!Object.values(delReqTypes).some(Boolean)) {
      showToast.error('Vui lòng chọn ít nhất một loại dữ liệu cần xóa')
      return
    }
    setDelReqLoading(true)
    try {
      await addDoc(collection(db, 'deletion_requests'), {
        uid:       user.uid,
        email:     user.email,
        types:     delReqTypes,
        note:      delReqNote.trim(),
        status:    'pending',
        createdAt: serverTimestamp(),
      })
      setDelReqSent(true)
      showToast.success('Yêu cầu đã gửi! Chúng tôi sẽ xử lý trong 30 ngày làm việc.')
    } catch (e) {
      showToast.error('Gửi yêu cầu thất bại. Vui lòng thử lại.')
    } finally {
      setDelReqLoading(false)
    }
  }

  const handleDeleteAccount = () => {
    setDeleteModal(true)
    setDeletePw('')
    setDeleteError('')
  }
  const confirmDeleteAccount = async () => {
    if (!deletePw.trim()) { setDeleteError('Vui lòng nhập mật khẩu'); return }
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await deleteAccount(deletePw)
      navigate('/')
    } catch (e) {
      console.error('Xoá tài khoản thất bại:', e)

      setDeleteError(AUTH_ERROR_MESSAGES[e.code] || 'Xóa thất bại. Thử lại.')
      setDeleteLoading(false)
    }
  }

  const handleSaveApiKeys = () => {
    if (!apiKeys.gemini.trim()) { showToast.error('Vui lòng nhập Gemini API Key'); return }
    setGeminiApiKey(apiKeys.gemini.trim())
    if (apiKeys.vision.trim()) setVisionApiKey(apiKeys.vision.trim())
    setApiSaveSuccess(true)
    setTimeout(() => setApiSaveSuccess(false), 3000)
  }

  const handleTestApiKeys = async () => {
    if (!apiKeys.gemini.trim()) { showToast.error('Nhập Gemini API Key trước'); return }
    setApiTestLoading(true)
    setApiTestStatus(null)
    try {
      const result = await testApiKeys(apiKeys.gemini.trim(), apiKeys.vision.trim() || undefined)
      setApiTestStatus(result)
    } catch (e) {
      setApiTestStatus({ valid: false, error: e.message })
    } finally { setApiTestLoading(false) }
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="page-header"><h2>Cài đặt</h2></div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {}
        <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <label
            htmlFor="avatar-upload-input"
            style={{
              position: 'relative', width: 52, height: 52, flexShrink: 0,
              cursor: avatarUploading ? 'wait' : 'pointer',
              borderRadius: '50%', overflow: 'visible',
            }}
            title="Đổi ảnh đại diện"
          >
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Ảnh đại diện"
                style={{
                  width: 52, height: 52, borderRadius: '50%',
                  objectFit: 'cover', display: 'block',
                  opacity: avatarUploading ? 0.5 : 1,
                }}
              />
            ) : (
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #8B5CF6, #F43F5E)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, opacity: avatarUploading ? 0.5 : 1,
              }}>
                {user?.displayName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            {}
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 20, height: 20, borderRadius: '50%',
              background: '#8B5CF6', border: '2px solid #1A1230',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10,
            }}>
              {avatarUploading ? '⏳' : '📷'}
            </div>
            <input
              id="avatar-upload-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={avatarUploading}
              style={{ display: 'none' }}
            />
          </label>
          <div>
            <p style={{ fontWeight: 600, fontSize: 16 }}>{profile?.name || user?.displayName}</p>
            <p style={{ color: '#A598C7', fontSize: 13 }}>{user?.email}</p>
          </div>
        </div>

        {}
        <div className="card" style={{ border: isPremium ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(245,158,11,0.3)', background: isPremium ? 'rgba(139,92,246,0.05)' : 'rgba(245,158,11,0.04)' }}>
          <button style={s.sectionBtn} onClick={() => setSection(section === 'premium' ? null : 'premium')}>
            <span>{isPremium ? '⭐ Premium (đang kích hoạt)' : '👑 Nâng cấp Premium'}</span>
            <span style={{ color: '#F59E0B' }}>{section === 'premium' ? '▲' : '▼'}</span>
          </button>
          {section === 'premium' && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {isPremium ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <p style={{ fontSize: 36, marginBottom: 8 }}>⭐</p>
                  <p style={{ fontWeight: 600, color: '#A78BFA' }}>Bạn đang dùng Premium!</p>
                  <p style={{ color: '#6B5E8A', fontSize: 13, marginTop: 4 }}>Tạo outfit không giới hạn, không quảng cáo</p>
                  <GiftCodeInput onSuccess={refreshProfile} />
                </div>
              ) : (
                <>
                  <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: 10, padding: 12, marginBottom: 4 }}>
                    <p style={{ color: '#F59E0B', fontWeight: 600, marginBottom: 6 }}>✨ Quyền lợi Premium</p>
                    {['Tạo outfit không giới hạn', 'Không xem quảng cáo', 'Phân tích phong cách nâng cao', 'Ưu tiên hỗ trợ'].map(b => (
                      <p key={b} style={{ color: '#A598C7', fontSize: 13, marginBottom: 3 }}>✓ {b}</p>
                    ))}
                  </div>
                  {PREMIUM_PACKAGES.map(pkg => (
                    <div key={pkg.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 14px', borderRadius: 12,
                      background: pkg.popular ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                      border: pkg.popular ? '2px solid #8B5CF6' : '1px solid rgba(139,92,246,0.15)',
                    }}>
                      <div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: 15 }}>{pkg.name}</span>
                          {pkg.popular && <span style={{ background: '#8B5CF6', color: '#fff', fontSize: 9, padding: '2px 7px', borderRadius: 50, fontWeight: 700 }}>TỐT NHẤT</span>}
                          {pkg.savings && <span style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981', fontSize: 10, padding: '2px 7px', borderRadius: 50 }}>🔥 -{pkg.savings}</span>}
                        </div>
                        <p style={{ color: '#6B5E8A', fontSize: 12, marginTop: 2 }}>{pkg.desc}</p>
                        <p style={{ color: '#4B4268', fontSize: 11, marginTop: 1 }}>
                          ~{Math.round(pkg.price / pkg.days).toLocaleString('vi-VN')}đ/ngày
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 17, color: '#A78BFA' }}>{pkg.price.toLocaleString('vi-VN')}đ</span>
                        <button
                          onClick={() => handleBuyPremium(pkg)}
                          disabled={showPayment}
                          style={{
                            background: showPayment && selectedPkg?.id === pkg.id
                              ? 'rgba(139,92,246,0.3)'
                              : 'linear-gradient(135deg,#8B5CF6,#F43F5E)',
                            border: 'none', borderRadius: 50, padding: '8px 14px',
                            color: '#fff', fontWeight: 600, fontSize: 13,
                            cursor: showPayment ? 'not-allowed' : 'pointer',
                            opacity: showPayment && selectedPkg?.id !== pkg.id ? 0.45 : 1,
                            minWidth: 52, textAlign: 'center',
                          }}
                        >
                          {showPayment && selectedPkg?.id === pkg.id ? '⏳' : 'Mua'}
                        </button>
                      </div>
                    </div>
                  ))}
                  <GiftCodeInput onSuccess={refreshProfile} />
                </>
              )}
            </div>
          )}
        </div>

        {}
        <SupportAdBlock />

        {}
        <div className="card" style={{ border: '1px solid rgba(139,92,246,0.4)' }}>
          <button style={s.sectionBtn} onClick={() => setSection(section === 'api' ? null : 'api')}>
            <span>🔑 API Keys cá nhân</span>
            <span style={{ color: '#8B5CF6' }}>{section === 'api' ? '▲' : '▼'}</span>
          </button>
          {section === 'api' && !isPremium && (
            <div style={{ marginTop: 16, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: 14 }}>
              <p style={{ color: '#F59E0B', fontSize: 13, marginBottom: 8 }}>
                🔑 Nhập Gemini API Key cá nhân để ưu tiên dùng quota của bạn thay vì quota chung.
                ưu tiên hơn server chung.
              </p>
              <p style={{ color: '#A598C7', fontSize: 12 }}>
                Gói Free vẫn tạo outfit được bình thường (3 lượt/ngày + 2 lượt xem
                quảng cáo), chỉ là dùng server chung thay vì key riêng của bạn.
              </p>
            </div>
          )}
          {section === 'api' && isPremium && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, padding: 12 }}>
                <p style={{ color: '#A78BFA', fontSize: 12 }}>✦ API Key lưu trên trình duyệt của bạn, chỉ gửi lên server khi tạo outfit (không lưu trên server).</p>
                {}
                <p style={{ fontSize: 12, color: '#A598C7', marginTop: 8 }}>
                  ⚠️ Key không đồng bộ đa thiết bị. Hãy tự bảo vệ key của bạn
                  và không lưu key khi dùng chung máy/thiết bị công cộng với người khác.
                </p>
              </div>
              <div>
                <label className="label">Gemini API Key <span style={{ color: '#6B5E8A' }}>(tùy chọn — ưu tiên 1, dùng trước server)</span></label>
                <input className="input-field" type="password" placeholder="AIzaSy..."
                  value={apiKeys.gemini} onChange={e => setApiKeys({ ...apiKeys, gemini: e.target.value })} />
                <p style={{ color: '#6B5E8A', fontSize: 11, marginTop: 4 }}>
                  Lấy miễn phí tại <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: '#8B5CF6' }}>aistudio.google.com</a>.
                  Không nhập vẫn dùng AI được — hệ thống tự dùng server Premium.
                </p>
              </div>
              <div>
                <label className="label">Google Vision API Key <span style={{ color: '#6B5E8A' }}>(tùy chọn)</span></label>
                <input className="input-field" type="password" placeholder="AIzaSy..."
                  value={apiKeys.vision} onChange={e => setApiKeys({ ...apiKeys, vision: e.target.value })} />
                <p style={{ color: '#6B5E8A', fontSize: 11, marginTop: 4 }}>Nếu không nhập, Gemini sẽ tự phân tích ảnh</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" onClick={handleSaveApiKeys} style={{ flex: 1 }}>
                  {apiSaveSuccess ? '✅ Đã lưu!' : '💾 Lưu'}
                </button>
                <button className="btn-secondary" onClick={handleTestApiKeys} disabled={apiTestLoading} style={{ flex: 1 }}>
                  {apiTestLoading ? '⏳...' : '🧪 Test'}
                </button>
              </div>
              {apiTestStatus && (
                <div style={{ padding: 10, borderRadius: 8, fontSize: 13,
                  background: apiTestStatus.valid ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                  color: apiTestStatus.valid ? '#10B981' : '#F43F5E',
                  border: `1px solid ${apiTestStatus.valid ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}` }}>
                  {apiTestStatus.valid ? '✅ API Key hoạt động tốt!' : `❌ ${apiTestStatus.error}`}
                </div>
              )}
            </div>
          )}
        </div>

        {}
        <div className="card">
          <button style={s.sectionBtn} onClick={() => setSection(section === 'body' ? null : 'body')}>
            <span>📏 Số đo cơ thể</span>
            <span style={{ color: '#8B5CF6' }}>{section === 'body' ? '▲' : '▼'}</span>
          </button>
          {section === 'body' && <div style={{ marginTop: 16 }}><BodyMeasurementsForm isSettings onSaved={() => setSection(null)} /></div>}
        </div>

        {}
        <div className="card">
          <button style={s.sectionBtn} onClick={() => setSection(section === 'password' ? null : 'password')}>
            <span>🔒 Đổi mật khẩu</span>
            <span style={{ color: '#8B5CF6' }}>{section === 'password' ? '▲' : '▼'}</span>
          </button>
          {section === 'password' && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['current', 'newPw', 'confirm'].map((k, i) => (
                <div key={k}>
                  <label className="label">{['Mật khẩu hiện tại', 'Mật khẩu mới', 'Xác nhận'][i]}</label>
                  <input className="input-field" type="password" value={pwForm[k]}
                    onChange={e => setPwForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
              {pwError && <p className="error-text">{pwError}</p>}
              {pwSuccess && <p style={{ color: '#10B981', fontSize: 13 }}>✓ Đổi mật khẩu thành công!</p>}
              <button className="btn-primary" onClick={handleChangePassword} disabled={loading}>
                {loading ? '...' : 'Đổi mật khẩu'}
              </button>
            </div>
          )}
        </div>

        {}
        <div style={s.card}>
          <button style={s.sectionBtn} onClick={() => setSection(section === 'delreq' ? null : 'delreq')}>
            <span>🛡️ Yêu cầu xóa dữ liệu</span>
            <span style={{ color: '#8B5CF6' }}>{section === 'delreq' ? '▲' : '▼'}</span>
          </button>

          {section === 'delreq' && (
            <div style={{ marginTop: 16 }}>
              {delReqSent ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ fontSize: 32, margin: '0 0 8px' }}>✅</p>
                  <p style={{ color: '#10B981', fontWeight: 600 }}>Yêu cầu đã gửi thành công!</p>
                  <p style={{ color: '#A598C7', fontSize: 13, lineHeight: 1.6 }}>
                    Chúng tôi sẽ xử lý và phản hồi qua email <strong>{user?.email}</strong> trong vòng 30 ngày làm việc.
                  </p>
                  <button onClick={() => { setDelReqSent(false); setDelReqTypes({ wardrobe: false, payment: false, all: false }); setDelReqNote('') }}
                    style={{ marginTop: 12, background: 'none', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 50, padding: '8px 20px', color: '#8B5CF6', fontSize: 13, cursor: 'pointer' }}>
                    Gửi yêu cầu khác
                  </button>
                </div>
              ) : (
                <>
                  <p style={{ color: '#A598C7', fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
                    Theo quyền của bạn được quy định tại Nghị định 13/2023/NĐ-CP, bạn có thể yêu cầu xóa một phần hoặc toàn bộ dữ liệu.
                    Chọn loại dữ liệu bạn muốn xóa:
                  </p>

                  {}
                  {[
                    { key: 'wardrobe', label: '👔 Toàn bộ tủ đồ & ảnh trang phục', sub: 'Xóa tất cả clothing items, ảnh trên Cloudinary, lịch sử outfit' },
                    { key: 'payment',  label: '💳 Dữ liệu thanh toán & lịch sử giao dịch', sub: 'Xóa hồ sơ Premium, lịch sử thanh toán (ngoại trừ bắt buộc giữ theo luật kế toán)' },
                    { key: 'all',      label: '🗑️ Toàn bộ dữ liệu & tài khoản', sub: 'Xóa tài khoản và mọi dữ liệu liên quan — tương đương "Xóa tài khoản" bên dưới' },
                  ].map(({ key, label, sub }) => (
                    <label key={key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={delReqTypes[key]} onChange={() => handleDelReqToggle(key)}
                        style={{ marginTop: 3, accentColor: '#8B5CF6', flexShrink: 0 }} />
                      <span>
                        <span style={{ color: '#F8F5FF', fontSize: 14 }}>{label}</span>
                        <span style={{ display: 'block', color: '#6B5E8A', fontSize: 12, marginTop: 2 }}>{sub}</span>
                      </span>
                    </label>
                  ))}

                  {}
                  <textarea
                    placeholder="Mô tả thêm yêu cầu của bạn (tùy chọn)..."
                    value={delReqNote}
                    onChange={e => setDelReqNote(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%', marginTop: 4, marginBottom: 14,
                      background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)',
                      borderRadius: 12, padding: '10px 14px', color: '#F8F5FF',
                      fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                  />

                  <button
                    onClick={handleSubmitDelReq}
                    disabled={delReqLoading || !Object.values(delReqTypes).some(Boolean)}
                    style={{
                      width: '100%', background: 'rgba(139,92,246,0.15)',
                      border: '1px solid rgba(139,92,246,0.3)', borderRadius: 50,
                      padding: 13, color: '#8B5CF6', fontWeight: 600, fontSize: 14,
                      cursor: 'pointer',
                      opacity: (!Object.values(delReqTypes).some(Boolean) || delReqLoading) ? 0.5 : 1,
                    }}>
                    {delReqLoading ? 'Đang gửi...' : '📨 Gửi yêu cầu xóa dữ liệu'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <button className="btn-secondary" onClick={handleLogout} style={{ marginTop: 8 }}>🚪 Đăng xuất</button>
        <button onClick={handleDeleteAccount}
          style={{ background: 'none', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 50, padding: 13, color: '#F43F5E', fontSize: 14, cursor: 'pointer', width: '100%' }}>
          🗑️ Xóa tài khoản
        </button>
        <p style={{ textAlign: 'center', color: '#6B5E8A', fontSize: 12 }}>Lama Stylers v2.1.0</p>
      </div>

      {}
      {}
      {deleteModal && (
        <div style={stylesModal.overlay}>
          <div style={{ ...stylesModal.content, maxWidth: 340, padding: 24 }}>
            <p style={{ fontSize: 20, marginBottom: 4, textAlign: 'center' }}>🗑️</p>
            <h3 style={{ textAlign: 'center', fontSize: 16, marginBottom: 6 }}>Xóa tài khoản</h3>
            <p style={{ color: '#F43F5E', fontSize: 13, textAlign: 'center', marginBottom: 16, lineHeight: 1.5 }}>
              ⚠️ Toàn bộ dữ liệu sẽ bị xóa vĩnh viễn. Nhập mật khẩu để xác nhận.
            </p>
            <input
              className="input-field"
              type="password"
              placeholder="Mật khẩu hiện tại"
              value={deletePw}
              onChange={e => setDeletePw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !deleteLoading && confirmDeleteAccount()}
              style={{ marginBottom: 8 }}
            />
            {deleteError && <p style={{ color: '#F43F5E', fontSize: 12, marginBottom: 8 }}>{deleteError}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                className="btn-secondary"
                onClick={() => setDeleteModal(false)}
                style={{ flex: 1 }}
                disabled={deleteLoading}
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteAccount}
                disabled={deleteLoading}
                style={{ flex: 1, background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.4)', borderRadius: 50, padding: 12, color: '#F43F5E', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                {deleteLoading ? '...' : 'Xóa tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayment && selectedPkg && (
        <div style={stylesModal.overlay}>
          <div style={stylesModal.content}>
            <div style={stylesModal.header}>
              <h3>💳 Thanh toán</h3>
              <button onClick={handleCancelPayment} style={stylesModal.closeBtn}>✕</button>
            </div>
            {}
            <p style={{ textAlign: 'center', color: '#4B4268', fontSize: 11, margin: '4px 20px 0', paddingBottom: 4 }}>
              Kéo xuống để xem thêm hoặc hủy giao dịch
            </p>
            <MBQRPayment
              key={retryKey}
              amount={selectedPkg.price}
              userId={user.uid}
              userEmail={user.email}
              userName={profile?.name || user.displayName || ''}
              packageId={selectedPkg.id}
              packageName={selectedPkg.name}
              onSuccess={handlePaymentSuccess}
              onCancel={handleCancelPayment}
              onRetry={() => setRetryKey(k => k + 1)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  sectionBtn: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', color: '#F8F5FF', fontSize: 15, fontWeight: 500, border: 'none', cursor: 'pointer', padding: 0 }
}

const stylesModal = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16
  },
  content: {
    background: '#0F0A1E', borderRadius: 20, maxWidth: 480, width: '100%',

    maxHeight: '94vh', overflowY: 'auto', position: 'relative',
    WebkitOverflowScrolling: 'touch',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px 0'
  },
  closeBtn: {
    background: 'none', border: 'none', color: '#A598C7', fontSize: 18,
    cursor: 'pointer', padding: 4
  }
}
