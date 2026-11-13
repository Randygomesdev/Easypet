import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { TextField } from '../../components/ui/Field'
import { useAuth } from '../../contexts/AuthContext'
import { customerApiError, customerService } from '../../services/customer.service'
import { CopyClaimCode } from './CopyClaimCode'

export default function ClaimCustomerPage() {
  const { session } = useAuth()
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const token = String(new FormData(event.currentTarget).get('token')).trim()
    setSaving(true)
    setError('')
    try {
      await customerService.redeemClaim(token)
      setCompleted(true)
    } catch (cause) {
      setError(customerApiError(cause, 'Não foi possível vincular o cadastro. Tente novamente.').message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-bold text-text-heading lg:text-3xl">Reivindicar cadastro</h1>
      {completed ? (
        <Card><CardContent className="space-y-4">
          <p role="status" className="text-sm font-medium text-text-body">Cadastro vinculado com sucesso.</p>
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-text-heading">
            <Link className="underline" to="/app/pets">Ver meus pets</Link>
            <Link className="underline" to="/app/agendamentos">Ver meus agendamentos</Link>
          </div>
        </CardContent></Card>
      ) : (
        <>
          {session && <Card>
            <CardHeader title="Mostre seu código da conta" description="Apresente este código ao atendente no estabelecimento." />
            <CardContent><CopyClaimCode label="Código da conta" value={session.userId} /></CardContent>
          </Card>}
          <Card>
            <CardHeader title="Vincule seu cadastro" description="Informe o código de vinculação entregue pelo atendente." />
            <CardContent>
              <form className="space-y-4" onSubmit={submit} aria-busy={saving}>
                <TextField label="Código de vinculação" name="token" autoComplete="off" spellCheck={false} required
                  maxLength={80} disabled={saving} />
                {error && <p role="alert" className="text-sm text-text-danger">{error}</p>}
                <Button type="submit" disabled={saving}>{saving ? 'Vinculando…' : 'Vincular cadastro'}</Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
