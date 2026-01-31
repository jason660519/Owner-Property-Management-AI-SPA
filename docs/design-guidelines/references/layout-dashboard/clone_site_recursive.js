const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const url = require('url');
const axios = require('axios');

// Configuration
const REMOTE_DEBUGGING_URL = 'http://127.0.0.1:9222';
const OUTPUT_DIR = path.join(__dirname, 'local_replica');
const BASE_URL = 'https://rental.turbotenant.com';
const MAX_DEPTH = 3; 
const MAX_PAGES = 100;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// State
const visitedUrls = new Set();
const processedAssets = new Set();
let pageCount = 0;

// Helper to sanitize filename and determine local path
function getLocalPath(resourceUrl) {
    try {
        // Handle data URLs
        if (resourceUrl.startsWith('data:')) return null;

        const parsedUrl = new url.URL(resourceUrl);
        
        // Only save resources from our domain or specific CDNs (like Amazon S3 for user content)
        // But for a true clone, we might want to proxy everything? 
        // For now, let's focus on same-origin + critical assets
        
        let safePath = parsedUrl.pathname;
        
        // Logic to handle clean URLs vs assets
        // If it looks like a page route (no extension), append index.html
        if (!path.extname(safePath) || safePath.endsWith('/')) {
             if (safePath.endsWith('/')) safePath += 'index.html';
             else safePath += '/index.html';
        }
        
        if (safePath.startsWith('/')) safePath = safePath.substring(1);
        
        // Decode URI components (handle spaces etc)
        safePath = decodeURIComponent(safePath);
        
        return path.join(OUTPUT_DIR, safePath);
    } catch (e) {
        return null;
    }
}

async function saveResponse(response) {
    const url = response.url();
    if (processedAssets.has(url)) return;
    processedAssets.add(url);

    // Filter out irrelevant requests
    if (url.startsWith('data:') || url.includes('google-analytics') || url.includes('facebook') || url.includes('doubleclick')) return;

    const status = response.status();
    if (status >= 300 && status < 400) return; // Skip redirects
    if (status >= 400) return; // Skip errors

    const localPath = getLocalPath(url);
    if (!localPath) return;

    try {
        let buffer = await response.body();
        
        // Inject auto_login.js into HTML files
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('text/html')) {
             let html = buffer.toString();
             if (html.includes('</body>')) {
                 html = html.replace('</body>', '<script src="/assets/auto_login.js"></script></body>');
             } else {
                 html += '<script src="/assets/auto_login.js"></script>';
             }
             buffer = Buffer.from(html);
        }

        const dir = path.dirname(localPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(localPath, buffer);
        console.log(`Saved resource: ${path.basename(localPath)}`);
    } catch (e) {
        console.error(`Failed to save ${url}: ${e.message}`);
    }
}

async function processPage(page, targetUrl, depth) {
    if (visitedUrls.has(targetUrl) || depth > MAX_DEPTH || pageCount >= MAX_PAGES) return;
    visitedUrls.add(targetUrl);
    pageCount++;

    console.log(`[${pageCount}/${MAX_PAGES}] Depth ${depth}: Visiting ${targetUrl}`);

    try {
        // Navigate
        try {
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (navError) {
            console.log(`Navigation timeout/error for ${targetUrl}, attempting to proceed...`);
        }
        
        // Auto-scroll to trigger lazy loading
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 50);
            });
        });
        await page.waitForTimeout(5000); // Wait longer for network requests

        // Save the final HTML of the page (after JS execution)
        let content = await page.content();
        
        // Rewrite Links
        // We want all links to start with / so they work with our local server root
        // But we need to be careful not to break external links
        // Simple regex replace for BASE_URL -> "" (which implies /)
        
        const escapedBase = BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const baseRegex = new RegExp(escapedBase, 'g');
        content = content.replace(baseRegex, ''); 
        
        // Also remove <base> tag if present, or update it
        content = content.replace(/<base[^>]*>/i, ''); 

        const localHtmlPath = getLocalPath(targetUrl);
        if (localHtmlPath) {
            const dir = path.dirname(localHtmlPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(localHtmlPath, content);
            console.log(`Saved HTML Page: ${localHtmlPath}`);
        }

        // Extract Links for next depth
        if (depth < MAX_DEPTH) {
            const links = await page.evaluate((baseUrl) => {
                return Array.from(document.querySelectorAll('a[href]'))
                    .map(a => a.href)
                    .filter(href => href.startsWith(baseUrl) && !href.includes('#') && !href.includes('logout'));
            }, BASE_URL);
            
            const uniqueLinks = [...new Set(links)];
            for (const link of uniqueLinks) {
                await processPage(page, link, depth + 1);
            }
        }

    } catch (e) {
        console.error(`Error processing ${targetUrl}: ${e.message}`);
    }
}

async function run() {
    let browser;
    try {
        browser = await chromium.connectOverCDP(REMOTE_DEBUGGING_URL);
        const context = browser.contexts()[0];
        const pages = context.pages();
        let page = pages.find(p => p.url().includes('turbotenant.com'));
        
        if (page) {
            console.log(`Using existing tab: ${page.url()}`);
        } else {
            console.log('No existing TurboTenant tab found, creating new one...');
            page = await context.newPage();
        }

        // Setup Network Interception to save ALL assets
        page.on('response', saveResponse);

        // Start from Dashboard
        await processPage(page, 'https://rental.turbotenant.com/owners/dashboard', 1);

        console.log('Recursive clone completed.');

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        if (browser) await browser.disconnect();
    }
}

run();
