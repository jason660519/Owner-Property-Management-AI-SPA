
const fs = require('fs');
const path = '/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/project-process/project-progress-dashboard/roadmap.js';
const content = fs.readFileSync(path, 'utf8');

// Extract the array content
const match = content.match(/features:\s*\[([\s\S]*?)\]\s*};/);
if (match) {
    const featuresDetails = match[1];
    // This is a bit hacky to parse JS object literal with comments, but let's try to just eval it if possible or regex it.
    // simpler: regex for name: "..."
    const regex = /name:\s*"([^"]+)"/g;
    let m;
    let index = 1;
    while ((m = regex.exec(featuresDetails)) !== null) {
        console.log(`${index.toString().padStart(3, '0')}: ${m[1]}`);
        index++;
    }
}
