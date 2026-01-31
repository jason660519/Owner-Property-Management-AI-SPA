const fs = require('fs');
const path = require('path');

const rootDir = '/Volumes/KLEVV-4T-1/Owner Property Management AI/Turbotenant/local_replica';

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file.startsWith('._')) continue;
        const filePath = path.join(dir, file);
        try {
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                walk(filePath);
            } else if (file.endsWith('.html')) {
                let content = fs.readFileSync(filePath, 'utf8');
                let modified = false;

                // Remove old injection at the end
                if (content.includes('<script src="/assets/auto_login.js"></script></body>')) {
                    content = content.replace('<script src="/assets/auto_login.js"></script></body>', '</body>');
                    modified = true;
                }
                if (content.includes('<script src="/assets/auto_login.js"></script>')) {
                    content = content.replace('<script src="/assets/auto_login.js"></script>', '');
                    modified = true;
                }

                // Inject at the top of head
                if (content.includes('<head>')) {
                    content = content.replace('<head>', '<head><script src="/assets/auto_login.js"></script>');
                    modified = true;
                } else if (content.includes('<html>')) {
                    content = content.replace('<html>', '<html><head><script src="/assets/auto_login.js"></script></head>');
                    modified = true;
                }

                if (modified) {
                    fs.writeFileSync(filePath, content);
                    console.log(`Reinjected into ${filePath}`);
                }
            }
        } catch (e) {
            console.error(`Error processing ${filePath}: ${e.message}`);
        }
    }
}

walk(rootDir);
