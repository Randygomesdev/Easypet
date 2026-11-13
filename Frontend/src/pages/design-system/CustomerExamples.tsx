import { useState } from 'react'
import { Search, Users } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/FeedbackState'
import { TextField } from '../../components/ui/Field'
import ExampleCode from './ExampleCode'

export default function CustomerExamples() {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')

  return (
    <Card id="clientes">
      <CardHeader title="Busca de clientes" description="Composição usada nas listas de clientes do parceiro e do administrador." />
      <CardContent className="space-y-4">
        <form className="flex flex-wrap items-end gap-2" onSubmit={event => {
          event.preventDefault()
          setSubmittedQuery(query.trim())
        }}>
          <div className="w-full max-w-sm min-w-0">
            <TextField label="Buscar clientes" type="search" maxLength={254}
              value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome, e-mail ou telefone" />
          </div>
          <Button type="submit" variant="secondary"><Search size={16} aria-hidden="true" />Buscar</Button>
        </form>
        <div role="status" className="rounded-xl border border-border">
          <EmptyState icon={Users}
            title={submittedQuery ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
            description={submittedQuery ? 'Confira o nome, e-mail ou telefone e tente outra busca.' : undefined} />
        </div>
        <ExampleCode>{`<TextField label="Buscar clientes" type="search" maxLength={254}
  value={search} onChange={event => setSearch(event.target.value)}
  placeholder="Nome, e-mail ou telefone" />
<Button type="submit" variant="secondary"><Search size={16} aria-hidden="true" />Buscar</Button>
<EmptyState icon={Users}
  title={q ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
  description={q ? 'Confira o nome, e-mail ou telefone e tente outra busca.' : undefined} />`}</ExampleCode>
      </CardContent>
    </Card>
  )
}
