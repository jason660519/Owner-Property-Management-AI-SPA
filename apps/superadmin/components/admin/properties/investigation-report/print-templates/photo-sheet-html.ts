// Print template: property photo contact sheet (2-column grid, 6 photos/page)
import { escapeHtml } from './print-css';
import type { PropertyPhotoItem } from '@/lib/types/properties';

const PHOTOS_PER_PAGE = 6;
const MAX_PHOTOS = 30;

function photoLabel(p: PropertyPhotoItem): string {
  const t = p.photoType?.trim() || '一般';
  return `#${p.sortOrder}（${t}）`;
}

export function buildPhotoSheetHtml(photos: PropertyPhotoItem[]): string {
  if (photos.length === 0) {
    return `
<div class="attachment-page">
  <h3>物件照片</h3>
  <p style="color:#888;font-size:9px">尚無物件照片。</p>
</div>`;
  }

  const limited = photos.slice(0, MAX_PHOTOS);
  const pages: string[] = [];

  for (let i = 0; i < limited.length; i += PHOTOS_PER_PAGE) {
    const chunk = limited.slice(i, i + PHOTOS_PER_PAGE);
    const isFirst = i === 0;
    const pageNum = Math.floor(i / PHOTOS_PER_PAGE) + 1;
    const totalPages = Math.ceil(limited.length / PHOTOS_PER_PAGE);

    const grid = chunk
      .map(
        (p) => `
      <div>
        <img src="${escapeHtml(p.url)}" alt="${escapeHtml(photoLabel(p))}" />
        <div class="caption">${escapeHtml(photoLabel(p))}</div>
      </div>`,
      )
      .join('');

    pages.push(`
<div class="${isFirst ? 'attachment-page' : 'page-break'}">
  <h3>物件照片${totalPages > 1 ? `（${pageNum}/${totalPages}）` : ''}　共 ${limited.length} 張</h3>
  <div class="photo-grid">
    ${grid}
  </div>
</div>`);
  }

  if (photos.length > MAX_PHOTOS) {
    pages.push(`
<p style="font-size:8px;color:#888;margin-top:4px">
  ※ 僅顯示前 ${MAX_PHOTOS} 張照片，共 ${photos.length} 張
</p>`);
  }

  return pages.join('');
}
