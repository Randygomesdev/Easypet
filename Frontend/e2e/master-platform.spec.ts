import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { bearer, directStatus, json, signIn, token } from './wave-b-fixtures'

test.skip(process.env.E2E_H1 !== '1', 'Requer a stack H1 real e o coletor local.')
const endpoint = '/admin/platform/status'
const root = fileURLToPath(new URL('../../', import.meta.url))

function collect() {
  const project = process.env.E2E_REVIEW_PROJECT ?? ''
  const directory = process.env.E2E_MASTER_STATUS_DIR ?? ''
  if (!/^easypet-e2e-[a-f0-9]{10}$/.test(project) || !directory) throw new Error('Fixture master ausente.')
  const target = join(directory, 'status.json')
  execFileSync(process.env.E2E_PYTHON ?? 'python', [join(root, 'scripts/production/master_status.py'),
    '--project', project, '--output', target], { encoding: 'utf8', timeout: 45_000 })
  return target
}

test('master protege o status no ingresso e no Auth direto e usa coleta real', async ({ request, page }) => {
  collect()
  const admin = bearer(await token(request, 'admin@example.test'))
  const tutor = bearer(await token(request, 'tutor@example.test'))
  const partner = bearer(await token(request, 'parceiro-a@example.test'))
  await json(request, 'GET', endpoint, 401)
  await json(request, 'GET', endpoint, 401, { Authorization: 'Bearer invalid', 'X-User-Role': 'ADMIN' })
  await json(request, 'GET', endpoint, 403, { ...tutor, 'X-User-Role': 'ADMIN' })
  await json(request, 'GET', endpoint, 403, partner)
  const direct = 'http://auth-service:8081/api/v1' + endpoint
  expect(directStatus(direct, tutor.Authorization)).toBe(403)
  expect(directStatus(direct, partner.Authorization)).toBe(403)
  expect(directStatus(direct, admin.Authorization)).toBe(200)
  const response = await request.get('/api/v1' + endpoint, { headers: admin })
  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toContain('no-store')
  const snapshot = await response.json()
  expect(snapshot.state).toBe('AVAILABLE')
  expect(snapshot.services).toHaveLength(16)
  expect(snapshot.services.every((row: { status: string; memoryBytes: number | null }) =>
    row.status === 'HEALTHY' && row.memoryBytes !== null)).toBe(true)
  expect(Object.keys(snapshot).sort()).toEqual(['collectedAt', 'hostMemory', 'sampleAgeSeconds', 'services', 'state'])
  expect(JSON.stringify(snapshot)).not.toMatch(/password|token|secret|jdbc|setoriza/i)
  await signIn(page, 'parceiro-a@example.test')
  await expect(page).toHaveURL(/\/partner\/dashboard$/)
  await page.goto('/admin/sistema')
  await expect(page).toHaveURL(/\/partner\/dashboard$/)
  await expect(page.getByRole('link', { name: 'Sistema', exact: true })).toHaveCount(0)
})

test('master reúne indicadores reais, gestões e monitoramento sem esconder coleta vencida', async ({ request, page }) => {
  const target = collect()
  const original = readFileSync(target, 'utf8')
  const admin = bearer(await token(request, 'admin@example.test'))
  const partners = await json(request, 'GET', '/admin/partners?active=true&page=0&size=1', 200, admin)
  await signIn(page, 'admin@example.test')
  await expect(page).toHaveURL(/\/admin\/visao-geral$/)
  await expect(page.getByRole('heading', { name: 'Painel master' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Estabelecimentos ativos', exact: true }).locator('..')
    .getByText(partners.totalElements.toLocaleString('pt-BR'), { exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/master-overview.png', fullPage: true })
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Estabelecimentos', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Parceiros', exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Tutores', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Contas da plataforma' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Sistema', exact: true }).click()
  await expect(page.getByText('16 de 16', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/master-system.png', fullPage: true })
  try {
    const old = JSON.parse(original)
    old.collectedAt = new Date(Date.now() - 180_000).toISOString()
    writeFileSync(target, JSON.stringify(old))
    await page.getByRole('button', { name: 'Atualizar status' }).click()
    await expect(page.getByRole('alert')).toContainText('Coleta desatualizada')
    await expect(page.getByText('16 de 16', { exact: true })).toHaveCount(0)
    writeFileSync(target, '{invalid')
    await page.getByRole('button', { name: 'Atualizar status' }).click()
    await expect(page.getByRole('heading', { name: 'Monitoramento indisponível' })).toBeVisible()
    await expect(page.getByText('16 de 16', { exact: true })).toHaveCount(0)
  } finally {
    writeFileSync(target, original)
  }
  await page.getByRole('button', { name: 'Atualizar status' }).click()
  await expect(page.getByText('16 de 16', { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: 'Sistema', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/master-system-mobile.png', fullPage: true })
})
