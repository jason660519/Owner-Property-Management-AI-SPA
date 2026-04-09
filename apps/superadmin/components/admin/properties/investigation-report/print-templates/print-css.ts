// Shared print CSS for all investigation report print templates (A4)

export const SHARED_PRINT_CSS = `
@page { size: A4; margin: 12mm; }
body {
  font-family: "PingFang TC","Microsoft JhengHei","Noto Sans TC",sans-serif;
  font-size: 10px; color: #111; line-height: 1.5;
}
h2 { font-size: 22px; text-align: center; margin: 40px 0 12px; font-weight: bold; }
h3 { font-size: 13px; border-bottom: 1.5px solid #333; padding-bottom: 4px; margin: 18px 0 8px; font-weight: bold; }
.cover-address { font-size: 16px; font-weight: bold; text-align: center; margin: 8px 0; }
.cover-name { font-size: 20px; font-weight: bold; text-align: center; margin: 8px 0 32px; }
.cover-label { font-size: 11px; color: #555; text-align: center; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #555; padding: 2px 4px; font-size: 9.5px; vertical-align: top; }
th { background: #f0f0f0; font-weight: 600; text-align: center; }
.lbl { color: #444; font-weight: 600; white-space: nowrap; }
.vw { color: #000; }
.header-row th { font-size: 13px; padding: 4px 6px; }
.section-cell { writing-mode: vertical-rl; text-orientation: mixed; font-weight: bold;
  text-align: center; background: #e8e8e8; width: 16px; padding: 2px; font-size: 9px; }
.total-row td { font-weight: bold; background: #fafafa; }
.page-break { page-break-before: always; }
.row { display: flex; gap: 6px; padding: 1px 0; }
.row .lbl { width: 90px; flex-shrink: 0; color: #555; }
ol { margin: 4px 0 4px 16px; padding: 0; }
ol li { margin-bottom: 2px; }
.note-text { font-size: 9px; line-height: 1.6; }
.attachment-page { page-break-before: always; padding: 8px 0; }
.attachment-page h3 { font-size: 15px; border-bottom: 2px solid #333; margin-bottom: 12px; }
.info-grid { display: grid; grid-template-columns: 100px 1fr; gap: 2px 8px; }
.info-grid .lbl { font-weight: 600; color: #444; font-size: 10px; }
.info-grid .val { font-size: 10px; }
.photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.photo-grid img { width: 100%; height: auto; max-height: 130mm; object-fit: contain; border: 1px solid #ccc; }
.photo-grid .caption { font-size: 8px; color: #555; text-align: center; margin-top: 2px; }
`;

/** Escape HTML special characters */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
