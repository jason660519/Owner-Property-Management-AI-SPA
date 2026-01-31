const fs = require('fs');
const path = require('path');

const scriptTag = '<script src="/assets/auto_login.js"></script>';
const rootDir = path.join(__dirname, 'local_replica');

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
                if (!content.includes('auto_login.js')) {
                    if (content.includes('</body>')) {
                        content = content.replace('</body>', scriptTag + '</body>');
                    } else {
                        content += scriptTag;
                    }
                    fs.writeFileSync(filePath, content);
                    console.log(`Injected into ${filePath}`);
                }
            }
        } catch (e) {
            console.error(`Error processing ${filePath}: ${e.message}`);
        }
    }
}

walk(rootDir);
