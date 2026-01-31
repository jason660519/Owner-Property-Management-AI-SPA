const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const url = require('url');
const axios = require('axios');

// Configuration
const REMOTE_DEBUGGING_URL = 'http://127.0.0.1:9222';
const OUTPUT_DIR = path.join(__dirname, 'local_replica');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function downloadFile(fileUrl, localPath) {
    try {
        const response = await axios({
            method: 'GET',
            url: fileUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const dir = path.dirname(localPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const writer = fs.createWriteStream(localPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`Failed to download ${fileUrl}: ${error.message}`);
    }
}

async function run() {
    let browser;
    try {
        // Connect to existing Chrome
        browser = await chromium.connectOverCDP(REMOTE_DEBUGGING_URL);
        const contexts = browser.contexts();
        if (contexts.length === 0) {
            console.error('No browser context found.');
            return;
        }
        const context = contexts[0];
        const pages = context.pages();
        if (pages.length === 0) {
            console.error('No pages found. Please open the target page in Chrome.');
            return;
        }

        // Use the first page (assuming it's the active one or the one user wants)
        // Or find the one matching turbotenant
        let page = pages.find(p => p.url().includes('turbotenant.com'));
        if (!page) {
            console.log('TurboTenant tab not found, using the first available tab...');
            page = pages[0];
        }

        console.log(`Targeting page: ${page.url()}`);
        
        // Wait for load just in case
        await page.waitForLoadState('networkidle');

        // Get all resource URLs from the page
        const resources = await page.evaluate(() => {
            const getUrl = (el, attr) => el[attr]; // Get full URL
            
            const assets = [];
            
            // Scripts
            document.querySelectorAll('script[src]').forEach(el => {
                assets.push({ type: 'script', url: el.src, original: el.getAttribute('src') });
            });
            
            // Styles
            document.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
                assets.push({ type: 'style', url: el.href, original: el.getAttribute('href') });
            });
            
            // Images
            document.querySelectorAll('img[src]').forEach(el => {
                assets.push({ type: 'image', url: el.src, original: el.getAttribute('src') });
            });

            return assets;
        });

        console.log(`Found ${resources.length} resources.`);

        // Process resources
        const downloadedResources = new Set();

        for (const resource of resources) {
            if (!resource.url || resource.url.startsWith('data:')) continue;

            try {
                const parsedUrl = new url.URL(resource.url);
                // We only download assets from the same domain or common CDNs if needed.
                // For a "clone", we usually want everything that is needed for the look.
                
                // Construct a local path based on the URL path
                // e.g., /_next/static/css/main.css -> local_replica/_next/static/css/main.css
                let safePath = parsedUrl.pathname;
                if (safePath.endsWith('/')) safePath += 'index.html';
                
                // Remove leading slash for join
                if (safePath.startsWith('/')) safePath = safePath.substring(1);
                
                const localFilePath = path.join(OUTPUT_DIR, safePath);
                
                // Avoid duplicates
                if (downloadedResources.has(localFilePath)) continue;
                downloadedResources.add(localFilePath);

                console.log(`Downloading ${resource.url} -> ${safePath}`);
                await downloadFile(resource.url, localFilePath);

            } catch (e) {
                console.error(`Error processing URL ${resource.url}: ${e.message}`);
            }
        }

        // Now, we need to save the HTML and Rewrite links
        // We will fetch the content using evaluate to get the DOM *after* JS execution
        let htmlContent = await page.content();

        // Simple Rewrite Strategy:
        // We can't easily parse and rewrite every single dynamic URL in the raw string safely.
        // But we can use Cheerio or JSDOM if we want to be precise.
        // For now, let's try to replace the Base URL if it exists, or inject a base tag?
        // NO, the user wants a local project. A <base href="."> might help if structure is preserved.
        
        // However, if we saved `_next/static/css/main.css` and the HTML says `src="/_next/..."`,
        // then serving `local_replica` as root will work perfectly.
        
        // We just need to make sure we remove absolute URLs pointing to the live site.
        // e.g. replace "https://rental.turbotenant.com/" with "/" or ""
        
        const origin = new url.URL(page.url()).origin;
        const escapedOrigin = origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape for regex
        const originRegex = new RegExp(escapedOrigin, 'g');
        
        // Replace absolute origin with empty string to make them root-relative
        htmlContent = htmlContent.replace(originRegex, '');

        // Save index.html
        fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), htmlContent);
        console.log('Saved index.html');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (browser) await browser.close();
    }
}

run();
