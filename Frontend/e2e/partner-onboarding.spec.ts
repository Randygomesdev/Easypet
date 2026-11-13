import { expect, test, type Page } from '@playwright/test'
import { randomInt } from 'node:crypto'

const email = 'parceiro-onboarding@example.test'

function waitForApi(page: Page, method: string, path: string) {
  return page.waitForResponse(response =>
    response.request().method() === method && new URL(response.url()).pathname === '/api/v1' + path,
  )
}

test('parceiro cadastra estabelecimento, serviço, colaborador e escala pelo painel', async ({ page }) => {
  const password = process.env.E2E_TEST_PASSWORD
  if (!password) throw new Error('Execute npm run test:e2e para provisionar a conta de onboarding.')
  const suffix = randomInt(10_000_000, 100_000_000)
  const partnerName = `Clínica E2E ${suffix}`
  const serviceName = `Consulta E2E ${suffix}`
  const staffName = `Veterinária E2E ${suffix}`

  await page.route('https://viacep.com.br/ws/88010000/json/', route => route.fulfill({
    headers: { 'access-control-allow-origin': '*' },
    json: { logradouro: 'Rua de Teste', bairro: 'Centro', localidade: 'Florianópolis', uf: 'SC' },
  }))

  await page.goto('/login')
  await page.getByPlaceholder('seu@email.com').fill(email)
  await page.locator('input[type=password]').fill(password)
  await page.getByRole('button', { name: 'Entrar no Easypet' }).click()
  await expect(page).toHaveURL(/\/partner\/dashboard$/)
  const checklist = page.getByRole('region', { name: 'Configuração inicial' })
  await expect(checklist.getByText('Aguardando cadastro', { exact: true })).toHaveCount(3)
  await checklist.getByRole('link', { name: 'Abrir cadastro' }).click()
  await expect(page).toHaveURL(/\/partner\/cadastro$/)
  await expect(page.getByPlaceholder('Digite a Razão Social')).toHaveValue('')
  await page.getByPlaceholder('Digite a Razão Social').fill(partnerName)
  await page.getByPlaceholder('Digite o Nome Fantasia').fill(partnerName)
  await page.getByPlaceholder('00.000.000/0000-00').fill(`${suffix}000100`)
  await page.getByPlaceholder('Digite o Email').fill(email)
  await page.getByPlaceholder('(00) 00000-0000').first().fill('48912345678')
  await page.getByPlaceholder('Conte aos Clientes o que sua loja pode oferecer de especial').fill('Estabelecimento fictício de homologação')
  await page.getByRole('button', { name: 'Endereço', exact: true }).click()
  await page.getByPlaceholder('00000-000').fill('88010000')
  await expect(page.getByPlaceholder('Digite o Logradouro')).toHaveValue('Rua de Teste')
  await page.getByPlaceholder('Digite o Número').fill('123')
  await page.getByPlaceholder('-23.550520').fill('-27.5')
  await page.getByPlaceholder('-46.633308').fill('-48.5')

  const savedPartner = waitForApi(page, 'POST', '/partners')
  await page.getByRole('button', { name: 'Salvar Alterações' }).click()
  const partnerResponse = await savedPartner
  expect(partnerResponse.status()).toBe(201)
  const partner = await partnerResponse.json()
  expect(partner).toMatchObject({ name: partnerName, city: 'Florianópolis', state: 'SC' })
  await expect(page.getByText('Dados salvos com sucesso!')).toBeVisible()

  await page.getByRole('link', { name: 'Serviços', exact: true }).click()
  await page.getByRole('button', { name: 'Novo Serviço', exact: true }).click()
  await page.getByPlaceholder('Ex: Banho e Tosa').fill(serviceName)
  await page.getByPlaceholder('0,00').fill('65')
  const savedService = waitForApi(page, 'POST', `/partners/${partner.id}/services`)
  await page.getByRole('button', { name: 'Adicionar serviço', exact: true }).click()
  const serviceResponse = await savedService
  expect(serviceResponse.ok()).toBeTruthy()
  const service = await serviceResponse.json()
  expect(service).toMatchObject({ name: serviceName, price: 65 })
  await expect(page.getByText(serviceName, { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Colaboradores', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar Colaborador', exact: true }).click()
  await page.getByPlaceholder('Digite o Nome Completo').fill(staffName)
  await page.getByRole('button', { name: serviceName, exact: true }).click()
  const savedStaff = waitForApi(page, 'POST', `/partners/${partner.id}/staff`)
  await page.getByRole('button', { name: 'Salvar Alterações' }).click()
  const staffResponse = await savedStaff
  expect(staffResponse.status()).toBe(201)
  const staff = await staffResponse.json()
  expect(staff).toMatchObject({ name: staffName, serviceIds: [service.id] })
  await expect(page).toHaveURL(new RegExp(`/partner/colaboradores/${staff.id}$`))

  await page.getByRole('button', { name: 'Escala Horários' }).click()
  const monday = page.getByRole('switch', { name: 'Expediente de Segunda Feira' })
  await expect(monday).not.toBeChecked()
  await monday.click()
  await expect(monday).toBeChecked()
  const mondayRow = page.getByRole('group', { name: 'Segunda Feira' })
  // A escala nova tem os dois horários vazios. Preenche início e fim pelo seletor da linha.
  await mondayRow.getByRole('button', { name: '00:00', exact: true }).first().click()
  await mondayRow.getByRole('button', { name: '08', exact: true }).click()
  await mondayRow.getByRole('button', { name: '00:00', exact: true }).click()
  await mondayRow.getByRole('button', { name: '17', exact: true }).click()
  const savedSchedule = waitForApi(page, 'PUT', `/partners/staff/${staff.id}/schedule`)
  await page.getByRole('button', { name: 'Salvar Alterações' }).click()
  const scheduleResponse = await savedSchedule
  expect(scheduleResponse.ok()).toBeTruthy()
  expect(await scheduleResponse.json()).toMatchObject([
    { dayOfWeek: 2, startTime: '08:00:00', endTime: '17:00:00' },
  ])

  await page.reload()
  await page.getByRole('button', { name: 'Escala Horários' }).click()
  await expect(monday).toBeChecked()
  await expect(mondayRow.getByRole('button', { name: '08:00', exact: true })).toBeVisible()
  await expect(mondayRow.getByRole('button', { name: '17:00', exact: true })).toBeVisible()
  if (process.env.E2E_H1 === '1') {
    await page.goto('/partner/dashboard')
    await expect(checklist.getByText('Concluído', { exact: true })).toHaveCount(4)
    await expect(checklist.getByRole('link', { name: 'Abrir colaborador para editar escala' }))
      .toHaveAttribute('href', new RegExp(`^/partner/colaboradores/${staff.id}(\\?.*)?$`))
  }
})
