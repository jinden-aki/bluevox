'use client'

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

interface DateTimePickerProps {
  value: string | null          // ISO 8601 string or null
  onChange: (iso: string | null) => void
}

export default function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  // valueからdate部分とtime部分を分離
  const dateVal = value ? value.slice(0, 10) : ''
  const timeVal = value ? (() => {
    const d = new Date(value)
    const h = String(d.getHours()).padStart(2, '0')
    const m = d.getMinutes() < 30 ? '00' : '30'
    return `${h}:${m}`
  })() : '09:00'

  const handleDateChange = (date: string) => {
    if (!date) { onChange(null); return }
    const [h, m] = timeVal.split(':')
    const iso = new Date(`${date}T${h}:${m}:00`).toISOString()
    onChange(iso)
  }

  const handleTimeChange = (time: string) => {
    if (!dateVal) return
    const iso = new Date(`${dateVal}T${time}:00`).toISOString()
    onChange(iso)
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={dateVal}
        onChange={e => handleDateChange(e.target.value)}
        style={{
          fontSize: 13, color: '#1A1A2E', border: '1px solid #E8ECF1',
          borderRadius: 8, padding: '6px 10px', background: '#fff',
          outline: 'none', cursor: 'pointer',
        }}
        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#1565C0' }}
        onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E8ECF1' }}
      />
      <select
        value={timeVal}
        onChange={e => handleTimeChange(e.target.value)}
        disabled={!dateVal}
        style={{
          fontSize: 13, color: dateVal ? '#1A1A2E' : '#94A3B8',
          border: '1px solid #E8ECF1', borderRadius: 8,
          padding: '6px 10px', background: '#fff',
          outline: 'none', cursor: dateVal ? 'pointer' : 'default',
        }}
        onFocus={e => { (e.target as HTMLSelectElement).style.borderColor = '#1565C0' }}
        onBlur={e => { (e.target as HTMLSelectElement).style.borderColor = '#E8ECF1' }}
      >
        {TIME_OPTIONS.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      {value && (
        <button
          onClick={() => onChange(null)}
          style={{ fontSize: 12, color: '#94A3B8', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, background: 'none', border: 'none' }}
          title="期日をクリア"
        >
          ✕
        </button>
      )}
    </div>
  )
}
