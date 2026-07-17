import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, Star, Users, CalendarCheck,
  Wrench, DollarSign, UserPlus, Clock, ArrowUpRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { partnerService, type PartnerResponse } from '../../services/partner.service'
import { staffService, type StaffResponse } from '../../services/staff.service'
import {
  bookingService,
  type BookingResponse,
  type BookingStatus,
  type BookingType,
  type DailyStatsEntry,
  BOOKING_TYPE_LABEL,
  BOOKING_STATUS_LABEL,
} from '../../services/booking.service'

/* ─────────────────────────────────────────────
   Cores para Recharts (CSS vars não funcionam em SVG)
───────────────────────────────────────────── */
const C_PRIMARY = '#16426b'

const STATUS_COLORS: Record<BookingStatus, string> = {
  PENDING:   '#f59e0b',
  CONFIRMED: '#7c3aed',
  COMPLETED: '#059669',
  CANCELLED: '#db2777',
}

const STATUS_STYLE: Record<BookingStatus, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CONFIRMED: 'bg-violet-100  text-violet-700',
  PENDING:   'bg-amber-100   text-amber-700',
  CANCELLED: 'bg-pink-100    text-pink-600',
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const MONTHS_PT = [
  'janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro',
]
const DAYS_PT = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado']
const DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function toMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

function formatDatePT(d: Date) {
  return `${DAYS_PT[d.getDay()]}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// Converte "YYYY-MM-DD" → rótulo curto do dia da semana
function dayLabel(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return DAYS_SHORT[new Date(y, m - 1, d).getDay()]
}

/* ─────────────────────────────────────────────
   Subcomponentes
───────────────────────────────────────────── */
function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {BOOKING_STATUS_LABEL[status] ?? status}
    </span>
  )
}

/* ─────────────────────────────────────────────
   Página
───────────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate()

  const [partner,       setPartner]       = useState<PartnerResponse | null>(null)
  const [staff,         setStaff]         = useState<StaffResponse[]>([])
  const [todayBookings, setTodayBookings] = useState<BookingResponse[]>([])
  const [dailyStats,    setDailyStats]    = useState<DailyStatsEntry[]>([])
  const [revenue,       setRevenue]       = useState<number>(0)
  const [newClients,    setNewClients]    = useState<number>(0)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    partnerService.getMe()
      .then(async p => {
        setPartner(p)
        const today = toDateKey(new Date())
        const month = toMonthKey(new Date())

        const results = await Promise.allSettled([
          staffService.getByPartner(p.id),
          bookingService.getByPartner(p.id, { date: today, size: 50 }),
          bookingService.getDailyStats(p.id, 7),
          bookingService.getRevenueStats(p.id, month),
          bookingService.getClientStats(p.id, month),
        ])

        if (results[0].status === 'fulfilled') setStaff(results[0].value)
        if (results[1].status === 'fulfilled') setTodayBookings(results[1].value.content)
        if (results[2].status === 'fulfilled') setDailyStats(results[2].value)
        if (results[3].status === 'fulfilled') setRevenue(Number(results[3].value.revenue))
        if (results[4].status === 'fulfilled') setNewClients(results[4].value.newClients)
      })
      .catch(err => {
        if (err?.response?.status === 404) navigate('/partner/cadastro', { replace: true })
      })
      .finally(() => setLoading(false))
  }, [])

  /* ── Dados derivados ─────────────────────── */
  const firstName        = partner?.name?.split(' ')[0] ?? 'parceiro'
  const activeStaff      = staff.filter(s => s.status === 'ACTIVE').length
  const avaliacaoMedia   = partner?.rating ?? 0
  const servicosCad      = partner?.services?.length ?? 0
  const agendamentosHoje = todayBookings.length

  const statusCount = todayBookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1
    return acc
  }, {})

  const donutData = Object.entries(statusCount).map(([status, value]) => ({
    name:   BOOKING_STATUS_LABEL[status as BookingStatus] ?? status,
    value,
    status: status as BookingStatus,
  }))

  const typeCount = todayBookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.type] = (acc[b.type] ?? 0) + 1
    return acc
  }, {})

  const typeBreakdown = Object.entries(typeCount)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      label: BOOKING_TYPE_LABEL[type as BookingType] ?? type,
      count,
      pct: agendamentosHoje > 0 ? Math.round((count / agendamentosHoje) * 100) : 0,
    }))

  const upcomingToday = todayBookings
    .filter(b => b.status !== 'CANCELLED')
    .slice(0, 5)

  // Formata os dados diários com rótulo curto do dia da semana
  const chartData = dailyStats.map(e => ({
    day:   dayLabel(e.day),
    total: e.total,
  }))

  type KpiItem = {
    label:     string
    value:     string
    sub:       string
    icon:      React.ReactNode
    iconBg:    string
    iconColor: string
  }

  const kpis: KpiItem[] = [
    {
      label:     'Agendamentos Hoje',
      value:     String(agendamentosHoje),
      sub:       'atendimentos do dia',
      icon:      <CalendarCheck size={20} />,
      iconBg:    'bg-violet-100',
      iconColor: 'text-violet-600',
    },
    {
      label:     'Receita do Mês',
      value:     `R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      sub:       MONTHS_PT[new Date().getMonth()],
      icon:      <DollarSign size={20} />,
      iconBg:    'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label:     'Novos Clientes',
      value:     String(newClients),
      sub:       'primeiro agendamento este mês',
      icon:      <UserPlus size={20} />,
      iconBg:    'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label:     'Colaboradores Ativos',
      value:     String(activeStaff),
      sub:       `de ${staff.length} cadastrado${staff.length !== 1 ? 's' : ''}`,
      icon:      <Users size={20} />,
      iconBg:    'bg-teal-100',
      iconColor: 'text-teal-600',
    },
    {
      label:     'Avaliação Média',
      value:     avaliacaoMedia > 0 ? avaliacaoMedia.toFixed(1) : '–',
      sub:       'baseado nas avaliações',
      icon:      <Star size={20} />,
      iconBg:    'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      label:     'Serviços Cadastrados',
      value:     String(servicosCad),
      sub:       'serviços no catálogo',
      icon:      <Wrench size={20} />,
      iconBg:    'bg-pink-100',
      iconColor: 'text-pink-600',
    },
  ]

  /* ── Loading ─────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-(--color-primary-700)" />
      </div>
    )
  }

  /* ── Render ──────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-(--color-text-heading)">
          {getGreeting()}, {firstName}!
        </h1>
        <p className="text-sm text-(--color-text-muted) mt-1 first-letter:uppercase">
          {formatDatePT(new Date())}
        </p>
      </div>

      {/* ══════════════════════════════════════
          KPIs
          ══════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i}
            className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-4 shadow-sm
                       hover:shadow-md transition-shadow flex flex-col gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
              <span className={kpi.iconColor}>{kpi.icon}</span>
            </div>
            <div>
              <p className="text-2xl font-black text-(--color-text-heading) tabular-nums leading-none">
                {kpi.value}
              </p>
              <p className="text-[11px] font-semibold text-(--color-text-heading) mt-0.5 leading-tight">
                {kpi.label}
              </p>
              <p className="text-[10px] text-(--color-text-muted) mt-0.5 leading-tight">
                {kpi.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════
          Gráficos
          ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Bar chart: agendamentos por dia */}
        <div className="lg:col-span-2 bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-(--color-text-heading)">Agendamentos por Dia</h2>
            <p className="text-xs text-(--color-text-muted) mt-0.5">últimos 7 dias</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={32} margin={{ top: 0, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ebebef" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#808098', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#808098' }}
                axisLine={false}
                tickLine={false}
                width={28}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #ebebef', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}
                cursor={{ fill: '#f6f6f8', radius: 6 }}
                formatter={(v: number) => [v, 'Agendamentos']}
              />
              <Bar dataKey="total" fill={C_PRIMARY} radius={[6, 6, 0, 0]} name="Agendamentos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut: status dos agendamentos de hoje */}
        <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-(--color-text-heading)">Status de Hoje</h2>
            <p className="text-xs text-(--color-text-muted) mt-0.5">distribuição por situação</p>
          </div>

          {donutData.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 py-8">
              <div className="w-14 h-14 rounded-full bg-(--color-bg) border border-(--color-border) flex items-center justify-center">
                <CalendarCheck size={24} className="text-(--color-text-muted)" />
              </div>
              <p className="text-xs text-(--color-text-muted) text-center">Nenhum agendamento hoje</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%" cy="50%"
                    innerRadius={42} outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] ?? '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #ebebef', fontSize: 12 }}
                    formatter={(v: number, _: string, props: { payload: { name: string } }) => [v, props.payload.name]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2 mt-2">
                {donutData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: STATUS_COLORS[d.status] ?? '#9ca3af' }} />
                      <span className="text-xs text-(--color-text-body)">{d.name}</span>
                    </div>
                    <span className="text-xs font-bold text-(--color-text-heading)">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          Linha inferior
          ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Agendamentos do dia */}
        <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-(--color-border) flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-(--color-text-heading)">Agendamentos de Hoje</h2>
              <p className="text-xs text-(--color-text-muted) mt-0.5">excluindo cancelados</p>
            </div>
            <button
              onClick={() => navigate('/partner/agendamentos')}
              className="flex items-center gap-1 text-xs font-semibold text-(--color-primary-700)
                         hover:text-(--color-secondary-500) transition-colors"
            >
              Ver todos <ArrowUpRight size={13} />
            </button>
          </div>

          {upcomingToday.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-14 h-14 rounded-full bg-(--color-bg) border border-(--color-border) flex items-center justify-center">
                <Clock size={22} className="text-(--color-text-muted)" />
              </div>
              <p className="text-xs text-(--color-text-muted)">Sem agendamentos ativos hoje</p>
            </div>
          ) : (
            <div className="divide-y divide-(--color-border)">
              {upcomingToday.map(b => (
                <div key={b.id}
                  className="px-5 py-3.5 flex items-center gap-3 hover:bg-(--color-bg)/60 transition-colors">
                  <div className="w-12 h-10 rounded-xl bg-(--color-bg) border border-(--color-border)
                                  flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-(--color-text-muted) leading-none text-center">
                      {b.bookingDate ? formatTime(b.bookingDate) : '–'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-(--color-text-heading) truncate">
                      {BOOKING_TYPE_LABEL[b.type] ?? b.type}
                    </p>
                    <p className="text-xs text-(--color-text-muted)">
                      R$ {b.price.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mix de serviços de hoje */}
        <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-(--color-border)">
            <h2 className="text-sm font-bold text-(--color-text-heading)">Mix de Serviços</h2>
            <p className="text-xs text-(--color-text-muted) mt-0.5">distribuição de hoje por tipo</p>
          </div>

          {typeBreakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-14 h-14 rounded-full bg-(--color-bg) border border-(--color-border) flex items-center justify-center">
                <Wrench size={22} className="text-(--color-text-muted)" />
              </div>
              <p className="text-xs text-(--color-text-muted)">Sem atendimentos hoje</p>
            </div>
          ) : (
            <div className="px-5 py-5 space-y-5">
              {typeBreakdown.map((t, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-(--color-text-body)">{t.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-(--color-text-muted)">{t.pct}%</span>
                      <span className="text-sm font-bold text-(--color-text-heading)">{t.count}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-(--color-bg) overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${t.pct}%`,
                        background: C_PRIMARY,
                        opacity: 0.7 + (0.3 * (1 - i / typeBreakdown.length)),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
