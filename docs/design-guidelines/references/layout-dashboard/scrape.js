const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('正在連接到現有的 Chrome 瀏覽器...');
  
  // 嘗試連接到遠端除錯端口 9222
  let browser;
  try {
      browser = await puppeteer.connect({
        browserURL: 'http://127.0.0.1:9222',
        defaultViewport: null
      });
      console.log('成功連接到現有瀏覽器！');
  } catch (e) {
      console.error('無法連接到瀏覽器。請確保您已使用 --remote-debugging-port=9222 參數啟動 Chrome。');
      console.error('詳細錯誤:', e.message);
      return;
  }

  // 尋找目標 Dashboard 頁面
  const pages = await browser.pages();
  // 優先尋找包含 turbotenant 的頁面，不一定要是 dashboard，因為可能被重定向
  let page = pages.find(p => p.url().includes('turbotenant.com'));

  if (!page) {
    console.log('找不到已開啟的 TurboTenant 頁面，正在開啟新分頁...');
    page = await browser.newPage();
  } else {
    console.log(`找到現有分頁: ${page.url()}`);
    await page.bringToFront();
  }

  // 強制跳轉到 dashboard
  const targetUrl = 'https://rental.turbotenant.com/owners/dashboard';
  if (page.url() !== targetUrl) {
      console.log(`正在導航至 ${targetUrl}...`);
      await page.goto(targetUrl, { waitUntil: 'networkidle2' });
  }

  // 增加人工確認機制
  console.log('請檢查瀏覽器視窗是否已顯示正確的 Dashboard 畫面。');
  console.log('如果不正確，請在瀏覽器中手動點擊到 Dashboard 頁面。');
  console.log('程式將等待 10 秒後再進行抓取...');
  
  await new Promise(r => setTimeout(r, 10000));

  console.log(`當前 URL: ${page.url()}`);
  console.log('開始抓取頁面結構...');
  
  // 取得完整 HTML
  const htmlContent = await page.content();
  
  // 儲存 HTML
  fs.writeFileSync('dashboard.html', htmlContent);
  console.log('已儲存網頁結構至 dashboard.html');

  // 截圖備份
  await page.screenshot({ path: 'dashboard.screenshot.png', fullPage: true });
  console.log('已儲存網頁截圖至 dashboard.screenshot.png');

  // 嘗試提取並列出所有 CSS/JS 資源鏈接 (僅供參考)
  const resources = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src).filter(Boolean);
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(s => s.href).filter(Boolean);
    return { scripts, styles };
  });
  
  fs.writeFileSync('resources_list.json', JSON.stringify(resources, null, 2));
  console.log('已儲存資源列表至 resources_list.json');

  console.log('任務完成！瀏覽器將於 5 秒後關閉...');
  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
})();
