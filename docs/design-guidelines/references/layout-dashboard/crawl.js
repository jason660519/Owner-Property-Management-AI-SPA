const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// 配置
const MAX_DEPTH = 5; // 深度限制 (0=Dashboard, 1=Dashboard上的鏈接, 2=第二層...)
const MAX_PAGES = 300; // 安全限制：最大頁面數，避免無限爬取
const START_URL = 'https://rental.turbotenant.com/owners/dashboard';
const OUTPUT_DIR = path.resolve(__dirname, 'crawled_data');
const ALLOWED_HOST = 'rental.turbotenant.com'; // 僅限爬取此網域

// 確保輸出目錄存在
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

// 產生檔案名稱的輔助函式
function urlToFilename(url) {
    try {
        const parsedUrl = new URL(url);
        let name = parsedUrl.pathname.replace(/^\//, '').replace(/\//g, '_');
        if (name === '') name = 'index';
        
        // 加入 query string 避免重複 (如果有重要參數)
        if (parsedUrl.search) {
            const params = parsedUrl.search.replace(/^\?/, '').replace(/=/g, '_').replace(/&/g, '_');
            name += '_' + params;
        }
        
        return `owners_${name}.html`; // 加上前綴避免衝突
    } catch (e) {
        return 'unknown_' + Date.now() + '.html';
    }
}

// 用來記錄 Sitemap 資訊
const sitemapData = [];

(async () => {
    console.log('正在連接到現有的 Chrome 瀏覽器...');
    
    let browser;
    try {
        // 嘗試連接到開啟了遠端除錯端口的 Chrome
        browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: null // 使用瀏覽器目前的視窗大小
        });
        console.log('成功連接到現有瀏覽器！');
    } catch (error) {
        console.error('無法連接到瀏覽器。請確保您已使用 --remote-debugging-port=9222 參數啟動 Chrome。');
        process.exit(1);
    }

    const page = await browser.newPage(); // 開啟新分頁進行爬取，避免干擾使用者
    
    // 設定 Viewport 讓截圖更完整
    await page.setViewport({ width: 1280, height: 800 });

    // 自動滾動函式，用於觸發懶加載
    async function autoScroll(page) {
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight - window.innerHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
    }

    const visited = new Set();
    const queue = [{ url: START_URL, depth: 0 }];
    let pagesCrawled = 0;

    // 爬蟲主迴圈
    while (queue.length > 0 && pagesCrawled < MAX_PAGES) {
        const { url, depth } = queue.shift();
        
        // 去除 URL hash 避免重複
        const cleanUrl = url.split('#')[0];
        
        if (visited.has(cleanUrl)) continue;
        visited.add(cleanUrl);

        // 安全檢查：排除登出、刪除等危險操作
        if (cleanUrl.includes('logout') || cleanUrl.includes('signout') || cleanUrl.includes('delete')) {
            console.log(`跳過危險 URL: ${cleanUrl}`);
            continue;
        }

        console.log(`[${pagesCrawled + 1}/${MAX_PAGES}] (深度: ${depth}) 正在處理: ${cleanUrl}`);

        try {
            const filename = urlToFilename(cleanUrl);
            const filepath = path.join(OUTPUT_DIR, filename);
            const screenshotFilename = filename.replace('.html', '.png');
            let content = '';

            // 檢查檔案是否存在 (快取機制)
            // 智慧判斷：如果是列表頁面 (含有特定關鍵字)，則強制重爬以觸發自動滾動
            const forceRefreshKeywords = ['dashboard', 'renters', 'properties', 'leads', 'applicants', 'tenants', 'transactions', 'messages', 'documents', 'leases'];
            const shouldForceRefresh = forceRefreshKeywords.some(kw => cleanUrl.toLowerCase().includes(kw));

            if (fs.existsSync(filepath) && !shouldForceRefresh) {
                console.log(`  檔案已存在，從本地讀取: ${filename}`);
                content = fs.readFileSync(filepath, 'utf8');
                
                // 補回 Sitemap 資料 (因為是新的執行，記憶體中沒有)
                // 這裡假設如果 HTML 存在，截圖也應該存在 (或者不重要)
                sitemapData.push({
                    url: cleanUrl,
                    title: 'Cached Page', // 從檔案讀取 title 比較麻煩，先暫略或用 regex
                    file: filename,
                    screenshot: screenshotFilename
                });
                
                // 注意：讀取快取不增加 pagesCrawled 計數，這樣可以爬更多新頁面
                // 或者如果您希望總量控制，可以增加。這裡選擇不增加，以便抓取更多新內容。
            } else {
                // 檔案不存在，進行網路爬取
                await page.goto(cleanUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                
                // 隨機等待 1-3 秒，模擬人類行為
                await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

                // 自動滾動到底部以加載更多內容
                try {
                    console.log('  正在滾動頁面以加載更多內容...');
                    await autoScroll(page);
                    // 滾動後再等待一下，確保內容渲染完成
                    await new Promise(r => setTimeout(r, 2000));
                } catch (e) {
                    console.log('  滾動失敗 (可能頁面太短):', e.message);
                }

                // 1. 保存 HTML
                content = await page.content();
                
                // 注入 Base Tag 以修復顯示問題
                if (/<head>/i.test(content)) {
                    content = content.replace(/<head>/i, '<head><base href="https://rental.turbotenant.com/">');
                }
                
                fs.writeFileSync(filepath, content);
                console.log(`  已保存 HTML: ${filename}`);

                // 2. 保存截圖 (Screenshot)
                const screenshotPath = path.join(OUTPUT_DIR, screenshotFilename);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`  已保存截圖: ${screenshotFilename}`);

                // 3. 記錄到 Sitemap 資料
                sitemapData.push({
                    url: cleanUrl,
                    title: await page.title(),
                    file: filename,
                    screenshot: screenshotFilename
                });

                pagesCrawled++;
            }

            // 深度未達上限時提取新鏈接 (無論是從快取還是網路，都要解析鏈接)
            if (depth < MAX_DEPTH) {
                // 如果是從快取讀取的內容，我們需要用 cheerio 或 regex 解析
                // 為了統一，我們讓 page 載入內容 (如果是快取) 或者直接在當前 page 環境執行 js (如果是網路)
                // 但如果從快取讀取，page 當前可能停在別的頁面。
                // 為了效能，不要用 page.setContent (太慢)。
                // 直接用 Regex 提取 href 比較快。
                
                const linkRegex = /href=["']([^"']+)["']/g;
                let match;
                const links = [];
                while ((match = linkRegex.exec(content)) !== null) {
                    links.push(match[1]);
                }

                let newLinksCount = 0;
                for (const link of links) {
                    try {
                        // 處理相對路徑
                        let linkUrl;
                        if (link.startsWith('http')) {
                            linkUrl = link;
                        } else if (link.startsWith('/')) {
                            linkUrl = new URL(link, 'https://rental.turbotenant.com').href;
                        } else {
                            continue; 
                        }
                        
                        // 去除 hash
                        linkUrl = linkUrl.split('#')[0];

                        // 排除靜態資源文件
                        const ignoredExtensions = ['.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.xml', '.pdf', '.zip', '.webp', '.mp4', '.webm', '.mp3'];
                        const urlPath = new URL(linkUrl).pathname.toLowerCase();
                        if (ignoredExtensions.some(ext => urlPath.endsWith(ext))) {
                            continue;
                        }
                        
                        const linkHost = new URL(linkUrl).host;
                        
                        // 僅加入同網域且未訪問過的鏈接
                        if (linkHost === ALLOWED_HOST && !visited.has(linkUrl)) {
                            // 檢查是否已在佇列中
                            const inQueue = queue.some(item => item.url === linkUrl);
                            if (!inQueue) {
                                queue.push({ url: linkUrl, depth: depth + 1 });
                                newLinksCount++;
                            }
                        }
                    } catch (e) {
                        // 忽略無效 URL
                    }
                }
                if (newLinksCount > 0) {
                     console.log(`  發現 ${newLinksCount} 個新鏈接`);
                }
            }

        } catch (error) {
            console.error(`  爬取失敗: ${cleanUrl}`, error.message);
        }
    }

    // 生成 Sitemap 報告 (HTML)
    const sitemapHtml = `
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
        <meta charset="UTF-8">
        <title>TurboTenant 爬取報告 (Sitemap)</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
            h1 { color: #333; }
            .page-card { border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 8px; display: flex; gap: 20px; }
            .page-info { flex: 1; }
            .page-thumb { width: 300px; border: 1px solid #eee; }
            .page-thumb img { width: 100%; height: auto; display: block; }
            a { text-decoration: none; color: #007bff; }
            a:hover { text-decoration: underline; }
            .meta { color: #666; font-size: 0.9em; margin-top: 5px; }
        </style>
    </head>
    <body>
        <h1>TurboTenant 爬取報告</h1>
        <p>共爬取 ${sitemapData.length} 個頁面。點擊圖片可查看大圖，點擊標題可查看原始 HTML。</p>
        
        ${sitemapData.map(page => `
            <div class="page-card">
                <div class="page-thumb">
                    <a href="${page.screenshot}" target="_blank">
                        <img src="${page.screenshot}" alt="Screenshot">
                    </a>
                </div>
                <div class="page-info">
                    <h3><a href="${page.file}" target="_blank">${page.title || '無標題'}</a></h3>
                    <div class="meta"><strong>URL:</strong> <a href="${page.url}" target="_blank">${page.url}</a></div>
                    <div class="meta"><strong>HTML 檔案:</strong> ${page.file}</div>
                    <div class="meta"><strong>截圖檔案:</strong> ${page.screenshot}</div>
                </div>
            </div>
        `).join('')}
    </body>
    </html>
    `;
    
    fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap_report.html'), sitemapHtml);
    console.log('爬取任務完成！已生成報告: sitemap_report.html');
    console.log(`共爬取 ${pagesCrawled} 個頁面，檔案存放在 ${OUTPUT_DIR}`);

    // 不關閉瀏覽器，方便使用者繼續操作
    await browser.disconnect();
})();
