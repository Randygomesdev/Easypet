import { useState, useRef, useEffect } from 'react'
import { Clock } from 'lucide-react'

const hours   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const minutes = ['00', '15', '30', '45']

type Props = {
  value: string
  onChange: (v: string) => void
}

export default function TimePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const [h, m] = value ? value.split(':') : ['08', '00']

  function select(newH: string, newM: string) {
    onChange(`${newH}:${newM}`)
  }

  /* fecha ao clicar fora */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-sm min-w-24
                    text-(--color-text-body) bg-(--color-bg) transition-shadow cursor-pointer
                    ${open
                      ? 'border-(--color-primary-400) ring-2 ring-(--color-primary-300)'
                      : 'border-(--color-border) hover:border-(--color-primary-400)'
                    }`}
      >
        <Clock size={13} className="text-(--color-icon-default) shrink-0" />
        <span>{value || '00:00'}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-(--color-surface) border border-(--color-border)
                        rounded-xl shadow-lg flex overflow-hidden min-w-36">

          {/* Horas */}
          <div className="flex flex-col overflow-y-auto max-h-48 w-1/2 border-r border-(--color-border)">
            <p className="text-xs text-(--color-text-muted) px-3 py-1.5 sticky top-0 bg-(--color-surface) border-b border-(--color-border)">
              Hora
            </p>
            {hours.map((hh) => (
              <button
                key={hh}
                type="button"
                onClick={() => { select(hh, m); setOpen(false) }}
                className={`px-3 py-1.5 text-sm text-left transition-colors cursor-pointer
                  ${hh === h
                    ? 'bg-(--color-primary-700) text-white font-medium'
                    : 'text-(--color-text-body) hover:bg-(--color-bg)'
                  }`}
              >
                {hh}
              </button>
            ))}
          </div>

          {/* Minutos */}
          <div className="flex flex-col w-1/2">
            <p className="text-xs text-(--color-text-muted) px-3 py-1.5 sticky top-0 bg-(--color-surface) border-b border-(--color-border)">
              Min
            </p>
            {minutes.map((mm) => (
              <button
                key={mm}
                type="button"
                onClick={() => { select(h, mm); setOpen(false) }}
                className={`px-3 py-1.5 text-sm text-left transition-colors cursor-pointer
                  ${mm === m
                    ? 'bg-(--color-primary-700) text-white font-medium'
                    : 'text-(--color-text-body) hover:bg-(--color-bg)'
                  }`}
              >
                {mm}
              </button>
            ))}
          </div>

        </div>
      )}
    </div>
  )
}
