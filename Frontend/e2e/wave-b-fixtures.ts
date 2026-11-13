import { execFileSync } from 'node:child_process'
import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { authenticate, retryRateLimited } from './authenticate'

export const smtpUrl = process.env.E2E_SMTP_URL
const project = process.env.E2E_REVIEW_PROJECT ?? ''

export function password() {
  const value = process.env.E2E_TEST_PASSWORD
  if (!value) throw new Error('Execute a suíte pelo runner descartável.')
  return value
}

export function bearer(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export async function token(request: APIRequestContext, email: string, secret = password()): Promise<string> {
  return (await authenticate(request, email, secret)).token
}

export async function signIn(page: Page, email: string, secret = password()) {
  await page.goto('/login')
  await page.getByPlaceholder('seu@email.com').fill(email)
  await page.locator('input[type=password]').fill(secret)
  const submit = page.getByRole('button', { name: 'Entrar no Easypet' })
  const response = await submitAuthForm(page, '/auth/login', submit)
  expect(response.status(), `Login pela interface da conta fictícia ${email}`).toBe(200)
}

async function authAction(page: Page, method: string, path: string, act: () => Promise<unknown>) {
  return retryRateLimited(async () => {
    const sent = page.waitForResponse(response =>
      new URL(response.url()).pathname === '/api/v1' + path && response.request().method() === method,
    )
    await act()
    return sent
  })
}

export function submitAuthForm(page: Page, path: string, submit: Locator, method = 'POST') {
  return authAction(page, method, path, () => submit.click())
}

export async function openAuthPage(page: Page, url: string, method: string, path: string) {
  let firstAttempt = true
  const response = await authAction(page, method, path, () => {
    if (!firstAttempt) return page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
    firstAttempt = false
    return page.goto(url)
  })
  expect(response.status(), `${method} ${path} ao abrir a página`).toBe(200)
}

export async function captures(email: string) {
  const url = new URL('/messages', smtpUrl)
  url.searchParams.set('recipient', email)
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
  if (!response.ok) throw new Error(`Coletor SMTP retornou ${response.status}.`)
  return await response.json() as Array<{ sender: string; recipients: string[]; raw: string }>
}

export async function capturedLink(email: string, origin: string, path: string, previous?: string) {
  let link: URL | undefined
  await expect.poll(async () => {
    const messages = await captures(email)
    const content = messages.map(message => message.raw.replace(/=\r?\n/g, '').replace(/=3D/gi, '=')).join('\n')
    const candidates = content.match(/https?:\/\/[^\s"'<>]+/g) ?? []
    link = candidates.filter(candidate => URL.canParse(candidate)).map(candidate => new URL(candidate)).find(candidate =>
      candidate.origin === origin && candidate.pathname === path && candidate.searchParams.has('token')
        && candidate.href !== previous,
    )
    return Boolean(link)
  }, { timeout: 15_000 }).toBe(true)
  if (!link) throw new Error('Link de teste ausente na captura SMTP.')
  return link
}

export function docker(args: string[], input?: string) {
  if (!/^easypet-e2e-[a-f0-9]{10}$/.test(project)) throw new Error('Projeto descartável inválido.')
  return execFileSync('docker', args.map(arg => arg.replace('{project}', project)), {
    input, encoding: 'utf8', timeout: 30_000, stdio: ['pipe', 'pipe', 'pipe'],
  })
}

export function directStatus(url: string, authorization: string): number {
  return Number(docker(['exec', '-i', '{project}-pet-fault-1', 'node', '--input-type=module', '-e', `
    import { readFileSync } from 'node:fs'
    const { url, authorization } = JSON.parse(readFileSync(0, 'utf8'))
    const response = await fetch(url, {
      headers: { Authorization: authorization }, signal: AbortSignal.timeout(7000),
    })
    console.log(response.status)
  `], JSON.stringify({ url, authorization })).trim())
}

export async function json(request: APIRequestContext, method: string, path: string, status: number,
                           headers?: Record<string, string>, data?: object) {
  const send = () => request.fetch('/api/v1' + path, { method, headers, data })
  const response = path.startsWith('/auth/')
    ? await retryRateLimited(send, response => response.dispose())
    : await send()
  expect(response.status(), `${method} ${path}`).toBe(status)
  const body = await response.text()
  return body ? JSON.parse(body) : undefined
}

export function futureDate(days: number) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(Date.now() + days * 86_400_000))
}

export function sql(database: string, query: string) {
  return docker(['exec', '-i', `{project}-${database}-db-1`, 'psql', '-XAtq',
    '-v', 'ON_ERROR_STOP=1', '-U', database, '-d', `${database}_db`], query).trim()
}

export async function prepareConsultation(request: APIRequestContext, owner: Record<string, string>, options: {
  name: string; cnpj: string; serviceName: string; staffName: string
}) {
  const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
  const partner = await json(request, 'POST', '/partners', 201, owner, {
    name: options.name, legalName: options.name, cnpj: options.cnpj, latitude: -27.5, longitude: -48.5,
    businessHours: weekdays.map(dayOfWeek => ({
      dayOfWeek, businessStartHour: '08:00', businessEndHour: '18:00', closed: false,
    })),
  })
  const staff = await json(request, 'POST', `/partners/${partner.id}/staff`, 201, owner, {
    name: options.staffName, status: 'ACTIVE',
  })
  const schedule = weekdays.map((_, index) => ({ dayOfWeek: index + 1, startTime: '08:00', endTime: '18:00' }))
  await json(request, 'PUT', `/partners/staff/${staff.id}/schedule`, 200, owner, schedule)
  const categories = await json(request, 'GET', '/categories', 200, owner)
  const category = categories.find((item: { slug: string }) => item.slug === 'saude')
  const service = await json(request, 'POST', `/partners/${partner.id}/services`, 200, owner, {
    name: options.serviceName, price: 60, durationMinutes: 30, billingUnit: 'HOURLY',
    categoryId: category.id, staffIds: [staff.id],
  })
  return { partner, staff, service, category, schedule }
}
