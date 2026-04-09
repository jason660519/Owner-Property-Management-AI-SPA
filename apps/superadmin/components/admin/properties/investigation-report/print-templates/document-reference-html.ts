// Print template: document reference list (for private-bucket docs that can't be embedded)
import { escapeHtml } from './print-css';
import type { PropertyDocumentItem } from '@/lib/types/properties';

const DOC_TYPE_LABELS: Record<string, string> = {
  land_registry_transcript: '土地謄本',
  building_registry_transcript: '建物謄本',
  land_title: '土地權狀',
  building_title: '建物權狀',
  floor_plan: '格局圖',
  building_measurement_survey: '建物測量成果圖',
  cadastral_map: '地籍圖',
  transaction_comparables: '成交行情表',
  transaction_comparables_nearby: '成交行情表（附近）',
  transaction_comparables_street_section: '成交行情表（同街段）',
  parking_land_registry_transcript: '車位土地謄本',
  lease_contract: '租約',
  sales_contract: '買賣合約',
};

function typeLabel(docType: string): string {
  return DOC_TYPE_LABELS[docType] || docType;
}

export function buildDocumentReferenceHtml(
  documents: PropertyDocumentItem[],
): string {
  if (documents.length === 0) {
    return `
<div class="attachment-page">
  <h3>附件文件清單</h3>
  <p style="color:#888;font-size:9px">無已選文件。</p>
</div>`;
  }

  const rows = documents
    .map(
      (d, i) => `
    <tr>
      <td class="vw" style="text-align:center">${i + 1}</td>
      <td class="vw">${escapeHtml(typeLabel(d.documentType ?? ''))}</td>
      <td class="vw">${escapeHtml(d.documentName ?? '未命名')}</td>
      <td class="vw" style="font-size:8px;color:#888">${d.createdAt ? new Date(d.createdAt).toLocaleDateString('zh-TW') : '—'}</td>
    </tr>`,
    )
    .join('');

  return `
<div class="attachment-page">
  <h3>附件文件清單</h3>
  <p style="font-size:9px;color:#555;margin-bottom:8px">
    以下文件為此物件之附件資料，實際檔案請至後台文件管理區開啟檢視或另行列印。
  </p>
  <table>
    <tr>
      <th style="width:30px">#</th>
      <th style="width:130px">文件類型</th>
      <th>文件名稱</th>
      <th style="width:80px">上傳日期</th>
    </tr>
    ${rows}
  </table>
  <p style="margin-top:12px;font-size:8px;color:#888">
    ※ 文件原始檔案存放於安全儲存區，請至系統後台取得
  </p>
</div>`;
}
