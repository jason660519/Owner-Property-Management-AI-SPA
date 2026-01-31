const fs = require('fs');
const path = require('path');

// 設定
const SOURCE_DIR = path.join(__dirname, 'crawled_data');
const TARGET_DIR = path.join(__dirname, 'local_project');
const SITEMAP_FILE = path.join(SOURCE_DIR, 'sitemap_report.html');
const BASE_URL = 'https://rental.turbotenant.com';

// 確保目標目錄存在
if (fs.existsSync(TARGET_DIR)) {
    fs.rmSync(TARGET_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TARGET_DIR, { recursive: true });

// 讀取 Sitemap 報告以建立映射關係
const sitemapContent = fs.readFileSync(SITEMAP_FILE, 'utf8');

// 提取 URL 和 檔案名稱的對應關係
// Regex 匹配: <div class="meta"><strong>URL:</strong> <a href="(...)" ...>...</a></div>...<div class="meta"><strong>HTML 檔案:</strong> (...)</div>
// 簡化 Regex 逐行處理比較穩
const mappings = [];
const lines = sitemapContent.split('\n');
let currentUrl = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('<strong>URL:</strong>')) {
        const match = line.match(/href="([^"]+)"/);
        if (match) currentUrl = match[1];
    } else if (line.includes('<strong>HTML 檔案:</strong>') && currentUrl) {
        const match = line.match(/HTML 檔案:<\/strong>\s*(.+?)<\/div>/);
        if (match) {
            mappings.push({
                url: currentUrl,
                file: match[1].trim()
            });
            currentUrl = null; // Reset
        }
    }
}

console.log(`找到 ${mappings.length} 個頁面映射。`);

// 建立 URL 到 本地路徑 的映射表
// 用於後續替換連結
const urlToLocalPath = {};

mappings.forEach(map => {
    try {
        const urlObj = new URL(map.url);
        let pathname = urlObj.pathname;
        
        // 如果是根目錄或空，設為 index.html
        if (pathname === '/' || pathname === '') {
            pathname = '/index.html';
        } else if (!path.extname(pathname)) {
            // 如果沒有副檔名，當作目錄並加入 index.html
            pathname = pathname + '/index.html';
        }
        
        // 移除開頭的 slash 以便用於 path.join
        const relativePath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
        
        map.localPath = relativePath;
        urlToLocalPath[map.url] = '/' + relativePath; // 儲存絕對路徑 (用於取代)
    } catch (e) {
        console.error(`解析 URL 失敗: ${map.url}`, e);
    }
});

// 開始處理檔案
mappings.forEach(map => {
    const srcFile = path.join(SOURCE_DIR, map.file);
    if (!fs.existsSync(srcFile)) {
        console.warn(`檔案未找到: ${srcFile}`);
        return;
    }

    const destFile = path.join(TARGET_DIR, map.localPath);
    const destDir = path.dirname(destFile);

    // 建立目錄結構
    fs.mkdirSync(destDir, { recursive: true });

    let content = fs.readFileSync(srcFile, 'utf8');

    // 1. 移除 Base Tag (因為我們要自己處理路徑)
    content = content.replace(/<base href="[^"]+">/i, '');

    // 2. 修復靜態資源路徑 (JS, CSS, Images)
    // 將相對路徑轉換為絕對的遠端路徑
    // 匹配 src="...", href="..." (排除 a href)
    // 這裡用簡單的 regex 替換
    
    // 替換 src="/..." 為 src="BASE_URL/..."
    content = content.replace(/\ssrc="\/([^"]*)"/g, (match, p1) => {
        return ` src="${BASE_URL}/${p1}"`;
    });
    
    // 替換 href="/..." (用於 link css, 但要小心不要換掉 a href，雖然 a href 也是 href)
    // 我們先換掉 <link href="...">
    content = content.replace(/<link\s+([^>]*?)href="\/([^"]*)"/gi, (match, p1, p2) => {
        return `<link ${p1}href="${BASE_URL}/${p2}"`;
    });

    // 3. 修復導航連結 (a href)
    // 將原本指向 rental.turbotenant.com 的連結，替換為本地路徑
    // 為了支援本地文件系統瀏覽 (file://)，我們必須計算「相對路徑」
    
    // 目前檔案所在的目錄深度
    const currentDepth = map.localPath.split('/').length - 1; 
    
    Object.keys(urlToLocalPath).forEach(targetUrl => {
        const targetLocalAbsPath = urlToLocalPath[targetUrl]; // e.g. /owners/dashboard/index.html
        
        // 計算相對路徑
        // 從 /owners/properties/index.html 到 /owners/dashboard/index.html
        // 需要 ../dashboard/index.html
        
        let relativePath = path.relative(path.dirname('/' + map.localPath), targetLocalAbsPath);
        
        // path.relative 可能不會加上 ./
        if (!relativePath.startsWith('.')) {
            relativePath = './' + relativePath;
        }

        // 進行全域替換
        // 小心：有些 URL 可能包含 query string，這裡只處理純 URL
        // 簡單起見，我們直接 replace 完整的絕對 URL
        const regex = new RegExp(`href="${targetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
        content = content.replace(regex, `href="${relativePath}"`);
        
        // 也要處理相對路徑的 href (如果原始 HTML 裡是寫相對路徑)
        // 這比較困難，因為原始 HTML 的相對路徑是基於 base url
        // 但我們之前已經把 base url 拿掉了。
        // 如果原始 HTML 裡有 <a href="/owners/dashboard">，我們也要換掉
        // 因為我們已經把資源的 href="/..." 換成了遠端，這裡要避免換錯
        // 所以我們針對 <a href="/..."> 做處理
    });

    // 針對站內絕對路徑的導航連結 <a href="/owners/..."> 進行處理
    content = content.replace(/<a\s+([^>]*?)href="\/([^"]*)"/gi, (match, p1, p2) => {
        // p2 是路徑，例如 owners/dashboard
        const fullUrl = `${BASE_URL}/${p2}`;
        // 檢查這個 fullUrl 是否在我們的映射表中
        // 這裡需要模糊比對，因為 p2 可能帶有 query params
        
        // 簡單做法：如果 p2 指向我們已知的路徑，就轉為本地相對路徑
        // 否則，轉為完整的遠端 URL (保持外連)
        
        // 先嘗試找完全匹配
        const targetPath = urlToLocalPath[fullUrl];
        if (targetPath) {
             let relativePath = path.relative(path.dirname('/' + map.localPath), targetPath);
             if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
             return `<a ${p1}href="${relativePath}"`;
        }
        
        // 如果找不到，就變成絕對遠端路徑，確保不破圖
        return `<a ${p1}href="${BASE_URL}/${p2}"`;
    });

    fs.writeFileSync(destFile, content);
    console.log(`已重建: ${map.localPath}`);
});

console.log('專案重建完成！位於 local_project 目錄');
