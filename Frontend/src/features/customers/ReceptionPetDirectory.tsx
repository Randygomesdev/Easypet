import { useCallback, useState } from 'react'
import { CalendarPlus, PawPrint, Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState'
import { TextField } from '../../components/ui/Field'
import { Pagination } from '../../components/ui/Pagination'
import { Table, TableCell, TableHeaderCell } from '../../components/ui/Table'
import { useAuth } from '../../contexts/AuthContext'
import { customerService, type ReceptionPet } from '../../services/customer.service'
import { SPECIES_LABEL } from '../../services/pet.service'
import { ReceptionPetCreateForm } from './ReceptionPetCreateForm'
import { useCustomerQuery } from './useCustomerQuery'
import { useDirectoryFilter } from './useDirectoryFilter'
import { ReceptionBookingDialog } from '../booking/ReceptionBookingDialog'

export function ReceptionPetDirectory({ customerId, partnerId }: { customerId: string; partnerId: string }) {
  const { session, hasPermission } = useAuth()
  const canBook = session?.role === 'PARTNER' || hasPermission('BOOKINGS_WRITE')
  const { search, setSearch, submitSearch, filter: { q, page }, selectPage } = useDirectoryFilter()
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [bookingPet, setBookingPet] = useState<ReceptionPet>()
  const [bookedPet, setBookedPet] = useState<string>()
  const load = useCallback((signal: AbortSignal) => customerService.listPets(customerId, { q, page, size: 10 }, signal),
    [customerId, q, page])
  const { data, error, loading, reload } = useCustomerQuery(load, 'Não foi possível carregar os pets.')

  return (
    <Card className="overflow-hidden">
      <CardHeader title="Pets" action={
        <Button size="sm" onClick={() => { setSaved(false); setShowCreate(true) }}>
          <Plus size={16} aria-hidden="true" />Novo pet
        </Button>
      } />
      <CardContent className="space-y-3">
        {saved && <p role="status" className="text-sm font-medium text-text-body">Pet cadastrado com sucesso.</p>}
        {bookedPet && <p role="status" className="text-sm font-medium text-text-body">Reserva de {bookedPet} criada.</p>}
        <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-2">
          <div className="w-full max-w-sm min-w-0">
            <TextField label="Buscar pets" type="search" maxLength={255} value={search}
              onChange={event => setSearch(event.target.value)} placeholder="Nome do pet" />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
      </CardContent>
      {loading && <LoadingState label="Carregando pets…" />}
      {error && <ErrorState message={error} action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>} />}
      {data?.content.length === 0 && <EmptyState icon={PawPrint} size="sm"
        title={q ? 'Nenhum pet encontrado.' : 'Nenhum pet cadastrado para este cliente.'} />}
      {data && data.content.length > 0 && (
        <Table caption="Pets do cliente">
          <thead className="border-b border-border">
            <tr>
              <TableHeaderCell>Nome</TableHeaderCell>
              <TableHeaderCell>Espécie</TableHeaderCell>
              <TableHeaderCell>Raça</TableHeaderCell>
              <TableHeaderCell>Nascimento</TableHeaderCell>
              <TableHeaderCell>Microchip</TableHeaderCell>
              {canBook && <TableHeaderCell>Ações</TableHeaderCell>}
            </tr>
          </thead>
          <tbody>
            {data.content.map(pet => (
              <tr key={pet.id} className="border-b border-border last:border-b-0">
                <TableCell className="font-semibold">{pet.name}</TableCell>
                <TableCell>{SPECIES_LABEL[pet.species]}</TableCell>
                <TableCell>{pet.breed}</TableCell>
                <TableCell className="whitespace-nowrap">{pet.birthDate.split('-').reverse().join('/')}</TableCell>
                <TableCell>{pet.microchipNumber ?? '—'}</TableCell>
                {canBook && <TableCell>
                  <Button size="sm" variant="secondary" aria-label={`Agendar ${pet.name}`}
                    onClick={() => { setBookedPet(undefined); setBookingPet(pet) }}>
                    <CalendarPlus size={16} aria-hidden="true" />Agendar
                  </Button>
                </TableCell>}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {data && <Pagination page={page + 1} totalPages={data.totalPages} label="Paginação de pets"
        onPageChange={next => selectPage(next - 1)} />}
      <Dialog open={showCreate} onOpenChange={open => { if (!saving) setShowCreate(open) }} title="Novo pet">
        {showCreate && <ReceptionPetCreateForm customerId={customerId} onSavingChange={setSaving}
          onSaved={() => { setShowCreate(false); setSaved(true); reload() }} />}
      </Dialog>
      {bookingPet && session && (
        <ReceptionBookingDialog actorId={session.userId} partnerId={partnerId} customerId={customerId}
          petId={bookingPet.id} petName={bookingPet.name} onClose={() => setBookingPet(undefined)}
          onBooked={() => { setBookedPet(bookingPet.name); setBookingPet(undefined) }} />
      )}
    </Card>
  )
}
