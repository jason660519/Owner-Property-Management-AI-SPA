'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, FolderOpen } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ColumnPreview {
  index: number;
  name: string;
  sample_values: (string | number | null)[];
}

interface PreviewResponse {
  columns: ColumnPreview[];
  row_count: number;
  preview_rows: Record<string, string | number | null>[];
}

type ImportStatus = 'idle' | 'uploading' | 'preview' | 'mapping' | 'submitting' | 'done' | 'error';

const SUPPORTED_FILE_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.pdf'] as const;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const WARN_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_BATCH = 100;
const MAX_TOTAL_SIZE_BYTES = 300 * 1024 * 1024;

const PEOPLE_FIELDS = [
  { key: 'full_name', label: '姓名', required: true },
  { key: 'id_number', label: '身分證字號', required: false },
  { key: 'phone', label: '電話', required: false },
  { key: 'mobile', label: '手機', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'birth_date', label: '出生日期', required: false },
  { key: 'address', label: '地址', required: false },
  { key: 'company', label: '公司', required: false },
  { key: 'note', label: '備註', required: false },
];
type PeopleFieldKey = (typeof PEOPLE_FIELDS)[number]['key'];
type MappingConfidenceLevel = 'high' | 'medium' | 'low' | 'manual';

interface MappingConfidence {
  level: MappingConfidenceLevel;
  score: number;
  source: 'auto' | 'manual';
}

interface AutoMappingResult {
  mapping: Record<string, string>;
  confidence: Partial<Record<PeopleFieldKey, MappingConfidence>>;
}

const FIELD_NAME_HINTS: Record<PeopleFieldKey, string[]> = {
  full_name: ['姓名', '名稱', 'fullname', 'full_name'],
  id_number: ['身分證', '身份證', '證號', 'idnumber', 'id_number', '身分證字號'],
  phone: ['電話', 'tel', 'phone', '市話', '聯絡電話'],
  mobile: ['手機', 'mobile', 'cell', '行動電話', '手機號碼'],
  email: ['email', 'e-mail', 'mail', '電子郵件'],
  birth_date: ['生日', '出生', 'birth', 'birthday', 'birthdate', 'birth_date', '出生日期'],
  address: ['地址', 'addr', 'address', '住址', '聯絡地址'],
  company: ['公司', '企業', 'organization', 'organisation', 'org', 'company', '單位'],
  note: ['備註', '註記', '描述', 'remark', 'note', 'memo'],
};

const normalizeForMatch = (text: string) =>
  text
    .toLowerCase()
    .replace(/[\s_\-()（）[\]【】:：]/g, '')
    .trim();

const valueToText = (value: string | number | null) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const sanitizePhoneValue = (text: string) => text.replace(/[^\d+]/g, '');

const isLikelyTwIdNumber = (text: string) => /^[a-z][12]\d{8}$/i.test(text.replace(/\s+/g, ''));

const isLikelyPhone = (text: string) => /^0\d{1,2}\d{6,8}$/.test(sanitizePhoneValue(text));

const isLikelyMobile = (text: string) => /^(?:\+?886)?9\d{8}$/.test(sanitizePhoneValue(text).replace(/^0/, ''));

const isLikelyEmail = (text: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.toLowerCase());

const isLikelyBirthDate = (text: string) =>
  /\d{4}[\/\-\.年]\d{1,2}[\/\-\.月]\d{1,2}(?:日)?/.test(text) ||
  /\d{2,3}[\/\-\.年]\d{1,2}[\/\-\.月]\d{1,2}(?:日)?/.test(text);

const isLikelyAddress = (text: string) => /(?:市|縣|區|鄉|鎮|里|路|街|段|巷|弄|號)/.test(text) && text.length >= 6;

const isLikelyCompany = (text: string) =>
  /(?:公司|有限公司|股份|企業|集團|工業|商行|事務所|CORP|INC|LLC|CO\.?)/i.test(text);

const isLikelyFullName = (text: string) =>
  /^[\u4e00-\u9fff]{2,8}$/.test(text.replace(/[^\u4e00-\u9fff]/g, '')) ||
  /^[a-z]{2,}(?:[-'][a-z]{2,})*(?:\s+[a-z]{2,}(?:[-'][a-z]{2,})*)*$/i.test(text.trim());

const VALUE_MATCHERS: Partial<Record<PeopleFieldKey, (text: string) => boolean>> = {
  full_name: isLikelyFullName,
  id_number: isLikelyTwIdNumber,
  phone: isLikelyPhone,
  mobile: isLikelyMobile,
  email: isLikelyEmail,
  birth_date: isLikelyBirthDate,
  address: isLikelyAddress,
  company: isLikelyCompany,
};

const getConfidenceLevel = (score: number): MappingConfidenceLevel => {
  if (score >= 12) return 'high';
  if (score >= 7) return 'medium';
  return 'low';
};

const getConfidenceMeta = (confidence?: MappingConfidence) => {
  if (!confidence) return null;
  if (confidence.source === 'manual') {
    return { label: '手動', className: 'border-border-default bg-bg-secondary text-text-secondary' };
  }
  if (confidence.level === 'high') {
    return { label: '高信心', className: 'border-border-default bg-bg-secondary text-accent' };
  }
  if (confidence.level === 'medium') {
    return { label: '中信心', className: 'border-border-default bg-bg-secondary text-text-primary' };
  }
  return { label: '低信心', className: 'border-border-default bg-bg-secondary text-text-secondary' };
};

const buildAutoMapping = (columns: ColumnPreview[]): AutoMappingResult => {
  const scoredCandidates: Array<{ fieldKey: PeopleFieldKey; columnIndex: number; score: number }> = [];

  PEOPLE_FIELDS.forEach((field) => {
    columns.forEach((column) => {
      let score = 0;
      const normalizedColumnName = normalizeForMatch(column.name);
      const hints = FIELD_NAME_HINTS[field.key];

      for (const hint of hints) {
        const normalizedHint = normalizeForMatch(hint);
        if (normalizedHint && normalizedColumnName.includes(normalizedHint)) {
          score += 6;
        }
      }

      const matcher = VALUE_MATCHERS[field.key];
      if (matcher) {
        const sampleValues = column.sample_values
          .map(valueToText)
          .filter((text) => text.length > 0)
          .slice(0, 8);

        if (sampleValues.length > 0) {
          const matchedCount = sampleValues.filter((text) => matcher(text)).length;
          const ratio = matchedCount / sampleValues.length;
          score += ratio * 10;
        }
      }

      if (field.key === 'phone' && /(?:手機|mobile|cell)/i.test(column.name)) {
        score -= 3;
      }
      if (field.key === 'mobile' && /(?:電話|tel|phone|市話)/i.test(column.name)) {
        score -= 2;
      }

      if (score > 0) {
        scoredCandidates.push({
          fieldKey: field.key,
          columnIndex: column.index,
          score,
        });
      }
    });
  });

  scoredCandidates.sort((a, b) => b.score - a.score);

  const usedColumns = new Set<number>();
  const usedFields = new Set<PeopleFieldKey>();
  const nextMapping: Record<string, string> = {};
  const confidenceMap: Partial<Record<PeopleFieldKey, MappingConfidence>> = {};

  for (const candidate of scoredCandidates) {
    if (usedColumns.has(candidate.columnIndex) || usedFields.has(candidate.fieldKey)) {
      continue;
    }

    const minScore = candidate.fieldKey === 'full_name' ? 2 : 4;
    if (candidate.score < minScore) continue;

    nextMapping[candidate.fieldKey] = String(candidate.columnIndex);
    confidenceMap[candidate.fieldKey] = {
      level: getConfidenceLevel(candidate.score),
      score: candidate.score,
      source: 'auto',
    };
    usedColumns.add(candidate.columnIndex);
    usedFields.add(candidate.fieldKey);
  }

  // Keep full_name mapped whenever possible so user can submit immediately.
  if (!nextMapping.full_name && columns.length > 0) {
    const bestNameCandidate = columns
      .filter((column) => !usedColumns.has(column.index))
      .map((column) => ({
        column,
        score:
          (FIELD_NAME_HINTS.full_name.some((hint) =>
            normalizeForMatch(column.name).includes(normalizeForMatch(hint))
          )
            ? 8
            : 0) +
          (column.sample_values
            .map(valueToText)
            .slice(0, 8)
            .filter((text) => text && isLikelyFullName(text)).length > 0
            ? 5
            : 0),
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (bestNameCandidate && bestNameCandidate.score >= 5) {
      nextMapping.full_name = String(bestNameCandidate.column.index);
      confidenceMap.full_name = {
        level: getConfidenceLevel(bestNameCandidate.score),
        score: bestNameCandidate.score,
        source: 'auto',
      };
    }
  }

  return { mapping: nextMapping, confidence: confidenceMap };
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PeopleDatabaseImportWorkspace() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [filesToImport, setFilesToImport] = useState<File[]>([]);
  const [importMode, setImportMode] = useState<'file' | 'folder'>('file');
  const [folderName, setFolderName] = useState('');
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappingConfidence, setMappingConfidence] = useState<Partial<Record<PeopleFieldKey, MappingConfidence>>>({});
  const [dataSource, setDataSource] = useState('');
  const [batchLabel, setBatchLabel] = useState('');
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  const isSupportedFile = (selectedFile: File) =>
    SUPPORTED_FILE_EXTENSIONS.some((extension) => selectedFile.name.toLowerCase().endsWith(extension));

  const formatBytes = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  };

  const validateImportFiles = (selectedFiles: File[]) => {
    if (selectedFiles.length > MAX_FILES_PER_BATCH) {
      return `一次最多可匯入 ${MAX_FILES_PER_BATCH} 份檔案，目前為 ${selectedFiles.length} 份。`;
    }

    const oversizedFiles = selectedFiles.filter((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      const names = oversizedFiles
        .slice(0, 3)
        .map((f) => `${f.name} (${formatBytes(f.size)})`)
        .join('、');
      return `單檔不可超過 ${formatBytes(MAX_FILE_SIZE_BYTES)}。超限檔案：${names}${oversizedFiles.length > 3 ? '…' : ''}`;
    }

    const totalBytes = selectedFiles.reduce((sum, current) => sum + current.size, 0);
    if (totalBytes > MAX_TOTAL_SIZE_BYTES) {
      return `單次匯入總大小不可超過 ${formatBytes(MAX_TOTAL_SIZE_BYTES)}，目前為 ${formatBytes(totalBytes)}。`;
    }

    return null;
  };

  const getFolderNameFromFiles = (selectedFiles: File[]) => {
    const firstFile = selectedFiles[0] as File & { webkitRelativePath?: string };
    const relativePath = firstFile.webkitRelativePath;
    if (!relativePath) return '';
    return relativePath.split('/')[0] ?? '';
  };

  // --------------------------- File selection ---------------------------
  const onFilesChange = async (selectedFiles: File[], mode: 'file' | 'folder') => {
    const normalizedFiles = mode === 'file' ? selectedFiles.slice(0, 1) : selectedFiles;
    const validFiles = normalizedFiles.filter(isSupportedFile);

    if (validFiles.length === 0) {
      setErrorMsg(`找不到可匯入檔案，僅支援 ${SUPPORTED_FILE_EXTENSIONS.join(' / ')}`);
      setStatus('error');
      return;
    }

    const validationError = validateImportFiles(validFiles);
    if (validationError) {
      setErrorMsg(validationError);
      setStatus('error');
      return;
    }

    const warningFiles = validFiles.filter((f) => f.size > WARN_FILE_SIZE_BYTES);
    if (warningFiles.length > 0) {
      setSelectionNotice(`已選擇 ${warningFiles.length} 份超過 ${formatBytes(WARN_FILE_SIZE_BYTES)} 的大檔，處理時間可能較長。`);
    } else {
      setSelectionNotice(null);
    }

    const firstFile = validFiles[0];
    setImportMode(mode);
    setFolderName(mode === 'folder' ? getFolderNameFromFiles(validFiles) : '');
    setFilesToImport(validFiles);
    setFile(firstFile);
    setBatchIds([]);
    setStatus('uploading');
    setErrorMsg(null);

    const form = new FormData();
    form.append('file', firstFile);

    try {
      const res = await fetch('/api/people-db/import/preview', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const json = (await res.json()) as { detail?: string };
        throw new Error(json.detail ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as PreviewResponse;
      setPreview(data);
      // Auto-map columns with matching names
      const columnsWithFallbackSamples = data.columns.map((column) => ({
        ...column,
        sample_values:
          column.sample_values.length > 0
            ? column.sample_values
            : data.preview_rows.map((row) => row[column.name] ?? null).slice(0, 8),
      }));
      const autoMappingResult = buildAutoMapping(columnsWithFallbackSamples);
      setMapping(autoMappingResult.mapping);
      setMappingConfidence(autoMappingResult.confidence);
      setStatus('preview');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '上傳失敗');
      setStatus('error');
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) onFilesChange(droppedFiles, 'file');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // --------------------------- Submit ---------------------------
  const handleSubmit = async () => {
    if (!file || !preview || filesToImport.length === 0) return;
    const validationError = validateImportFiles(filesToImport);
    if (validationError) {
      setErrorMsg(validationError);
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMsg(null);

    // Build column_mapping: field_key -> column_index (number)
    const columnMapping: Record<string, number> = {};
    Object.entries(mapping).forEach(([field, colIdx]) => {
      if (colIdx !== '') columnMapping[field] = Number(colIdx);
    });

    try {
      const nextBatchIds: string[] = [];
      for (const targetFile of filesToImport) {
        const res = await fetch('/api/people-db/import/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_name: targetFile.name,
            total_rows: preview.row_count,
            column_mapping: columnMapping,
            data_source: dataSource,
            batch_label: batchLabel || undefined,
          }),
        });
        if (!res.ok) {
          const json = (await res.json()) as { detail?: string };
          throw new Error(`[${targetFile.name}] ${json.detail ?? `HTTP ${res.status}`}`);
        }
        const data = (await res.json()) as { batch_id?: string; batchId?: string };
        const resolvedBatchId = data.batch_id ?? data.batchId;
        if (resolvedBatchId) nextBatchIds.push(resolvedBatchId);
      }
      setBatchIds(nextBatchIds);
      setStatus('done');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '提交失敗');
      setStatus('error');
    }
  };

  // --------------------------- Reset ---------------------------
  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setMapping({});
    setMappingConfidence({});
    setDataSource('');
    setBatchLabel('');
    setBatchIds([]);
    setFilesToImport([]);
    setImportMode('file');
    setFolderName('');
    setSelectionNotice(null);
    setErrorMsg(null);
    setStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  // ============================= Render =============================

  return (
    <div className="max-w-4xl mx-auto space-y-6">

        {/* ---- Header ---- */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">匯入人員資料</h1>
          <p className="text-text-secondary mt-1">上傳 CSV / Excel / PDF 檔案，設定欄位映射後批量匯入至尋人資料庫。</p>
          <p className="text-xs text-text-secondary mt-2">
            限制：單檔 {formatBytes(MAX_FILE_SIZE_BYTES)}、單次最多 {MAX_FILES_PER_BATCH} 份、總大小最多 {formatBytes(MAX_TOTAL_SIZE_BYTES)}。
          </p>
        </div>

        {/* ---- Done state ---- */}
        {status === 'done' && (
          <div className="rounded-lg border border-green-600/30 bg-green-500/10 p-6 flex items-start gap-4">
            <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-text-primary">匯入任務已建立</p>
              <p className="text-text-secondary text-sm mt-1">
                {batchIds.length > 1 ? `已建立 ${batchIds.length} 個批次` : '批次 ID：'}
                {batchIds.length === 1 && <code className="text-accent ml-1">{batchIds[0]}</code>}
              </p>
              {batchIds.length > 1 && (
                <div className="mt-2 text-xs text-text-secondary space-y-1">
                  {batchIds.slice(0, 5).map((id) => (
                    <div key={id}>
                      <code className="text-accent">{id}</code>
                    </div>
                  ))}
                  {batchIds.length > 5 && <div>... 其餘 {batchIds.length - 5} 個批次</div>}
                </div>
              )}
              <p className="text-text-secondary text-sm">資料將在後台非同步處理，可至<strong>匯入記錄</strong>查看進度。</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleReset}>
                繼續匯入新檔案
              </Button>
            </div>
          </div>
        )}

        {/* ---- Error state ---- */}
        {status === 'error' && (
          <div className="rounded-lg border border-red-600/30 bg-red-500/10 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-text-primary">發生錯誤</p>
              <p className="text-text-secondary text-sm">{errorMsg}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={handleReset}>重試</Button>
            </div>
          </div>
        )}

        {/* ---- (1) File Drop Zone ---- */}
        {(status === 'idle' || status === 'uploading') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-accent" />
                選擇檔案或資料夾
              </CardTitle>
              <CardDescription>支援 .csv、.xlsx、.xls、.pdf 格式（可一次匯入整個資料夾）</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border-default rounded-lg cursor-pointer hover:border-accent hover:bg-bg-secondary transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                {status === 'uploading' ? (
                  <div className="flex flex-col items-center gap-2 text-text-secondary">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span>解析檔案中…</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-text-secondary">
                    <Upload className="h-8 w-8" />
                    <span className="text-sm font-medium text-text-primary">拖放檔案，或選擇檔案 / 資料夾</span>
                    <span className="text-xs">.csv / .xlsx / .xls / .pdf</span>
                    <div className="mt-2 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        選擇檔案
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => folderInputRef.current?.click()}>
                        <FolderOpen className="h-4 w-4 mr-1" />
                        選擇整個資料夾
                      </Button>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const nextFiles = Array.from(e.target.files ?? []);
                    if (nextFiles.length > 0) onFilesChange(nextFiles, 'file');
                  }}
                />
                <input
                  ref={folderInputRef}
                  id="folder-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const nextFiles = Array.from(e.target.files ?? []);
                    if (nextFiles.length > 0) onFilesChange(nextFiles, 'folder');
                  }}
                />
              </div>
              {selectionNotice && (
                <p className="text-xs text-text-secondary mt-3">{selectionNotice}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ---- (2) Preview + Mapping ---- */}
        {(status === 'preview' || status === 'submitting') && preview && (
          <>
            {/* File info */}
            <Card>
              <CardHeader>
                <CardTitle>檔案資訊</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-6 text-sm text-text-secondary">
                <span>
                  匯入方式：
                  <strong className="text-text-primary ml-1">{importMode === 'folder' ? '資料夾' : '單一檔案'}</strong>
                </span>
                {importMode === 'folder' ? (
                  <span>
                    資料夾：<strong className="text-text-primary">{folderName || '(未命名資料夾)'}</strong>
                  </span>
                ) : (
                  <span>檔案：<strong className="text-text-primary">{file?.name}</strong></span>
                )}
                <span>檔案數：<strong className="text-text-primary">{filesToImport.length.toLocaleString()}</strong></span>
                <span>
                  總大小：
                  <strong className="text-text-primary ml-1">
                    {formatBytes(filesToImport.reduce((sum, current) => sum + current.size, 0))}
                  </strong>
                </span>
                <span>預估總列數：<strong className="text-text-primary">{(preview.row_count * filesToImport.length).toLocaleString()}</strong></span>
                <span>欄位數：<strong className="text-text-primary">{preview.columns.length}</strong></span>
                <Button variant="ghost" size="sm" onClick={handleReset} className="ml-auto">
                  重新選擇
                </Button>
              </CardContent>
            </Card>

            {/* Column mapping */}
            <Card>
              <CardHeader>
                <CardTitle>欄位映射</CardTitle>
                <CardDescription>將來源欄位對應到系統欄位（標示 * 為必填）</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PEOPLE_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center gap-3">
                      <label htmlFor={`field-mapping-${field.key}`} className="w-28 shrink-0 text-sm text-text-secondary">
                        <span>{field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}</span>
                        {mapping[field.key] && (() => {
                          const meta = getConfidenceMeta(mappingConfidence[field.key]);
                          if (!meta) return null;
                          return (
                            <span className={`mt-1 inline-flex rounded border px-1.5 py-0.5 text-[10px] ${meta.className}`}>
                              {meta.label}
                            </span>
                          );
                        })()}
                      </label>
                      <select
                        id={`field-mapping-${field.key}`}
                        className="flex-1 rounded-md border border-border-default bg-bg-primary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        value={mapping[field.key] ?? ''}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          setMapping((prev) => ({ ...prev, [field.key]: nextValue }));
                          setMappingConfidence((prev) => {
                            const next = { ...prev };
                            if (nextValue) {
                              next[field.key] = { level: 'manual', score: 0, source: 'manual' };
                            } else {
                              delete next[field.key];
                            }
                            return next;
                          });
                        }}
                      >
                        <option value="">-- 略過 --</option>
                        {preview.columns.map((col) => (
                          <option key={col.index} value={String(col.index)}>
                            {col.index}: {col.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Preview table (first 5 rows) */}
                <div className="mt-6 overflow-x-auto rounded border border-border-default">
                  <table className="min-w-full text-xs">
                    <thead className="bg-bg-secondary">
                      <tr>
                        {preview.columns.map((col) => (
                          <th key={col.index} className="px-3 py-2 text-left text-text-secondary font-medium whitespace-nowrap">
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview_rows.map((row, ri) => (
                        <tr key={ri} className="border-t border-border-default hover:bg-bg-secondary">
                          {preview.columns.map((col) => (
                            <td key={col.index} className="px-3 py-1.5 text-text-secondary whitespace-nowrap max-w-[160px] truncate">
                              {String(row[col.name] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>批次設定</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-text-secondary">資料來源</label>
                  <Input
                    placeholder="例：台灣不動產交易資料"
                    value={dataSource}
                    onChange={(e) => setDataSource(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-text-secondary">批次標籤（選填）</label>
                  <Input
                    placeholder="例：2026Q1 匯入"
                    value={batchLabel}
                    onChange={(e) => setBatchLabel(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleReset} disabled={status === 'submitting'}>
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={status === 'submitting' || !mapping['full_name']}
              >
                {status === 'submitting' ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />提交中…</>
                ) : (
                  importMode === 'folder' ? `開始匯入 ${filesToImport.length} 份檔案` : '開始匯入'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
  );
}

export default function PeopleDatabaseImportPage() {
  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="尋人資料庫 — 匯入資料"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '尋人資料庫', href: '/superadmin/settings/people-database' },
        { label: '匯入資料' },
      ]}
    >
      <PeopleDatabaseImportWorkspace />
    </DashboardLayout>
  );
}
