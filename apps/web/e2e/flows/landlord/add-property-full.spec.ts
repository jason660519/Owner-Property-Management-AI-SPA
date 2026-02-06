/**
 * E2E Test: 房東新增物件完整流程
 * 測試用戶: a0405142777@gmail.com
 * 測試密碼: NewPassword123!
 */

import { test, expect } from '@playwright/test'

// 測試數據
const TEST_USER = {
  email: 'a0405142777@gmail.com',
  password: 'NewPassword123!'
}

const TEST_PROPERTY = {
  // Step 1: 基本資料
  title: '台北市大安區精緻三房公寓',
  address: '台北市大安區和平東路三段123號4樓',
  type: 'rental', // or 'sale'
  price: '28000', // 月租金
  
  // Step 2: 權狀資料
  owner_name: '王小明',
  owner_contact: '台北市大安區和平東路三段123號',
  building_number: 'A12345678',
  land_number: 'L98765432',
  
  // Step 3: 面積換算
  main_area_sqm: '30.5',
  auxiliary_area_sqm: '5.2',
  common_area_sqm: '8.3',
  
  // Step 4: 物件詳情
  bedrooms: '3',
  bathrooms: '2',
  floor: '4',
  total_floors: '12',
  description: '全新裝潢，採光良好，近捷運大安站，生活機能佳'
}

test.describe('房東新增物件 - 完整流程', () => {
  test.beforeEach(async ({ page }) => {
    // 前往登入頁面
    await page.goto('http://localhost:3000/auth/signin')
    
    // 登入
    await page.fill('input[name="email"]', TEST_USER.email)
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    
    // 等待導向儀表板
    await page.waitForURL('**/landlord/dashboard')
    
    // 前往新增物件頁面
    await page.goto('http://localhost:3000/landlord/properties/add')
    await page.waitForLoadState('networkidle')
  })

  test('應該顯示5個步驟進度條', async ({ page }) => {
    // 檢查步驟進度條
    const steps = page.locator('text=基本資料')
    await expect(steps).toBeVisible()
    
    const step2 = page.locator('text=權狀資料')
    await expect(step2).toBeVisible()
    
    const step3 = page.locator('text=面積換算')
    await expect(step3).toBeVisible()
    
    const step4 = page.locator('text=物件詳情')
    await expect(step4).toBeVisible()
    
    const step5 = page.locator('text=照片上傳')
    await expect(step5).toBeVisible()
  })

  test('步驟1: 填寫基本資料並進入下一步', async ({ page }) => {
    // 填寫物件標題
    await page.fill('input[name="title"]', TEST_PROPERTY.title)
    
    // 填寫地址
    await page.fill('input[name="address"]', TEST_PROPERTY.address)
    
    // 選擇物件類型（出租）
    await page.click('input[value="rental"]')
    
    // 填寫價格
    await page.fill('input[name="price"]', TEST_PROPERTY.price)
    
    // 點擊下一步
    await page.click('button:has-text("下一步")')
    
    // 驗證進入步驟2
    await expect(page.locator('text=所有權人姓名')).toBeVisible()
  })

  test('步驟2: 填寫權狀資料並進入下一步', async ({ page }) => {
    // 先完成步驟1
    await page.fill('input[name="title"]', TEST_PROPERTY.title)
    await page.fill('input[name="address"]', TEST_PROPERTY.address)
    await page.click('input[value="rental"]')
    await page.fill('input[name="price"]', TEST_PROPERTY.price)
    await page.click('button:has-text("下一步")')
    
    // 填寫所有權人姓名
    await page.fill('input[name="owner_name"]', TEST_PROPERTY.owner_name)
    
    // 填寫聯絡地址（選填）
    await page.fill('input[name="owner_contact"]', TEST_PROPERTY.owner_contact)
    
    // 填寫建號（選填）
    await page.fill('input[name="building_number"]', TEST_PROPERTY.building_number)
    
    // 填寫地號（選填）
    await page.fill('input[name="land_number"]', TEST_PROPERTY.land_number)
    
    // 點擊下一步
    await page.click('button:has-text("下一步")')
    
    // 驗證進入步驟3
    await expect(page.locator('text=主建物面積')).toBeVisible()
  })

  test('步驟3: 填寫面積並驗證自動換算', async ({ page }) => {
    // 先完成步驟1和2
    await page.fill('input[name="title"]', TEST_PROPERTY.title)
    await page.fill('input[name="address"]', TEST_PROPERTY.address)
    await page.click('input[value="rental"]')
    await page.fill('input[name="price"]', TEST_PROPERTY.price)
    await page.click('button:has-text("下一步")')
    
    await page.fill('input[name="owner_name"]', TEST_PROPERTY.owner_name)
    await page.click('button:has-text("下一步")')
    
    // 填寫主建物面積
    await page.fill('input[name="main_area_sqm"]', TEST_PROPERTY.main_area_sqm)
    
    // 驗證自動換算到坪 (30.5 * 0.3025 ≈ 9.23 坪)
    const pingDisplay = page.locator('text=/9\\.23.*坪/')
    await expect(pingDisplay).toBeVisible()
    
    // 填寫附屬建物（選填）
    await page.fill('input[name="auxiliary_area_sqm"]', TEST_PROPERTY.auxiliary_area_sqm)
    
    // 填寫公設（選填）
    await page.fill('input[name="common_area_sqm"]', TEST_PROPERTY.common_area_sqm)
    
    // 驗證總面積計算
    const totalArea = parseFloat(TEST_PROPERTY.main_area_sqm) + 
                     parseFloat(TEST_PROPERTY.auxiliary_area_sqm) + 
                     parseFloat(TEST_PROPERTY.common_area_sqm)
    const totalPing = (totalArea * 0.3025).toFixed(2)
    
    const totalDisplay = page.locator(`text=/${totalPing}.*坪/`)
    await expect(totalDisplay).toBeVisible()
    
    // 點擊下一步
    await page.click('button:has-text("下一步")')
    
    // 驗證進入步驟4
    await expect(page.locator('text=房間數')).toBeVisible()
  })

  test('步驟4: 填寫物件詳情並進入下一步', async ({ page }) => {
    // 先完成前3步
    await page.fill('input[name="title"]', TEST_PROPERTY.title)
    await page.fill('input[name="address"]', TEST_PROPERTY.address)
    await page.click('input[value="rental"]')
    await page.fill('input[name="price"]', TEST_PROPERTY.price)
    await page.click('button:has-text("下一步")')
    
    await page.fill('input[name="owner_name"]', TEST_PROPERTY.owner_name)
    await page.click('button:has-text("下一步")')
    
    await page.fill('input[name="main_area_sqm"]', TEST_PROPERTY.main_area_sqm)
    await page.click('button:has-text("下一步")')
    
    // 填寫房間數
    await page.fill('input[name="bedrooms"]', TEST_PROPERTY.bedrooms)
    
    // 填寫衛浴數
    await page.fill('input[name="bathrooms"]', TEST_PROPERTY.bathrooms)
    
    // 填寫所在樓層
    await page.fill('input[name="floor"]', TEST_PROPERTY.floor)
    
    // 填寫總樓層
    await page.fill('input[name="total_floors"]', TEST_PROPERTY.total_floors)
    
    // 填寫物件描述
    await page.fill('textarea[name="description"]', TEST_PROPERTY.description)
    
    // 點擊下一步
    await page.click('button:has-text("下一步")')
    
    // 驗證進入步驟5
    await expect(page.locator('text=照片上傳')).toBeVisible()
  })

  test('步驟5: 跳過照片上傳並完成新增', async ({ page }) => {
    // 先完成前4步
    await page.fill('input[name="title"]', TEST_PROPERTY.title)
    await page.fill('input[name="address"]', TEST_PROPERTY.address)
    await page.click('input[value="rental"]')
    await page.fill('input[name="price"]', TEST_PROPERTY.price)
    await page.click('button:has-text("下一步")')
    
    await page.fill('input[name="owner_name"]', TEST_PROPERTY.owner_name)
    await page.click('button:has-text("下一步")')
    
    await page.fill('input[name="main_area_sqm"]', TEST_PROPERTY.main_area_sqm)
    await page.click('button:has-text("下一步")')
    
    await page.fill('input[name="bedrooms"]', TEST_PROPERTY.bedrooms)
    await page.click('button:has-text("下一步")')
    
    // 在步驟5直接點擊完成（跳過照片上傳）
    await page.click('button:has-text("完成")')
    
    // 驗證導向物件列表頁
    await page.waitForURL('**/landlord/properties')
    
    // 驗證新增的物件出現在列表中
    await expect(page.locator(`text=${TEST_PROPERTY.title}`)).toBeVisible()
  })

  test('應該能使用上一步按鈕返回前一步', async ({ page }) => {
    // 進入步驟2
    await page.fill('input[name="title"]', TEST_PROPERTY.title)
    await page.fill('input[name="address"]', TEST_PROPERTY.address)
    await page.click('input[value="rental"]')
    await page.fill('input[name="price"]', TEST_PROPERTY.price)
    await page.click('button:has-text("下一步")')
    
    // 驗證在步驟2
    await expect(page.locator('text=所有權人姓名')).toBeVisible()
    
    // 點擊上一步
    await page.click('button:has-text("上一步")')
    
    // 驗證回到步驟1
    await expect(page.locator('text=物件標題')).toBeVisible()
    
    // 驗證表單資料仍保留
    const titleInput = page.locator('input[name="title"]')
    await expect(titleInput).toHaveValue(TEST_PROPERTY.title)
  })

  test('步驟1未填寫完整時不應該進入下一步', async ({ page }) => {
    // 只填寫標題，不填寫其他必填欄位
    await page.fill('input[name="title"]', TEST_PROPERTY.title)
    
    // 點擊下一步
    await page.click('button:has-text("下一步")')
    
    // 應該仍在步驟1，顯示錯誤訊息
    await expect(page.locator('text=物件標題')).toBeVisible()
    
    // 應該看到驗證錯誤
    // （這裡的具體實現取決於你的錯誤顯示方式）
  })
})

test.describe('VLM文件掃描整合測試', () => {
  test.skip('應該能上傳謄本PDF並自動填入資料', async ({ page }) => {
    // 這個測試需要VLM服務啟動
    await page.goto('http://localhost:3000/auth/signin')
    await page.fill('input[name="email"]', TEST_USER.email)
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/landlord/dashboard')
    
    await page.goto('http://localhost:3000/landlord/properties/add')
    
    // 在步驟2，應該有VLM掃描選項
    await page.fill('input[name="title"]', TEST_PROPERTY.title)
    await page.fill('input[name="address"]', TEST_PROPERTY.address)
    await page.click('input[value="rental"]')
    await page.fill('input[name="price"]', TEST_PROPERTY.price)
    await page.click('button:has-text("下一步")')
    
    // 上傳謄本PDF
    const pdfPath = '/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/resources/samples/成交資料附件/000003-A-FNPEF.PDF'
    
    await page.setInputFiles('input[type="file"]', pdfPath)
    
    // 等待VLM解析完成
    await page.waitForSelector('text=解析完成', { timeout: 30000 })
    
    // 驗證自動填入的資料
    const ownerNameInput = page.locator('input[name="owner_name"]')
    await expect(ownerNameInput).not.toHaveValue('')
  })
})
