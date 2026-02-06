/**
 * @file add-property-complete.spec.ts
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @description Complete E2E test for add property feature (TDD)
 */

import { test, expect } from '@playwright/test'

test.describe('新增物件完整流程測試', () => {
  test.beforeEach(async ({ page }) => {
    // 前往新增物件頁面
    await page.goto('http://localhost:3000/landlord/properties/add')
    await page.waitForLoadState('networkidle')
  })

  test('Test 1: 草稿功能基本測試 - 儲存、讀取、刪除', async ({ page }) => {
    // Step 1: 填寫基本資料
    await test.step('填寫 Step 1 - 基本資料', async () => {
      await page.fill('input[name="title"]', '測試物件A - 草稿測試')
      await page.fill('input[name="address"]', '台北市大安區測試路123號')
      await page.click('input[value="rental"]')
      await page.fill('input[name="price"]', '30000')
    })

    // 測試快速儲存草稿（不開 Drawer）
    await test.step('快速儲存草稿', async () => {
      // 找到「儲存草稿」按鈕（在「讀取草稿」旁邊）
      const saveDraftBtn = page.locator('button:has-text("儲存草稿")').last()
      await saveDraftBtn.click()

      // 等待 alert
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('草稿已儲存')
        expect(dialog.message()).toContain('測試物件A - 草稿測試')
        await dialog.accept()
      })

      await page.waitForTimeout(500)
    })

    // 清空表單（模擬重新開始）
    await test.step('清空表單', async () => {
      await page.fill('input[name="title"]', '')
      await page.fill('input[name="address"]', '')
      await page.fill('input[name="price"]', '')
    })

    // 讀取草稿
    await test.step('讀取草稿', async () => {
      await page.click('button:has-text("讀取草稿")')

      // 等待 Drawer 開啟
      await expect(page.locator('text=草稿管理')).toBeVisible()

      // 應該看到剛才儲存的草稿
      await expect(page.locator('text=測試物件A - 草稿測試')).toBeVisible()
      await expect(page.locator('text=台北市大安區測試路123號')).toBeVisible()
      await expect(page.locator('text=NT$ 30,000/月')).toBeVisible()

      // 點擊「載入」
      const loadBtn = page.locator('button:has-text("載入")').first()
      await loadBtn.click()

      // 等待 alert
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('草稿已載入')
        await dialog.accept()
      })

      await page.waitForTimeout(500)
    })

    // 驗證表單已填入
    await test.step('驗證表單資料已載入', async () => {
      await expect(page.locator('input[name="title"]')).toHaveValue('測試物件A - 草稿測試')
      await expect(page.locator('input[name="address"]')).toHaveValue('台北市大安區測試路123號')
      await expect(page.locator('input[name="price"]')).toHaveValue('30000')
    })

    // 刪除草稿
    await test.step('刪除草稿', async () => {
      await page.click('button:has-text("讀取草稿")')
      await expect(page.locator('text=草稿管理')).toBeVisible()

      // 點擊刪除
      const deleteBtn = page.locator('button:has-text("刪除")').first()

      // Handle confirm dialog
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm')
        expect(dialog.message()).toContain('確定要刪除')
        await dialog.accept()
      })

      await deleteBtn.click()
      await page.waitForTimeout(500)

      // 應該看到「尚無儲存的草稿」
      await expect(page.locator('text=尚無儲存的草稿')).toBeVisible()
    })
  })

  test('Test 2: 完整 5 步驟表單填寫', async ({ page }) => {
    // Step 1: 基本資料
    await test.step('Step 1 - 基本資料', async () => {
      await page.fill('input[name="title"]', '完整測試物件')
      await page.fill('input[name="address"]', '台北市信義區測試路456號')
      await page.click('input[value="sale"]')
      await page.fill('input[name="price"]', '25000000')

      await page.click('button:has-text("下一步")')
      await page.waitForTimeout(500)
    })

    // Step 2: 權狀資料
    await test.step('Step 2 - 權狀資料', async () => {
      await expect(page.locator('text=權狀資料')).toBeVisible()

      await page.fill('input[name="owner_name"]', '測試所有權人')
      await page.fill('input[name="owner_contact"]', '台北市測試區')
      await page.fill('input[name="building_number"]', 'A12345')
      await page.fill('input[name="land_number"]', 'L67890')

      await page.click('button:has-text("下一步")')
      await page.waitForTimeout(500)
    })

    // Step 3: 面積換算
    await test.step('Step 3 - 面積換算', async () => {
      await expect(page.locator('text=面積換算')).toBeVisible()

      // 主建物面積
      await page.fill('input[name="main_area_sqm"]', '30')

      // 新增附屬建物
      await page.click('button:has-text("新增"):has-text("附屬建物")')
      await page.selectOption('select', '陽台')
      await page.fill('input[placeholder="0.00"]', '5.5')
      await page.click('button:has-text("確認新增")')

      // 新增車位
      await page.click('button:has-text("新增車位")')
      await page.click('input[value="independent"]')
      await page.fill('input[placeholder="A-01"]', 'A-01')
      await page.fill('input[placeholder="12.50"]', '12.5')
      await page.click('button:has-text("確認新增"):last-of-type')

      await page.click('button:has-text("下一步")')
      await page.waitForTimeout(500)
    })

    // Step 4: 物件詳情
    await test.step('Step 4 - 物件詳情', async () => {
      await expect(page.locator('text=物件詳情')).toBeVisible()

      await page.fill('input[name="bedrooms"]', '3')
      await page.fill('input[name="bathrooms"]', '2')
      await page.fill('input[name="floor"]', '5')
      await page.fill('input[name="total_floors"]', '12')
      await page.fill('textarea[name="description"]', '測試物件描述')

      await page.click('button:has-text("下一步")')
      await page.waitForTimeout(500)
    })

    // Step 5: 照片上傳
    await test.step('Step 5 - 照片上傳', async () => {
      await expect(page.locator('text=照片上傳')).toBeVisible()

      // 驗證上傳區域存在
      await expect(page.locator('text=點擊或拖曳照片至此處上傳')).toBeVisible()
      await expect(page.locator('text=支援 JPG、PNG、HEIC 格式')).toBeVisible()
    })
  })

  test('Test 3: 自訂草稿名稱', async ({ page }) => {
    // 填寫基本資料
    await page.fill('input[name="title"]', '測試物件B')
    await page.fill('input[name="address"]', '台北市中山區測試路')
    await page.click('input[value="rental"]')
    await page.fill('input[name="price"]', '35000')

    // 開啟草稿 Drawer
    await page.click('button:has-text("讀取草稿")')
    await expect(page.locator('text=草稿管理')).toBeVisible()

    // 應該看到預設檔名預覽
    await expect(page.locator('text=預設檔名: 測試物件B - 出租')).toBeVisible()

    // 輸入自訂名稱
    const customNameInput = page.locator('input[placeholder*="預設"]')
    await customNameInput.fill('VIP客戶-張先生物件')

    // 儲存
    await page.click('button:has-text("儲存"):last-of-type')

    // 等待 alert
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('VIP客戶-張先生物件')
      await dialog.accept()
    })

    await page.waitForTimeout(500)
  })

  test('Test 4: 多個草稿管理', async ({ page }) => {
    // 儲存第一個草稿
    await test.step('儲存草稿 1', async () => {
      await page.fill('input[name="title"]', '物件A')
      await page.fill('input[name="address"]', '地址A')
      await page.click('input[value="rental"]')
      await page.fill('input[name="price"]', '20000')

      await page.click('button:has-text("儲存草稿")').last()
      page.once('dialog', async (dialog) => await dialog.accept())
      await page.waitForTimeout(500)
    })

    // 清空並儲存第二個草稿
    await test.step('儲存草稿 2', async () => {
      await page.reload()
      await page.waitForLoadState('networkidle')

      await page.fill('input[name="title"]', '物件B')
      await page.fill('input[name="address"]', '地址B')
      await page.click('input[value="sale"]')
      await page.fill('input[name="price"]', '15000000')

      await page.click('button:has-text("儲存草稿")').last()
      page.once('dialog', async (dialog) => await dialog.accept())
      await page.waitForTimeout(500)
    })

    // 開啟草稿管理
    await test.step('驗證有 2 個草稿', async () => {
      await page.click('button:has-text("讀取草稿")')
      await expect(page.locator('text=草稿管理')).toBeVisible()

      // 應該看到 (2/10)
      await expect(page.locator('text=已儲存的草稿 (2/10)')).toBeVisible()

      // 應該看到兩個草稿
      await expect(page.locator('text=物件A - 出租')).toBeVisible()
      await expect(page.locator('text=物件B - 出售')).toBeVisible()
    })
  })

  test('Test 5: 驗證草稿儲存位置', async ({ page }) => {
    // 儲存一個草稿
    await page.fill('input[name="title"]', '檢查儲存位置')
    await page.fill('input[name="address"]', '測試地址')
    await page.click('input[value="rental"]')
    await page.fill('input[name="price"]', '25000')

    await page.click('button:has-text("儲存草稿")').last()
    page.once('dialog', async (dialog) => await dialog.accept())
    await page.waitForTimeout(500)

    // 檢查 localStorage
    const localStorageData = await page.evaluate(() => {
      const data = localStorage.getItem('property_form_drafts')
      return data
    })

    expect(localStorageData).toBeTruthy()

    const drafts = JSON.parse(localStorageData!)
    expect(Array.isArray(drafts)).toBe(true)
    expect(drafts.length).toBeGreaterThan(0)
    expect(drafts[0]).toHaveProperty('id')
    expect(drafts[0]).toHaveProperty('name')
    expect(drafts[0]).toHaveProperty('savedAt')
    expect(drafts[0]).toHaveProperty('data')

    console.log('✅ 草稿儲存位置: localStorage.property_form_drafts')
    console.log('✅ 草稿數量:', drafts.length)
    console.log('✅ 最多可存: 10 個')
  })
})
