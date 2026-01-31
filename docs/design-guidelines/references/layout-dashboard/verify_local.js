const puppeteer = require('puppeteer');

(async () => {
    console.log('Launching browser to verify local replica...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Capture console logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    // Capture network failed requests
    page.on('requestfailed', request => {
        console.log(`FAILED: ${request.url()} - ${request.failure().errorText}`);
    });
    
    page.on('response', response => {
        if (response.status() >= 400) {
            console.log(`ERROR ${response.status()}: ${response.url()}`);
        } else if (response.url().includes('tt-icons')) {
            console.log(`SUCCESS: ${response.url()} (${response.status()}) type: ${response.headers()['content-type']}`);
        }
    });

    try {
        console.log('Navigating to http://localhost:8091/owners/dashboard/index.html');
        await page.goto('http://localhost:8091/owners/dashboard/index.html', { waitUntil: 'networkidle0' });
        console.log('Page loaded.');
        
        // Check if font is loaded (basic check)
        const fontLoaded = await page.evaluate(() => {
            return document.fonts.check('16px tt-icons');
        });
        console.log(`Font 'tt-icons' check: ${fontLoaded}`);

    } catch (e) {
        console.error('Error during navigation:', e);
    } finally {
        await browser.close();
    }
})();
