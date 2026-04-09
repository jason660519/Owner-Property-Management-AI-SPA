// Print template: property introduction / description
import { escapeHtml } from './print-css';
import type { PropertyItem } from '@/lib/types/properties';

export function buildPropertyIntroHtml(property?: PropertyItem): string {
  const desc = property?.description?.trim();
  if (!desc) {
    return `
<div class="attachment-page">
  <h3>物件介紹</h3>
  <p style="color:#888">尚未填寫物件介紹。</p>
</div>`;
  }

  // Convert line breaks to paragraphs
  const paragraphs = desc
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:6px 0;font-size:10px;line-height:1.8">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');

  return `
<div class="attachment-page">
  <h3>物件介紹</h3>
  <div style="padding:4px 0">
    ${paragraphs}
  </div>
</div>`;
}
