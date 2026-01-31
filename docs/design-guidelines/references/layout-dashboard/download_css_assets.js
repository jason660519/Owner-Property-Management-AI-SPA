const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const LOCAL_REPLICA_DIR = path.resolve(__dirname, 'local_replica');
const ASSETS_DIR = path.join(LOCAL_REPLICA_DIR, 'assets');
const BASE_URL = 'https://rental.turbotenant.com';

async function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                fs.unlink(destPath, () => {}); // Delete partial file
                reject(new Error(`Failed to download ${url}: Status Code ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => resolve());
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });
    });
}

async function processCssFile(filePath) {
    console.log(`Processing CSS file: ${filePath}`);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const urlRegex = /url\(['"]?([^'"\)]+)['"]?\)/g;
        let match;
        const downloads = [];

        while ((match = urlRegex.exec(content)) !== null) {
            let assetUrl = match[1];
            
            // Ignore data URLs
            if (assetUrl.startsWith('data:')) continue;

            // Remove query strings and hashes for the filename
            const urlObj = new URL(assetUrl, BASE_URL);
            const cleanPath = urlObj.pathname;
            const fileName = path.basename(cleanPath);
            
            // We assume all assets go to /assets/ folder based on the CSS structure we saw
            // If the URL is absolute path like /assets/foo.ttf, we map it to ASSETS_DIR/foo.ttf
            // If it's relative, we need to be careful, but here we saw /assets/...
            
            if (cleanPath.startsWith('/assets/')) {
                 const destFile = path.join(ASSETS_DIR, fileName);
                 
                 if (!fs.existsSync(destFile)) {
                     const fullDownloadUrl = BASE_URL + cleanPath + urlObj.search; // Keep query params for download if needed, usually not but sometimes serves different versions. Actually, usually better to strip for static files, but CDN might need them. Let's try to download with them if simple path fails? No, standard static assets usually work without. But let's keep the exact string found in CSS but resolved to absolute.
                     
                     // Wait, the CSS had /assets/tt-icons-GbDCRTsU.ttf?7ll4f8
                     // The server likely ignores the query param for static file serving, but maybe not.
                     // Let's construct the full URL exactly as it appears.
                     const fullUrl = new URL(assetUrl, BASE_URL).href;
                     
                     console.log(`Found missing asset: ${fileName} (from ${assetUrl})`);
                     downloads.push(downloadFile(fullUrl, destFile)
                        .then(() => console.log(`Downloaded: ${fileName}`))
                        .catch(err => console.error(`Failed to download ${fileName}: ${err.message}`))
                     );
                 }
            }
        }
        
        await Promise.all(downloads);
        
    } catch (e) {
        console.error(`Error processing ${filePath}:`, e);
    }
}

async function main() {
    if (!fs.existsSync(ASSETS_DIR)) {
        console.error('Assets directory not found!');
        return;
    }

    const files = fs.readdirSync(ASSETS_DIR);
    for (const file of files) {
        if (file.endsWith('.css')) {
            await processCssFile(path.join(ASSETS_DIR, file));
        }
    }
    console.log('Done processing assets.');
}

main();
