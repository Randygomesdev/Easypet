import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const host = '127.0.0.1'
const port = 19173
const url = `http://${host}:${port}`
process.env.VITE_API_URL = '/api/v1'
process.env.VITE_WAVE_B_ENABLED = 'true'

const fixtureDate = '2027-05-10'
const partnerId = 'partner-s03'
const petId = 'pet-s03'
const staff = { id: 'staff-s03', name: 'Ana' }
const partner = { id: partnerId, name: 'Petshop S03', services: [
  { id: 'service-s03', name: 'Banho', bookingType: 'GROOMING', billingUnit: 'HOURLY', price: 80, durationMinutes: 60 },
] }
const initialBooking = {
  id: 'booking-s03', petId, partnerId, userId: 'tutor-s03', type: 'GROOMING',
  status: 'CONFIRMED', bookingDate: `${fixtureDate}T09:00:00`, serviceId: 'service-s03',
  staffId: staff.id, price: 80, createdAt: '2027-05-08T09:00:00',
}
const pet = { id: petId, name: 'Luna', breed: 'SRD', species: 'DOG', gender: 'FEMALE', birthDate: '2022-01-01', weight: 8 }
const history = { appointments: [], vaccines: [], medications: [], exams: [], weights: [], surgeries: [] }
const errors = []
let browser
let server

async function openPage(role, path, { width = 1440, height = 900, reception = false, cart = false, desk = false } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, timezoneId: 'America/Sao_Paulo' })
  page.setDefaultTimeout(10000)
  page.on('pageerror', error => errors.push(error.message))
  await page.clock.setFixedTime(new Date(`${fixtureDate}T10:00:00-03:00`))
  await page.addInitScript(({ role, cart, partnerId, petId, fixtureDate }) => {
    const token = 'local-s03-test'
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ token, id: 's03', role, name: 'Teste', email: 's03@example.test' }))
    if (cart && !localStorage.getItem('s03-cart-seeded')) {
      localStorage.setItem('s03-cart-seeded', '1')
      localStorage.setItem('easypet_cart', JSON.stringify([{
        cartItemId: 's03-cart-item', productId: 'service-s03', label: 'Banho', price: 80, quantity: 1,
        metadata: { partnerId, petId, petName: 'Luna', bookingType: 'GROOMING', scheduledDate: fixtureDate, scheduledTime: '10:30' },
      }]))
    }
  }, { role, cart, partnerId, petId, fixtureDate })

  const state = {
    booking: {
      ...initialBooking,
      ...(role === 'CUSTOMER' ? { bookingDate: `${fixtureDate}T12:00:00` } : {}),
      ...(reception ? { userId: null, receptionCustomerId: 'reception-s03' } : {}),
    },
    checkIn: null,
    block: null,
    rescheduleFails: true,
    reschedules: [],
    reasons: [],
    submissions: [],
    catalogAvailable: false,
    slotsAvailable: false,
    updatedPrice: null,
    extras: [],
    extraRequests: [],
    interrupts: [],
  }

  await page.route('**/api/v1/**', async route => {
    const request = route.request()
    const uri = new URL(request.url())
    const path = uri.pathname.slice('/api/v1'.length)
    const method = request.method()
    const current = state.booking
    const data = request.postDataJSON()
    const respond = (json, status = 200) => route.fulfill({ json, status })
    const bookingPath = `/bookings/${current.id}`
    if (path === '/bookings/policy') return respond({ tutorNoticeMinutes: 90, defaultAppointmentDurationMinutes: 30 })
    if (path === bookingPath + '/tutor-actions') return respond({
      canCancel: ['PENDING', 'CONFIRMED'].includes(current.status),
      canReschedule: ['PENDING', 'CONFIRMED'].includes(current.status), tutorNoticeMinutes: 90,
    })
    if (path === '/partners/catalog') {
      const term = uri.searchParams.get('name')
      if (term === 'Petshop' && !state.catalogAvailable) {
        return respond({ message: 'Catálogo temporariamente indisponível.' }, 503)
      }
      return respond({ content: [partner], totalPages: 1, totalElements: 1, number: 0, size: 12 })
    }
    if (path === '/auth/session') {
      return respond(role === 'TEAM_MEMBER'
        ? { userId: 's03', role, partnerId, teamAccessId: 's03-link',
            accessRole: desk ? 'RECEPTION' : 'PROFESSIONAL',
            permissions: desk ? ['BOOKINGS_READ', 'BOOKINGS_WRITE', 'DESK_CUSTOMERS_MANAGE']
              : ['BOOKINGS_ASSIGNED_READ', 'BOOKINGS_ASSIGNED_ATTEND'] }
        : { userId: 's03', role, partnerId: null, accessRole: null, permissions: [] })
    }
    if (path === '/bookings/agenda-access') {
      return respond({ partnerId, canManage: role !== 'TEAM_MEMBER', canAttend: true, staffId: role === 'TEAM_MEMBER' ? staff.id : null,
        teamMember: role === 'TEAM_MEMBER', canRegisterInPersonExtraDecision: desk || role === 'PARTNER' })
    }
    if (path === `/bookings/partner/${partnerId}/summary`) return respond(partner)
    if (path === bookingPath + '/pet-summary') return respond({ id: petId, name: pet.name, species: 'DOG' })
    if (path === '/partners/me' || path === `/partners/catalog/${partnerId}`) {
      return respond(state.updatedPrice === null ? partner : {
        ...partner, services: partner.services.map(service => ({ ...service, price: state.updatedPrice })),
      })
    }
    if (path === '/partners/me/desk') return respond({ partnerId })
    if (path.startsWith('/partners/me/customers')) {
      const customer = { id: 'reception-s03', partnerId, partnerName: partner.name, name: 'Ana Balcão',
        accountStatus: 'UNCLAIMED', createdAt: '2027-05-08T12:00:00Z' }
      return respond(path.endsWith('/customers')
        ? { content: [customer], number: 0, size: 10, totalPages: 1, totalElements: 1 }
        : customer)
    }
    if (path === `/partners/${partnerId}/staff`) return respond([staff])
    if (path === '/pets') return respond({ content: [pet] })
    if (path === '/payments/credits/balance' && cart) return respond({ balance: 80 })
    if (path === '/pets/reception/customers/reception-s03') {
      return respond({ content: [pet], number: 0, size: 10, totalPages: 1, totalElements: 1 })
    }
    if (path === `/pets/${petId}` || path === `/pets/reception/customers/reception-s03/${petId}`) return respond(pet)
    if (path === `/pets/${petId}/history`) {
      if (reception || role === 'TEAM_MEMBER') errors.push('A tela solicitou prontuário sem autorização clínica.')
      return respond(history)
    }
    if (path === '/bookings/my-bookings' || path === `/bookings/partner/${partnerId}`) {
      const status = uri.searchParams.get('status')
      const content = status && status !== current.status ? [] : [current]
      return respond({ content, totalElements: content.length, totalPages: 1, number: 0, size: 10 })
    }
    if (path === '/bookings/availability') {
      if (uri.searchParams.has('excludeBookingId')) assert.equal(uri.searchParams.get('excludeBookingId'), current.id)
      if (uri.searchParams.has('excludeBookingId') && !state.slotsAvailable) {
        return respond({ message: 'Horários temporariamente indisponíveis.' }, 503)
      }
      return respond([{ time: '10:30', available: true, staff: [staff] }, { time: '11:00', available: false }])
    }
    if (path === bookingPath + '/history') return respond([])
    if (path === bookingPath + '/extras' && method === 'POST') {
      const key = request.headers()['idempotency-key']
      state.extraRequests.push({ key, data })
      if (state.extraRequests.length === 1) {
        state.extras.push({ id: 'extra-s03', bookingId: current.id, ...data, version: 1, amountCents: data.quantity * data.unitPriceCents, status: 'PENDING' })
        return route.abort('failed')
      }
      return respond(state.extras[0], 201)
    }
    if (path === bookingPath + '/extras') {
      return respond({ content: state.extras, totalElements: state.extras.length, totalPages: 1, number: 0, size: 20 })
    }
    if (path === bookingPath + '/extras/extra-s03/decisions/in-person' || path === bookingPath + '/extras/extra-s03/decisions/digital') {
      assert.equal(data.version, 1)
      if (path.endsWith('/in-person')) assert.ok(data.reason && data.evidence)
      state.extras[0] = { ...state.extras[0], status: data.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        channel: path.endsWith('/in-person') ? 'IN_PERSON' : 'DIGITAL' }
      return respond(state.extras[0])
    }
    if (path === bookingPath + '/interrupt') {
      state.interrupts.push(data)
      state.booking = { ...current, status: 'INTERRUPTED', interruptionReason: data.reason }
      return respond(state.booking)
    }
    if (path === '/bookings' && method === 'POST') {
      state.submissions.push({ key: request.headers()['idempotency-key'], data })
      if (state.updatedPrice !== null && data.price !== state.updatedPrice) {
        return respond({ message: 'O preço do serviço mudou.', errors: { price: 'Confira o valor atualizado.' } }, 409)
      }
      if (state.submissions.length === 1) return route.abort('failed')
      return respond({ ...current, ...data, status: 'PENDING' }, 201)
    }
    if (path === bookingPath + '/status') {
      const status = uri.searchParams.get('status')
      if (data?.reason) state.reasons.push({ status, reason: data.reason })
      state.booking = { ...current, status, ...(status === 'CANCELLED' ? { cancellationReason: data.reason } : {}) }
      return respond(state.booking)
    }
    if (path === bookingPath + '/reschedule') {
      state.reschedules.push(data)
      if (state.rescheduleFails) {
        state.rescheduleFails = false
        return respond({ message: 'A vaga acabou de ser ocupada.' }, 409)
      }
      state.booking = { ...current, ...data }
      return respond(state.booking)
    }
    if (path === bookingPath + '/check-in' && method === 'PUT') {
      state.checkIn = data
      return respond(data)
    }
    if (path === bookingPath + '/check-in') {
      return state.checkIn ? respond(state.checkIn) : route.fulfill({ status: 204 })
    }
    if (path === bookingPath + '/ready') {
      assert.ok(state.checkIn?.petIdentified && state.checkIn?.instructionsConfirmed)
      state.booking = { ...current, readyAt: `${fixtureDate}T11:30:00` }
      return respond(state.booking)
    }
    const blocks = `/bookings/partner/${partnerId}/blocks`
    if (path === blocks && method === 'POST') {
      state.block = { ...data, id: 'block-s03', partnerId }
      return respond(state.block, 201)
    }
    if (path === blocks) return respond(state.block ? [state.block] : [])
    if (path === blocks + '/block-s03' && method === 'DELETE') {
      state.block = null
      return route.fulfill({ status: 204 })
    }
    return respond({ balance: 0 })
  })
  await page.goto(url + path)
  return { page, state }
}

try {
  process.env.VITE_INTERNAL_PILOT = 'true'
  server = await createServer({ root, server: { host, port, strictPort: true }, logLevel: 'warn' })
  await server.listen()
  browser = await chromium.launch({ channel: process.env.EASYPET_S03_BROWSER_CHANNEL || 'chrome' })

  const agenda = await openPage('PARTNER', '/partner/agendamentos')
  const row = agenda.page.getByRole('row').filter({ hasText: 'Luna' })
  await row.getByRole('button', { name: 'Registrar falta' }).click()
  const absence = agenda.page.getByRole('dialog', { name: 'Registrar falta' })
  await absence.getByRole('textbox', { name: 'Motivo' }).fill('Tutor não compareceu')
  await absence.getByRole('button', { name: 'Registrar falta' }).click()
  await expect(row.getByText('Falta', { exact: true })).toBeVisible()
  await expect(row.getByRole('button', { name: 'Reagendar' })).toHaveCount(0)
  assert.deepEqual(agenda.state.reasons, [{ status: 'NO_SHOW', reason: 'Tutor não compareceu' }])

  await agenda.page.getByRole('button', { name: 'Bloqueios de agenda' }).click()
  const blocks = agenda.page.getByRole('dialog', { name: 'Bloqueios de agenda' })
  await blocks.getByLabel('Início').fill('2027-05-11T08:00')
  await blocks.getByLabel('Fim').fill('2027-05-11T12:00')
  await blocks.getByLabel('Motivo').fill('Manutenção')
  await blocks.getByRole('button', { name: 'Bloquear período' }).click()
  await expect(blocks.getByText('Manutenção')).toBeVisible()
  await blocks.getByRole('button', { name: 'Remover bloqueio' }).click()
  await expect(blocks.getByText('Nenhum bloqueio cadastrado.')).toBeVisible()
  await agenda.page.close()

  const tutor = await openPage('CUSTOMER', '/app/agendamentos', { width: 390, height: 840 })
  await tutor.page.getByRole('button', { name: /Luna/ }).click()
  await tutor.page.getByRole('button', { name: 'Reagendar', exact: true }).click()
  const reschedule = tutor.page.getByRole('dialog', { name: 'Reagendar' })
  await expect(reschedule.getByText('Horários temporariamente indisponíveis.')).toBeVisible()
  tutor.state.slotsAvailable = true
  await reschedule.getByRole('button', { name: 'Consultar novamente' }).click()
  await reschedule.getByLabel('Nova data').fill('2027-05-11')
  await reschedule.getByLabel('Horário').selectOption('10:30')
  await reschedule.getByRole('button', { name: 'Salvar horário' }).click()
  await expect(reschedule.getByRole('alert')).toHaveText('A vaga acabou de ser ocupada.')
  await expect(reschedule.getByLabel('Horário')).toHaveValue('10:30')
  await reschedule.getByRole('button', { name: 'Salvar horário' }).click()
  await expect(reschedule).toBeHidden()
  await expect(tutor.page.getByText('11/05/2027 às 10:30', { exact: true }).last()).toBeVisible()
  assert.deepEqual(tutor.state.reschedules, Array.from({ length: 2 }, () => ({
    bookingDate: '2027-05-11T10:30:00', staffId: staff.id,
  })))
  await tutor.page.getByRole('button', { name: 'Cancelar agendamento', exact: true }).click()
  const cancellation = tutor.page.getByRole('dialog', { name: 'Cancelar agendamento' })
  await cancellation.getByLabel('Motivo').fill('Viagem')
  await cancellation.getByRole('button', { name: 'Cancelar agendamento' }).click()
  await expect(tutor.page.getByText('Viagem', { exact: true })).toBeVisible()
  await tutor.page.getByRole('button', { name: 'Fechar detalhes do agendamento' }).click()
  await tutor.page.getByRole('button', { name: 'Confirmados', exact: true }).click()
  await expect(tutor.page.getByRole('button', { name: /Luna/ })).toHaveCount(0)
  await tutor.page.getByRole('button', { name: 'Cancelados', exact: true }).click()
  await expect(tutor.page.getByRole('button', { name: /Luna/ })).toBeVisible()
  await tutor.page.close()

  const attendance = await openPage('TEAM_MEMBER', '/partner/atendimento', { reception: true })
  const visit = attendance.page.getByRole('button', { name: /Luna/ })
  await visit.click()
  await expect(visit.getByText('Em atendimento')).toBeVisible()
  await expect(visit.getByText('Banho', { exact: true })).toBeVisible()
  await expect(attendance.page.getByText('Cadastro do pet')).toBeVisible()
  await attendance.page.getByRole('checkbox', { name: 'Identificação do pet conferida' }).check()
  await attendance.page.getByRole('checkbox', { name: 'Orientações de entrada confirmadas' }).check()
  await attendance.page.getByLabel('Alergias informadas').fill('Shampoo específico')
  await attendance.page.getByRole('button', { name: 'Salvar checklist' }).click()
  await expect(attendance.page.getByRole('button', { name: 'Checklist salvo' })).toBeDisabled()
  await attendance.page.getByRole('button', { name: 'Marcar pronto para retirada' }).click()
  await expect(visit.getByText('Pronto para retirada')).toBeVisible()
  await attendance.page.getByRole('button', { name: 'Finalizar Atendimento' }).click()
  await expect(visit).toBeDisabled()
  assert.equal(attendance.state.checkIn.allergies, 'Shampoo específico')
  await attendance.page.close()

  const deskVisit = await openPage('TEAM_MEMBER', '/partner/atendimento', { desk: true, width: 390, height: 840 })
  const deskRow = deskVisit.page.getByRole('button', { name: /Luna/ })
  await deskRow.click()
  await deskVisit.page.getByRole('button', { name: 'Propor adicional', exact: true }).click()
  const proposal = deskVisit.page.getByRole('dialog', { name: 'Propor adicional' })
  await proposal.getByLabel('Descrição').fill('Hidratação')
  await proposal.getByLabel('Quantidade').fill('2')
  await proposal.getByLabel('Valor unitário (R$)').fill('15,50')
  await proposal.getByRole('button', { name: 'Enviar proposta' }).click()
  await expect(proposal.getByRole('alert')).toBeVisible()
  await deskVisit.page.reload()
  await deskVisit.page.getByRole('button', { name: 'Propor adicional', exact: true }).click()
  await expect(proposal.getByLabel('Descrição')).toHaveValue('Hidratação')
  await proposal.getByRole('button', { name: 'Enviar proposta' }).click()
  await expect(proposal).toBeHidden()
  assert.deepEqual(deskVisit.state.extraRequests[0], deskVisit.state.extraRequests[1])
  await deskVisit.page.getByRole('button', { name: 'Registrar decisão presencial' }).click()
  const faceToFace = deskVisit.page.getByRole('dialog', { name: 'Registrar decisão presencial' })
  await expect(faceToFace.getByText(/Total R\$\s*31,00/)).toBeVisible()
  await faceToFace.getByLabel('Decisão do tutor').selectOption('APPROVE')
  await faceToFace.getByLabel('Motivo').fill('Tutor conferiu o valor')
  await faceToFace.getByLabel('Prova declarada').fill('Protocolo sintético 41')
  await faceToFace.getByRole('button', { name: 'Registrar decisão' }).click()
  await expect(deskVisit.page.getByText('Autorizado · Registro presencial')).toBeVisible()
  await deskVisit.page.getByRole('button', { name: 'Interromper atendimento', exact: true }).click()
  const interrupt = deskVisit.page.getByRole('dialog', { name: 'Interromper atendimento' })
  await interrupt.getByLabel('Motivo').fill('Pedido do tutor')
  await interrupt.getByRole('button', { name: 'Interromper atendimento' }).click()
  await expect(deskRow.getByText('Interrompido')).toBeVisible()
  assert.deepEqual(deskVisit.state.interrupts, [{ reason: 'Pedido do tutor' }])
  await deskVisit.page.close()

  const digital = await openPage('CUSTOMER', '/app/agendamentos', { width: 360, height: 740 })
  digital.state.booking = { ...digital.state.booking, status: 'IN_PROGRESS' }
  digital.state.extras = [{ id: 'extra-s03', bookingId: digital.state.booking.id, description: 'Hidratação',
    quantity: 1, unitPriceCents: 1500, amountCents: 1500, status: 'PENDING', version: 1 }]
  await digital.page.getByRole('button', { name: /Luna/ }).click()
  await digital.page.getByRole('button', { name: 'Revisar e decidir' }).click()
  const decision = digital.page.getByRole('dialog', { name: 'Decidir sobre adicional' })
  await decision.getByLabel('Sua decisão').selectOption('REJECT')
  await decision.getByRole('button', { name: 'Registrar decisão' }).click()
  await expect(digital.page.getByText('Recusado', { exact: true })).toBeVisible()
  await digital.page.close()

  const catalog = await openPage('CUSTOMER', '/app/home', { width: 360, height: 740 })
  await catalog.page.getByRole('searchbox', { name: 'Buscar no catálogo' }).fill('Petshop')
  await expect(catalog.page.getByText('Catálogo temporariamente indisponível.')).toBeVisible()
  catalog.state.catalogAvailable = true
  await catalog.page.getByRole('button', { name: 'Tentar novamente' }).click()
  await catalog.page.getByText(partner.name, { exact: true }).click()
  await expect(catalog.page).toHaveURL(new RegExp('/app/parceiros/' + partnerId))
  async function openConfirmation(page) {
    await page.getByRole('button', { name: 'Agendar', exact: true }).click()
    await page.locator('input[type=date]').fill(fixtureDate)
    await page.getByRole('button', { name: 'Ver horários' }).click()
    await page.getByRole('button', { name: '10:30', exact: true }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
  }
  await openConfirmation(catalog.page)
  const mobileDialog = catalog.page.getByRole('dialog', { name: 'Agendar serviço' })
  await expect(mobileDialog.getByText(/90 minutos de antecedência/)).toBeVisible()
  await expect(mobileDialog.getByText('Duração do serviço: 1 hora')).toBeVisible()
  assert.ok(await mobileDialog.evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth))
  await catalog.page.getByRole('button', { name: 'Solicitar agendamento' }).click()
  await expect(catalog.page.getByRole('button', { name: 'Retomar reserva' })).toBeVisible()
  await catalog.page.reload()
  await catalog.page.getByRole('button', { name: 'Agendar', exact: true }).click()
  await catalog.page.getByRole('button', { name: 'Retomar reserva' }).click()
  await expect(catalog.page.getByText('Agendamento solicitado!')).toBeVisible()
  assert.equal(catalog.state.submissions.length, 2)
  assert.ok(catalog.state.submissions[0].key)
  assert.deepEqual(catalog.state.submissions[0], catalog.state.submissions[1])
  await catalog.page.close()

  const stalePrice = await openPage('CUSTOMER', `/app/parceiros/${partnerId}`, { width: 360, height: 740 })
  await openConfirmation(stalePrice.page)
  stalePrice.state.updatedPrice = 90
  await stalePrice.page.getByRole('button', { name: 'Solicitar agendamento' }).click()
  await expect(stalePrice.page.getByRole('alert').filter({ hasText: 'O preço do serviço mudou.' })).toBeVisible()
  await stalePrice.page.getByRole('button', { name: 'Atualizar preço do serviço' }).click()
  await openConfirmation(stalePrice.page)
  await stalePrice.page.getByRole('button', { name: 'Solicitar agendamento' }).click()
  await expect(stalePrice.page.getByText('Agendamento solicitado!')).toBeVisible()
  assert.deepEqual(stalePrice.state.submissions.map(({ data }) => data.price), [80, 90])
  assert.notEqual(stalePrice.state.submissions[0].key, stalePrice.state.submissions[1].key)
  await stalePrice.page.close()

  const desk = await openPage('TEAM_MEMBER', '/partner/clientes', { desk: true })
  async function openDeskBooking() {
    await desk.page.getByRole('button', { name: 'Ver cadastro de Ana Balcão' }).click()
    await desk.page.getByRole('button', { name: 'Agendar Luna' }).click()
    return desk.page.getByRole('dialog', { name: 'Agendar atendimento' })
  }
  let deskDialog = await openDeskBooking()
  await deskDialog.getByLabel('Serviço').selectOption('service-s03')
  await deskDialog.getByLabel('Data').fill(fixtureDate)
  await deskDialog.getByLabel('Horário').selectOption('10:30')
  await deskDialog.getByRole('button', { name: 'Solicitar reserva' }).click()
  await expect(deskDialog.getByRole('button', { name: 'Consultar ou retomar reserva' })).toBeVisible()
  await desk.page.reload()
  deskDialog = await openDeskBooking()
  await deskDialog.getByRole('button', { name: 'Consultar ou retomar reserva' }).click()
  await expect(desk.page.getByText('Reserva de Luna criada.')).toBeVisible()
  assert.equal(desk.state.submissions.length, 2)
  assert.ok(desk.state.submissions[0].key)
  assert.equal(desk.state.submissions[0].data.receptionCustomerId, 'reception-s03')
  assert.deepEqual(desk.state.submissions[0], desk.state.submissions[1])
  await desk.page.close()

  await server.close()
  process.env.VITE_INTERNAL_PILOT = 'false'
  server = await createServer({ root, server: { host, port, strictPort: true }, logLevel: 'warn' })
  await server.listen()
  const cart = await openPage('CUSTOMER', '/app/carrinho', { cart: true })
  await cart.page.getByRole('button', { name: /Créditos Easypet/ }).click()
  await cart.page.getByRole('button', { name: /Usar .* de crédito/ }).click()
  await cart.page.getByRole('button', { name: 'Confirmar com créditos' }).click()
  await expect(cart.page.getByRole('button', { name: 'Retomar reservas' })).toBeVisible()
  await cart.page.reload()
  await cart.page.getByRole('button', { name: 'Retomar reservas' }).click()
  await expect(cart.page).toHaveURL(/\/app\/pagamento\/sucesso\?source=credit/)
  assert.equal(cart.state.submissions.length, 2)
  assert.equal(cart.state.submissions[0].key, 's03-cart-item')
  assert.deepEqual(cart.state.submissions[0], cart.state.submissions[1])
  await cart.page.close()

  assert.deepEqual(errors, [])
  process.stdout.write('S03: jornada móvel, atendimento, interrupção, decisões de adicionais e regressões de reserva validadas com API simulada.\n')
} finally {
  await browser?.close()
  await server?.close()
}
