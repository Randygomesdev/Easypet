import { expect, test } from '@playwright/test'
import { bearer, futureDate, json, prepareConsultation, signIn, smtpUrl, sql, token } from './wave-b-fixtures'

test.skip(!smtpUrl, 'Requer o ambiente descartável da onda B.')

test('reserva no catálogo preserva intenção após resposta perdida e recarga', async ({ request, page }) => {
  const owner = bearer(await token(request, 'parceiro-retry@example.test'))
  const tutor = bearer(await token(request, 'retry@example.test'))
  const { partner } = await prepareConsultation(request, owner, {
    name: 'Catálogo Onda B', cnpj: '11111111000106', serviceName: 'Consulta Retry E2E', staffName: 'Profissional Retry E2E',
  })
  await json(request, 'POST', '/pets', 201, tutor, {
    name: 'Pet Retry E2E', species: 'DOG', breed: 'SRD', gender: 'MALE', weight: 8, birthDate: '2022-01-01',
  })
  await signIn(page, 'retry@example.test')
  await expect(page).toHaveURL(/\/app\/home$/)
  await page.goto(`/app/parceiros/${partner.id}`)
  await page.getByRole('button', { name: 'Agendar', exact: true }).click()
  await page.getByRole('combobox').selectOption({ label: 'Pet Retry E2E (Cão)' })
  await page.locator('input[type=date]').fill(futureDate(6))
  await page.getByRole('button', { name: 'Ver horários' }).click()
  await page.getByRole('button', { name: '10:00', exact: true }).click()
  await page.getByRole('button', { name: 'Próximo' }).click()
  let key: string | undefined
  let payload: string | null = null
  let bookingId: string | undefined
  const submitBooking = async (route: import('@playwright/test').Route) => {
    if (route.request().method() !== 'POST') return route.continue()
    const response = await route.fetch()
    expect(response.status()).toBe(201)
    bookingId = (await response.json()).id
    key = route.request().headers()['idempotency-key']
    payload = route.request().postData()
    await route.abort()
    await page.unroute('**/api/v1/bookings', submitBooking)
  }
  await page.route('**/api/v1/bookings', submitBooking)
  await page.getByRole('button', { name: 'Solicitar agendamento' }).click()
  await expect.poll(() => Boolean(key && bookingId)).toBe(true)
  await page.reload()
  await page.getByRole('button', { name: 'Agendar', exact: true }).click()
  const retry = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/v1/bookings' && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Retomar reserva', exact: true }).click()
  const replay = await retry
  expect(replay.status()).toBe(201)
  expect(replay.request().headers()['idempotency-key']).toBe(key)
  expect(replay.request().postData()).toBe(payload)
  expect((await replay.json()).id).toBe(bookingId)
  expect(bookingId).toMatch(/^[a-f\d-]{36}$/i)
  const bookings = await json(request, 'GET', '/bookings/my-bookings', 200, tutor)
  expect(bookings.content).toEqual([expect.objectContaining({ id: bookingId })])
  expect(sql('booking', `SELECT count(*) FROM booking_outbox WHERE booking_id = '${bookingId}'
    AND event_type = 'BOOKING_CREATED';`)).toBe('1')
})
