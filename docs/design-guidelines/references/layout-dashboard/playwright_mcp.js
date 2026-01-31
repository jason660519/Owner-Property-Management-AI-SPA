const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 模擬 MCP Server 的簡單實作
// 接收參數: node playwright_mcp.js <command> <args_json>
// 例如: node playwright_mcp.js crawl '{"url": "...", "depth": 2}'

const OUTPUT_DIR = path.join(__dirname, 'playwright_data');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function connectToBrowser() {
    try {
        // 嘗試連接到現有的 Chrome Debugging Port
        return await chromium.connectOverCDP('http://localhost:9222');
    } catch (error) {
        console.error('無法連接到現有 Chrome，請確認是否已用 --remote-debugging-port=9222 啟動');
        process.exit(1);
    }
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                // 如果滾動到底部或滾動超過一定長度 (例如 20000px) 就停止
                if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 20000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 50); // 速度快一點
        });
    });
}

// 核心爬取邏輯
async function crawl(params) {
    const { startUrl, maxDepth = 2, maxPages = 50 } = params;
    const browser = await connectToBrowser();
    const context = browser.contexts()[0]; // 使用現有 context (含登入資訊)
    const page = await context.newPage();

    const visited = new Set();
    const queue = [{ url: startUrl, depth: 0 }];
    const results = [];
    let pageCount = 0;

    console.log(JSON.stringify({ type: 'status', msg: '開始爬取', params }));

    while (queue.length > 0 && pageCount < maxPages) {
        const current = queue.shift();
        
        if (visited.has(current.url)) continue;
        visited.add(current.url);

        try {
            console.log(JSON.stringify({ type: 'progress', url: current.url, depth: current.depth, count: pageCount + 1 }));
            
            await page.goto(current.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            // 智慧等待與滾動
            await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
            await autoScroll(page);
            await page.waitForTimeout(1000); // 確保 Lazy Load 渲染

            // 擷取資料
            const title = await page.title();
            const filename = current.url.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.html';
            const screenshotName = filename.replace('.html', '.png');
            
            // 處理內容 (Base Tag & Static Resources)
            let content = await page.content();
            if (/<head>/i.test(content)) {
                content = content.replace(/<head>/i, '<head><base href="https://rental.turbotenant.com/">');
            }
            
            fs.writeFileSync(path.join(OUTPUT_DIR, filename), content);
            await page.screenshot({ path: path.join(OUTPUT_DIR, screenshotName), fullPage: true });

            results.push({
                url: current.url,
                title,
                file: filename,
                screenshot: screenshotName,
                depth: current.depth
            });

            pageCount++;

            // 提取連結 (僅在深度允許時)
            if (current.depth < maxDepth) {
                const links = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('a[href]'))
                        .map(a => a.href)
                        .filter(href => href.startsWith('https://rental.turbotenant.com/owners')) // 限制在 owners 區域
                        .filter(href => !href.match(/\.(pdf|zip|png|jpg|js|css)$/i)); // 過濾資源
                });

                for (const link of links) {
                    // 去除 hash
                    const cleanLink = link.split('#')[0];
                    if (!visited.has(cleanLink) && !queue.some(q => q.url === cleanLink)) {
                        queue.push({ url: cleanLink, depth: current.depth + 1 });
                    }
                }
            }

        } catch (error) {
            console.error(JSON.stringify({ type: 'error', url: current.url, msg: error.message }));
        }
    }

    await page.close();
    await browser.close(); // 注意：這只會斷開連接，不會關閉您的 Chrome

    return results;
}

// 主程式入口 (模擬 MCP Request Handler)
const args = process.argv.slice(2);
const command = args[0];
const params = args[1] ? JSON.parse(args[1]) : {};

if (command === 'crawl') {
    crawl(params).then(results => {
        // 輸出最終結果 JSON
        console.log('MCP_RESULT_START');
        console.log(JSON.stringify(results, null, 2));
        console.log('MCP_RESULT_END');
    });
} else {
    console.log('Usage: node playwright_mcp.js crawl \'{"url": "...", ...}\'');
}
