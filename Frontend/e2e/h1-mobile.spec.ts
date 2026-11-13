import { devices, expect, test } from '@playwright/test'
import { bearer, futureDate, json, prepareConsultation, signIn, token } from './wave-b-fixtures'

test.skip(process.env.E2E_H1 !== '1', 'Requer o aceite H1 descartável.')
test.use({ ...devices['iPhone 13'], defaultBrowserType: 'chromium', timezoneId: 'America/Sao_Paulo' })

test('tutor em celular encontra serviço, reserva, reagenda e cancela', async ({ page, request }) => {
  const email = 'mobile-h1@example.test'
  const tutor = bearer(await token(request, email))
  const owner = bearer(await token(request, 'parceiro-mobile-h1@example.test'))
  const { partner, staff, service } = await prepareConsultation(request, owner, {
    name: 'Clínica Mobile H1', cnpj: '11111111000108', serviceName: 'Consulta Mobile H1', staffName: 'Profissional Mobile H1',
  })
  const pet = await json(request, 'POST', '/pets', 201, tutor, {
    name: 'Pet Mobile H1', species: 'DOG', breed: 'SRD', gender: 'MALE', weight: 8, birthDate: '2022-01-01',
  })
  await signIn(page, email)
  await expect(page).toHaveURL(/\/app\/home$/)
  await page.getByRole('searchbox', { name: 'Buscar no catálogo' }).fill(partner.name)
  await page.getByText(partner.name, { exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/app/parceiros/${partner.id}$`))
  await expect(page.getByText(service.name, { exact: true })).toBeVisible()
  await expect(page.getByText(/30\s*(minutos|min)/).first()).toBeVisible()
  await expect(page.getByText(/R\$\s*60,00/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Agendar', exact: true }).click()
  await page.getByRole('combobox').selectOption({ label: 'Pet Mobile H1 (Cão)' })
  await page.locator('input[type=date]').fill(futureDate(6))
  await page.getByRole('button', { name: 'Ver horários' }).click()
  await page.getByRole('button', { name: '10:00', exact: true }).click()
  await page.getByRole('button', { name: 'Próximo' }).click()
  await expect(page.getByText(/pelo menos 2 horas de antecedência/)).toBeVisible()
  const submitted = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/v1/bookings' && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Solicitar agendamento' }).click()
  const created = await submitted
  expect(created.status()).toBe(201)
  const booking = await created.json()
  expect(booking).toMatchObject({ petId: pet.id, serviceId: service.id, price: 60, status: 'PENDING' })

  await page.goto('/app/agendamentos')
  await page.getByRole('button', { name: /Clínica Mobile H1/ }).click()
  await page.getByRole('button', { name: 'Reagendar', exact: true }).click()
  const schedule = page.getByRole('dialog', { name: 'Reagendar' })
  await schedule.getByLabel('Nova data').fill(futureDate(7))
  await schedule.getByLabel('Horário').selectOption({ label: '11:00' })
  await schedule.getByLabel('Profissional').selectOption({ value: staff.id })
  const rescheduled = page.waitForResponse(response =>
    new URL(response.url()).pathname === `/api/v1/bookings/${booking.id}/reschedule` && response.request().method() === 'POST')
  await schedule.getByRole('button', { name: 'Salvar horário' }).click()
  expect((await rescheduled).status()).toBe(200)
  expect(await json(request, 'GET', `/bookings/${booking.id}`, 200, tutor)).toMatchObject({
    id: booking.id, bookingDate: `${futureDate(7)}T11:00:00`,
  })

  await page.getByRole('button', { name: 'Cancelar agendamento', exact: true }).click()
  const cancel = page.getByRole('dialog', { name: 'Cancelar agendamento' })
  await cancel.getByLabel('Motivo').fill('Alteração da disponibilidade do tutor')
  await cancel.getByRole('button', { name: 'Cancelar agendamento' }).click()
  await expect(cancel).toBeHidden()
  expect(await json(request, 'GET', `/bookings/${booking.id}`, 200, tutor)).toMatchObject({
    id: booking.id, status: 'CANCELLED', cancellationReason: 'Alteração da disponibilidade do tutor',
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})
