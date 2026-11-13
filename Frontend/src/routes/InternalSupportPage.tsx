import { ExternalLink, LifeBuoy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/FeedbackState'
import { useAuth } from '../contexts/AuthContext'

function supportUrl(value: string | undefined) {
  try {
    const url = new URL(value?.trim() ?? '')
    if (url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash) return url.href
  } catch {
    return undefined
  }
}

const configuredUrl = supportUrl(import.meta.env.VITE_INTERNAL_SUPPORT_URL)
const linkClass = `inline-flex min-h-11 items-center gap-2 rounded px-2 text-sm font-semibold text-text-heading underline
  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400`

export default function InternalSupportPage() {
  const { sessionStatus } = useAuth()

  return (
    <main className="mx-auto max-w-xl space-y-4 p-4 lg:p-8">
      <Link className={linkClass} to={sessionStatus === 'ready' ? '/painel' : '/login'}>
        {sessionStatus === 'ready' ? 'Voltar ao painel' : 'Ir para o login'}
      </Link>
      <h1 className="text-2xl font-bold text-text-heading lg:text-3xl">Suporte interno</h1>
      <Card>
        {configuredUrl ? <>
          <CardHeader title="Canal da homologação" />
          <CardContent className="space-y-3">
            <p className="text-sm text-text-body">Informe a tela, o horário e o que ocorreu. Use somente dados fictícios da homologação.</p>
            <a className={linkClass} href={configuredUrl} referrerPolicy="no-referrer">
              Acessar canal de suporte <ExternalLink size={16} aria-hidden="true" />
            </a>
          </CardContent>
        </> : (
          <EmptyState icon={LifeBuoy} title="Canal de suporte interno ainda não configurado"
            description="A coordenação da homologação pode informar o canal aprovado." />
        )}
      </Card>
    </main>
  )
}
