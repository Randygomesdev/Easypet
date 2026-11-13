import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { SelectField, TextField } from '../../components/ui/Field'
import { CopyClaimCode } from '../../features/claims/CopyClaimCode'
import ExampleCode from './ExampleCode'

const recoveryCode = `<form onSubmit={submit} className="space-y-4">
  <TextField name="email" type="email" label="E-mail" autoComplete="email" required />
  <Button type="submit" variant="accent" disabled={loading}>Enviar link de recuperação</Button>
</form>
{sent && <p role="status">Se houver uma conta ativa para esse e-mail, você receberá um link.</p>}`

export default function AccountExamples() {
  const [sent, setSent] = useState(false)
  const [invited, setInvited] = useState(false)
  const [claimed, setClaimed] = useState(false)

  function submitExample(event: FormEvent<HTMLFormElement>, showConfirmation: (value: boolean) => void) {
    event.preventDefault()
    showConfirmation(true)
  }

  return (
    <Card id="contas">
      <CardHeader title="Recuperação de senha, convite e vinculação" description="Formulários com dados fictícios para conferir os estados de confirmação." />
      <CardContent className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-text-heading">Recuperação de senha</h3>
          <form className="space-y-4" onSubmit={event => submitExample(event, setSent)}>
            <TextField name="email" type="email" label="E-mail da conta" autoComplete="email" required
              defaultValue="tutor@example.test" onChange={() => setSent(false)} />
            <Button type="submit" variant="accent">Enviar link de recuperação</Button>
            <p role="status" className="text-sm text-text-body">
              {sent && 'Se houver uma conta ativa para esse e-mail, você receberá um link para redefinir a senha.'}
            </p>
          </form>
          <ExampleCode>{recoveryCode}</ExampleCode>
          <details className="rounded-xl border border-border px-3 py-2 text-sm text-text-body">
            <summary className="cursor-pointer font-medium">Estados do link de recuperação</summary>
            <LoadingState label="Verificando o link de recuperação…" />
            <ErrorState message="Este link de recuperação expirou."
              action={<a href="#contas" className="font-semibold text-text-heading underline">Solicitar outro link</a>} />
          </details>
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-text-heading">Convite de equipe</h3>
          <form className="space-y-4" onSubmit={event => submitExample(event, setInvited)}>
            <TextField name="inviteEmail" type="email" label="E-mail do convidado" autoComplete="off" required
              defaultValue="recepcao@example.test" onChange={() => setInvited(false)} />
            <SelectField name="accessRole" label="Perfil de acesso" defaultValue="RECEPTION" onChange={() => setInvited(false)}>
              <option value="MANAGER">Gestor</option>
              <option value="RECEPTION">Recepção</option>
              <option value="PROFESSIONAL">Profissional</option>
            </SelectField>
            <Button type="submit" variant="accent">Enviar convite</Button>
            <p role="status" className="text-sm text-text-body">{invited && 'Exemplo de convite criado. Aguardando aceite.'}</p>
          </form>
          <ExampleCode>{`<SelectField name="accessRole" label="Perfil de acesso" defaultValue="RECEPTION">
  <option value="MANAGER">Gestor</option>
  <option value="RECEPTION">Recepção</option>
  <option value="PROFESSIONAL">Profissional</option>
</SelectField>
<Button type="submit" variant="accent">Enviar convite</Button>`}</ExampleCode>
        </div>
        <div className="space-y-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-text-heading">Vinculação de cadastro</h3>
          <CopyClaimCode label="Código da conta de exemplo" value="43bf8767-c38a-4ca8-a09a-bb680a2897be" />
          <form className="space-y-4" onSubmit={event => submitExample(event, setClaimed)}>
            <TextField label="Código de vinculação" name="token" autoComplete="off" spellCheck={false} required
              maxLength={80} onChange={() => setClaimed(false)} />
            <Button type="submit">Vincular cadastro de exemplo</Button>
            <p role="status" className="text-sm text-text-body">{claimed && 'Cadastro vinculado neste exemplo.'}</p>
          </form>
          <ExampleCode>{`<CopyClaimCode label="Código da conta" value={session.userId} />
<TextField label="Código de vinculação" name="token" autoComplete="off" spellCheck={false}
  required maxLength={80} disabled={saving} />
<Button type="submit" disabled={saving}>Vincular cadastro</Button>`}</ExampleCode>
        </div>
      </CardContent>
    </Card>
  )
}
