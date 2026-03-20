'use client';

import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes } from 'react';
import { Download, FileText, Loader2, Printer, ScrollText } from 'lucide-react';
import type { ContractDraft, SalePaymentMilestone } from '@/lib/types/contracts';
import type { PropertyItem } from '@/lib/types/properties';
import { readLocalStorage, writeLocalStorage } from '@/lib/utils/storage-state';
import {
  deleteCloudDraft,
  deleteCloudDraftById,
  listCloudDrafts,
  loadLatestCloudDraft,
  saveCloudDraft,
} from '@/lib/utils/form-draft-cloud';
import {
  buildContractDocumentFileName,
  getContractOfficialDocxTemplatePath,
  renderContractDocumentDocx,
  renderContractDocumentHtml,
} from '@/lib/utils/contract-document-renderer';

interface Props {
  property: PropertyItem;
}

type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';

interface ContractDraftFormState {
  contractType: 'lease' | 'sale';
  tenantName: string;
  buyerName: string;
  agentName: string;
  brokerName: string;
  scrivenerName: string;
  deliveryCondition: string;
  taxAllocation: string;
  registrationFeeAllocation: string;
  brokerFeeAllocation: string;
  escrowMethod: string;
  occupiedByOthersCondition: string;
  encroachmentCondition: string;
  leaseBorrowCondition: string;
  copyRetentionHolder: string;
  defaultClauseSummary: string;
  contractDate: string;
  leaseStartDate: string;
  leaseEndDate: string;
  depositAmount: number;
  contractCopiesCount: number;
  holdoverPenaltyMultiple: number | '';
  usePurpose: '' | 'residential' | 'office' | 'commercial' | 'other';
  includedItemsInput: string;
  specialTerms: string;
  monthlyRent: number;
  paymentDueDay: number;
  salePriceTotal: number;
  landPrice: number;
  buildingPrice: number;
  parkingLandPrice: number;
  parkingBuildingPrice: number;
  handoverDate: string;
  ownershipTransferDate: string;
  paymentSchedule: SalePaymentMilestone[];
}

interface PersistedContractDraftState {
  form: ContractDraftFormState;
  generatedDraft: ContractDraft | null;
}

interface DraftVersionOption {
  id: string;
  name: string;
  updatedAt: string;
}

const LOCAL_STORAGE_KEY_PREFIX = 'contract-draft-preview:';
const CLOUD_SYNC_DEBOUNCE_MS = 900;

function formatCurrency(value: number | undefined) {
  if (value == null) return '—';
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatLeaseUsePurpose(value?: 'residential' | 'office' | 'commercial' | 'other') {
  switch (value) {
    case 'residential':
      return '住宅';
    case 'office':
      return '辦公';
    case 'commercial':
      return '商業';
    case 'other':
      return '其他';
    default:
      return '—';
  }
}

function buildDefaultPaymentSchedule(amount: number): SalePaymentMilestone[] {
  const earnestMoney = Math.round(amount * 0.1);
  const finalPayment = Math.max(amount - earnestMoney, 0);

  return [
    { label: '簽約款', amount: earnestMoney, dueDate: '' },
    { label: '尾款', amount: finalPayment, dueDate: '' },
  ];
}

function buildInitialContractFormState(property: PropertyItem): ContractDraftFormState {
  const defaultContractType = property.type === 'sale' ? 'sale' : 'lease';

  return {
    contractType: defaultContractType,
    tenantName: '',
    buyerName: '',
    agentName: '',
    brokerName: '',
    scrivenerName: '',
    deliveryCondition: '',
    taxAllocation: '',
    registrationFeeAllocation: '',
    brokerFeeAllocation: '',
    escrowMethod: '',
    occupiedByOthersCondition: '',
    encroachmentCondition: '',
    leaseBorrowCondition: '',
    copyRetentionHolder: '',
    defaultClauseSummary: '',
    contractDate: '',
    leaseStartDate: '',
    leaseEndDate: '',
    depositAmount: property.monthlyRent ? property.monthlyRent * 2 : 0,
    contractCopiesCount: 2,
    holdoverPenaltyMultiple: '',
    usePurpose: '',
    includedItemsInput: '',
    specialTerms: '',
    monthlyRent: property.monthlyRent ?? 0,
    paymentDueDay: 5,
    salePriceTotal: property.price ?? 0,
    landPrice: 0,
    buildingPrice: 0,
    parkingLandPrice: 0,
    parkingBuildingPrice: 0,
    handoverDate: '',
    ownershipTransferDate: '',
    paymentSchedule: buildDefaultPaymentSchedule(property.price ?? 0),
  };
}

function buildContractDraftName(property: PropertyItem, contractType: ContractDraftFormState['contractType']) {
  const contractLabel = contractType === 'lease' ? '租賃' : '買賣';
  return `${property.title}-${contractLabel}契約草稿`;
}

function formatSavedAt(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('zh-TW', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface NumericInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: number | '';
  onChange: (value: number | '') => void;
  allowDecimal?: boolean;
  allowEmpty?: boolean;
}

function clampNumericValue(value: number, min?: number, max?: number) {
  let nextValue = value;

  if (typeof min === 'number') {
    nextValue = Math.max(min, nextValue);
  }

  if (typeof max === 'number') {
    nextValue = Math.min(max, nextValue);
  }

  return nextValue;
}

function sanitizeNumericInput(rawValue: string, allowDecimal: boolean) {
  if (!allowDecimal) {
    return rawValue.replace(/[^0-9]/g, '');
  }

  const sanitized = rawValue.replace(/[^0-9.]/g, '');
  const [integerPart, ...decimalParts] = sanitized.split('.');

  if (decimalParts.length === 0) {
    return sanitized;
  }

  return `${integerPart}.${decimalParts.join('')}`;
}

function NumericInput({
  value,
  onChange,
  allowDecimal = false,
  allowEmpty = false,
  min,
  max,
  inputMode,
  ...restProps
}: NumericInputProps) {
  // Local display text — decoupled from parent value so the user can type freely
  const [localText, setLocalText] = useState(() => (value === '' ? '' : String(value)));
  const isFocusedRef = useRef(false);

  // Sync parent value → localText only when the input is NOT focused.
  // This lets the parent reset the field (e.g. after cloud-draft load) without
  // clobbering in-progress user input.
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalText(value === '' ? '' : String(value));
    }
  }, [value]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const sanitized = sanitizeNumericInput(event.target.value, allowDecimal);
    setLocalText(sanitized);

    if (sanitized === '' || sanitized === '.') {
      if (allowEmpty) onChange('');
      return;
    }

    const parsed = allowDecimal ? Number(sanitized) : Number.parseInt(sanitized, 10);
    if (!Number.isFinite(parsed)) return;
    onChange(clampNumericValue(parsed, min as number | undefined, max as number | undefined));
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
    isFocusedRef.current = false;
    const sanitized = sanitizeNumericInput(event.target.value, allowDecimal);

    if (sanitized === '' || sanitized === '.') {
      if (allowEmpty) {
        setLocalText('');
        onChange('');
      } else {
        const fallback = clampNumericValue(
          typeof min === 'number' ? min : 0,
          min as number | undefined,
          max as number | undefined,
        );
        setLocalText(String(fallback));
        onChange(fallback);
      }
      restProps.onBlur?.(event);
      return;
    }

    const parsed = allowDecimal ? Number(sanitized) : Number.parseInt(sanitized, 10);
    if (Number.isFinite(parsed)) {
      const normalized = clampNumericValue(parsed, min as number | undefined, max as number | undefined);
      setLocalText(String(normalized));
      onChange(normalized);
    }
    restProps.onBlur?.(event);
  }

  return (
    <input
      {...restProps}
      type="text"
      inputMode={inputMode ?? (allowDecimal ? 'decimal' : 'numeric')}
      value={localText}
      onFocus={(event) => {
        isFocusedRef.current = true;
        restProps.onFocus?.(event);
      }}
      onBlur={handleBlur}
      onChange={handleChange}
    />
  );
}

export function ContractDraftPreviewSection({ property }: Props) {
  const initialFormState = useMemo(
    () => buildInitialContractFormState(property),
    [property.id, property.type, property.monthlyRent, property.price],
  );
  const storageKey = useMemo(() => `${LOCAL_STORAGE_KEY_PREFIX}${property.id}`, [property.id]);
  const cloudFormKey = useMemo(() => `${LOCAL_STORAGE_KEY_PREFIX}${property.id}`, [property.id]);
  const hasHydratedDraftRef = useRef(false);
  const skipNextPersistRef = useRef(false);
  const cloudDraftIdRef = useRef<string | null>(null);
  const cloudSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [contractType, setContractType] = useState<'lease' | 'sale'>(initialFormState.contractType);
  const [tenantName, setTenantName] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [agentName, setAgentName] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [scrivenerName, setScrivenerName] = useState('');
  const [deliveryCondition, setDeliveryCondition] = useState('');
  const [taxAllocation, setTaxAllocation] = useState('');
  const [registrationFeeAllocation, setRegistrationFeeAllocation] = useState('');
  const [brokerFeeAllocation, setBrokerFeeAllocation] = useState('');
  const [escrowMethod, setEscrowMethod] = useState('');
  const [occupiedByOthersCondition, setOccupiedByOthersCondition] = useState('');
  const [encroachmentCondition, setEncroachmentCondition] = useState('');
  const [leaseBorrowCondition, setLeaseBorrowCondition] = useState('');
  const [copyRetentionHolder, setCopyRetentionHolder] = useState('');
  const [defaultClauseSummary, setDefaultClauseSummary] = useState('');
  const [contractDate, setContractDate] = useState('');
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [depositAmount, setDepositAmount] = useState(property.monthlyRent ? property.monthlyRent * 2 : 0);
  const [contractCopiesCount, setContractCopiesCount] = useState(2);
  const [holdoverPenaltyMultiple, setHoldoverPenaltyMultiple] = useState<number | ''>('');
  const [usePurpose, setUsePurpose] = useState<'' | 'residential' | 'office' | 'commercial' | 'other'>('');
  const [includedItemsInput, setIncludedItemsInput] = useState('');
  const [specialTerms, setSpecialTerms] = useState('');
  const [monthlyRent, setMonthlyRent] = useState(property.monthlyRent ?? 0);
  const [paymentDueDay, setPaymentDueDay] = useState(5);
  const [salePriceTotal, setSalePriceTotal] = useState(property.price ?? 0);
  const [landPrice, setLandPrice] = useState(0);
  const [buildingPrice, setBuildingPrice] = useState(0);
  const [parkingLandPrice, setParkingLandPrice] = useState(0);
  const [parkingBuildingPrice, setParkingBuildingPrice] = useState(0);
  const [handoverDate, setHandoverDate] = useState('');
  const [ownershipTransferDate, setOwnershipTransferDate] = useState('');
  const [paymentSchedule, setPaymentSchedule] = useState<SalePaymentMilestone[]>(
    buildDefaultPaymentSchedule(property.price ?? 0),
  );
  const [draft, setDraft] = useState<ContractDraft | null>(null);
  const previewHtml = useMemo(
    () => (draft ? renderContractDocumentHtml(draft) : ''),
    [draft],
  );
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cloudSyncState, setCloudSyncState] = useState<'idle' | 'loading' | 'saved' | 'error'>('loading');
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [draftVersions, setDraftVersions] = useState<DraftVersionOption[]>([]);
  const [selectedDraftVersionId, setSelectedDraftVersionId] = useState<string>('');
  const [newVersionName, setNewVersionName] = useState('');

  function applyFormState(nextState: ContractDraftFormState) {
    setContractType(nextState.contractType);
    setTenantName(nextState.tenantName);
    setBuyerName(nextState.buyerName);
    setAgentName(nextState.agentName);
    setBrokerName(nextState.brokerName);
    setScrivenerName(nextState.scrivenerName);
    setDeliveryCondition(nextState.deliveryCondition);
    setTaxAllocation(nextState.taxAllocation);
    setRegistrationFeeAllocation(nextState.registrationFeeAllocation);
    setBrokerFeeAllocation(nextState.brokerFeeAllocation);
    setEscrowMethod(nextState.escrowMethod);
    setOccupiedByOthersCondition(nextState.occupiedByOthersCondition);
    setEncroachmentCondition(nextState.encroachmentCondition);
    setLeaseBorrowCondition(nextState.leaseBorrowCondition);
    setCopyRetentionHolder(nextState.copyRetentionHolder);
    setDefaultClauseSummary(nextState.defaultClauseSummary);
    setContractDate(nextState.contractDate);
    setLeaseStartDate(nextState.leaseStartDate);
    setLeaseEndDate(nextState.leaseEndDate);
    setDepositAmount(nextState.depositAmount);
    setContractCopiesCount(nextState.contractCopiesCount);
    setHoldoverPenaltyMultiple(nextState.holdoverPenaltyMultiple);
    setUsePurpose(nextState.usePurpose);
    setIncludedItemsInput(nextState.includedItemsInput);
    setSpecialTerms(nextState.specialTerms);
    setMonthlyRent(nextState.monthlyRent);
    setPaymentDueDay(nextState.paymentDueDay);
    setSalePriceTotal(nextState.salePriceTotal);
    setLandPrice(nextState.landPrice);
    setBuildingPrice(nextState.buildingPrice);
    setParkingLandPrice(nextState.parkingLandPrice);
    setParkingBuildingPrice(nextState.parkingBuildingPrice);
    setHandoverDate(nextState.handoverDate);
    setOwnershipTransferDate(nextState.ownershipTransferDate);
    setPaymentSchedule(nextState.paymentSchedule);
  }

  const persistedFormState = useMemo<ContractDraftFormState>(() => ({
    contractType,
    tenantName,
    buyerName,
    agentName,
    brokerName,
    scrivenerName,
    deliveryCondition,
    taxAllocation,
    registrationFeeAllocation,
    brokerFeeAllocation,
    escrowMethod,
    occupiedByOthersCondition,
    encroachmentCondition,
    leaseBorrowCondition,
    copyRetentionHolder,
    defaultClauseSummary,
    contractDate,
    leaseStartDate,
    leaseEndDate,
    depositAmount,
    contractCopiesCount,
    holdoverPenaltyMultiple,
    usePurpose,
    includedItemsInput,
    specialTerms,
    monthlyRent,
    paymentDueDay,
    salePriceTotal,
    landPrice,
    buildingPrice,
    parkingLandPrice,
    parkingBuildingPrice,
    handoverDate,
    ownershipTransferDate,
    paymentSchedule,
  }), [
    contractType,
    tenantName,
    buyerName,
    agentName,
    brokerName,
    scrivenerName,
    deliveryCondition,
    taxAllocation,
    registrationFeeAllocation,
    brokerFeeAllocation,
    escrowMethod,
    occupiedByOthersCondition,
    encroachmentCondition,
    leaseBorrowCondition,
    copyRetentionHolder,
    defaultClauseSummary,
    contractDate,
    leaseStartDate,
    leaseEndDate,
    depositAmount,
    contractCopiesCount,
    holdoverPenaltyMultiple,
    usePurpose,
    includedItemsInput,
    specialTerms,
    monthlyRent,
    paymentDueDay,
    salePriceTotal,
    landPrice,
    buildingPrice,
    parkingLandPrice,
    parkingBuildingPrice,
    handoverDate,
    ownershipTransferDate,
    paymentSchedule,
  ]);

  const lastPropertyIdRef = useRef(property.id);

  useEffect(() => {
    let isCancelled = false;

    async function hydrateDraftState() {
      // 如果物件 ID 變了，重置讀取狀態
      if (lastPropertyIdRef.current !== property.id) {
        hasHydratedDraftRef.current = false;
        lastPropertyIdRef.current = property.id;
      }

      // 如果已經讀取過草稿且正在編輯中，不要因為 property 對象的變動而重新蓋掉當前狀態
      if (hasHydratedDraftRef.current) return;

      const savedLocalDraft = readLocalStorage<PersistedContractDraftState | null>(storageKey, null);
      const localFormState: ContractDraftFormState = {
        ...initialFormState,
        ...(savedLocalDraft?.form ?? {}),
        paymentSchedule: Array.isArray(savedLocalDraft?.form?.paymentSchedule)
          ? savedLocalDraft.form.paymentSchedule
          : initialFormState.paymentSchedule,
      };

      applyFormState(localFormState);
      setDraft(savedLocalDraft?.generatedDraft ?? null);
      setStatus(savedLocalDraft?.generatedDraft ? 'success' : 'idle');
      setErrorMessage(null);
      setCloudSyncState('loading');
      setCloudSyncMessage(null);
      setLastSavedAt(null);
      setDraftVersions([]);
      setSelectedDraftVersionId('');
      cloudDraftIdRef.current = null;

      try {
        const cloudDraft = await loadLatestCloudDraft<PersistedContractDraftState>(cloudFormKey);
        const cloudDrafts = await listCloudDrafts<PersistedContractDraftState>({
          formKey: cloudFormKey,
          limit: 20,
        });
        if (isCancelled) return;

        setDraftVersions(
          cloudDrafts.map((item) => ({
            id: item.id,
            name: item.name,
            updatedAt: item.updatedAt,
          })),
        );

        if (cloudDraft?.data) {
          const nextFormState: ContractDraftFormState = {
            ...initialFormState,
            ...(cloudDraft.data.form ?? {}),
            paymentSchedule: Array.isArray(cloudDraft.data.form?.paymentSchedule)
              ? cloudDraft.data.form.paymentSchedule
              : initialFormState.paymentSchedule,
          };

          skipNextPersistRef.current = true;
          cloudDraftIdRef.current = cloudDraft.id;
          applyFormState(nextFormState);
          setDraft(cloudDraft.data.generatedDraft ?? null);
          setStatus(cloudDraft.data.generatedDraft ? 'success' : 'idle');
          writeLocalStorage(storageKey, {
            form: nextFormState,
            generatedDraft: cloudDraft.data.generatedDraft ?? null,
          });
          setSelectedDraftVersionId(cloudDraft.id);
          setLastSavedAt(cloudDraft.updatedAt);
          setCloudSyncState('saved');
          return;
        }

        if (savedLocalDraft?.form) {
          const createdDraft = await saveCloudDraft({
            formKey: cloudFormKey,
            name: buildContractDraftName(property, localFormState.contractType),
            data: {
              form: localFormState,
              generatedDraft: savedLocalDraft.generatedDraft ?? null,
            },
          });

          if (isCancelled) return;

          cloudDraftIdRef.current = createdDraft.id;
          setLastSavedAt(createdDraft.updatedAt);
          setSelectedDraftVersionId(createdDraft.id);
          setCloudSyncState('saved');
          setCloudSyncMessage('已將此瀏覽器草稿同步到雲端帳號。');
          setDraftVersions((current) => [
            {
              id: createdDraft.id,
              name: createdDraft.name,
              updatedAt: createdDraft.updatedAt,
            },
            ...current.filter((item) => item.id !== createdDraft.id),
          ]);
          return;
        }

        setCloudSyncState('idle');
      } catch (error) {
        if (isCancelled) return;

        setCloudSyncState('error');
        setCloudSyncMessage(error instanceof Error ? error.message : '雲端草稿同步失敗');
      } finally {
        if (!isCancelled) {
          hasHydratedDraftRef.current = true;
        }
      }
    }

    // 當切換物件 (property.id 改變) 時，才重新觸發讀取
    void hydrateDraftState();

    return () => {
      isCancelled = true;
    };
  }, [cloudFormKey, initialFormState, property.id, storageKey]); // 移除 property 對象依賴，改用 property.id

  useEffect(() => {
    if (!hasHydratedDraftRef.current) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }

    writeLocalStorage(storageKey, {
      form: persistedFormState,
      generatedDraft: draft,
    });

    if (cloudSyncTimeoutRef.current) {
      clearTimeout(cloudSyncTimeoutRef.current);
    }

    setCloudSyncState('loading');
    setCloudSyncMessage(null);

    cloudSyncTimeoutRef.current = setTimeout(() => {
      void (async () => {
        try {
          const savedDraft = await saveCloudDraft({
            formKey: cloudFormKey,
            name: buildContractDraftName(property, persistedFormState.contractType),
            data: {
              form: persistedFormState,
              generatedDraft: draft,
            },
            draftId: cloudDraftIdRef.current,
          });

          cloudDraftIdRef.current = savedDraft.id;
          setLastSavedAt(savedDraft.updatedAt);
          setSelectedDraftVersionId(savedDraft.id);
          setDraftVersions((current) => [
            {
              id: savedDraft.id,
              name: savedDraft.name,
              updatedAt: savedDraft.updatedAt,
            },
            ...current.filter((item) => item.id !== savedDraft.id),
          ]);
          setCloudSyncState('saved');
        } catch (error) {
          setCloudSyncState('error');
          setCloudSyncMessage(error instanceof Error ? error.message : '雲端草稿同步失敗');
        }
      })();
    }, CLOUD_SYNC_DEBOUNCE_MS);

    return () => {
      if (cloudSyncTimeoutRef.current) {
        window.clearTimeout(cloudSyncTimeoutRef.current);
        cloudSyncTimeoutRef.current = null;
      }
    };
  }, [cloudFormKey, draft, persistedFormState, property, storageKey]);

  useEffect(() => {
    return () => {
      if (cloudSyncTimeoutRef.current) {
        window.clearTimeout(cloudSyncTimeoutRef.current);
      }
    };
  }, []);

  const contractTypeOptions = useMemo(() => {
    return property.type === 'sale' ? (['sale', 'lease'] as const) : (['lease', 'sale'] as const);
  }, [property.type]);

  async function handleClearDraft() {
    skipNextPersistRef.current = true;

    if (cloudSyncTimeoutRef.current) {
      window.clearTimeout(cloudSyncTimeoutRef.current);
      cloudSyncTimeoutRef.current = null;
    }

    applyFormState(initialFormState);
    setDraft(null);
    setStatus('idle');
    setErrorMessage(null);
    setCloudSyncMessage(null);
    setLastSavedAt(null);

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }

    try {
      await deleteCloudDraft({
        formKey: cloudFormKey,
        draftId: cloudDraftIdRef.current,
      });

      cloudDraftIdRef.current = null;
      setDraftVersions([]);
      setSelectedDraftVersionId('');
      setCloudSyncState('idle');
    } catch (error) {
      setCloudSyncState('error');
      setCloudSyncMessage(error instanceof Error ? error.message : '清除雲端草稿失敗');
    }
  }

  async function handleGenerateDraft() {
    setStatus('loading');
    setErrorMessage(null);

    const parsedHoldoverPenaltyMultiple = holdoverPenaltyMultiple === ''
      ? undefined
      : holdoverPenaltyMultiple;
    const parsedUsePurpose = usePurpose === '' ? undefined : usePurpose;
    const parsedIncludedItems = includedItemsInput
      .split(/[\n,，]/)
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = contractType === 'lease'
      ? {
          contractType,
          propertyId: property.id,
          tenantName,
          leaseStartDate,
          leaseEndDate,
          depositAmount,
          contractCopiesCount,
          holdoverPenaltyMultiple: parsedHoldoverPenaltyMultiple,
          monthlyRent,
          paymentDueDay,
          contractDate,
          usePurpose: parsedUsePurpose,
          includedItems: parsedIncludedItems.length > 0 ? parsedIncludedItems : undefined,
          specialTerms,
        }
      : {
          contractType,
          propertyId: property.id,
          buyerName,
          agentName,
          brokerName,
          scrivenerName,
          deliveryCondition,
          taxAllocation,
          registrationFeeAllocation,
          brokerFeeAllocation,
          escrowMethod,
          occupiedByOthersCondition,
          encroachmentCondition,
          leaseBorrowCondition,
          copyRetentionHolder,
          defaultClauseSummary,
          salePriceTotal,
          landPrice,
          buildingPrice,
          parkingLandPrice,
          parkingBuildingPrice,
          paymentSchedule,
          handoverDate,
          ownershipTransferDate,
          contractDate,
        };

    try {
      const response = await fetch('/api/contracts/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error || '產生契約草稿失敗');
      }

      setDraft(body.draft as ContractDraft);
      setStatus('success');
      writeLocalStorage(storageKey, {
        form: persistedFormState,
        generatedDraft: body.draft as ContractDraft,
      });

      try {
        const savedDraft = await saveCloudDraft({
          formKey: cloudFormKey,
          name: buildContractDraftName(property, persistedFormState.contractType),
          data: {
            form: persistedFormState,
            generatedDraft: body.draft as ContractDraft,
          },
          draftId: cloudDraftIdRef.current,
        });
        cloudDraftIdRef.current = savedDraft.id;
        setLastSavedAt(savedDraft.updatedAt);
        setSelectedDraftVersionId(savedDraft.id);
        setDraftVersions((current) => [
          {
            id: savedDraft.id,
            name: savedDraft.name,
            updatedAt: savedDraft.updatedAt,
          },
          ...current.filter((item) => item.id !== savedDraft.id),
        ]);
        setCloudSyncState('saved');
      } catch (syncError) {
        setCloudSyncState('error');
        setCloudSyncMessage(syncError instanceof Error ? syncError.message : '雲端草稿同步失敗');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '產生契約草稿失敗');
    }
  }

  async function handleCreateVersionSnapshot() {
    setCloudSyncState('loading');
    setCloudSyncMessage(null);

    try {
      const versionSavedAt = new Intl.DateTimeFormat('zh-TW', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date());
      const customName = newVersionName.trim();
      const versionName = customName.length > 0
        ? customName
        : `${buildContractDraftName(property, persistedFormState.contractType)}（版本 ${versionSavedAt}）`;
      const savedDraft = await saveCloudDraft({
        formKey: cloudFormKey,
        name: versionName,
        data: {
          form: persistedFormState,
          generatedDraft: draft,
        },
      });
      cloudDraftIdRef.current = savedDraft.id;
      setLastSavedAt(savedDraft.updatedAt);
      setSelectedDraftVersionId(savedDraft.id);
      setDraftVersions((current) => [
        {
          id: savedDraft.id,
          name: savedDraft.name,
          updatedAt: savedDraft.updatedAt,
        },
        ...current.filter((item) => item.id !== savedDraft.id),
      ]);
      setCloudSyncState('saved');
      setCloudSyncMessage('已建立新草稿版本。');
      setNewVersionName('');
    } catch (error) {
      setCloudSyncState('error');
      setCloudSyncMessage(error instanceof Error ? error.message : '建立草稿版本失敗');
    }
  }

  async function handleSwitchDraftVersion(versionId: string) {
    if (!versionId) return;
    setSelectedDraftVersionId(versionId);
    setCloudSyncState('loading');
    setCloudSyncMessage(null);

    try {
      const cloudDrafts = await listCloudDrafts<PersistedContractDraftState>({
        formKey: cloudFormKey,
        limit: 20,
      });
      const target = cloudDrafts.find((item) => item.id === versionId);
      if (!target) {
        throw new Error('找不到指定草稿版本');
      }

      const nextFormState: ContractDraftFormState = {
        ...initialFormState,
        ...(target.data.form ?? {}),
        paymentSchedule: Array.isArray(target.data.form?.paymentSchedule)
          ? target.data.form.paymentSchedule
          : initialFormState.paymentSchedule,
      };

      skipNextPersistRef.current = true;
      cloudDraftIdRef.current = target.id;
      applyFormState(nextFormState);
      setDraft(target.data.generatedDraft ?? null);
      setStatus(target.data.generatedDraft ? 'success' : 'idle');
      setLastSavedAt(target.updatedAt);
      writeLocalStorage(storageKey, {
        form: nextFormState,
        generatedDraft: target.data.generatedDraft ?? null,
      });
      setCloudSyncState('saved');
    } catch (error) {
      setCloudSyncState('error');
      setCloudSyncMessage(error instanceof Error ? error.message : '切換草稿版本失敗');
    }
  }

  async function handleDeleteSelectedVersion() {
    if (!selectedDraftVersionId) return;

    setCloudSyncState('loading');
    setCloudSyncMessage(null);

    try {
      await deleteCloudDraftById(selectedDraftVersionId);
      const nextVersions = draftVersions.filter((item) => item.id !== selectedDraftVersionId);
      setDraftVersions(nextVersions);

      if (nextVersions.length === 0) {
        cloudDraftIdRef.current = null;
        setSelectedDraftVersionId('');
        setCloudSyncState('idle');
        setCloudSyncMessage('已刪除版本，雲端目前無可用版本。');
        return;
      }

      const fallbackVersionId = nextVersions[0].id;
      await handleSwitchDraftVersion(fallbackVersionId);
      setCloudSyncMessage('已刪除版本，並切換至最新可用版本。');
    } catch (error) {
      setCloudSyncState('error');
      setCloudSyncMessage(error instanceof Error ? error.message : '刪除草稿版本失敗');
    }
  }

  function updatePaymentSchedule(index: number, field: keyof SalePaymentMilestone, value: string) {
    setPaymentSchedule((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;

      if (field === 'amount') {
        return { ...item, amount: Number(value || 0) };
      }

      return { ...item, [field]: value };
    }));
  }

  function handleDownloadHtml() {
    if (!draft) return;

    const html = renderContractDocumentHtml(draft);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, buildContractDocumentFileName(draft));
  }

  async function handleDownloadDocx() {
    if (!draft) return;

    try {
      setErrorMessage(null);
      let templateDocxBytes: Uint8Array | undefined;
      const templateResponse = await fetch(getContractOfficialDocxTemplatePath(draft.contractType), {
        cache: 'no-store',
      });

      if (templateResponse.ok) {
        templateDocxBytes = new Uint8Array(await templateResponse.arrayBuffer());
      }

      const docxBytes = await renderContractDocumentDocx(draft, { templateDocxBytes });
      const blob = new Blob([docxBytes as any], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      downloadBlob(blob, buildContractDocumentFileName(draft, 'docx'));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '下載 DOCX 失敗');
    }
  }

  function handlePrintDraft() {
    if (!draft) return;

    const html = renderContractDocumentHtml(draft);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');

    if (!printWindow) {
      setErrorMessage('無法開啟列印視窗，請確認瀏覽器未封鎖彈出視窗。');
      URL.revokeObjectURL(url);
      return;
    }

    printWindow.onload = () => {
      printWindow.print();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
  }

  return (
    <section className="rounded-2xl border border-border-default bg-bg-primary p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-text-primary">
            <ScrollText className="h-5 w-5 text-accent" />
            <h3 className="text-lg font-semibold">契約草稿產生器</h3>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            依目前物件與謄本資料產生租賃或買賣契約草稿預覽，生成後仍需人工覆核。
          </p>
          <p className="mt-1 text-xs text-text-muted">
            欄位會自動同步到目前登入帳號；重新登入或換裝置後可接續編輯，瀏覽器也會保留備援快取。
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {cloudSyncState === 'loading' && '雲端草稿同步中...'}
            {cloudSyncState === 'saved' && `雲端草稿已儲存${formatSavedAt(lastSavedAt) ? `：${formatSavedAt(lastSavedAt)}` : ''}`}
            {cloudSyncState === 'idle' && '尚未建立雲端草稿。'}
            {cloudSyncState === 'error' && `雲端同步失敗，暫時改用瀏覽器備援快取${cloudSyncMessage ? `：${cloudSyncMessage}` : '。'}`}
          </p>
          {cloudSyncMessage && cloudSyncState !== 'error' && (
            <p className="mt-1 text-xs text-accent">{cloudSyncMessage}</p>
          )}
        </div>
        <div className="rounded-full bg-bg-secondary px-3 py-1 text-xs text-text-secondary">
          物件類型：{property.type === 'sale' ? '出售' : '出租'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-text-secondary">契約類型</label>
          <select
            value={contractType}
            onChange={(event) => setContractType(event.target.value as 'lease' | 'sale')}
            className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
          >
            {contractTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'lease' ? '租賃契約' : '買賣契約'}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="contractDate" className="text-sm font-medium text-text-secondary">契約日期</label>
          <input
            id="contractDate"
            type="date"
            value={contractDate}
            onChange={(event) => setContractDate(event.target.value)}
            className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
          />
        </div>
      </div>

      {contractType === 'lease' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="tenantName" className="text-sm font-medium text-text-secondary">承租人姓名</label>
            <input id="tenantName" value={tenantName} onChange={(e) => setTenantName(e.target.value)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
          </div>
          <div className="space-y-1">
            <label htmlFor="paymentDueDay" className="text-sm font-medium text-text-secondary">每月付款日</label>
            <NumericInput id="paymentDueDay" min={1} max={31} value={paymentDueDay} onChange={(value) => setPaymentDueDay(typeof value === 'number' ? value : 1)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
          </div>
          <div className="space-y-1">
            <label htmlFor="usePurpose" className="text-sm font-medium text-text-secondary">使用用途</label>
            <select
              id="usePurpose"
              value={usePurpose}
              onChange={(event) => setUsePurpose(event.target.value as '' | 'residential' | 'office' | 'commercial' | 'other')}
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
            >
              <option value="">請選擇</option>
              <option value="residential">住宅</option>
              <option value="office">辦公</option>
              <option value="commercial">商業</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="contractCopiesCount" className="text-sm font-medium text-text-secondary">契約分存份數</label>
            <NumericInput id="contractCopiesCount" min={1} value={contractCopiesCount} onChange={(value) => setContractCopiesCount(typeof value === 'number' ? value : 1)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
          </div>
          <div className="space-y-1">
            <label htmlFor="holdoverPenaltyMultiple" className="text-sm font-medium text-text-secondary">返還遲延違約金倍數</label>
            <NumericInput
              id="holdoverPenaltyMultiple"
              min={0.1}
              value={holdoverPenaltyMultiple}
              onChange={(value) => setHoldoverPenaltyMultiple(value)}
              allowDecimal
              allowEmpty
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="leaseStartDate" className="text-sm font-medium text-text-secondary">租期起日</label>
            <input id="leaseStartDate" type="date" value={leaseStartDate} onChange={(e) => setLeaseStartDate(e.target.value)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
          </div>
          <div className="space-y-1">
            <label htmlFor="leaseEndDate" className="text-sm font-medium text-text-secondary">租期迄日</label>
            <input id="leaseEndDate" type="date" value={leaseEndDate} onChange={(e) => setLeaseEndDate(e.target.value)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
          </div>
          <div className="space-y-1">
            <label htmlFor="monthlyRent" className="text-sm font-medium text-text-secondary">月租金</label>
            <NumericInput id="monthlyRent" min={0} value={monthlyRent} onChange={(value) => setMonthlyRent(typeof value === 'number' ? value : 0)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
          </div>
          <div className="space-y-1">
            <label htmlFor="depositAmount" className="text-sm font-medium text-text-secondary">押金</label>
            <NumericInput id="depositAmount" min={0} value={depositAmount} onChange={(value) => setDepositAmount(typeof value === 'number' ? value : 0)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="includedItems" className="text-sm font-medium text-text-secondary">附屬設備</label>
            <textarea
              id="includedItems"
              value={includedItemsInput}
              onChange={(e) => setIncludedItemsInput(e.target.value)}
              rows={3}
              placeholder="例如：冷氣, 冰箱, 熱水器"
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="specialTerms" className="text-sm font-medium text-text-secondary">其他特約</label>
            <textarea
              id="specialTerms"
              value={specialTerms}
              onChange={(e) => setSpecialTerms(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="buyerName" className="text-sm font-medium text-text-secondary">買方姓名</label>
              <input id="buyerName" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
            <div className="space-y-1">
              <label htmlFor="agentName" className="text-sm font-medium text-text-secondary">仲介經紀人</label>
              <input id="agentName" value={agentName} onChange={(e) => setAgentName(e.target.value)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
            <div className="space-y-1">
              <label htmlFor="brokerName" className="text-sm font-medium text-text-secondary">仲介公司</label>
              <input id="brokerName" value={brokerName} onChange={(e) => setBrokerName(e.target.value)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
            <div className="space-y-1">
              <label htmlFor="scrivenerName" className="text-sm font-medium text-text-secondary">代書／地政士</label>
              <input id="scrivenerName" value={scrivenerName} onChange={(e) => setScrivenerName(e.target.value)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
            <div className="space-y-1">
              <label htmlFor="salePriceTotal" className="text-sm font-medium text-text-secondary">買賣總價</label>
              <NumericInput id="salePriceTotal" min={0} value={salePriceTotal} onChange={(value) => {
                const nextAmount = typeof value === 'number' ? value : 0;
                setSalePriceTotal(nextAmount);
                setPaymentSchedule(buildDefaultPaymentSchedule(nextAmount));
              }} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
            <div className="space-y-1">
              <label htmlFor="ownershipTransferDate" className="text-sm font-medium text-text-secondary">過戶日</label>
              <input id="ownershipTransferDate" type="date" value={ownershipTransferDate} onChange={(e) => setOwnershipTransferDate(e.target.value)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
            <div className="space-y-1">
              <label htmlFor="handoverDate" className="text-sm font-medium text-text-secondary">交屋日</label>
              <input id="handoverDate" type="date" value={handoverDate} onChange={(e) => setHandoverDate(e.target.value)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
            <div className="space-y-1">
              <label htmlFor="landPrice" className="text-sm font-medium text-text-secondary">土地價款</label>
              <NumericInput id="landPrice" min={0} value={landPrice} onChange={(value) => setLandPrice(typeof value === 'number' ? value : 0)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
            <div className="space-y-1">
              <label htmlFor="buildingPrice" className="text-sm font-medium text-text-secondary">建物價款</label>
              <NumericInput id="buildingPrice" min={0} value={buildingPrice} onChange={(value) => setBuildingPrice(typeof value === 'number' ? value : 0)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
            <div className="space-y-1">
              <label htmlFor="parkingLandPrice" className="text-sm font-medium text-text-secondary">車位土地價款</label>
              <NumericInput id="parkingLandPrice" min={0} value={parkingLandPrice} onChange={(value) => setParkingLandPrice(typeof value === 'number' ? value : 0)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
            <div className="space-y-1">
              <label htmlFor="parkingBuildingPrice" className="text-sm font-medium text-text-secondary">車位建物價款</label>
              <NumericInput id="parkingBuildingPrice" min={0} value={parkingBuildingPrice} onChange={(value) => setParkingBuildingPrice(typeof value === 'number' ? value : 0)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="deliveryCondition" className="text-sm font-medium text-text-secondary">交屋現況</label>
            <textarea id="deliveryCondition" value={deliveryCondition} onChange={(e) => setDeliveryCondition(e.target.value)} rows={3} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="taxAllocation" className="text-sm font-medium text-text-secondary">稅費負擔</label>
              <textarea id="taxAllocation" value={taxAllocation} onChange={(e) => setTaxAllocation(e.target.value)} rows={3} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
            <div className="space-y-1">
              <label htmlFor="registrationFeeAllocation" className="text-sm font-medium text-text-secondary">登記規費分擔</label>
              <textarea id="registrationFeeAllocation" value={registrationFeeAllocation} onChange={(e) => setRegistrationFeeAllocation(e.target.value)} rows={3} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
            <div className="space-y-1">
              <label htmlFor="brokerFeeAllocation" className="text-sm font-medium text-text-secondary">仲介費分擔</label>
              <textarea id="brokerFeeAllocation" value={brokerFeeAllocation} onChange={(e) => setBrokerFeeAllocation(e.target.value)} rows={3} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="escrowMethod" className="text-sm font-medium text-text-secondary">履約保證／價金保管方式</label>
              <textarea id="escrowMethod" value={escrowMethod} onChange={(e) => setEscrowMethod(e.target.value)} rows={3} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
            <div className="space-y-1">
              <label htmlFor="defaultClauseSummary" className="text-sm font-medium text-text-secondary">特約條款摘要</label>
              <textarea id="defaultClauseSummary" value={defaultClauseSummary} onChange={(e) => setDefaultClauseSummary(e.target.value)} rows={3} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="occupiedByOthersCondition" className="text-sm font-medium text-text-secondary">建物被他人占用情形</label>
              <textarea id="occupiedByOthersCondition" value={occupiedByOthersCondition} onChange={(e) => setOccupiedByOthersCondition(e.target.value)} rows={3} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
            <div className="space-y-1">
              <label htmlFor="encroachmentCondition" className="text-sm font-medium text-text-secondary">占用他人土地情形</label>
              <textarea id="encroachmentCondition" value={encroachmentCondition} onChange={(e) => setEncroachmentCondition(e.target.value)} rows={3} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
            <div className="space-y-1">
              <label htmlFor="leaseBorrowCondition" className="text-sm font-medium text-text-secondary">出租或出借情形</label>
              <textarea id="leaseBorrowCondition" value={leaseBorrowCondition} onChange={(e) => setLeaseBorrowCondition(e.target.value)} rows={3} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="copyRetentionHolder" className="text-sm font-medium text-text-secondary">副本留存人</label>
            <input id="copyRetentionHolder" value={copyRetentionHolder} onChange={(e) => setCopyRetentionHolder(e.target.value)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
          </div>

          <div className="rounded-xl border border-border-default bg-bg-secondary/40 p-4 space-y-3">
            <div className="text-sm font-medium text-text-primary">付款節點</div>
            {paymentSchedule.map((item, index) => (
              <div key={index} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr]">
                <input aria-label={`付款節點名稱-${index + 1}`} value={item.label} onChange={(e) => updatePaymentSchedule(index, 'label', e.target.value)} className="rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
                <NumericInput aria-label={`付款節點金額-${index + 1}`} min={0} value={item.amount} onChange={(value) => updatePaymentSchedule(index, 'amount', String(typeof value === 'number' ? value : 0))} className="rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
                <input aria-label={`付款節點日期-${index + 1}`} type="date" value={item.dueDate} onChange={(e) => updatePaymentSchedule(index, 'dueDate', e.target.value)} className="rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
              </div>
            ))}
          </div>
        </div>
      )}

      {contractType === 'sale' && !property.buildingTranscript && !property.landTranscript && (
        <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-3 text-sm text-amber-700">
          ⚠ 此物件尚未上傳建物或土地謄本，買賣契約草稿無法產生。請先在「謄本資料」標籤上傳謄本。
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleGenerateDraft}
          disabled={status === 'loading' || (contractType === 'sale' && !property.buildingTranscript && !property.landTranscript)}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          產生草稿預覽
        </button>
        <button type="button" onClick={() => { void handleClearDraft(); }} className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-primary px-4 py-2 text-sm font-medium text-text-primary">
          清除草稿
        </button>
        {errorMessage && <span className="text-sm text-red-500">{errorMessage}</span>}
      </div>

      <div className="rounded-xl border border-border-default bg-bg-secondary/30 p-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <label htmlFor="draftVersionSelector" className="text-sm font-medium text-text-secondary">
              草稿版本
            </label>
            <select
              id="draftVersionSelector"
              value={selectedDraftVersionId}
              onChange={(event) => {
                void handleSwitchDraftVersion(event.target.value);
              }}
              className="min-w-[280px] rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
            >
              <option value="" disabled>
                {draftVersions.length > 0 ? '選擇已儲存版本' : '尚無雲端版本'}
              </option>
              {draftVersions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.name} · {formatSavedAt(version.updatedAt) ?? version.updatedAt}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newVersionName}
              onChange={(event) => setNewVersionName(event.target.value)}
              placeholder="可選：輸入版本名稱"
              aria-label="版本名稱"
              className="min-w-[220px] rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
            />
            <button
              type="button"
              onClick={() => { void handleCreateVersionSnapshot(); }}
              className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm font-medium text-text-primary"
            >
              另存新版本
            </button>
            <button
              type="button"
              onClick={() => { void handleDeleteSelectedVersion(); }}
              disabled={!selectedDraftVersionId}
              className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm font-medium text-text-primary disabled:opacity-60"
            >
              刪除目前版本
            </button>
          </div>
        </div>
      </div>

      {draft && (
        <div className="space-y-4 rounded-2xl border border-border-default bg-bg-secondary/30 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h4 className="text-base font-semibold text-text-primary">契約草稿預覽</h4>
              <p className="mt-1 text-sm text-text-secondary">
                依官方範本填入資料後之草稿，供律師或代書參考修正，不具法律效力。
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {draft.contractType === 'lease' ? '房屋租賃契約書' : '成屋買賣契約書'}
                {' · '}
                {draft.propertyAddress}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={handleDownloadHtml} className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm font-medium text-text-primary">
                <Download className="h-4 w-4" />
                下載 HTML
              </button>
              <button type="button" onClick={handleDownloadDocx} className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm font-medium text-text-primary">
                <Download className="h-4 w-4" />
                下載 DOCX
              </button>
              <button type="button" onClick={handlePrintDraft} className="inline-flex items-center gap-2 rounded-md bg-bg-primary px-3 py-2 text-sm font-medium text-text-primary border border-border-default">
                <Printer className="h-4 w-4" />
                列印 / 另存 PDF
              </button>
            </div>
          </div>

          {draft.contractType === 'sale' && (draft.manualReviewRequired || draft.riskNotes) && (
            <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-4 text-sm space-y-1">
              <div className="font-medium text-amber-700">⚠ 需人工覆核</div>
              {draft.riskNotes && <div className="text-text-primary">{draft.riskNotes}</div>}
              {draft.transcriptAttachmentNote && (
                <div className="text-text-secondary">{draft.transcriptAttachmentNote}</div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-border-default overflow-hidden">
            {/* Renders the full official-template-based contract HTML for inline review */}
            <iframe
              srcDoc={previewHtml}
              className="w-full bg-white"
              style={{ height: '900px' }}
              title="契約草稿預覽"
            />
          </div>
        </div>
      )}
    </section>
  );
}