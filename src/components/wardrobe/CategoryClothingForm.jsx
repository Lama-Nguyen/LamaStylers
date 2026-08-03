import { useState, useEffect } from 'react'
import { getSuggestion, applyTypeMapping } from '../../lib/typeMapping'

const TOPS_TYPES     = ['T-shirt', 'Polo', 'Sơ mi', 'Hoodie', 'Sweater', 'Blazer', 'Áo khoác', 'Cardigan', 'Tank top', 'Croptop', 'Khác']
const TOPS_FITS      = ['Ôm body', 'Regular', 'Oversized', 'Boxy', 'Cropped']
const TOPS_SLEEVES   = ['Tay ngắn', 'Tay dài', 'Tay lửng', 'Sát nách']
const TOPS_COLLARS   = ['Tròn', 'Cổ bẻ', 'Cổ trụ', 'Cổ lọ', 'V-neck', 'Khác']
const SHOULDERS      = ['Regular', 'Drop shoulder']

const PANTS_TYPES    = ['Short', 'Jeans', 'Baggy Jeans', 'Kaki', 'Jogger', 'Tây', 'Khác']
const PANTS_FITS     = ['Ôm', 'Regular', 'Rộng', 'Khác']

const ACC_TYPES      = ['Dây chuyền', 'Vòng tay', 'Nhẫn', 'Đồng hồ', 'Kính mát', 'Kính gọng', 'Thắt lưng', 'Túi xách', 'Balo', 'Khăn', 'Khác']
const ACC_STYLES     = ['Casual', 'Formal', 'Streetwear', 'Vintage', 'Minimalist', 'Khác']

const HAT_TYPES      = ['Baseball cap', 'Bucket hat', 'Beanie', 'Snapback', 'Fedora', 'Mũ lưỡi trai', 'Beret', 'Khác']
const HAT_BRIMS      = ['Cong', 'Thẳng', 'Rộng', 'Hẹp']

const MATERIALS      = ['Cotton', 'Jean', 'Kaki', 'Polyester', 'Linen', 'Len', 'Silk', 'Nhung', 'Khác']
const PATTERNS       = ['Trơn', 'Sọc', 'Caro', 'Hoa', 'Họa tiết', 'Logo', 'Khác']
const COLORS         = ['Đen', 'Trắng', 'Xám', 'Xanh navy', 'Xanh dương', 'Xanh lá', 'Đỏ', 'Hồng', 'Vàng', 'Cam', 'Nâu', 'Be/Kem', 'Tím', 'Khác']

const STEPS = ['Thông số cơ bản', 'Thông số chi tiết']

function SelectField({ label, value, onChange, options, required, placeholder }) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
      >
        <option value="">{placeholder || 'Chọn...'}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}

function NumberField({ label, value, onChange, unit = 'cm', placeholder }) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || '0'}
          min={0}
          max={999}
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
        />
        <span className="text-gray-400 text-sm whitespace-nowrap">{unit}</span>
      </div>
    </div>
  )
}

function OtherInput({ value, onChange, placeholder, category }) {
  const [suggestion, setSuggestion] = useState(null)

  useEffect(() => {
    if (!value || value.length < 2) { setSuggestion(null); return }
    const s = getSuggestion(value)
    setSuggestion(s)
  }, [value])

  return (
    <div className="mt-2">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'Vd: boxy tee, cargo pants...'}
        className="w-full bg-gray-700 border border-dashed border-gray-500 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-400"
        autoFocus
      />
      {suggestion && (
        <button
          type="button"
          onClick={() => onChange(null, suggestion.mapping)}
          className="mt-1.5 w-full text-left text-xs bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-1.5 text-purple-300 hover:bg-purple-900/50 transition-colors"
        >
          💡 Có phải bạn muốn chọn: <strong>{suggestion.text}</strong>? (nhấn để chọn)
        </button>
      )}
      {value && !suggestion && value.length > 1 && (
        <p className="mt-1 text-xs text-gray-500">
          Không tìm thấy gợi ý phù hợp — sẽ lưu tên tuỳ chỉnh
        </p>
      )}
    </div>
  )
}

export default function CategoryClothingForm({ category, initialData = {}, onSave, onCancel }) {
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState({})

  const [type, setType]         = useState(initialData.type || '')
  const [customType, setCustomType] = useState('')
  const [appliedMapping, setAppliedMapping] = useState(null)
  const [color, setColor]       = useState(initialData.color || '')
  const [customColor, setCustomColor] = useState('')
  const [material, setMaterial] = useState(initialData.material || '')
  const [pattern, setPattern]   = useState(initialData.pattern || 'Trơn')

  const [topsFit, setTopsFit]         = useState(initialData.fit || '')
  const [topsSleeve, setTopsSleeve]   = useState('')
  const [topsBodyLen, setTopsBodyLen] = useState('')
  const [topsShoulder, setTopsShoulder] = useState('')
  const [topsShoulderCm, setTopsShoulderCm] = useState('')
  const [topsCollar, setTopsCollar]   = useState('')
  const [topsCollarOther, setTopsCollarOther] = useState('')

  const [pantsRise, setPantsRise]     = useState('')
  const [pantsInseam, setPantsInseam] = useState('')
  const [pantsTotalLen, setPantsTotalLen] = useState('')
  const [pantsFit, setPantsFit]       = useState(initialData.fit || '')
  const [pantsFitOther, setPantsFitOther] = useState('')

  const [accSub, setAccSub]           = useState('')
  const [accSize, setAccSize]         = useState('')
  const [accStyle, setAccStyle]       = useState('')

  const [hatSize, setHatSize]         = useState('')
  const [hatDepth, setHatDepth]       = useState('')
  const [hatBrim, setHatBrim]         = useState('')
  const [hatBrimCm, setHatBrimCm]     = useState('')

  const [footwearKind, setFootwearKind] = useState('Giày')
  const [shoeForm, setShoeForm]         = useState('')
  const [shoeName, setShoeName]         = useState('')
  const [sandalsType, setSandalsType]   = useState('')

  const handleCustomTypeChange = (val, mapping = null) => {
    if (mapping) {

      setAppliedMapping(mapping)
      setType(mapping.type || '')
      if (mapping.fit) {
        if (category === 'tops') setTopsFit(mapping.fit)
        if (category === 'pants') setPantsFit(mapping.fit)
      }
      setCustomType(mapping.custom_type || val)
    } else {
      setCustomType(val || '')
      setAppliedMapping(null)
    }
  }

  const validate = () => {
    const errs = {}

    const resolvedType = type || (appliedMapping?.type)
    if (!resolvedType && !customType) {
      errs.type = 'Vui lòng chọn hoặc nhập loại đồ'
    }

    if ((type === 'Khác' || pantsFit === 'Khác') && !customType) {
      errs.customType = 'Vui lòng nhập tên loại đồ'
    }

    const hasMeasurement = [
      topsBodyLen, topsShoulder, pantsRise, pantsInseam, pantsTotalLen,
      hatSize, hatDepth, hatBrimCm, accSize,
    ].some(v => v && v.trim() !== '')

    if (['tops', 'pants', 'headwear'].includes(category) && !hasMeasurement) {
      errs.measurement = 'Vui lòng nhập ít nhất 1 thông số kích thước'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const buildMeasurements = () => {
    const base = {
      category,
      type: appliedMapping?.type || (type !== 'Khác' ? type : null),
      custom_type: customType || null,
      display_name: appliedMapping?.display_name || customType || type || null,
      color: color === 'Khác' ? customColor : color,
      material: material !== 'Khác' ? material : null,
      pattern: pattern !== 'Khác' ? pattern : null,
    }

    if (category === 'tops') {
      return {
        ...base,
        fit: appliedMapping?.fit || topsFit,
        sleeve_length: topsSleeve,
        body_length_cm: topsBodyLen ? Number(topsBodyLen) : null,
        shoulder_type: topsShoulder,
        shoulder_cm: topsShoulderCm ? Number(topsShoulderCm) : null,
        collar: topsCollar === 'Khác' ? topsCollarOther : topsCollar,
      }
    }
    if (category === 'pants') {
      return {
        ...base,
        fit: appliedMapping?.fit || (pantsFit === 'Khác' ? pantsFitOther : pantsFit),
        rise_cm: pantsRise ? Number(pantsRise) : null,
        inseam_cm: pantsInseam ? Number(pantsInseam) : null,
        total_length_cm: pantsTotalLen ? Number(pantsTotalLen) : null,
      }
    }
    if (category === 'accessories') {
      return {
        ...base,
        sub_type: accSub,
        size: accSize,
        style: accStyle,
      }
    }
    if (category === 'headwear') {
      return {
        ...base,
        head_circumference_cm: hatSize ? Number(hatSize) : null,
        depth_cm: hatDepth ? Number(hatDepth) : null,
        brim_type: hatBrim,
        brim_width_cm: hatBrimCm ? Number(hatBrimCm) : null,
      }
    }
    if (category === 'footwear') {

      return {
        ...base,
        type:     footwearKind,
        sub_type: footwearKind === 'Giày' ? shoeForm : sandalsType,
        name:     footwearKind === 'Giày' && shoeName ? shoeName.trim() : null,
      }
    }
    return base
  }

  const handleSave = () => {
    if (!validate()) return
    onSave(buildMeasurements())
  }

  const isLastStep = step === STEPS.length - 1

  const categoryLabel = {
    tops: 'Áo', pants: 'Quần', accessories: 'Phụ kiện', headwear: 'Mũ/Nón', footwear: 'Giày/Dép',
  }[category] || 'Đồ'

  return (
    <div className="flex flex-col h-full">
      {}
      <div className="flex border-b border-gray-700 mb-4 flex-shrink-0">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(i)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              step === i
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-1 pb-4">
        {}
        {step === 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-3">
              Category: <span className="text-purple-400 font-medium">{categoryLabel}</span>
            </p>

            {}
            {category === 'tops' && (
              <>
                <SelectField
                  label="Loại áo"
                  value={type}
                  onChange={v => { setType(v); if (v !== 'Khác') { setCustomType(''); setAppliedMapping(null) }}}
                  options={TOPS_TYPES}
                  required
                  placeholder="Chọn loại áo..."
                />
                {type === 'Khác' && (
                  <OtherInput
                    value={customType}
                    onChange={handleCustomTypeChange}
                    placeholder="Vd: boxy tee, áo corset, crop hoodie..."
                    category={category}
                  />
                )}
                {errors.customType && <p className="text-red-400 text-xs mt-1">{errors.customType}</p>}

                <SelectField label="Dáng áo" value={topsFit} onChange={setTopsFit} options={TOPS_FITS} />
                <SelectField label="Chiều dài tay" value={topsSleeve} onChange={setTopsSleeve} options={TOPS_SLEEVES} />
              </>
            )}

            {category === 'pants' && (
              <>
                <SelectField
                  label="Loại quần"
                  value={type}
                  onChange={v => { setType(v); if (v !== 'Khác') { setCustomType(''); setAppliedMapping(null) }}}
                  options={PANTS_TYPES}
                  required
                  placeholder="Chọn loại quần..."
                />
                {type === 'Khác' && (
                  <OtherInput
                    value={customType}
                    onChange={handleCustomTypeChange}
                    placeholder="Vd: jeans lửng, cargo pants, wide leg..."
                    category={category}
                  />
                )}
                {errors.customType && <p className="text-red-400 text-xs mt-1">{errors.customType}</p>}

                <SelectField
                  label="Dáng quần"
                  value={pantsFit}
                  onChange={v => { setPantsFit(v); if (v !== 'Khác') setPantsFitOther('') }}
                  options={PANTS_FITS}
                />
                {pantsFit === 'Khác' && (
                  <OtherInput
                    value={pantsFitOther}
                    onChange={(v) => setPantsFitOther(v || '')}
                    placeholder="Vd: Baggy, Tapered..."
                  />
                )}
              </>
            )}

            {category === 'accessories' && (
              <SelectField
                label="Loại phụ kiện"
                value={type}
                onChange={v => { setType(v); if (v !== 'Khác') { setCustomType(''); setAppliedMapping(null) }}}
                options={ACC_TYPES}
                required
                placeholder="Chọn loại phụ kiện..."
              />
            )}
            {category === 'accessories' && type === 'Khác' && (
              <OtherInput value={customType} onChange={handleCustomTypeChange} placeholder="Vd: fanny pack, choker..." category={category} />
            )}

            {category === 'headwear' && (
              <>
                <SelectField
                  label="Loại mũ"
                  value={type}
                  onChange={v => { setType(v); if (v !== 'Khác') { setCustomType(''); setAppliedMapping(null) }}}
                  options={HAT_TYPES}
                  required
                  placeholder="Chọn loại mũ..."
                />
                {type === 'Khác' && (
                  <OtherInput value={customType} onChange={handleCustomTypeChange} placeholder="Vd: visor, trucker hat..." category={category} />
                )}
              </>
            )}

            {errors.type && <p className="text-red-400 text-xs mt-1">{errors.type}</p>}

            {}
            <SelectField label="Màu sắc" value={color} onChange={v => { setColor(v); if (v !== 'Khác') setCustomColor('') }} options={COLORS} />
            {color === 'Khác' && (
              <input
                type="text"
                value={customColor}
                onChange={e => setCustomColor(e.target.value)}
                placeholder="Mô tả màu sắc..."
                className="w-full bg-gray-700 border border-dashed border-gray-500 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-400 mt-1 mb-3"
              />
            )}

            {}
            <SelectField label="Chất liệu" value={material} onChange={setMaterial} options={MATERIALS} />

            {errors.measurement && (
              <p className="text-orange-400 text-xs mt-2 bg-orange-900/20 px-3 py-2 rounded-lg">
                ⚠️ {errors.measurement}
              </p>
            )}
          </div>
        )}

        {}
        {step === 1 && (
          <div>
            {category === 'tops' && (
              <>
                <NumberField label="Chiều dài thân áo" value={topsBodyLen} onChange={setTopsBodyLen} />
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Rộng vai</label>
                  <div className="flex gap-2">
                    <select
                      value={topsShoulder}
                      onChange={e => setTopsShoulder(e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Chọn...</option>
                      {SHOULDERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input
                      type="number"
                      value={topsShoulderCm}
                      onChange={e => setTopsShoulderCm(e.target.value)}
                      placeholder="cm"
                      min={0}
                      className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                <SelectField
                  label="Cổ áo"
                  value={topsCollar}
                  onChange={v => { setTopsCollar(v); if (v !== 'Khác') setTopsCollarOther('') }}
                  options={TOPS_COLLARS}
                />
                {topsCollar === 'Khác' && (
                  <input
                    type="text"
                    value={topsCollarOther}
                    onChange={e => setTopsCollarOther(e.target.value)}
                    placeholder="Vd: cổ vuông, cổ thuyền..."
                    className="w-full bg-gray-700 border border-dashed border-gray-500 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none mt-1 mb-3"
                  />
                )}
                <SelectField label="Họa tiết" value={pattern} onChange={setPattern} options={PATTERNS} />
              </>
            )}

            {category === 'pants' && (
              <>
                <NumberField label="Độ dài đũng quần" value={pantsRise} onChange={setPantsRise} placeholder="28" />
                <NumberField label="Độ dài ống quần" value={pantsInseam} onChange={setPantsInseam} placeholder="18" />
                <NumberField label="Tổng chiều dài quần" value={pantsTotalLen} onChange={setPantsTotalLen} placeholder="95" />
                <SelectField label="Họa tiết" value={pattern} onChange={setPattern} options={PATTERNS} />
              </>
            )}

            {category === 'accessories' && (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phân loại phụ</label>
                  <input
                    type="text"
                    value={accSub}
                    onChange={e => setAccSub(e.target.value)}
                    placeholder={type === 'Dây chuyền' ? 'Vd: dài dây 45cm, mặt dây...' : 'Chi tiết thêm...'}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Kích cỡ</label>
                  <input
                    type="text"
                    value={accSize}
                    onChange={e => setAccSize(e.target.value)}
                    placeholder="Vd: Free size, S/M/L, số cm..."
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <SelectField label="Phong cách" value={accStyle} onChange={setAccStyle} options={ACC_STYLES} />
              </>
            )}

            {category === 'headwear' && (
              <>
                <NumberField label="Chu vi vòng đầu" value={hatSize} onChange={setHatSize} placeholder="58" />
                <NumberField label="Chiều sâu mũ" value={hatDepth} onChange={setHatDepth} placeholder="12" />
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Vành mũ</label>
                  <div className="flex gap-2">
                    <select
                      value={hatBrim}
                      onChange={e => setHatBrim(e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Chọn...</option>
                      {HAT_BRIMS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <input
                      type="number"
                      value={hatBrimCm}
                      onChange={e => setHatBrimCm(e.target.value)}
                      placeholder="cm"
                      min={0}
                      className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </>
            )}

            {category === 'footwear' && (
              <>
                {}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Loại *</label>
                  <div className="flex gap-2">
                    {['Giày', 'Dép'].map(k => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => { setFootwearKind(k); setShoeForm(''); setSandalsType('') }}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                          footwearKind === k
                            ? 'bg-purple-700 border-purple-500 text-white'
                            : 'bg-gray-800 border-gray-600 text-gray-400'
                        }`}
                      >
                        {k === 'Giày' ? '👟 Giày' : '🩴 Dép'}
                      </button>
                    ))}
                  </div>
                </div>

                {footwearKind === 'Giày' ? (
                  <>
                    {}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Tên giày <span className="text-gray-500 font-normal">(tuỳ chọn)</span>
                      </label>
                      <input
                        type="text"
                        value={shoeName}
                        onChange={e => setShoeName(e.target.value)}
                        placeholder="Vd: Nike Air Force 1, Converse Chuck Taylor..."
                        maxLength={80}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    {}
                    <SelectField
                      label="Form dáng *"
                      value={shoeForm}
                      onChange={setShoeForm}
                      options={['Sneaker', 'Oxford/Derby', 'Loafer', 'Boot', 'Heel/Cao gót', 'Slip-on', 'Mule', 'Sandal gót', 'Khác']}
                      required
                      placeholder="Chọn form dáng..."
                    />
                    <p className="text-xs text-gray-500 -mt-2 mb-3">
                      💡 Màu, phong cách, điểm nhấn sẽ được AI xác định qua hình ảnh
                    </p>
                  </>
                ) : (
                  <>
                    {}
                    <SelectField
                      label="Loại dép *"
                      value={sandalsType}
                      onChange={setSandalsType}
                      options={['Dép tông', 'Dép crocs', 'Dép quai hậu', 'Dép lê', 'Dép sandal', 'Dép bệt', 'Khác']}
                      required
                      placeholder="Chọn loại dép..."
                    />
                    <p className="text-xs text-gray-500 -mt-2 mb-3">
                      💡 Màu, phong cách, điểm nhấn sẽ được AI xác định qua hình ảnh
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {}
      <div className="flex gap-3 pt-4 border-t border-gray-700 flex-shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-gray-700 text-gray-300 text-sm hover:bg-gray-600 transition-colors"
        >
          Huỷ
        </button>

        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            className="flex-1 py-2.5 rounded-xl bg-gray-700 text-gray-300 text-sm hover:bg-gray-600 transition-colors"
          >
            ← Trước
          </button>
        )}

        {!isLastStep ? (
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Tiếp →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            ✓ Lưu thông số
          </button>
        )}
      </div>
    </div>
  )
}
