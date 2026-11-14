import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { bearer, futureDate, json, prepareConsultation, token } from './wave-b-fixtures'

const output = process.env.E2E_PORTFOLIO_OUTPUT
test.skip(process.env.E2E_PORTFOLIO_VIDEO !== '1', 'Gravação de portfólio sob demanda.')

test('grava jornadas do EasyPet com dados fictícios', async ({ request, browser, baseURL }) => {
  test.setTimeout(180_000)
  expect(output).toBeTruthy()
  expect(new URL(baseURL!).hostname).toBe('127.0.0.1')
  expect(process.env.E2E_REVIEW_PROJECT).toMatch(/^easypet-e2e-[a-f0-9]{10}$/)
  await mkdir(output!, { recursive: true })

  const partners = await Promise.all([
    token(request, 'parceiro-a@example.test'),
    token(request, 'parceiro-b@example.test'),
  ])
  const tutors = await Promise.all([
    token(request, 'tutor@example.test'),
    token(request, 'retry@example.test'),
    token(request, 'notificacao@example.test'),
  ])
  const shops = []
  for (const [index, name] of ['Clínica Pata Serena', 'Centro Veterinário Jardim Animal'].entries()) {
    const owner = bearer(partners[index])
    const { partner, service, staff, category } = await prepareConsultation(request, owner, {
      name, cnpj: '1111111100020' + (index + 1), serviceName: 'Consulta veterinária',
      staffName: index ? 'Rafael Costa' : 'Marina Alves', categories: ['CLINIC'],
    })
    await json(request, 'POST', `/partners/${partner.id}/services`, 200, owner, {
      name: 'Consulta de retorno', price: 45, durationMinutes: 30, billingUnit: 'HOURLY',
      categoryId: category.id, staffIds: [staff.id],
    })
    shops.push({ partner, service })
  }
  const day = futureDate(2)
  for (const [index, name] of ['Amora', 'Bento', 'Luna'].entries()) {
    const tutor = bearer(tutors[index])
    const pet = await json(request, 'POST', '/pets', 201, tutor, {
      name, species: 'DOG', breed: 'SRD', gender: index === 1 ? 'MALE' : 'FEMALE',
      weight: 8 + index, birthDate: '2022-01-01',
    })
    const { partner, service } = shops[index % shops.length]
    const booking = await json(request, 'POST', '/bookings', 201,
      { ...tutor, 'Idempotency-Key': randomUUID() }, {
        partnerId: partner.id, serviceId: service.id, petId: pet.id, bookingDate: `${day}T1${index + 3}:00:00`,
        price: 60, type: 'CONSULTATION',
      })
    await json(request, 'PATCH', `/bookings/${booking.id}/status?status=CONFIRMED`, 200, bearer(partners[index % shops.length]))
  }
  const subject = 'Como acompanhar a reserva da Amora?'
  await json(request, 'POST', '/support/tickets', 201,
    { ...bearer(tutors[0]), 'Idempotency-Key': randomUUID() }, {
      subject, message: 'Gostaria de saber onde acompanhar as atualizações do agendamento.', bookingId: null,
    })

  async function clip(name: string, email: string, landing: RegExp, record: (page: Page) => Promise<void>) {
    const setup = await browser.newPage({ baseURL })
    let storage
    try {
      await setup.goto('/login')
      await setup.getByPlaceholder('seu@email.com').fill(email)
      await setup.locator('input[type=password]').fill(process.env.E2E_TEST_PASSWORD!)
      await setup.getByRole('button', { name: 'Entrar no Easypet' }).click()
      await expect(setup).toHaveURL(landing)
      storage = await setup.context().storageState()
      expect(storage.origins.flatMap(origin => origin.localStorage))
        .toEqual(expect.arrayContaining([expect.objectContaining({ name: 'token', value: expect.any(String) })]))
    } finally { await setup.close() }

    const context = await browser.newContext({
      baseURL, storageState: storage, viewport: { width: 1280, height: 720 }, timezoneId: 'America/Sao_Paulo',
      recordVideo: { dir: test.info().outputPath(name), size: { width: 1280, height: 720 } },
    })
    const page = await context.newPage()
    try {
      await record(page)
      await page.waitForTimeout(2400)
      await page.screenshot({ path: resolve(output!, name + '.png') })
    } finally { await context.close() }
    await page.video()!.saveAs(resolve(output!, name + '.webm'))
    console.log(`Vídeo gravado: ${name}.`)
  }

  await clip('tutor', 'tutor@example.test', /\/app\/home$/, async page => {
    await page.goto(`/app/parceiros/${shops[0].partner.id}`)
    await expect(page.getByText('Clínica Pata Serena', { exact: true }).first()).toBeVisible()
    await page.waitForTimeout(2000)
    await page.getByRole('button', { name: 'Agendar', exact: true }).first().click()
    await page.getByRole('combobox').selectOption({ label: 'Amora (Cão)' })
    await page.locator('input[type=date]').fill(day)
    await page.waitForTimeout(1200)
    await page.getByRole('button', { name: 'Ver horários' }).click()
    const slot = page.getByRole('button', { name: '10:00', exact: true })
    await expect(slot).toBeVisible()
    await page.waitForTimeout(1400)
    await slot.click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.waitForTimeout(1800)
    await page.getByRole('button', { name: 'Solicitar agendamento' }).click()
    await expect(page.getByText('Agendamento solicitado!')).toBeVisible()
  })

  await clip('admin', 'admin@example.test', /\/admin\/visao-geral$/, async page => {
    await page.goto('/admin/visao-geral')
    await expect(page.getByRole('heading', { name: 'Painel master' })).toBeVisible()
    await page.waitForTimeout(2200)
    await page.goto('/admin/sistema')
    await expect(page.getByText('16 de 16', { exact: true })).toBeVisible()
    await page.waitForTimeout(2200)
    await page.goto('/admin/alertas')
    await expect(page.getByRole('heading', { name: 'Alertas e chamados' })).toBeVisible()
    await expect(page.getByRole('heading', { name: subject })).toBeVisible()
  })

  await clip('parceiro', 'parceiro-a@example.test', /\/partner\/dashboard$/, async page => {
    await page.clock.setFixedTime(new Date(`${day}T10:00:00-03:00`))
    await page.goto('/partner/agendamentos')
    const rows = page.getByRole('row').filter({ hasText: 'Amora' })
    const pending = rows.filter({ hasText: 'Pendente' })
    await expect(pending).toBeVisible()
    await page.waitForTimeout(2100)
    await pending.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await rows.filter({ hasText: '10:00' }).getByRole('button', { name: 'Iniciar Atendimento' }).click()
    const visit = page.getByRole('button', { name: /^10:00.*Amora/ })
    await expect(visit.getByText('Em atendimento')).toBeVisible()
    await page.waitForTimeout(2000)
    await page.getByRole('button', { name: 'Observações da Consulta' }).click()
    await page.getByPlaceholder('Anamnese, diagnóstico, orientações…').fill('Consulta demonstrativa. Acompanhamento de rotina registrado.')
    await page.getByRole('button', { name: 'Salvar Registro' }).click()
    await expect(page.getByText('Registro salvo com sucesso!')).toBeVisible()
    await page.waitForTimeout(1200)
    await page.getByRole('button', { name: 'Fechar painel' }).click()
    await page.getByRole('button', { name: 'Finalizar Atendimento' }).click()
    await expect(visit).toBeDisabled()
    await page.goto('/partner/caixa')
    await expect(page.getByRole('heading', { name: 'Caixa', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Nova cobrança' }).click()
    await page.getByLabel('Data da reserva').fill(day)
    await page.getByRole('button', { name: /Consulta veterinária.*Amora/ }).filter({ hasText: '10:00' }).click()
    await page.getByLabel('Descrição').fill('Consulta da Amora')
    await expect(page.getByLabel('Valor do serviço (R$)')).toHaveValue('60,00')
    await page.waitForTimeout(1400)
    await page.getByRole('button', { name: 'Criar cobrança' }).click()
    await page.getByRole('button', { name: 'Registrar recebimento' }).click()
    const receipt = page.getByRole('dialog', { name: 'Registrar recebimento' })
    await receipt.getByRole('combobox', { name: /Forma de pagamento/ }).selectOption('PIX')
    await receipt.getByLabel('Valor recebido (R$)').fill('40,00')
    await page.waitForTimeout(1200)
    await receipt.getByRole('button', { name: 'Salvar recebimento' }).click()
    const charge = page.getByRole('dialog', { name: 'Consulta da Amora' })
    await expect(charge.getByText(/R\$\s*20,00/)).toBeVisible()
  })

})
