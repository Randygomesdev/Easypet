import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { bearer, captures, directStatus, docker, futureDate, json, prepareConsultation, signIn, smtpUrl, sql, token } from './wave-b-fixtures'

test.skip(!smtpUrl || process.env.E2E_NOTIFICATION_SMTP !== '1', 'Requer Notification com SMTP descartável.')

test('ADMIN investiga e reenvia após falha SMTP; reagendamento e reinício preservam a fila', async ({ request, page }) => {
  test.setTimeout(180_000)
  const email = 'notificacao@example.test'
  const owner = bearer(await token(request, 'parceiro-notificacao@example.test'))
  const tutor = bearer(await token(request, email))
  const admin = bearer(await token(request, 'admin@example.test'))
  const { partner, service } = await prepareConsultation(request, owner, {
    name: 'Notificações Onda B', cnpj: '11111111000105', serviceName: 'Consulta SMTP E2E', staffName: 'Profissional SMTP E2E',
  })
  const pet = await json(request, 'POST', '/pets', 201, tutor, {
    name: 'Pet Notificação E2E', species: 'DOG', breed: 'SRD', gender: 'MALE', weight: 8, birthDate: '2022-01-01',
  })
  const booking = await json(request, 'POST', '/bookings', 201, { ...tutor, 'Idempotency-Key': randomUUID() }, {
    petId: pet.id, partnerId: partner.id, serviceId: service.id,
    bookingDate: `${futureDate(5)}T10:00:00`, type: 'CONSULTATION', price: 60,
  })
  expect(booking.id).toMatch(/^[a-f\d-]{36}$/i)
  const bookingPath = `/bookings/${booking.id}`
  const notifications = `/admin/notifications?bookingId=${booking.id}`
  const byType = async (type: string) => {
    const result = await json(request, 'GET', notifications, 200, admin)
    return result.content.find((item: { type: string }) => item.type === type)
  }
  const rejection = new URL('/reject', smtpUrl)
  rejection.searchParams.set('recipient', email)
  expect((await fetch(rejection, { method: 'PUT' })).status).toBe(204)
  let confirmation
  try {
    await json(request, 'PATCH', bookingPath + '/status?status=CONFIRMED', 200, owner)
    await expect.poll(async () => {
      confirmation = await byType('CONFIRMATION')
      return confirmation?.status
    }, { timeout: 25_000 }).toBe('FAILED')
    expect(confirmation).toMatchObject({ attemptCount: 1, canRetry: true })
    expect(await captures(email)).toHaveLength(0)
    await json(request, 'GET', notifications, 403, tutor)
  } finally {
    expect((await fetch(rejection, { method: 'DELETE' })).status).toBe(204)
  }

  await signIn(page, 'admin@example.test')
  await expect(page).toHaveURL(/\/admin\/visao-geral$/)
  await page.goto('/admin/notificacoes')
  await expect(page.getByRole('heading', { name: /notificações/i }).first()).toBeVisible()
  await page.getByLabel('ID da reserva').fill(booking.id)
  await page.getByRole('button', { name: 'Consultar', exact: true }).click()
  await page.getByRole('button', { name: 'Ver tentativas de confirmação' }).click()
  const id = confirmation.id
  const attempts = await json(request, 'GET', `/admin/notifications/${id}/attempts`, 200, admin)
  expect(attempts).toEqual(expect.arrayContaining([expect.objectContaining({ number: 1, outcome: 'PERMANENT_FAILURE' })]))
  const accepted = page.waitForResponse(response =>
    new URL(response.url()).pathname === `/api/v1/admin/notifications/${id}/retry` && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Solicitar reenvio' }).click()
  const retryResponse = await accepted
  expect(retryResponse.status()).toBe(202)
  const key = retryResponse.request().headers()['idempotency-key']
  expect(key).toMatch(/^[a-f\d-]{36}$/i)
  const retry = { ...admin, 'Idempotency-Key': key }
  await json(request, 'POST', `/admin/notifications/${id}/retry`, 202, retry)
  await expect.poll(async () => (await byType('CONFIRMATION'))?.status, { timeout: 25_000 }).toBe('SENT')
  const captured = await captures(email)
  expect(captured).toHaveLength(1)
  expect(captured[0]).toMatchObject({ sender: 'notifications@example.test', recipients: [email] })

  const oldReminder = await byType('REMINDER')
  expect(oldReminder.status).toBe('PENDING')
  await json(request, 'POST', bookingPath + '/reschedule', 200, owner, { bookingDate: `${futureDate(5)}T11:00:00` })
  await expect.poll(async () => (await byType('RESCHEDULED'))?.status, { timeout: 25_000 }).toBe('SENT')
  await json(request, 'PATCH', bookingPath + '/status?status=CANCELLED', 200, owner, { reason: 'Cancelamento E2E' })
  await expect.poll(async () => (await byType('CANCELLED'))?.status, { timeout: 25_000 }).toBe('SENT')
  const all = await json(request, 'GET', notifications, 200, admin)
  expect(all.content.filter((item: { type: string }) => item.type === 'REMINDER').map((item: { status: string }) => item.status))
    .toEqual(['SUPERSEDED', 'SUPERSEDED'])

  // Simulate replay of an already committed event by clearing the producer's ACK in this disposable DB.
  docker(['stop', '{project}-notification-service-1'])
  const event = sql('booking', `UPDATE booking_outbox SET acknowledged_at = NULL
    WHERE booking_id = '${booking.id}' AND event_type = 'BOOKING_CONFIRMED' RETURNING event_id;`)
  expect(event).toMatch(/^[a-f\d-]{36}$/i)
  docker(['start', '{project}-notification-service-1'])
  await expect.poll(() => sql('booking', `SELECT count(*) FROM booking_outbox
    WHERE event_id = '${event}' AND acknowledged_at IS NOT NULL;`), { timeout: 45_000 }).toBe('1')
  expect(sql('notification', `SELECT count(*) FROM notification_event WHERE id = '${event}';`)).toBe('1')
  expect(sql('notification', `SELECT count(*) FROM notification_delivery WHERE event_id = '${event}' AND type = 'CONFIRMATION';`)).toBe('1')
  expect(await captures(email)).toHaveLength(3)

  const categories = await json(request, 'GET', '/categories', 200, owner)
  const grooming = categories.find((item: { slug: string }) => item.slug === 'estetica')
  const staff = await json(request, 'GET', `/partners/${partner.id}/staff`, 200, owner)
  const bath = await json(request, 'POST', `/partners/${partner.id}/services`, 200, owner, {
    name: 'Banho SMTP E2E', price: 60, durationMinutes: 30, billingUnit: 'HOURLY',
    categoryId: grooming.id, staffIds: [staff[0].id],
  })
  const next = await json(request, 'POST', '/bookings', 201, { ...tutor, 'Idempotency-Key': randomUUID() }, {
    petId: pet.id, partnerId: partner.id, serviceId: bath.id,
    bookingDate: `${futureDate(5)}T14:00:00`, type: 'GROOMING', price: 60,
  })
  const nextPath = `/bookings/${next.id}`
  await json(request, 'PATCH', nextPath + '/status?status=CONFIRMED', 200, owner)
  await json(request, 'PATCH', nextPath + '/status?status=IN_PROGRESS', 200, owner)
  await json(request, 'PUT', nextPath + '/check-in', 200, owner, {
    petIdentified: true, instructionsConfirmed: true,
  })
  const nextNotifications = `/admin/notifications?bookingId=${next.id}`
  const nextDelivery = async (type: string) => (await json(request, 'GET', nextNotifications, 200, admin)).content
    .find((item: { type: string }) => item.type === type)
  await expect.poll(async () => (await nextDelivery('CONFIRMATION'))?.status, { timeout: 25_000 }).toBe('SENT')
  await json(request, 'POST', nextPath + '/ready', 200, owner)
  await expect.poll(async () => (await nextDelivery('READY'))?.status, { timeout: 25_000 }).toBe('SENT')
  const nextMessages = await captures(email)
  expect(nextMessages.every(message => message.recipients.length === 1 && message.recipients[0] === email)).toBe(true)
  expect(nextMessages).toHaveLength(5)
  const raw = nextMessages.at(-1)!.raw.replace(/\r?\n[ \t]+/g, ' ')
  const subject = (raw.match(/^Subject: (.+)$/mi)?.[1] ?? '').replace(
    /=\?UTF-8\?([BQ])\?([^?]+)\?=/gi,
    (_, encoding: string, encoded: string) => encoding.toUpperCase() === 'B'
      ? Buffer.from(encoded, 'base64').toString('utf8')
      : Buffer.from(encoded.replace(/_/g, ' ').replace(/=([\dA-F]{2})/gi, (_match, hex) =>
        String.fromCharCode(Number.parseInt(hex, 16))), 'latin1').toString('utf8'),
  )
  expect(subject).toBe('Serviço pronto para retirada')

  const hold = new URL('/hold', smtpUrl)
  hold.searchParams.set('recipient', email)
  const ambiguous = await json(request, 'POST', '/bookings', 201, { ...tutor, 'Idempotency-Key': randomUUID() }, {
    petId: pet.id, partnerId: partner.id, serviceId: service.id,
    bookingDate: `${futureDate(5)}T15:00:00`, type: 'CONSULTATION', price: 60,
  })
  expect(ambiguous.id).toMatch(/^[a-f\d-]{36}$/i)
  expect((await fetch(hold, { method: 'PUT' })).status).toBe(204)
  const ambiguousList = `/admin/notifications?bookingId=${ambiguous.id}`
  const pendingDelivery = async () => (await json(request, 'GET', ambiguousList, 200, admin)).content
    .find((item: { type: string }) => item.type === 'CONFIRMATION')
  try {
    await json(request, 'PATCH', `/bookings/${ambiguous.id}/status?status=CONFIRMED`, 200, owner)
    await expect.poll(async () => (await captures(email)).length, { timeout: 25_000 }).toBe(6)
    const sending = await pendingDelivery()
    expect(sending.status).toBe('SENDING')
    expect(sending.id).toMatch(/^[a-f\d-]{36}$/i)
    docker(['kill', '{project}-notification-service-1'])
    expect(sql('notification', `UPDATE notification_delivery SET updated_at = CURRENT_TIMESTAMP - interval '3 minutes'
      WHERE id = '${sending.id}' AND status = 'SENDING' RETURNING id;`)).toBe(sending.id)
  } finally {
    expect((await fetch(hold, { method: 'DELETE' })).status).toBe(204)
    docker(['start', '{project}-notification-service-1'])
  }
  await expect.poll(async () => {
    try { return (await pendingDelivery())?.status } catch { return 'STARTING' }
  }, { timeout: 45_000 }).toBe('UNKNOWN')
  const unknown = await pendingDelivery()
  expect(unknown).toMatchObject({ attemptCount: 1, canRetry: false })
  await json(request, 'POST', `/admin/notifications/${unknown.id}/retry`, 409, { ...admin, 'Idempotency-Key': randomUUID() })
  expect(await captures(email)).toHaveLength(6)
  if (process.env.E2E_H1 === '1') {
    const queue = JSON.parse(docker(['exec', '{project}-notification-service-1', 'curl', '--fail', '--silent',
      'http://127.0.0.1:8089/actuator/notificationqueue']))
    expect(queue).toMatchObject({ transport: 'SMTP', outboxPollingEnabled: true })
    expect(queue.unknownLastHour).toBeGreaterThanOrEqual(1)
    expect((await request.get('/actuator/notificationqueue')).status()).toBe(404)
    expect((await request.get('/api/v1/actuator/notificationqueue', { headers: admin })).status()).toBe(404)
  }

  const adminSession = await json(request, 'GET', '/auth/session', 200, admin)
  expect(adminSession.userId).toMatch(/^[a-f\d-]{36}$/i)
  expect(sql('auth', `UPDATE users SET session_version = session_version + 1
    WHERE id = '${adminSession.userId}' RETURNING id;`)).toBe(adminSession.userId)
  expect((await request.get('/api/v1' + ambiguousList, { headers: admin })).status()).toBe(401)
  expect(directStatus('http://notification-service:8087/api/v1' + ambiguousList, admin.Authorization)).toBe(401)
  const currentAdmin = bearer(await token(request, 'admin@example.test'))
  docker(['pause', '{project}-auth-service-1'])
  try {
    expect((await request.get('/api/v1' + ambiguousList, { headers: currentAdmin })).status()).toBe(503)
    expect(directStatus('http://notification-service:8087/api/v1' + ambiguousList, currentAdmin.Authorization)).toBe(503)
  } finally {
    docker(['unpause', '{project}-auth-service-1'])
  }
})
