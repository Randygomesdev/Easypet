import { useState, useEffect, useRef } from 'react'
import TimePicker from '../../../components/ui/TimePicker'
import type { BusinessHour } from '../../../services/partner.service'

/* ─── Configuração dos dias ─── */
type DiaSemana = {
  dayOfWeek:        string
  letra:            string
  nome:             string
  aberto:           boolean
  expedienteInicio: string
  expedienteFim:    string
  intervalo:        boolean
  intervaloInicio:  string
  intervaloFim:     string
}

const CONFIG = [
  { dayOfWeek: 'MONDAY',    letra: 'S', nome: 'Segunda Feira' },
  { dayOfWeek: 'TUESDAY',   letra: 'T', nome: 'Terça Feira'   },
  { dayOfWeek: 'WEDNESDAY', letra: 'Q', nome: 'Quarta Feira'  },
  { dayOfWeek: 'THURSDAY',  letra: 'Q', nome: 'Quinta Feira'  },
  { dayOfWeek: 'FRIDAY',    letra: 'S', nome: 'Sexta Feira'   },
  { dayOfWeek: 'SATURDAY',  letra: 'S', nome: 'Sábado'        },
  { dayOfWeek: 'SUNDAY',    letra: 'D', nome: 'Domingo'       },
]

const DEFAULTS: DiaSemana[] = [
  { dayOfWeek: 'MONDAY',    letra: 'S', nome: 'Segunda Feira', aberto: false, expedienteInicio: '', expedienteFim: '', intervalo: false, intervaloInicio: '', intervaloFim: '' },
  { dayOfWeek: 'TUESDAY',   letra: 'T', nome: 'Terça Feira',   aberto: false, expedienteInicio: '', expedienteFim: '', intervalo: false, intervaloInicio: '', intervaloFim: '' },
  { dayOfWeek: 'WEDNESDAY', letra: 'Q', nome: 'Quarta Feira',  aberto: false, expedienteInicio: '', expedienteFim: '', intervalo: false, intervaloInicio: '', intervaloFim: '' },
  { dayOfWeek: 'THURSDAY',  letra: 'Q', nome: 'Quinta Feira',  aberto: false, expedienteInicio: '', expedienteFim: '', intervalo: false, intervaloInicio: '', intervaloFim: '' },
  { dayOfWeek: 'FRIDAY',    letra: 'S', nome: 'Sexta Feira',   aberto: false, expedienteInicio: '', expedienteFim: '', intervalo: false, intervaloInicio: '', intervaloFim: '' },
  { dayOfWeek: 'SATURDAY',  letra: 'S', nome: 'Sábado',        aberto: false, expedienteInicio: '', expedienteFim: '', intervalo: false, intervaloInicio: '', intervaloFim: '' },
  { dayOfWeek: 'SUNDAY',    letra: 'D', nome: 'Domingo',       aberto: false, expedienteInicio: '', expedienteFim: '', intervalo: false, intervaloInicio: '', intervaloFim: '' },
]

/* ─── Conversão API ↔ UI ─── */
function fromApi(hours: BusinessHour[]): DiaSemana[] {
  return CONFIG.map(cfg => {
    const h = hours.find(b => b.dayOfWeek === cfg.dayOfWeek)
    if (!h) return DEFAULTS.find(d => d.dayOfWeek === cfg.dayOfWeek)!
    return {
      dayOfWeek:        cfg.dayOfWeek,
      letra:            cfg.letra,
      nome:             cfg.nome,
      aberto:           !h.closed,
      expedienteInicio: h.businessStartHour ?? '',
      expedienteFim:    h.businessEndHour   ?? '',
      intervalo:        !!(h.lunchStartHour && h.lunchEndHour),
      intervaloInicio:  h.lunchStartHour    ?? '',
      intervaloFim:     h.lunchEndHour      ?? '',
    }
  })
}

function toApi(dias: DiaSemana[]): BusinessHour[] {
  return dias.map(d => ({
    dayOfWeek:        d.dayOfWeek,
    businessStartHour: d.aberto ? d.expedienteInicio : '',
    businessEndHour:   d.aberto ? d.expedienteFim    : '',
    lunchStartHour:    d.aberto && d.intervalo ? d.intervaloInicio : '',
    lunchEndHour:      d.aberto && d.intervalo ? d.intervaloFim    : '',
    closed:            !d.aberto,
  }))
}

/* ─── Componente ─── */
interface Props {
  value:    BusinessHour[]
  onChange: (hours: BusinessHour[]) => void
}

export default function HorarioTab({ value, onChange }: Props) {
  const [dias, setDias]   = useState<DiaSemana[]>(DEFAULTS)
  const initialized       = useRef(false)

  // Sincroniza apenas uma vez quando os dados do parceiro chegam da API
  useEffect(() => {
    if (!initialized.current && value.length > 0) {
      initialized.current = true
      setDias(fromApi(value))
    }
  }, [value])

  function update(index: number, field: keyof DiaSemana, val: string | boolean) {
    setDias(prev => {
      const next = prev.map((d, i) => i === index ? { ...d, [field]: val } : d)
      onChange(toApi(next))
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {dias.map((dia, i) => (
        <div
          key={dia.dayOfWeek}
          className="border border-(--color-border) rounded-xl p-4 flex flex-col gap-3
                     lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:p-3 lg:border-0 lg:rounded-none
                     lg:border-b lg:border-(--color-border) last:border-b-0"
        >
          {/* Toggle + Dia */}
          <div className="flex items-center justify-between lg:justify-start lg:gap-3 lg:w-52 lg:shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => update(i, 'aberto', !dia.aberto)}
                className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0
                  ${dia.aberto ? 'bg-(--color-secondary-500)' : 'bg-(--color-border)'}`}
              >
                <span
                  className={`absolute left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                    ${dia.aberto ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
              <div className="w-8 h-8 rounded-lg bg-(--color-bg) flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-(--color-text-heading)">{dia.letra}</span>
              </div>
              <span className="text-sm font-medium text-(--color-text-heading)">{dia.nome}</span>
            </div>
            <span className="text-xs text-(--color-text-muted) lg:hidden">
              {dia.aberto ? 'Aberto' : 'Fechado'}
            </span>
          </div>

          {/* Expediente */}
          {dia.aberto && (
            <div className="flex items-center gap-2 flex-wrap lg:flex-1 lg:justify-center">
              <span className="text-sm text-(--color-text-muted) shrink-0">Expediente:</span>
              <TimePicker value={dia.expedienteInicio} onChange={v => update(i, 'expedienteInicio', v)} />
              <span className="text-sm text-(--color-text-muted)">às</span>
              <TimePicker value={dia.expedienteFim}    onChange={v => update(i, 'expedienteFim',    v)} />
            </div>
          )}

          {/* Intervalo */}
          {dia.aberto && (
            <div className="flex items-center gap-2 flex-wrap lg:flex-1 lg:justify-center">
              <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={dia.intervalo}
                  onChange={e => update(i, 'intervalo', e.target.checked)}
                  className="accent-(--color-primary-700) w-3.5 h-3.5"
                />
                <span className="text-sm text-(--color-text-muted)">Intervalo</span>
              </label>
              {dia.intervalo && (
                <>
                  <TimePicker value={dia.intervaloInicio} onChange={v => update(i, 'intervaloInicio', v)} />
                  <span className="text-sm text-(--color-text-muted)">às</span>
                  <TimePicker value={dia.intervaloFim}    onChange={v => update(i, 'intervaloFim',    v)} />
                </>
              )}
            </div>
          )}

          {/* Status desktop */}
          <div className="hidden lg:block shrink-0 w-14 text-right">
            <span className="text-sm text-(--color-text-muted)">
              {dia.aberto ? 'Aberto' : 'Fechado'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
