/**
 * E2E Test: 新增物件完整流程
 * 
 * 測試情境：
 * 1. 使用測試帳號登入
 * 2. 導航到新增物件頁面
 * 3. 完成五個步驟的表單填寫
 * 4. 驗證表單驗證功能
 * 5. 提交並驗證結果
 */

import { test, expect } from '@playwright/test'

const TEST_USER = {
  email: 'a0405142777@gmail.com',
  password: 'NewPassword123!',
}

const TEST_PROPERTY = {
  // Step 1: 基本資料
  title: '台北市大安區精緻公寓',
  address: '台北市大安區和平東路三段123號4樓',
  type: 'rental',
  price: 25000,
  
  // Step 2: 權狀資料
  owner_name: '王小明',
  owner_contact: '台北市大安區和平東路三段123號',
  building_number: 'A12345678',
  land_number: 'L98765432',
  
  // Step 3: 面積資料
  main_area_sqm: 30.5,
  auxiliary_area_sqm: 5.2,
  common_area_sqm: 8.3,
  
  // Step 4: 物件詳情
  bedrooms: 3,
  bathrooms: 2,
  floor: 4,
  total_floors: 12,
  description: '位於台北市大安區精華地段，鄰近捷運站，生活機能便利，適合小家庭居住。',
}

test.describe('新增物件 - 完整流程', () => {
  test.beforeEach(async ({ page }) => {
    // 前往登入頁面
    await page.goto('http://localhost:3000/auth/signin')
    
    // 登入
    await page.fill('input[name="email"]', TEST_USER.email)
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    
    // 等待導向到儀表板
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })
    
    // 前往新增物件頁面
    await page.goto('http://localhost:3000/landlord/properties/add')
    await page.waitForLoadState('networkidle')
  })

  test('應該顯示五個步驟的進度條', async ({ page }) => {
    // 驗證步驟標題
    await expect(page.locator('text=基本資料')).toBeVisible()
    await expect(page.locator('text=權狀資料')).toBeVisible()
    await expect(page.locator('text=面積換算')).toBeVisible()
    await expect(page.locator('text=物件詳情')).toBeVisible()
    await expect(page.locator('text=照片上傳')).toBeVisible()
  })

  test('第一步：基本資料 - 必填欄位驗證', async ({ page }) => {
    // 不填寫任何欄位，直接點擊下一步
    await page.click('button:has-text("下一步")')
    
    // 應該看到錯誤訊息（因為有必填欄位）
    await page.waitForTimeout(500)
    
    // 驗證仍在第一步
    const step1 = page.locator('.bg-\\[\\#7C3AED\\]').first()
    await expect(step1).toBeVisible()
  })

  test('第一步：基本資料 - 成功填寫並進入下一步', async ({ page }) => {
    // 填寫物件標題
    await page.fill('input[placeholder*="台北市大安區精緻公寓"]', TEST_PROPERTY.title)
    
    // 填寫完整地址
    await page.fill('input[placeholder*="台北市大安區和平東路三段 123 號"]', TEST_PROPERTY.address)
    
    // 選擇物件類型（出租）
    await page.click('input[value="rental"]')
    
    // 填寫價格
    await page.fill('input[placeholder*="每月租金"]', TEST_PROPERTY.price.toString())
    
    // 點擊下一步
    await page.click('button:has-text("下一步")')
    
    // 等待進入第二步
    await page.waitForTimeout(500)
    
    // 驗證進入第二步（應該看到"所有權人姓名"標籤）
    await expect(page.locator('text=所有權人姓名')).toBeVisible()
  })

  test('完整流程：填寫所有步驟並提交', async ({ page }) => {
    // ========== Step 1: 基本資料 ==========
    await page.fill('input[placeholder*="台北市大安區精緻公寓"]', TEST_PROPERTY.title)
    await page.fill('input[placeholder*="台北市大安區和平東路三段 123 號"]', TEST_PROPERTY.address)
    await page.click('input[value="rental"]')
    await page.fill('input[placeholder*="每月租金"]', TEST_PROPERTY.price.toString())
    await page.click('button:has-text("下一步")')
    await page.waitForTimeout(500)

    // ========== Step 2: 權狀資料 ==========
    await expect(page.locator('text=所有權人姓名')).toBeVisible()
    
    await page.fill('input[placeholder*="請輸入所有權人姓名"]', TEST_PROPERTY.owner_name)
    await page.fill('input[placeholder*="所有權人聯絡地址"]', TEST_PROPERTY.owner_contact)
    await page.fill('input[placeholder*="A12345678"]', TEST_PROPERTY.building_number)
    await page.fill('input[placeholder*="L98765432"]', TEST_PROPERTY.land_number)
    await page.click('button:has-text("下一步")')
    await page.waitForTimeout(500)

    // ========== Step 3: 面積換算 ==========
    await expect(page.locator('text=主建物面積')).toBeVisible()
    
    // 填寫主建物面積
    const mainAreaInput = page.locator('input[placeholder*="30.5"]').first()
    await mainAreaInput.fill(TEST_PROPERTY.main_area_sqm.toString())
    
    // 驗證坪數換算（應該自動計算）
    await page.waitForTimeout(500)
    const expectedPing = (TEST_PROPERTY.main_area_sqm * 0.3025).toFixed(2)
    await expect(page.locator(`text=${expectedPing} 坪`).first()).toBeVisible()
    
    // 填寫附屬建物面積
    await page.locator('input[placeholder*="陽台、雨遮等"]').fill(TEST_PROPERTY.auxiliary_area_sqm.toString())
    
    // 填寫公共設施面積
    await page.locator('input[placeholder*="停車位等"]').fill(TEST_PROPERTY.common_area_sqm.toString())
    
    // 驗證總面積計算
    await page.waitForTimeout(500)
    const totalArea = TEST_PROPERTY.main_area_sqm + TEST_PROPERTY.auxiliary_area_sqm + TEST_PROPERTY.common_area_sqm
    const totalPing = (totalArea * 0.3025).toFixed(2)
    await expect(page.locator(`text=${totalPing} 坪`)).toBeVisible()
    
    await page.click('button:has-text("下一步")')
    await page.waitForTimeout(500)

    // ========== Step 4: 物件詳情 ==========
    await expect(page.locator('text=房間數')).toBeVisible()
    
    await page.fill('input[placeholder*="例：3"]', TEST_PROPERTY.bedrooms.toString())
    await page.fill('input[placeholder*="例：2"]', TEST_PROPERTY.bathrooms.toString())
    await page.fill('input[placeholder*="例：5"]', TEST_PROPERTY.floor.toString())
    await page.fill('input[placeholder*="例：12"]', TEST_PROPERTY.total_floors.toString())
    await page.fill('textarea[placeholder*="請描述物件的特色"]', TEST_PROPERTY.description)
    
    await page.click('button:has-text("下一步")')
    await page.waitForTimeout(500)

    // ========== Step 5: 照片上傳 ==========
    await expect(page.locator('text=點擊或拖曳照片至此處上傳')).toBeVisible()
    
    // 點擊完成按鈕
    await page.click('button:has-text("完成")')
    
    // 等待導向到物件列表頁面
    await page.waitForURL(/\/landlord\/properties/, { timeout: 10000 })
    
    // 驗證成功導向
    expect(page.url()).toContain('/landlord/properties')
  })

  test('上一步功能：應該能返回前一步', async ({ page }) => {
    // 完成第一步
    await page.fill('input[placeholder*="台北市大安區精緻公寓"]', TEST_PROPERTY.title)
    await page.fill('input[placeholder*="台北市大安區和平東路三段 123 號"]', TEST_PROPERTY.address)
    await page.click('input[value="rental"]')
    await page.fill('input[placeholder*="每月租金"]', TEST_PROPERTY.price.toString())
    await page.click('button:has-text("下一步")')
    await page.waitForTimeout(500)

    // 確認在第二步
    await expect(page.locator('text=所有權人姓名')).toBeVisible()
    
    // 點擊上一步
    await page.click('button:has-text("上一步")')
    await page.waitForTimeout(500)
    
    // 應該回到第一步，驗證表單保留數據
    await expect(page.locator('input[placeholder*="台北市大安區精緻公寓"]')).toHaveValue(TEST_PROPERTY.title)
    await expect(page.locator('input[placeholder*="台北市大安區和平東路三段 123 號"]')).toHaveValue(TEST_PROPERTY.address)
  })

  test('取消功能：第一步點擊取消應該返回', async ({ page }) => {
    // 在第一步點擊取消
    await page.click('button:has-text("取消")')
    
    // 應該返回上一頁（可能是物件列表或儀表板）
    await page.waitForTimeout(1000)
    expect(page.url()).not.toContain('/add')
  })
})

test.describe('新增物件 - 表單驗證', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signin')
    await page.fill('input[name="email"]', TEST_USER.email)
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 10000 })
    await page.goto('http://localhost:3000/landlord/properties/add')
    await page.waitForLoadState('networkidle')
  })

  test('物件標題：少於5個字元應該顯示錯誤', async ({ page }) => {
    await page.fill('input[placeholder*="台北市大安區精緻公寓"]', '公寓')
    await page.fill('input[placeholder*="台北市大安區和平東路三段 123 號"]', TEST_PROPERTY.address)
    await page.click('input[value="rental"]')
    await page.fill('input[placeholder*="每月租金"]', TEST_PROPERTY.price.toString())
    
    await page.click('button:has-text("下一步")')
    await page.waitForTimeout(500)
    
    // 應該看到錯誤訊息或仍在第一步
    await expect(page.locator('text=物件標題')).toBeVisible()
  })

  test('價格：應該是數字且大於0', async ({ page }) => {
    await page.fill('input[placeholder*="台北市大安區精緻公寓"]', TEST_PROPERTY.title)
    await page.fill('input[placeholder*="台北市大安區和平東路三段 123 號"]', TEST_PROPERTY.address)
    await page.click('input[value="rental"]')
    await page.fill('input[placeholder*="每月租金"]', '0')
    
    await page.click('button:has-text("下一步")')
    await page.waitForTimeout(500)
    
    // 應該仍在第一步
    await expect(page.locator('text=物件標題')).toBeVisible()
  })

  test('所有權人姓名：少於2個字元應該顯示錯誤', async ({ page }) => {
    // 先完成第一步
    await page.fill('input[placeholder*="台北市大安區精緻公寓"]', TEST_PROPERTY.title)
    await page.fill('input[placeholder*="台北市大安區和平東路三段 123 號"]', TEST_PROPERTY.address)
    await page.click('input[value="rental"]')
    await page.fill('input[placeholder*="每月租金"]', TEST_PROPERTY.price.toString())
    await page.click('button:has-text("下一步")')
    await page.waitForTimeout(500)

    // 在第二步填寫少於2個字元的姓名
    await page.fill('input[placeholder*="請輸入所有權人姓名"]', '王')
    await page.click('button:has-text("下一步")')
    await page.waitForTimeout(500)
    
    // 應該仍在第二步
    await expect(page.locator('text=所有權人姓名')).toBeVisible()
  })

  test('主建物面積：必須大於0', async ({ page }) => {
    // 完成第一步和第二步
    await page.fill('input[placeholder*="台北市大安區精緻公寓"]', TEST_PROPERTY.title)
    await page.fill('input[placeholder*="台北市大安區和平東路三段 123 號"]', TEST_PROPERTY.address)
    await page.click('input[value="rental"]')
    await page.fill('input[placeholder*="每月租金"]', TEST_PROPERTY.price.toString())
    await page.click('button:has-text("下一步")')
    await page.waitForTimeout(500)

    await page.fill('input[placeholder*="請輸入所有權人姓名"]', TEST_PROPERTY.owner_name)
    await page.click('button:has-text("下一步")')
    await page.waitForTimeout(500)

    // 在第三步填寫0或負數
    const mainAreaInput = page.locator('input[placeholder*="30.5"]').first()
    await mainAreaInput.fill('0')
    await page.click('button:has-text("下一步")')
    await page.waitForTimeout(500)
    
    // 應該仍在第三步
    await expect(page.locator('text=主建物面積')).toBeVisible()
  })
})
