import { expect, test } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { bearer, futureDate, json, prepareConsultation, signIn, token } from './wave-b-fixtures'

test.skip(process.env.E2E_H1 !== '1', 'Requer o aceite H1 descartável.')

test('ADMIN desativa e reativa conta pela interface; papéis sem acesso não escrevem', async ({ page, request }) => {
  const email = 'admin-conta-h1@example.test'
  const old = bearer(await token(request, email))
  const account = await json(request, 'GET', '/auth/session', 200, old)
  const partner = bearer(await token(request, 'parceiro-a@example.test'))
  const operation = `/admin/customers/${account.userId}/active`
  await json(request, 'PATCH', operation, 401, undefined, { active: false })
  await json(request, 'PATCH', operation, 403, old, { active: false })
  await json(request, 'PATCH', operation, 403, partner, { active: false })

  await signIn(page, 'admin@example.test')
  await expect(page).toHaveURL(/\/admin\/visao-geral$/)
  await page.goto('/admin/clientes')
  await page.getByRole('button', { name: 'Contas da plataforma' }).click()
  await page.getByLabel('Buscar contas').fill(email)
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  const row = page.getByRole('row').filter({ hasText: email })
  await expect(row.getByText('Ativa', { exact: true })).toBeVisible()
  await row.getByRole('button', { name: 'Desativar conta de Conta Admin H1' }).click()
  await page.getByRole('dialog').getByLabel('Motivo da alteração').fill('Desativação sintética H2')
  await page.getByRole('dialog').getByRole('button', { name: 'Desativar conta' }).click()
  await expect(row.getByText('Inativa', { exact: true })).toBeVisible()
  await json(request, 'GET', '/auth/session', 401, old)
  await row.getByRole('button', { name: 'Reativar conta de Conta Admin H1' }).click()
  await page.getByRole('dialog').getByLabel('Motivo da alteração').fill('Reativação sintética H2')
  await page.getByRole('dialog').getByRole('button', { name: 'Reativar conta' }).click()
  await expect(row.getByText('Ativa', { exact: true })).toBeVisible()
  await json(request, 'GET', '/auth/session', 401, old)
  await json(request, 'GET', '/auth/session', 200, bearer(await token(request, email)))
})

test('ADMIN muda situação de estabelecimento com motivo; escrita com escopo forjado é recusada', async ({ page, request }) => {
  const owner = bearer(await token(request, 'parceiro-escrita-h1@example.test'))
  const outsider = bearer(await token(request, 'parceiro-b@example.test'))
  const admin = bearer(await token(request, 'admin@example.test'))
  const tutor = bearer(await token(request, 'tutor-escrita-h1@example.test'))
  const { partner, staff, service } = await prepareConsultation(request, owner, {
    name: 'Estabelecimento Escrita H1', cnpj: '11111111000109',
    serviceName: 'Consulta Escrita H1', staffName: 'Profissional Escrita H1',
  })
  const operation = `/admin/partners/${partner.id}/active`
  const reason = 'Pausa fictícia H1'
  const pet = await json(request, 'POST', '/pets', 201, tutor, {
    name: 'Pet Administrativo H1', species: 'DOG', breed: 'SRD', gender: 'MALE', weight: 8, birthDate: '2022-01-01',
  })
  const reservation = await json(request, 'POST', '/bookings', 201, { ...tutor, 'Idempotency-Key': randomUUID() }, {
    petId: pet.id, partnerId: partner.id, serviceId: service.id, staffId: staff.id,
    bookingDate: `${futureDate(8)}T11:00:00`, type: 'CONSULTATION', price: 60,
  })
  await json(request, 'PATCH', operation, 403, outsider, { active: false, reason })
  await json(request, 'PATCH', operation, 400, admin, { active: false, reason: '' })
  await json(request, 'PUT', `/partners/${partner.id}/services/${service.id}`, 403, outsider, {
    name: 'Escrita recusada H1', price: 60, durationMinutes: 30, billingUnit: 'HOURLY',
    categoryId: service.categoryId, staffIds: [staff.id],
  })
  await json(request, 'GET', `/partners/staff/${staff.id}/schedule?partnerId=00000000-0000-4000-8000-000000000099`,
    404, admin)
  const statusPath = `/bookings/partner/${partner.id}/${reservation.id}/status`
  await json(request, 'PATCH', statusPath + '?status=CONFIRMED', 403, outsider)
  await json(request, 'PATCH', statusPath + '?status=COMPLETED', 400, admin)
  await json(request, 'PATCH',
    `/bookings/partner/00000000-0000-4000-8000-000000000099/${reservation.id}/status?status=CONFIRMED`, 404, admin)
  expect(await json(request, 'GET', `/bookings/${reservation.id}`, 200, tutor)).toMatchObject({ status: 'PENDING' })
  await signIn(page, 'admin@example.test')
  await page.goto(`/admin/parceiros/${partner.id}`)
  await page.getByRole('button', { name: 'Situação e histórico' }).click()
  const status = page.getByRole('dialog', { name: 'Situação do estabelecimento' })
  await status.getByLabel('Motivo da alteração').fill(reason)
  await status.getByRole('button', { name: 'Desativar estabelecimento' }).click()
  await expect(status.getByText('Estabelecimento desativado.')).toBeVisible()
  await json(request, 'GET', `/partners/catalog/${partner.id}`, 404, owner)
  await json(request, 'GET', '/payments/cashier/context', 404, owner)
  expect(await json(request, 'GET', `/bookings/${reservation.id}/tutor-actions`, 200, tutor)).toMatchObject({
    canCancel: true, canReschedule: false,
  })
  await status.getByLabel('Motivo da alteração').fill('Retomada fictícia H1')
  await status.getByRole('button', { name: 'Reativar estabelecimento' }).click()
  await expect(status.getByText('Estabelecimento reativado.')).toBeVisible()
  await expect(status.getByText(reason, { exact: true })).toBeVisible()
  await expect(status.getByText('Retomada fictícia H1', { exact: true })).toBeVisible()
  const actor = await json(request, 'GET', '/auth/session', 200, admin)
  const history = await json(request, 'GET', `/admin/partners/${partner.id}/status-history`, 200, admin)
  expect(history.content).toEqual(expect.arrayContaining([
    expect.objectContaining({ active: false, actorId: actor.userId, reason }),
    expect.objectContaining({ active: true, actorId: actor.userId, reason: 'Retomada fictícia H1' }),
  ]))
})
