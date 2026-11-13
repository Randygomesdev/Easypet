import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import ExampleCode from './ExampleCode'

const palettes = [
  { name: 'Primária', prefix: 'primary' },
  { name: 'Secundária', prefix: 'secondary' },
  { name: 'Cinza', prefix: 'gray' },
]

const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
const semanticTokens = [
  'bg', 'surface', 'border', 'text-heading', 'text-body', 'text-muted',
  'text-placeholder', 'text-danger', 'icon-default', 'icon-active',
]

function Swatch({ token, label = token }: { token: string; label?: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="h-9 rounded-lg border border-border" style={{ backgroundColor: `var(--color-${token})` }} aria-hidden="true" />
      <code className="block text-xs break-words text-text-body" title={`--color-${token}`}>{label}</code>
    </div>
  )
}

export default function FoundationExamples() {
  return (
    <>
      <Card id="cores">
        <CardHeader title="Cores" description="Escalas de marca e tokens semânticos do tema atual." />
        <CardContent className="space-y-5">
          {palettes.map(({ name, prefix }) => (
            <div className="space-y-2" key={prefix}>
              <h3 className="text-xs font-semibold text-text-heading">{name} <code>--color-{prefix}-*</code></h3>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                {shades.map(shade => <Swatch key={shade} token={`${prefix}-${shade}`} label={String(shade)} />)}
              </div>
            </div>
          ))}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-text-heading">Semânticos <code>--color-*</code></h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {semanticTokens.map(token => <Swatch key={token} token={token} />)}
            </div>
          </div>
          <ExampleCode>{'<div className="bg-surface border border-border text-text-body">…</div>'}</ExampleCode>
        </CardContent>
      </Card>

      <Card id="tipografia">
        <CardHeader title="Tipografia" description="Inter com fallback para a fonte do sistema." />
        <CardContent className="space-y-3">
          <p className="text-2xl font-bold text-text-heading lg:text-3xl">Título de página</p>
          <p className="text-sm font-bold text-text-heading">Título de card</p>
          <p className="text-sm text-text-body">Texto de corpo</p>
          <p className="text-xs text-text-muted">Texto auxiliar</p>
          <ExampleCode>{'<h1 className="text-2xl font-bold text-text-heading lg:text-3xl">Título de página</h1>'}</ExampleCode>
        </CardContent>
      </Card>
    </>
  )
}
