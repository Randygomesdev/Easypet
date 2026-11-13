import { expect, type APIRequestContext } from '@playwright/test'

export async function authenticate(
  request: APIRequestContext,
  email: string,
  password: string,
) {
  const response = await retryRateLimited(
    () => request.post('/api/v1/auth/login', { data: { email, password } }),
    response => response.dispose(),
  )
  expect(response.status(), `Login da conta fictícia ${email}`).toBe(200)
  return response.json()
}

export async function retryRateLimited<T extends { status(): number }>(
  send: () => Promise<T>,
  dispose?: (response: T) => Promise<void>,
) {
  let response = await send()
  // O limitador do Gateway agrupa as requisições desta suíte pelo endereço do Nginx.
  for (let attempt = 0; response.status() === 429 && attempt < 3; attempt++) {
    await dispose?.(response)
    await new Promise(resolve => setTimeout(resolve, 1100))
    response = await send()
  }
  return response
}
