import { useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import type { CustomerScope } from '../../services/customer.service'
import { CustomerAccountDirectory } from './CustomerAccountDirectory'
import { CustomerCreateForm } from './CustomerCreateForm'
import { CustomerDetail } from './CustomerDetail'
import { CustomerDirectory } from './CustomerDirectory'

export function CustomersPageContent({ scope }: { scope: CustomerScope }) {
  const [selectedId, setSelectedId] = useState<string>()
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const isPartner = scope === 'partner'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-heading lg:text-3xl">Clientes</h1>
          <p className="mt-1 text-sm text-text-muted">
            {isPartner ? 'Cadastre e consulte clientes e pets do estabelecimento.'
              : 'Consulte os cadastros de balcão e as contas da plataforma.'}
          </p>
        </div>
        {isPartner && !selectedId && (
          <Button onClick={() => setShowCreate(true)}><Plus size={17} aria-hidden="true" />Novo cliente</Button>
        )}
      </div>
      {!isPartner && !selectedId && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Consulta de clientes">
          <Button variant={showAccounts ? 'secondary' : 'primary'} aria-pressed={!showAccounts}
            onClick={() => setShowAccounts(false)}>Cadastros de balcão</Button>
          <Button variant={showAccounts ? 'primary' : 'secondary'} aria-pressed={showAccounts}
            onClick={() => setShowAccounts(true)}>Contas da plataforma</Button>
        </div>
      )}
      {selectedId ? (
        <>
          <Button variant="secondary" size="sm" onClick={() => { setSaved(false); setSelectedId(undefined) }}>
            <ArrowLeft size={16} aria-hidden="true" />Voltar para clientes
          </Button>
          {saved && <p role="status" className="text-sm font-medium text-text-body">Cliente cadastrado com sucesso.</p>}
          <CustomerDetail scope={scope} customerId={selectedId} />
        </>
      ) : showAccounts ? <CustomerAccountDirectory /> : <CustomerDirectory scope={scope} onSelect={setSelectedId} />}
      {isPartner && <Dialog open={showCreate} onOpenChange={open => { if (!saving) setShowCreate(open) }}
        title="Novo cliente" description="Informe o nome e ao menos uma forma de contato.">
        {showCreate && <CustomerCreateForm onSavingChange={setSaving} onSaved={customer => {
          setShowCreate(false)
          setSaved(true)
          setSelectedId(customer.id)
        }} />}
      </Dialog>}
    </div>
  )
}
