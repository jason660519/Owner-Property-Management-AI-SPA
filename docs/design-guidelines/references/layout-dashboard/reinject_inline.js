const fs = require('fs');
const path = require('path');

const rootDir = '/Volumes/KLEVV-4T-1/Owner Property Management AI/Turbotenant/local_replica';
const autoLoginPath = path.join(rootDir, 'assets/auto_login.js');
const autoLoginCode = fs.readFileSync(autoLoginPath, 'utf8');

// Minify slightly to save space (remove comments mostly)
const minifiedCode = autoLoginCode
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*/g, '') // Remove line comments
    .replace(/\s+/g, ' '); // Collapse whitespace

const inlineScript = `<script id="auto-login-v5">${minifiedCode}</script>`;

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

                // 1. Remove old src injection
                if (content.includes('<script src="/assets/auto_login.js"></script>')) {
                    content = content.replace('<script src="/assets/auto_login.js"></script>', '');
                    modified = true;
                }
                
                // 2. Remove old inline injection (if any, by ID or content pattern)
                if (content.includes('id="auto-login-v5"')) {
                     // Regex to remove the whole script block
                     content = content.replace(/<script id="auto-login-v5">.*?<\/script>/, '');
                     modified = true;
                }

                // 3. Inject new inline script at the VERY TOP of head
                if (content.includes('<head>')) {
                    content = content.replace('<head>', `<head>${inlineScript}`);
                    modified = true;
                } else if (content.includes('<html>')) {
                    content = content.replace('<html>', `<html><head>${inlineScript}</head>`);
                    modified = true;
                }

                if (modified) {
                    fs.writeFileSync(filePath, content);
                    console.log(`Updated ${filePath}`);
                }
            }
        } catch (e) {
            console.error(`Error processing ${filePath}: ${e.message}`);
        }
    }
}

console.log("Starting inline injection of Auto-Login V5...");
walk(rootDir);
console.log("Done.");
