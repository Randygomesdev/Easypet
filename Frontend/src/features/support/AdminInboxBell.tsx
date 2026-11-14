import { useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { usePanelQuery } from '../../routes/usePanelQuery'
import { supportService } from '../../services/support.service'

export default function AdminInboxBell() {
  const { pathname } = useLocation()
  const { result, reload } = usePanelQuery(supportService.unread)
  useEffect(() => {
    const refresh = () => reload()
    window.addEventListener('easypet:inbox-updated', refresh)
    return () => window.removeEventListener('easypet:inbox-updated', refresh)
  }, [reload])
  const count = result?.status === 'ready' ? result.data.count : undefined
  const label = count === undefined ? 'Alertas e chamados' : `Alertas e chamados, ${count} não lidos`

  return <Link to="/admin/alertas" aria-label={label} aria-current={pathname === '/admin/alertas' ? 'page' : undefined}
    className="relative flex size-11 shrink-0 items-center justify-center rounded-lg text-icon-default hover:bg-bg hover:text-icon-active focus-visible:outline-2 focus-visible:outline-primary-400">
    <Bell size={20} aria-hidden="true" />
    {!!count && <span aria-hidden="true" className="absolute -right-1 -top-1 rounded-full bg-secondary-500 px-1 text-xs font-bold text-primary-900">{count > 99 ? '99+' : count}</span>}
  </Link>
}
