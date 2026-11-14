import { useCallback, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { SelectField } from '../../components/ui/Field'
import { notificationService, type NotificationPreference } from '../../services/notification.service'
import { queryError } from './presentation'
import { useNotificationQuery } from './useNotificationQuery'

export function BookingNotificationPreferences() {
  const load = useCallback((signal: AbortSignal) => notificationService.preferences(signal), [])
  const { state, reload } = useNotificationQuery(load)

  return (
    <Card>
      <CardHeader title="Avisos de agendamento" />
      {state.status === 'loading' && <LoadingState label="Carregando preferências…" />}
      {state.status === 'error' && (
        <ErrorState message={queryError(state.error, 'Não foi possível consultar sua preferência.')}
          action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />
      )}
      {state.status === 'success' && <PreferenceForm initial={state.data} />}
    </Card>
  )
}

function PreferenceForm({ initial }: { initial: NotificationPreference }) {
  const [bookingEmail, setBookingEmail] = useState(initial.bookingEmail)
  const [saved, setSaved] = useState(initial.bookingEmail)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; error: boolean }>()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || bookingEmail === saved) return
    setSaving(true)
    setFeedback(undefined)
    try {
      const result = await notificationService.savePreferences({ bookingEmail })
      setSaved(result.bookingEmail)
      setFeedback({ text: 'Preferência salva.', error: false })
    } catch (error) {
      setFeedback({ text: queryError(error, 'Não foi possível salvar a preferência.'), error: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <CardContent>
      <form className="space-y-3" onSubmit={submit}>
        <SelectField label="E-mail sobre minhas reservas" value={String(bookingEmail)} disabled={saving}
          hint="A preferência vale para avisos da agenda. E-mails de recuperação de senha continuam disponíveis."
          onChange={event => {
            setBookingEmail(event.target.value === 'true')
            setFeedback(undefined)
          }}>
          <option value="true">Receber avisos</option>
          <option value="false">Desativar avisos</option>
        </SelectField>
        <Button type="submit" disabled={saving || bookingEmail === saved}>{saving ? 'Salvando…' : 'Salvar'}</Button>
        {feedback && (
          <p role={feedback.error ? 'alert' : 'status'}
            className={feedback.error ? 'text-sm text-text-danger' : 'text-sm text-text-body'}>
            {feedback.text}
          </p>
        )}
      </form>
    </CardContent>
  )
}
