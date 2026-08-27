import { expect, test } from '@playwright/test'

test('renders the anonymous login foundation', async ({ page }, testInfo) => {
  const pageErrors: string[] = []
  const unexpectedConsoleErrors: string[] = []
  const failedRequests: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      !message
        .text()
        .includes('Failed to load resource: net::ERR_CONNECTION_REFUSED') &&
      !message
        .text()
        .includes(
          'Failed to load resource: the server responded with a status of 401 (Unauthorized)',
        )
    ) {
      unexpectedConsoleErrors.push(message.text())
    }
  })
  page.on('requestfailed', (request) => failedRequests.push(request.url()))

  await page.route('**/auth/refresh', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthenticated' }),
    })
  })

  await page.goto('/login')

  await expect(
    page.getByRole('heading', { name: 'Welcome back' }),
  ).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('login-default.png') })
  expect(pageErrors).toEqual([])
  expect(unexpectedConsoleErrors).toEqual([])
  expect(failedRequests).toEqual([])
})

test('renders an accessible API login error', async ({ page }) => {
  await page.route('**/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Check your email and password, then try again.',
      }),
    })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill('maya@acme.com')
  await page.getByLabel('Password').fill('not-the-password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('alert')).toContainText('Unable to sign in')
  await expect(page.getByLabel('Password')).toHaveAttribute(
    'aria-invalid',
    'true',
  )
})
