import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Save } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { SelectField, TextField } from '../../components/ui/Field'
import ExampleCode from './ExampleCode'

const fieldsCode = `import { SelectField, TextField } from '../../components/ui/Field'

<TextField label="Nome do pet" name="pet" required
  hint="Digite pelo menos dois caracteres." error={error} />
<SelectField label="Espécie" name="species" defaultValue="DOG">
  <option value="DOG">Cão</option>
  <option value="CAT">Gato</option>
</SelectField>`

function FieldsExample() {
  const nameInput = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (name.trim().length < 2) {
      setError('Informe pelo menos dois caracteres.')
      nameInput.current?.focus()
      return
    }

    setFeedback(`Exemplo salvo para ${name.trim()}.`)
  }

  return (
    <Card id="campos">
      <CardHeader title="Campos e selects" description="Rótulos associados, mensagens de validação e controles nativos." />
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              ref={nameInput}
              label="Nome do pet"
              name="pet"
              value={name}
              onChange={event => {
                setName(event.target.value)
                setError('')
                setFeedback('')
              }}
              required
              hint="Digite pelo menos dois caracteres."
              error={error}
            />
            <SelectField label="Espécie" name="species" defaultValue="DOG" onChange={() => setFeedback('')}>
              <option value="DOG">Cão</option>
              <option value="CAT">Gato</option>
            </SelectField>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit"><Save size={16} aria-hidden="true" /> Salvar exemplo</Button>
            <p className="text-sm text-text-body" role="status">{feedback}</p>
          </div>
        </form>
        <ExampleCode>{fieldsCode}</ExampleCode>
      </CardContent>
    </Card>
  )
}

const dialogCode = `import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'

<Button onClick={() => setOpen(true)}>Abrir diálogo</Button>
<Dialog open={open} onOpenChange={setOpen} title="Confirmar exemplo"
  description="A confirmação atualiza o estado local desta galeria."
  actions={<Button onClick={confirm}>Confirmar</Button>} />`

const bookingReasonCode = `import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/ui/Field'

<Dialog open={open} title="Registrar falta" onOpenChange={onOpenChange}>
  <form className="space-y-4" onSubmit={submit}>
    <TextField label="Motivo" required maxLength={500} value={reason}
      onChange={event => setReason(event.target.value)} disabled={saving} />
    {error && <p role="alert" className="text-sm text-text-danger">{error}</p>}
    <Button type="submit" variant="danger" disabled={saving}>Registrar falta</Button>
  </form>
</Dialog>`

function DialogExample() {
  const [open, setOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  return (
    <Card id="dialogos">
      <CardHeader title="Diálogos" description="Abra o modal e use Tab e Escape para conferir o foco." />
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => { setConfirmed(false); setOpen(true) }}>Abrir diálogo</Button>
          <span role="status" className="text-sm text-text-body">{confirmed && 'Exemplo confirmado.'}</span>
        </div>
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="Confirmar exemplo"
          description="A confirmação atualiza o estado local desta galeria."
          actions={<>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => { setConfirmed(true); setOpen(false) }}>Confirmar</Button>
          </>}
        />
        <ExampleCode>{dialogCode}</ExampleCode>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-heading">Motivo de falta na agenda</h3>
          <ExampleCode>{bookingReasonCode}</ExampleCode>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ControlExamples() {
  return (
    <>
      <Card id="botoes">
        <CardHeader title="Botões" />
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primário</Button>
            <Button variant="accent"><Plus size={16} aria-hidden="true" /> Destaque</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="danger">Destrutivo</Button>
            <Button size="sm">Compacto</Button>
            <Button disabled>Desabilitado</Button>
          </div>
          <ExampleCode>{`import { Button } from '../../components/ui/Button'

<Button type="submit">Salvar</Button>
<Button variant="secondary" onClick={onCancel}>Cancelar</Button>
<Button variant="danger" size="sm" onClick={onRemove}>Remover</Button>`}</ExampleCode>
        </CardContent>
      </Card>

      <FieldsExample />

      <Card id="badges">
        <CardHeader title="Badges" />
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Rascunho</Badge>
            <Badge tone="warning">Pendente</Badge>
            <Badge tone="info">Confirmado</Badge>
            <Badge tone="success">Concluído</Badge>
            <Badge tone="danger">Cancelado</Badge>
          </div>
          <ExampleCode>{`import { Badge } from '../../components/ui/Badge'

<Badge tone="info">Confirmado</Badge>`}</ExampleCode>
        </CardContent>
      </Card>

      <DialogExample />
    </>
  )
}
