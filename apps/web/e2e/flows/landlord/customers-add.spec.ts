/**
 * E2E: 房東客戶 — 新增客戶表單開啟與驗證提示
 *
 * 使用與其他 landlord flow 相同的測試帳號；需本機 dev server。
 */

import { test, expect } from '@playwright/test'

const TEST_USER = {
  email: 'a0405142777@gmail.com',
  password: 'NewPassword123!',
}

test.describe('房東客戶 — 新增客戶', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signin')
    await page.fill('input[name="email"]', TEST_USER.email)
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 15000 })
    await page.goto('http://localhost:3000/landlord/customers')
    await page.waitForLoadState('networkidle')
  })

  test('應開啟新增客戶對話框並顯示必填欄位', async ({ page }) => {
    await page.getByRole('button', { name: '新增客戶' }).first().click()
    await expect(page.getByRole('heading', { name: '新增客戶' })).toBeVisible()

    await page.locator('form').getByRole('button', { name: '新增客戶' }).click()
    await expect(page.getByText('姓名為必填欄位')).toBeVisible()
    await expect(page.getByText('手機號碼為必填欄位')).toBeVisible()
    await expect(page.getByText('Email 為必填欄位')).toBeVisible()
  })
})
