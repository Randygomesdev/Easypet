import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { bearer, captures, docker, futureDate, json, prepareConsultation, signIn, token } from './wave-b-fixtures'

test.skip(process.env.E2E_H2 !== '1', 'Requer o runner descartável H2.')

test('H2 preserva navegação master e empurra o conteúdo ao abrir menu no desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, 'admin@example.test')
  await expect(page).toHaveURL(/\/admin\/visao-geral$/)
  const main = page.getByRole('main', { includeHidden: true })
  const nav = page.getByRole('navigation', { name: 'Navegação principal' })
  await expect(main).toBeVisible()
  await page.mouse.move(1300, 400)
  const before = (await main.boundingBox())!.x
  await nav.hover()
  await expect.poll(async () => (await main.boundingBox())!.x).toBeGreaterThan(before)
  await page.mouse.move(1300, 400)
  await expect.poll(async () => (await main.boundingBox())!.x).toBeCloseTo(before, 0)
  await page.setViewportSize({ width: 390, height: 844 })
  const toggle = page.getByRole('button', { name: 'Abrir menu', includeHidden: true })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(toggle).toBeFocused()
})

test('H2 combina catálogo e comprova aceite explícito, aplicação única e interrupção com histórico', async ({ page, request }) => {
  test.setTimeout(150_000)
  const owner = bearer(await token(request, 'parceiro-h2@example.test'))
  const tutor = bearer(await token(request, 'tutor-h2@example.test'))
  const outsider = bearer(await token(request, 'retry@example.test'))
  const admin = bearer(await token(request, 'admin@example.test'))
  const { partner, service } = await prepareConsultation(request, owner, {
    name: 'Clínica H2 E2E', cnpj: '11111111000110', serviceName: 'Serviço exclusivo H2',
    staffName: 'Profissional H2', categories: ['PETSHOP'],
  })
  const query = new URLSearchParams({ name: service.name, category: 'PETSHOP', size: '1' })
  const catalog = await json(request, 'GET', `/partners/catalog?${query}`, 200, tutor)
  expect(catalog.content).toEqual([expect.objectContaining({ id: partner.id })])
  expect(catalog.totalElements).toBe(1)
  const unmatched = new URLSearchParams({ name: service.name, category: 'CLINIC' })
  expect(await json(request, 'GET', `/partners/catalog?${unmatched}`, 200, tutor)).toMatchObject({ content: [], totalElements: 0 })
  const pet = await json(request, 'POST', '/pets', 201, tutor, {
    name: 'Pet adicional H2', species: 'DOG', breed: 'SRD', gender: 'MALE', weight: 8, birthDate: '2022-01-01',
  })
  const booking = await json(request, 'POST', '/bookings', 201, { ...tutor, 'Idempotency-Key': randomUUID() }, {
    partnerId: partner.id, serviceId: service.id, petId: pet.id, bookingDate: `${futureDate(14)}T14:00:00`, type: 'CONSULTATION', price: Number(service.price),
  })
  const bookingPath = `/bookings/${booking.id}`
  await json(request, 'PATCH', `${bookingPath}/status?status=CONFIRMED`, 200, owner)
  const reminder = () => json(request, 'GET', `/admin/notifications?bookingId=${booking.id}`, 200, admin)
    .then(result => result.content.find((item: { type: string }) => item.type === 'REMINDER')?.status)
  await expect.poll(reminder, { timeout: 25_000 }).toBe('PENDING')
  await json(request, 'PATCH', `${bookingPath}/status?status=IN_PROGRESS`, 200, owner)
  const extras = `${bookingPath}/extras`
  const proposal = { description: 'Adicional sintético H2', quantity: 2, unitPriceCents: 750 }
  const propose = { ...owner, 'Idempotency-Key': randomUUID() }
  const pending = await json(request, 'POST', extras, 201, propose, proposal)
  expect(await json(request, 'POST', extras, 201, propose, proposal)).toMatchObject({ id: pending.id })
  const decision = `${extras}/${pending.id}/decisions/digital`
  const approval = { version: pending.version, decision: 'APPROVE' }
  await json(request, 'POST', decision, 404, outsider, approval)
  const charges = '/payments/cashier/charges'
  const charge = await json(request, 'POST', charges, 200, { ...owner, 'Idempotency-Key': randomUUID() }, {
    bookingId: booking.id, description: 'Caixa adicional H2', baseCents: 6000, extrasCents: 0, discountCents: 0,
  })
  const chargePath = `${charges}/${charge.id}`
  const apply = { ...owner, 'Idempotency-Key': randomUUID() }
  const payload = { approvalId: pending.id, version: pending.version }
  const path = `${chargePath}/approved-extras`
  await json(request, 'POST', path, 404, apply, payload)
  const accepted = await json(request, 'POST', decision, 200, tutor, approval)
  expect(accepted).toMatchObject({ status: 'APPROVED', amountCents: 1500, channel: 'DIGITAL' })
  const results = await Promise.all([json(request, 'POST', path, 200, apply, payload), json(request, 'POST', path, 200, apply, payload)])
  expect(results[0]).toEqual(results[1])
  await json(request, 'POST', path, 409, { ...owner, 'Idempotency-Key': randomUUID() }, payload)
  const before = await json(request, 'GET', chargePath, 200, owner)
  expect(before).toMatchObject({ charge: { totalCents: 7500, receivedCents: 0 }, movements: [],
    approvedExtras: [expect.objectContaining({ approvalId: accepted.id, amountCents: 1500 })] })
  const inPerson = await json(request, 'POST', extras, 201, { ...owner, 'Idempotency-Key': randomUUID() }, {
    description: 'Aceite presencial sintético H2', quantity: 1, unitPriceCents: 900,
  })
  const inPersonPath = `${extras}/${inPerson.id}/decisions/in-person`
  await json(request, 'POST', inPersonPath, 400, owner, { version: inPerson.version, decision: 'APPROVE' })
  expect(await json(request, 'POST', inPersonPath, 200, owner, { version: inPerson.version, decision: 'APPROVE',
    reason: 'Tutor conferiu a proposta', evidence: 'Protocolo sintético de balcão H2' }))
    .toMatchObject({ status: 'APPROVED', channel: 'IN_PERSON' })
  const interruption = { reason: 'Interrupção sintética H2' }
  const stopped = await json(request, 'POST', `${bookingPath}/interrupt`, 200, owner, interruption)
  expect(stopped).toMatchObject({ status: 'INTERRUPTED', interruptionReason: interruption.reason })
  expect(await json(request, 'POST', `${bookingPath}/interrupt`, 200, owner, interruption)).toMatchObject({ interruptedAt: stopped.interruptedAt })
  await expect.poll(reminder, { timeout: 25_000 }).toBe('SUPERSEDED')
  expect(await json(request, 'GET', chargePath, 200, owner)).toEqual(before)
  expect(await json(request, 'GET', `/admin/bookings/investigations/${booking.id}?partnerId=${partner.id}`, 200, admin))
    .toMatchObject({ booking: { bookingId: booking.id, status: 'INTERRUPTED' }, reason: interruption.reason })
  await json(request, 'GET', `/admin/cashier/bookings/${booking.id}?partnerId=${partner.id}`, 200, admin)
  await signIn(page, 'admin@example.test')
  await expect(page).toHaveURL(/\/admin\/visao-geral$/)
  await page.goto(`/admin/ocorrencias?reserva=${booking.id}`)
  await expect(page.getByRole('heading', { name: 'Ocorrências de reservas' })).toBeVisible()
  await expect(page.getByText(interruption.reason, { exact: true }).first()).toBeVisible()
})

test('H2 protege auditoria e ingresso operacional e conserva privacidade dos chamados', async ({ page, request }) => {
  const tutor = bearer(await token(request, 'tutor@example.test'))
  const other = bearer(await token(request, 'retry@example.test'))
  const admin = bearer(await token(request, 'admin@example.test'))
  const id = randomUUID()
  for (const path of ['/admin/identity-audit', `/admin/bookings/investigations/${id}`, `/admin/cashier/bookings/${id}`,
    '/admin/operations/inbox', '/admin/operations/inbox/unread']) {
    await json(request, 'GET', path, 401)
    expect((await request.post(`/api/v1${path}`, { headers: admin, data: {} })).status(), path).toBe(404)
  }
  await json(request, 'GET', '/admin/identity-audit', 403, tutor)
  const audit = await json(request, 'GET', '/admin/identity-audit?size=100', 200, admin)
  expect(audit.content).toEqual(expect.arrayContaining([expect.objectContaining({ action: 'CUSTOMER_DEACTIVATED' })]))
  await signIn(page, 'admin@example.test')
  await expect(page).toHaveURL(/\/admin\/visao-geral$/)
  await page.goto('/admin/auditoria')
  await expect(page.getByRole('heading', { name: 'Auditoria de identidade' })).toBeVisible()
  await expect(page.getByText('Desativação sintética H2', { exact: true })).toBeVisible()

  const subject = 'Chamado privado H2'
  const command = { subject, message: 'Solicitação sintética de demonstração.', bookingId: null }
  const headers = { ...tutor, 'Idempotency-Key': randomUUID() }
  const ticket = await json(request, 'POST', '/support/tickets', 201, headers, command)
  expect(await json(request, 'POST', '/support/tickets', 201, headers, command)).toMatchObject({ id: ticket.id })
  await json(request, 'POST', '/support/tickets', 409, headers, { ...command, subject: 'Outro assunto' })
  await json(request, 'GET', `/support/tickets/${ticket.id}`, 404, other)
  const inbox = await json(request, 'GET', '/admin/operations/inbox?kind=TICKET', 200, admin)
  const item = inbox.content.find((candidate: { subject: string }) => candidate.subject === subject)
  expect(item?.id).toBeTruthy()
  await page.goto('/admin/alertas')
  await expect(page.getByRole('heading', { name: 'Alertas e chamados' })).toBeVisible()
  await expect(page.getByRole('heading', { name: subject })).toBeVisible()
  await json(request, 'POST', `/admin/operations/inbox/${item.id}/acknowledge`, 204, admin)
  const resolutionMessage = 'Chamado sintético resolvido.'
  await json(request, 'POST', `/admin/operations/inbox/${item.id}/resolve`, 204, admin, { resolutionMessage })
  expect(await json(request, 'GET', `/support/tickets/${ticket.id}`, 200, tutor)).toMatchObject({ status: 'RESOLVED', resolutionMessage })
  expect((await request.post('/api/v1/internal/operations/alerts', { headers: admin, data: {} })).status()).toBe(404)
})

test('H2 conserva preferência individual e autorização de balcão versionada', async ({ page, request }) => {
  test.setTimeout(150_000)
  const tutor = bearer(await token(request, 'tutor-h2@example.test'))
  const other = bearer(await token(request, 'tutor@example.test'))
  const owner = bearer(await token(request, 'parceiro-h2@example.test'))
  const outsider = bearer(await token(request, 'parceiro-escrita-h1@example.test'))
  const preferences = '/notifications/preferences'
  expect(await json(request, 'GET', preferences, 200, tutor)).toEqual({ bookingEmail: true })
  await signIn(page, 'tutor-h2@example.test')
  await expect(page).toHaveURL(/\/app\/home$/)
  await page.goto('/suporte')
  const choice = page.getByLabel('E-mail sobre minhas reservas')
  await expect(choice).toHaveValue('true')
  await choice.selectOption('false')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Preferência salva.', { exact: true })).toBeVisible()
  await page.reload()
  await expect(choice).toHaveValue('false')
  expect(await json(request, 'GET', preferences, 200, tutor)).toEqual({ bookingEmail: false })
  expect(await json(request, 'GET', preferences, 200, other)).toEqual({ bookingEmail: true })
  const customer = await json(request, 'POST', '/partners/me/customers', 201, owner, {
    name: 'Balcão Consentimento H2', email: 'balcao-consentimento-h2@example.test',
  })
  const path = `/partners/me/customers/${customer.id}/notification-email`
  expect(await json(request, 'GET', path, 200, owner)).toMatchObject({ state: 'NOT_GRANTED', revision: 0 })
  await json(request, 'GET', path, 404, outsider)
  await json(request, 'PUT', path, 400, owner, { authorized: true, expectedRevision: 0, confirmedInPerson: false })
  const consent = { authorized: true, expectedRevision: 0, confirmedInPerson: true }
  await json(request, 'PUT', path, 409, owner, { ...consent, confirmedEmail: 'endereco-antigo@example.test' })
  const allowed = await json(request, 'PUT', path, 200, owner, { ...consent, confirmedEmail: customer.email })
  expect(allowed).toMatchObject({ state: 'AUTHORIZED', revision: 1 })
  const admin = bearer(await token(request, 'admin@example.test'))
  const partner = await json(request, 'GET', '/partners/me', 200, owner)
  const service = partner.services[0]
  const pet = await json(request, 'POST', `/pets/reception/customers/${customer.id}`, 201, owner, {
    name: 'Pet consentimento H2', species: 'DOG', breed: 'SRD', gender: 'MALE', weight: 8, birthDate: '2022-01-01',
  })
  const confirm = async (day: number) => {
    const booking = await json(request, 'POST', '/bookings', 201, { ...owner, 'Idempotency-Key': randomUUID() }, {
      partnerId: partner.id, receptionCustomerId: customer.id, petId: pet.id,
      serviceId: service.id, bookingDate: `${futureDate(day)}T16:00:00`, price: 60, type: 'CONSULTATION',
    })
    await json(request, 'PATCH', `/bookings/${booking.id}/status?status=CONFIRMED`, 200, owner)
    return () => json(request, 'GET', `/admin/notifications?bookingId=${booking.id}`, 200, admin)
      .then(result => result.content.find((item: { type: string }) => item.type === 'CONFIRMATION')?.status)
  }
  const authorized = await confirm(16)
  await expect.poll(authorized, { timeout: 25_000 }).toBe('SENT')
  expect(await captures(customer.email)).toHaveLength(1)
  await json(request, 'PUT', path, 409, owner, { authorized: false, expectedRevision: 0 })
  expect(await json(request, 'PUT', path, 200, owner, { authorized: false, expectedRevision: allowed.revision }))
    .toMatchObject({ state: 'REVOKED', revision: 2 })
  const revoked = await confirm(17)
  await expect.poll(revoked, { timeout: 25_000 }).toBe('SUPPRESSED')
  expect(await captures(customer.email)).toHaveLength(1)
})

test('H2 entrega e resolve alerta operacional com o mesmo incidente após falha local', async ({ request }) => {
  const directory = await mkdtemp(join(tmpdir(), 'easypet-test-operations-'))
  const admin = bearer(await token(request, 'admin@example.test'))
  const { deliverOperations, sendThroughNotification } = await import('../../scripts/production/operations-alerts.mjs')
  const signal = { source: 'BACKUP', service: 'BACKUP', code: 'BACKUP_FAILED', severity: 'ERROR' }
  const deliver = (event: unknown) => sendThroughNotification((args: string[], options: { input: string }) =>
    docker(['exec', '-i', '{project}-notification-service-1', ...args.slice(3)], options.input).trim(), event)
  try {
    const anonymous = docker(['exec', '{project}-notification-service-1', 'curl', '--silent', '--max-time', '5',
      '-o', '/dev/null', '-w', '%{http_code}', '-H', 'Content-Type: application/json', '--data-binary',
      JSON.stringify({ ...signal, incidentId: randomUUID(), state: 'OPEN', sequence: 1 }),
      'http://127.0.0.1:8087/api/v1/internal/operations/alerts'])
    expect(anonymous.trim()).toBe('401')
    expect(await deliverOperations(directory, [{ ...signal, failed: true }], () => false)).toEqual({ sent: 0, pending: 1 })
    expect(await deliverOperations(directory, [{ ...signal, failed: true }], deliver)).toEqual({ sent: 1, pending: 0 })
    const open = await json(request, 'GET', '/admin/operations/inbox?kind=ALERT&status=OPEN', 200, admin)
    const incident = open.content.find((item: { code: string }) => item.code === signal.code)
    expect(incident).toMatchObject({ signalState: 'OPEN', signalSequence: 1 })
    expect(await deliverOperations(directory, [{ ...signal, failed: false }], deliver)).toEqual({ sent: 1, pending: 0 })
    const resolved = await json(request, 'GET', '/admin/operations/inbox?kind=ALERT&status=RESOLVED', 200, admin)
    expect(resolved.content).toEqual(expect.arrayContaining([expect.objectContaining({ id: incident.id,
      incidentId: incident.incidentId, signalState: 'RECOVERED', signalSequence: 2, resolutionOrigin: 'SYSTEM' })]))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
