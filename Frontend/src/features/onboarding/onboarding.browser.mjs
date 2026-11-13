import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function checkOnboarding(page, baseUrl, partnerId) {
  const staffId = '33adfe9e-4ce4-4d64-b7e0-52e1fa5618ad'
  const anotherStaffId = 'ff76a231-f48a-47ce-8931-f70e50db4634'
  const serviceId = '10b3f17f-808a-4931-9128-c699d9c318c9'
  const staff = [
    { id: staffId, partnerId, status: 'ACTIVE', serviceIds: [serviceId] },
    { id: anotherStaffId, partnerId, status: 'ACTIVE', serviceIds: [] },
  ]
  const setup = page.getByRole('region', { name: 'Configuração inicial' })
  const row = (title, status) => setup.getByRole('listitem').filter({ hasText: title }).getByText(status, { exact: true })
  let partnerStatus = 404
  let partnerActive = true
  let serviceActive = false
  let staffResponse = []
  let scheduleResponse = []
  let scheduleStatus = 200
  let staffRequests = 0
  let scheduleRequests = 0

  await page.route('**/api/v1/partners/me', route => route.fulfill({ status: partnerStatus, json: {
    id: partnerId, name: 'Banho de teste', active: partnerActive, services: [{ id: serviceId, active: serviceActive }],
  } }))
  await page.route(`**/api/v1/partners/${partnerId}/staff`, route => {
    staffRequests += 1
    return route.fulfill({ json: staffResponse })
  })
  await page.route('**/api/v1/partners/staff/*/schedule?*', route => {
    const url = new URL(route.request().url())
    assert.equal(url.searchParams.get('partnerId'), partnerId)
    assert.equal(url.pathname, `/api/v1/partners/staff/${staffId}/schedule`)
    scheduleRequests += 1
    return route.fulfill({ status: scheduleStatus, json: scheduleResponse })
  })

  await page.goto(`${baseUrl}/partner/dashboard`)
  await expect(row('Estabelecimento', 'Pendente')).toBeVisible()
  await expect(setup.getByRole('link', { name: 'Abrir cadastro' })).toHaveAttribute('href', '/partner/cadastro')
  await expect(row('Serviço ativo', 'Aguardando cadastro')).toBeVisible()
  assert.equal(staffRequests, 0)

  partnerStatus = 200
  await page.reload()
  await expect(row('Estabelecimento', 'Concluído')).toBeVisible()
  await expect(row('Serviço ativo', 'Pendente')).toBeVisible()
  await expect(setup.getByRole('link', { name: 'Abrir serviços' })).toHaveAttribute('href', '/partner/servicos')

  serviceActive = true
  await page.reload()
  await expect(row('Serviço ativo', 'Concluído')).toBeVisible()
  await expect(row('Colaborador ativo vinculado a um serviço', 'Pendente')).toBeVisible()
  await expect(setup.getByRole('link', { name: 'Abrir colaboradores' })).toHaveAttribute('href', '/partner/colaboradores')
  assert.equal(scheduleRequests, 0)

  staffResponse = staff
  await page.reload()
  await expect(row('Colaborador ativo vinculado a um serviço', 'Concluído')).toBeVisible()
  await expect(row('Escala cadastrada', 'Pendente')).toBeVisible()
  await expect(setup.getByRole('link', { name: 'Abrir colaborador para editar escala' }))
    .toHaveAttribute('href', `/partner/colaboradores/${staffId}`)

  scheduleStatus = 503
  await page.reload()
  await expect(row('Escala cadastrada', 'Não verificado')).toBeVisible()
  await expect(setup.getByRole('alert')).toContainText('Não foi possível verificar toda a configuração.')
  scheduleStatus = 200
  scheduleResponse = [{ staffId, dayOfWeek: 2, startTime: '09:00', endTime: '17:00:00' }]
  await setup.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(row('Escala cadastrada', 'Concluído')).toBeVisible()

  partnerActive = false
  await page.reload()
  await expect(row('Estabelecimento', 'Inativo')).toBeVisible()
  const main = page.locator('main')
  assert.ok(await main.evaluate(element => element.scrollWidth <= element.clientWidth))

  const trigger = page.getByRole('button', { name: 'Abrir menu' })
  await trigger.press('Enter')
  const menu = page.getByRole('dialog', { name: 'Menu do painel' })
  const close = menu.getByRole('button', { name: 'Fechar menu' })
  await expect(close).toBeFocused()
  await expect(page.getByRole('main')).toHaveCount(0)
  await expect(page.locator('main').locator('..')).toHaveAttribute('inert', '')
  await page.keyboard.press('Shift+Tab')
  await expect(menu.getByRole('button', { name: 'Sair' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await trigger.click()
  await menu.getByRole('link', { name: 'Suporte interno' }).click()
  await expect(page).toHaveURL(`${baseUrl}/suporte`)
  const support = process.env.VITE_INTERNAL_SUPPORT_URL
  if (support) {
    await expect(page.getByRole('link', { name: 'Acessar canal de suporte' })).toHaveAttribute('href', support)
  } else {
    await expect(page.getByText('Canal de suporte interno ainda não configurado')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Acessar canal de suporte' })).toHaveCount(0)
  }
}
