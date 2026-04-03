// filepath: apps/superadmin/components/admin/properties/investigation-report/AttachmentPicker.tsx
// 物件調查報告書 — 從已上傳文件／照片勾選附加至報告
'use client';

import { FileText, ImageIcon } from 'lucide-react';
import type { InvestigationReport, ReportAttachmentSelection } from './types';
import type { PropertyDocumentItem, PropertyPhotoItem } from '@/lib/types/properties';

interface Props {
  report: InvestigationReport;
  onChange: (r: InvestigationReport) => void;
  documents: PropertyDocumentItem[];
  photos: PropertyPhotoItem[];
}

function docLabel(d: PropertyDocumentItem): string {
  const type = d.documentType?.trim();
  const name = d.documentName?.trim() || '未命名檔案';
  return type ? `[${type}] ${name}` : name;
}

function photoLabel(p: PropertyPhotoItem): string {
  const t = p.photoType?.trim() || '一般';
  return `照片 #${p.sortOrder}（${t}）`;
}

function isSelected(list: ReportAttachmentSelection[], kind: ReportAttachmentSelection['kind'], id: string) {
  return list.some((a) => a.kind === kind && a.id === id);
}

export function AttachmentPicker({ report, onChange, documents, photos }: Props) {
  const list = report.reportAttachments;

  function toggle(sel: ReportAttachmentSelection) {
    const exists = isSelected(list, sel.kind, sel.id);
    const next = exists
      ? list.filter((a) => !(a.kind === sel.kind && a.id === sel.id))
      : [...list, sel];
    onChange({ ...report, reportAttachments: next });
  }

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-bold text-text-primary mb-1">選取附件</h4>
        <p className="text-[10px] text-text-muted leading-relaxed">
          勾選要一併列入調查報告參考的文件或照片；列印時會於末頁列出名稱。謄本等文件請於後台「文件」區開啟檢視。
        </p>
      </div>

      <div>
        <h5 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
          <FileText size={14} className="text-accent shrink-0" />
          已上傳文件
        </h5>
        {documents.length === 0 ? (
          <p className="text-xs text-text-muted border border-dashed border-border-default rounded-md px-3 py-4 text-center">
            此物件尚無文件，請至「媒體與文件」上傳後再回到此處勾選。
          </p>
        ) : (
          <div className="space-y-1.5">
            {documents.map((d) => {
              const checked = isSelected(list, 'document', d.id);
              return (
                <label
                  key={d.id}
                  className={`flex items-start gap-2.5 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                    checked
                      ? 'bg-accent/5 border-accent/30'
                      : 'bg-bg-primary border-border-default hover:border-text-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      toggle({
                        kind: 'document',
                        id: d.id,
                        label: docLabel(d),
                        url: d.url,
                      })
                    }
                    className="mt-0.5 w-3.5 h-3.5 accent-accent shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-text-primary block">{docLabel(d)}</span>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-accent hover:underline mt-0.5 inline-block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      開啟檢視
                    </a>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h5 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
          <ImageIcon size={14} className="text-accent shrink-0" />
          物件照片
        </h5>
        {photos.length === 0 ? (
          <p className="text-xs text-text-muted border border-dashed border-border-default rounded-md px-3 py-4 text-center">
            此物件尚無照片。
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {photos.map((p) => {
              const checked = isSelected(list, 'photo', p.id);
              return (
                <label
                  key={p.id}
                  className={`rounded-md border overflow-hidden cursor-pointer transition-colors ${
                    checked ? 'border-accent ring-1 ring-accent' : 'border-border-default hover:border-text-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      toggle({
                        kind: 'photo',
                        id: p.id,
                        label: photoLabel(p),
                        url: p.url,
                      })
                    }
                    className="sr-only"
                  />
                  <div className="relative aspect-square bg-bg-tertiary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                    {checked && (
                      <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-accent bg-bg-primary/90 px-1.5 py-0.5 rounded">
                          已選
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="px-1.5 py-1 text-[10px] text-text-secondary truncate" title={photoLabel(p)}>
                    {photoLabel(p)}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h5 className="text-xs font-semibold text-text-secondary mb-2">附加說明</h5>
        <textarea
          value={report.reportAttachmentSupplement}
          onChange={(e) => onChange({ ...report, reportAttachmentSupplement: e.target.value })}
          placeholder="可補充其他應一併交付或說明之事項（例如：口頭約定、待補文件名稱等）…"
          rows={4}
          className="w-full border border-border-default rounded-md px-2.5 py-1.5 bg-bg-primary text-text-primary text-xs focus:outline-none focus:border-accent placeholder-text-muted resize-y"
        />
      </div>

      <p className="text-[10px] text-text-muted">
        已勾選 {list.length} 項附件
        {report.reportAttachmentSupplement.trim() ? '，並含附加說明' : ''}
      </p>
    </div>
  );
}
