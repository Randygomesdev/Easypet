import { useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import ExampleCode from './ExampleCode'

export default function BookingExamples() {
  const [saved, setSaved] = useState(false)
  const [ready, setReady] = useState(false)

  return (
    <Card id="atendimento">
      <CardHeader title="Entrada para banho e tosa" action={ready && <Badge tone="success">Pronto para retirada</Badge>} />
      <CardContent className="space-y-4">
        <form className="space-y-3 text-sm text-text-body" onSubmit={event => {
          event.preventDefault()
          setSaved(true)
        }} onChange={() => setSaved(false)}>
          <label className="flex items-center gap-2">
            <input type="checkbox" required disabled={ready} /> Identificação do pet conferida
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" required disabled={ready} /> Orientações de entrada confirmadas
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="secondary" size="sm" disabled={saved || ready}>
              {saved ? 'Checklist salvo' : 'Salvar checklist'}
            </Button>
            <Button size="sm" disabled={!saved || ready} onClick={() => setReady(true)}>Marcar pronto para retirada</Button>
          </div>
        </form>
        <ExampleCode>{`<CardHeader title="Entrada para banho e tosa"
  action={booking.readyAt && <Badge tone="success">Pronto para retirada</Badge>} />
<Button type="submit" variant="secondary" size="sm" disabled={working || (saved && !dirty)}>
  {saved && !dirty ? 'Checklist salvo' : 'Salvar checklist'}
</Button>`}</ExampleCode>
      </CardContent>
    </Card>
  )
}
