import { test, expect } from '@playwright/test'

test('public pages have no auth/hydration console issues after clearing auth storage', async ({ page, context }) => {
  const issues: string[] = []

  page.on('pageerror', (err) => {
    issues.push(`pageerror: ${err.message}`)
  })

  page.on('console', (msg) => {
    const text = msg.text()
    const type = msg.type()
    if (type === 'error' || type === 'warning') {
      issues.push(`console(${type}): ${text}`)
    }
  })

  await context.clearCookies()

  await page.goto('/auth/clear', { waitUntil: 'domcontentloaded' })
  await page.waitForURL('**/', { timeout: 10_000 })
  await page.waitForLoadState('networkidle')

  const paths = ['/', '/login', '/register', '/contact']
  for (const path of paths) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
  }

  const relevant = issues.filter((m) => {
    return (
      m.includes('Invalid Refresh Token') ||
      m.includes('Refresh Token Not Found') ||
      m.toLowerCase().includes('hydration failed') ||
      m.toLowerCase().includes('hydration mismatch') ||
      m.toLowerCase().includes('failed to fetch')
    )
  })

  expect(relevant, relevant.join('\n')).toEqual([])
})
