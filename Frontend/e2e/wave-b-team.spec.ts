import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { bearer, capturedLink, directStatus, futureDate, ignoreHTTPSErrors, json, openAuthPage, password, prepareConsultation, signIn, smtpUrl, sql, submitAuthForm, token } from './wave-b-fixtures'

test.skip(!smtpUrl, 'Requer o ambiente descartável da onda B.')

test('equipe opera por permissão e o tutor reivindica somente seu cadastro', async ({ request, page, baseURL }) => {
  test.setTimeout(210_000)
  const ownerEmail = 'parceiro-equipe@example.test'
  const owner = bearer(await token(request, ownerEmail))
  const tutor = bearer(await token(request, 'reivindicacao@example.test'))
  const wrongTutor = bearer(await token(request, 'tutor@example.test'))
  const { partner, staff: assigned, service, category, schedule } = await prepareConsultation(request, owner, {
    name: 'Equipe Onda B', cnpj: '11111111000104', serviceName: 'Consulta Onda B', staffName: 'Profissional vinculado Onda B',
  })
  const origin = new URL(baseURL!).origin
  await signIn(page, ownerEmail)
  await expect(page).toHaveURL(/\/partner\/dashboard$/)

  async function invite(role: 'RECEPTION' | 'MANAGER' | 'PROFESSIONAL') {
    const email = `equipe-${role.toLowerCase()}@example.test`
    await openAuthPage(page, '/partner/equipe', 'GET', '/auth/team/accesses')
    await page.getByLabel('E-mail do convidado').fill(email)
    await page.getByLabel('Perfil de acesso').selectOption(role)
    const invited = await submitAuthForm(page, '/auth/team/invitations', page.getByRole('button', { name: 'Enviar convite' }))
    expect(invited.status()).toBe(201)
    const link = await capturedLink(email, origin, '/team/invitation')
    const input = { token: link.searchParams.get('token'), name: `Equipe E2E ${role}`, password: password() }
    if (role === 'RECEPTION' || process.env.E2E_H1 === '1') {
      const guest = await page.context().browser()!.newPage({ baseURL, ignoreHTTPSErrors })
      try {
        await guest.goto(link.href)
        await guest.getByLabel('Nome completo').fill(input.name)
        await guest.getByLabel('Senha').fill(input.password)
        const accepted = await submitAuthForm(guest, '/auth/team/invitations/accept', guest.getByRole('button', { name: 'Aceitar convite' }))
        expect(accepted.status()).toBe(200)
        await expect(guest.getByRole('status')).toContainText('Sua conta de equipe foi ativada')
      } finally { await guest.close() }
    } else {
      await json(request, 'POST', '/auth/team/invitations/accept', 200, undefined, input)
    }
    await json(request, 'POST', '/auth/team/invitations/accept', 400, undefined, input)
    const headers = bearer(await token(request, email))
    const session = await json(request, 'GET', '/auth/session', 200, headers)
    expect(session).toMatchObject({ role: 'TEAM_MEMBER', accessRole: role, partnerId: partner.id })
    return { ...session, headers, email, invitationId: (await invited.json()).id }
  }

  const reception = await invite('RECEPTION')
  const manager = await invite('MANAGER')
  const professional = await invite('PROFESSIONAL')
  await openAuthPage(page, '/partner/equipe', 'GET', '/auth/team/accesses')
  await page.getByLabel('Conta de profissional').selectOption({ label: professional.email })
  await page.getByLabel('Profissional da escala').selectOption({ value: assigned.id })
  const association = page.waitForResponse(response =>
    new URL(response.url()).pathname.endsWith('/team-member') && response.request().method() === 'PUT')
  await page.getByRole('button', { name: 'Associar profissional' }).click()
  expect((await association).status()).toBe(200)

  await page.evaluate(() => localStorage.clear())
  await signIn(page, reception.email)
  await page.goto('/partner/clientes')
  await page.getByRole('button', { name: 'Novo cliente' }).click()
  await page.getByLabel('Nome do tutor').fill('Tutor Balcão Onda B')
  await page.getByLabel('E-mail', { exact: true }).fill('balcao-onda-b@example.test')
  const createdCustomer = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/v1/partners/me/customers' && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Cadastrar cliente' }).click()
  expect((await createdCustomer).status()).toBe(201)
  const customer = await (await createdCustomer).json()
  await page.getByRole('button', { name: 'Novo pet' }).click()
  const petForm = page.getByRole('dialog', { name: 'Novo pet' })
  await petForm.locator('input[name=name]').fill('Pet Balcão Onda B')
  await petForm.getByLabel('Espécie').selectOption('DOG')
  await petForm.getByLabel('Sexo').selectOption('FEMALE')
  await petForm.getByLabel('Raça').fill('SRD')
  await petForm.getByLabel('Nascimento').fill('2022-01-01')
  await petForm.getByLabel('Peso (kg)').fill('8')
  const createdPet = page.waitForResponse(response =>
    new URL(response.url()).pathname === `/api/v1/pets/reception/customers/${customer.id}`
      && response.request().method() === 'POST')
  await petForm.getByRole('button', { name: 'Cadastrar pet' }).click()
  expect((await createdPet).status()).toBe(201)
  const pet = await (await createdPet).json()
  const bookingData = {
    partnerId: partner.id, serviceId: service.id, petId: pet.id,
    receptionCustomerId: customer.id, bookingDate: `${futureDate(4)}T11:00:00`, type: 'CONSULTATION', price: 60,
  }
  await page.getByRole('button', { name: 'Agendar Pet Balcão Onda B' }).click()
  const bookingForm = page.getByRole('dialog', { name: 'Agendar atendimento' })
  await bookingForm.getByLabel('Serviço').selectOption({ value: service.id })
  await bookingForm.getByLabel('Data').fill(futureDate(4))
  await bookingForm.getByLabel('Horário').selectOption({ label: '11:00' })
  await bookingForm.getByLabel('Profissional').selectOption({ value: assigned.id })
  const createdBooking = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/v1/bookings' && response.request().method() === 'POST')
  await bookingForm.locator('button[type=submit]').click()
  expect((await createdBooking).status()).toBe(201)
  const booking = await (await createdBooking).json()
  expect(booking).toMatchObject({ receptionCustomerId: customer.id, petId: pet.id, userId: null })
  const secondStaff = await json(request, 'POST', `/partners/${partner.id}/staff`, 201, owner, {
    name: 'Profissional sem vínculo Onda B', status: 'ACTIVE',
  })
  const secondService = await json(request, 'POST', `/partners/${partner.id}/services`, 200, owner, {
    name: 'Consulta de outro profissional', price: 60, durationMinutes: 30, billingUnit: 'HOURLY',
    categoryId: category.id, staffIds: [secondStaff.id],
  })
  await json(request, 'PUT', `/partners/staff/${secondStaff.id}/schedule`, 200, owner, schedule)
  const other = await json(request, 'POST', '/bookings', 201, reception.headers, {
    ...bookingData, bookingDate: `${futureDate(4)}T12:00:00`, serviceId: secondService.id, staffId: secondStaff.id,
  })
  await json(request, 'GET', `/bookings/${booking.id}`, 200, professional.headers)
  await json(request, 'GET', `/bookings/${other.id}`, 404, professional.headers)
  await json(request, 'PATCH', `/bookings/${booking.id}/status?status=CONFIRMED`, 200, reception.headers)
  const practitioner = await page.context().browser()!.newPage({ baseURL, ignoreHTTPSErrors, timezoneId: 'America/Sao_Paulo' })
  try {
    await practitioner.clock.setFixedTime(new Date(`${futureDate(4)}T11:00:00-03:00`))
    await signIn(practitioner, professional.email)
    await expect(practitioner).toHaveURL(/\/partner\/atendimento$/)
    const visit = practitioner.getByRole('button', { name: /Pet Balcão Onda B/ })
    await expect(visit).toContainText('Consulta Onda B')
    await expect(practitioner.getByText('Consulta de outro profissional', { exact: true })).toHaveCount(0)
    await visit.click()
    await expect(practitioner.getByRole('heading', { name: 'Pet Balcão Onda B' })).toBeVisible()
    await expect(visit).toContainText('Em atendimento')
    await practitioner.getByRole('button', { name: 'Finalizar Atendimento' }).click()
    await expect(visit).toBeDisabled()
  } finally { await practitioner.close() }
  await json(request, 'PATCH', `/bookings/${other.id}/status?status=IN_PROGRESS`, 404, professional.headers)

  const cashier = '/payments/cashier'
  await page.goto('/partner/caixa')
  await expect(page.getByRole('heading', { name: 'Caixa', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fechar dia' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Nova cobrança' }).click()
  await page.getByLabel('Data da reserva').fill(futureDate(4))
  await page.getByRole('button', { name: /Consulta Onda B.*Pet Balcão Onda B/ }).click()
  await page.getByLabel('Descrição').fill('Caixa Onda B')
  await expect(page.getByLabel('Valor do serviço (R$)')).toHaveValue('60,00')
  const createdCharge = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/v1' + cashier + '/charges' && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Criar cobrança' }).click()
  const chargeResponse = await createdCharge
  expect(chargeResponse.status()).toBe(200)
  expect(chargeResponse.request().postDataJSON()).toMatchObject({ bookingId: booking.id })
  const charge = await chargeResponse.json()
  await page.getByRole('button', { name: 'Registrar recebimento' }).click()
  await page.getByLabel('Forma de pagamento').selectOption('PIX')
  await page.getByLabel('Valor recebido (R$)').fill('40,00')
  const receiptPath = `${cashier}/charges/${charge.id}/receipts`
  let firstKey: string | undefined
  let firstBody: string | null = null
  await page.route(`**/api/v1${receiptPath}`, async route => {
    const response = await route.fetch()
    expect(response.status()).toBe(200)
    firstKey = route.request().headers()['idempotency-key']
    firstBody = route.request().postData()
    await route.abort()
  }, { times: 1 })
  await page.getByRole('button', { name: 'Salvar recebimento' }).click()
  await expect(page.getByRole('button', { name: 'Retomar lançamento' })).toBeVisible()
  await page.reload()
  const retried = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/v1' + receiptPath && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Retomar lançamento' }).click()
  const retryResponse = await retried
  expect(retryResponse.status()).toBe(200)
  expect(firstKey).toBeTruthy()
  expect(retryResponse.request().headers()['idempotency-key']).toBe(firstKey)
  expect(retryResponse.request().postData()).toBe(firstBody)
  const detail = await json(request, 'GET', `${cashier}/charges/${charge.id}`, 200, reception.headers)
  expect(detail.charge).toMatchObject({ receivedCents: 4000, balanceCents: 2000 })
  expect(detail.movements).toHaveLength(1)
  expect(detail.movements[0]).toMatchObject({ createdBy: reception.userId, amountCents: 4000 })
  await json(request, 'GET', cashier + '/charges', 403, professional.headers)
  const day = await json(request, 'GET', cashier + '/days', 200, manager.headers)
  const close = `${cashier}/days/${day.businessDate}/close`
  await json(request, 'POST', close, 403, { ...reception.headers, 'Idempotency-Key': randomUUID() })
  const managerPage = await page.context().browser()!.newPage({
    baseURL, ignoreHTTPSErrors, viewport: process.env.E2E_H1 === '1' ? { width: 390, height: 844 } : undefined,
  })
  try {
    await signIn(managerPage, manager.email)
    await managerPage.goto('/partner/caixa')
    if (process.env.E2E_H1 === '1') {
      const reverse = `${cashier}/receipts/${detail.movements[0].id}/reverse`
      const reason = 'Correção de recebimento H1'
      for (const headers of [reception.headers, professional.headers]) {
        await json(request, 'POST', reverse, 403, { ...headers, 'Idempotency-Key': randomUUID() }, { reason })
      }
      const otherOwner = bearer(await token(request, 'parceiro-a@example.test'))
      await json(request, 'POST', reverse, 404, { ...otherOwner, 'Idempotency-Key': randomUUID() }, { reason })
      await managerPage.getByRole('button', { name: 'Caixa Onda B', exact: true }).first().click()
      await managerPage.getByRole('button', { name: /^Reverter / }).click()
      await managerPage.getByLabel('Motivo').fill(reason)
      const reversed = managerPage.waitForResponse(response =>
        new URL(response.url()).pathname === '/api/v1' + reverse && response.request().method() === 'POST')
      await managerPage.getByRole('button', { name: 'Registrar reversão' }).click()
      expect((await reversed).status()).toBe(200)
      await expect(managerPage.getByRole('dialog').getByText(new RegExp(reason))).toBeVisible()
      const after = await json(request, 'GET', `${cashier}/charges/${charge.id}`, 200, manager.headers)
      expect(after.charge).toMatchObject({ receivedCents: 0, balanceCents: 6000 })
      expect(after.movements).toContainEqual(expect.objectContaining({
        type: 'REVERSAL', amountCents: -4000, createdBy: manager.userId, reason,
      }))
      await managerPage.keyboard.press('Escape')
    }
    await managerPage.getByRole('button', { name: 'Fechar dia' }).click()
    const closed = managerPage.waitForResponse(response =>
      new URL(response.url()).pathname === '/api/v1' + close && response.request().method() === 'POST')
    await managerPage.getByRole('button', { name: 'Confirmar fechamento' }).click()
    expect((await closed).status()).toBe(200)
    expect(await json(request, 'GET', cashier + '/days', 200, manager.headers)).toMatchObject({ closedBy: manager.userId })
  } finally { await managerPage.close() }

  const tutorSession = await json(request, 'GET', '/auth/session', 200, tutor)
  expect(customer.id).toMatch(/^[a-f\d-]{36}$/i)
  const claimPath = '/partners/customer-claims/redeem'
  const claimIssue = `/partners/me/customers/${customer.id}/claims`
  const expired = await json(request, 'POST', claimIssue, 201, reception.headers, { userId: tutorSession.userId })
  expect(sql('partner', `UPDATE reception_customer_claims SET expires_at = CURRENT_TIMESTAMP - interval '1 minute'
    WHERE customer_id = '${customer.id}' AND used_at IS NULL RETURNING id;`)).toMatch(/^[a-f\d-]{36}$/i)
  await json(request, 'POST', claimPath, 410, tutor, { token: expired.token })
  let claim
  if (process.env.E2E_H1 === '1') {
    await page.goto('/partner/clientes')
    await page.getByLabel('Buscar clientes').fill('Tutor Balcão Onda B')
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    await page.getByRole('button', { name: 'Ver cadastro de Tutor Balcão Onda B' }).click()
    await page.getByRole('button', { name: 'Gerar código de vinculação' }).click()
    const issue = page.getByRole('dialog', { name: 'Vincular conta do tutor' })
    await issue.getByRole('textbox', { name: 'Código da conta', exact: true }).fill(tutorSession.userId)
    await issue.getByRole('checkbox').check()
    const created = page.waitForResponse(response =>
      new URL(response.url()).pathname === '/api/v1' + claimIssue && response.request().method() === 'POST')
    await issue.getByRole('button', { name: 'Gerar código' }).click()
    const response = await created
    expect(response.status()).toBe(201)
    claim = { token: await issue.getByLabel('Código de vinculação').inputValue() }
    await issue.getByRole('button', { name: 'Concluir' }).click()
  } else {
    claim = await json(request, 'POST', claimIssue, 201, reception.headers, { userId: tutorSession.userId })
  }
  await json(request, 'POST', claimPath, 404, wrongTutor, { token: claim.token })
  const claimPage = await page.context().browser()!.newPage({ baseURL, ignoreHTTPSErrors })
  try {
    await signIn(claimPage, 'reivindicacao@example.test')
    await expect(claimPage).toHaveURL(/\/app\/home$/)
    await claimPage.goto('/app/reivindicar-cadastro')
    await claimPage.getByLabel('Código de vinculação').fill(claim.token)
    await claimPage.getByRole('button', { name: 'Vincular cadastro' }).click()
    await expect(claimPage.getByRole('status')).toContainText('Cadastro vinculado com sucesso')
  } finally { await claimPage.close() }
  await json(request, 'POST', claimPath, 409, tutor, { token: claim.token })
  expect(await json(request, 'GET', `/bookings/${booking.id}`, 200, tutor)).toMatchObject({ id: booking.id })
  expect(await json(request, 'GET', `/pets/${pet.id}`, 200, tutor)).toMatchObject({ id: pet.id })

  const fresh = await json(request, 'POST', '/bookings', 201, { ...tutor, 'Idempotency-Key': randomUUID() }, {
    partnerId: partner.id, serviceId: service.id, petId: pet.id, staffId: assigned.id,
    bookingDate: `${futureDate(4)}T13:00:00`, type: 'CONSULTATION', price: 60,
  })
  expect(fresh).toMatchObject({ userId: tutorSession.userId, petId: pet.id })
  await json(request, 'PATCH', `/bookings/${fresh.id}/status?status=CONFIRMED`, 200, owner)
  const tutorVisit = await page.context().browser()!.newPage({ baseURL, ignoreHTTPSErrors, timezoneId: 'America/Sao_Paulo' })
  try {
    await tutorVisit.clock.setFixedTime(new Date(`${futureDate(4)}T13:00:00-03:00`))
    await signIn(tutorVisit, professional.email)
    await expect(tutorVisit).toHaveURL(/\/partner\/atendimento$/)
    const visit = tutorVisit.getByRole('button', { name: /Pet Balcão Onda B/ })
    await expect(visit).toContainText('Consulta Onda B')
    await visit.click()
    await expect(tutorVisit.getByRole('heading', { name: 'Pet Balcão Onda B' })).toBeVisible()
  } finally { await tutorVisit.close() }

  const ownerPage = await page.context().browser()!.newPage({ baseURL, ignoreHTTPSErrors })
  try {
    await signIn(ownerPage, ownerEmail)
    await expect(ownerPage).toHaveURL(/\/partner\/dashboard$/)
    await openAuthPage(ownerPage, '/partner/equipe', 'GET', '/auth/team/accesses')
    await ownerPage.getByRole('button', { name: `Revogar acesso de ${reception.email}` }).click()
    const revoked = await submitAuthForm(ownerPage, `/auth/team/accesses/${reception.invitationId}`,
      ownerPage.getByRole('dialog').getByRole('button', { name: 'Revogar acesso' }), 'DELETE')
    expect(revoked.status()).toBe(204)
    await openAuthPage(ownerPage, '/partner/equipe', 'GET', '/auth/team/accesses')
    await expect(ownerPage.getByRole('row').filter({ hasText: reception.email })).toContainText('Revogado')
  } finally { await ownerPage.close() }
  expect((await request.get('/api/v1/auth/session', { headers: reception.headers })).status()).toBe(401)
  expect((await request.get('/api/v1/partners/me/customers', { headers: reception.headers })).status()).toBe(401)
  expect(directStatus('http://partner-service:8083/api/v1/partners/me/customers', reception.headers.Authorization)).toBe(401)
  expect(directStatus('http://payment-service:8085/api/v1/payments/cashier/charges', reception.headers.Authorization)).toBe(401)

  await json(request, 'DELETE', `/auth/team/accesses/${professional.invitationId}`, 204, owner)
  expect(directStatus(`http://booking-service:8084/api/v1/bookings/${fresh.id}`, professional.headers.Authorization)).toBe(401)
  const reinvited = await json(request, 'POST', '/auth/team/invitations', 201, owner, {
    email: professional.email, accessRole: 'PROFESSIONAL',
  })
  const previous = await capturedLink(professional.email, origin, '/team/invitation')
  const next = await capturedLink(professional.email, origin, '/team/invitation', previous.href)
  await json(request, 'POST', '/auth/team/invitations/accept', 200, undefined, {
    token: next.searchParams.get('token'), name: 'Profissional reconvidado', password: password(),
  })
  const newProfessional = bearer(await token(request, professional.email))
  const renewedSession = await json(request, 'GET', '/auth/session', 200, newProfessional)
  expect(renewedSession).toMatchObject({ userId: professional.userId, teamAccessId: reinvited.id })
  await json(request, 'GET', `/bookings/${fresh.id}`, 404, newProfessional)
})
