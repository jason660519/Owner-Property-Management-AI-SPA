#!/usr/bin/env node
/**
 * Convert project-process/features/*.html to Markdown (.md).
 * Usage: node scripts/html-to-md.js
 * Reads each .html, extracts semantic content, writes .md (same basename).
 */

const fs = require('fs');
const path = require('path');

const FEATURES_DIR = path.join(__dirname, '..', 'project-process', 'features');

function stripTag(html, tagName) {
  const open = new RegExp(`<${tagName}[^>]*>`, 'gi');
  const close = new RegExp(`</${tagName}>`, 'gi');
  return html.replace(open, '').replace(close, '');
}

function extractBody(html) {
  const match = html.replace(/<\s*script[\s\S]*?<\/script>/gi, '').replace(/<\s*style[\s\S]*?<\/style>/gi, '').match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1].trim() : html;
}

function htmlToMarkdown(html) {
  let md = extractBody(html);
  // Unescape &gt; etc.
  md = md.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  // Code blocks: <pre ...>...</pre> -> ```\n...\n```
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => '```\n' + code.trim().replace(/<[^>]+>/g, '') + '\n```\n');
  // Inline code: <code> -> `
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
  // Tables: <table>...</table> -> markdown table
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableHtml) => {
    const rows = [];
    tableHtml.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (_, row) => {
      const cells = [];
      row.replace(/<t(h|d)[^>]*>([\s\S]*?)<\/t\1>/gi, (_, __, cell) => cells.push(cell.replace(/<[^>]+>/g, '').trim()));
      if (cells.length) rows.push(cells);
      return '';
    });
    if (rows.length === 0) return '';
    const sep = rows[0].map(() => '---');
    const line = (arr) => '| ' + arr.join(' | ') + ' |';
    return '\n' + line(rows[0]) + '\n' + line(sep) + '\n' + rows.slice(1).map(r => line(r)).join('\n') + '\n';
  });
  // List items
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => '- ' + content.replace(/<[^>]+>/g, '').trim() + '\n');
  md = md.replace(/<\/?ul[^>]*>/gi, '\n');
  md = md.replace(/<\/?ol[^>]*>/gi, '\n');
  // Paragraphs and divs: extract text
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => '\n' + c.replace(/<[^>]+>/g, '').trim() + '\n');
  md = md.replace(/<div[^>]*class="highlight"[^>]*>([\s\S]*?)<\/div>/gi, (_, c) => '\n' + c.replace(/<[^>]+>/g, '').trim() + '\n');
  md = md.replace(/<div[^>]*class="info-card"[^>]*>[\s\S]*?<div[^>]*class="value"[^>]*>([\s\S]*?)<\/div>/gi, (_, v) => v.replace(/<[^>]+>/g, '').trim() + ' ');
  // Strong
  md = md.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**');
  // Remove remaining tags (span, div, header, main, a, svg, etc.)
  md = md.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');
  md = md.replace(/<div[^>]*>/gi, '\n');
  md = md.replace(/<\/div>/gi, '\n');
  md = md.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  md = md.replace(/<main[^>]*>/gi, '\n');
  md = md.replace(/<\/main>/gi, '\n');
  md = md.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  md = md.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  md = md.replace(/<path[^>]*>/gi, '');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  // Any remaining tag
  md = md.replace(/<[^>]+>/g, '');
  // Cleanup: multiple newlines -> 2, trim each line
  md = md.split('\n').map(l => l.trim()).join('\n').replace(/\n{3,}/g, '\n\n');
  return md.trim() + '\n';
}

const files = fs.readdirSync(FEATURES_DIR).filter(f => f.endsWith('.html') && f !== 'index.html');
let done = 0;
for (const file of files) {
  const base = file.replace(/\.html$/, '');
  const htmlPath = path.join(FEATURES_DIR, file);
  const mdPath = path.join(FEATURES_DIR, base + '.md');
  try {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const md = htmlToMarkdown(html);
    const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || base;
    const frontmatter = `# ${title.replace(/<[^>]+>/g, '').trim()}

> 由 HTML 遷移為 Markdown，以利 AI 讀取與版本控制。原始檔：\`${file}\`

---

`;
    fs.writeFileSync(mdPath, frontmatter + md, 'utf8');
    done++;
    console.log('OK', base + '.md');
  } catch (e) {
    console.error('FAIL', file, e.message);
  }
}
console.log('Converted', done, 'files.');
