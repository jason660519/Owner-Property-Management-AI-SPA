import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1);
const moneySchema = z.number().finite().nonnegative();

export const ContractTypeSchema = z.enum(['lease', 'sale']);
export const DraftStatusSchema = z.enum(['draft', 'reviewing', 'approved', 'exported']);
export const AttachmentTypeSchema = z.enum([
  'building_transcript',
  'land_transcript',
  'id_copy',
  'seal_certificate',
  'other',
]);
export const TranscriptKindSchema = z.enum(['building', 'land']);
export const LeaseUsePurposeSchema = z.enum(['residential', 'office', 'commercial', 'other']);

export const ContractAttachmentSchema = z.object({
  attachmentId: nonEmptyStringSchema,
  attachmentType: AttachmentTypeSchema,
  fileName: nonEmptyStringSchema,
  storagePath: nonEmptyStringSchema,
  pageCount: z.number().int().positive().optional(),
  isRequired: z.boolean(),
  isAttached: z.boolean(),
  snapshotHash: nonEmptyStringSchema.optional(),
  note: z.string().trim().optional(),
});

export const TranscriptSummarySectionSchema = z.object({
  title: nonEmptyStringSchema,
  content: nonEmptyStringSchema,
  transcriptType: TranscriptKindSchema,
  sourceAttachmentId: nonEmptyStringSchema.optional(),
});

export const ContractBaseSchema = z.object({
  draftStatus: DraftStatusSchema,
  templateCode: nonEmptyStringSchema,
  templateVersion: nonEmptyStringSchema,
  contractNumber: nonEmptyStringSchema.optional(),
  contractDate: nonEmptyStringSchema.optional(),
  propertyId: nonEmptyStringSchema,
  propertyAddress: nonEmptyStringSchema,
  ownerName: nonEmptyStringSchema,
  sourceBuildingTranscriptId: nonEmptyStringSchema.optional(),
  sourceLandTranscriptId: nonEmptyStringSchema.optional(),
  buildingTranscriptAttached: z.boolean(),
  landTranscriptAttached: z.boolean(),
  attachments: z.array(ContractAttachmentSchema),
  generatedBy: nonEmptyStringSchema.optional(),
  reviewedBy: nonEmptyStringSchema.optional(),
  reviewNotes: z.string().trim().optional(),
  disclaimerAccepted: z.boolean().optional(),
});

export const LeaseContractDraftSchema = ContractBaseSchema.extend({
  contractType: z.literal('lease'),
  tenantName: nonEmptyStringSchema,
  leaseStartDate: nonEmptyStringSchema,
  leaseEndDate: nonEmptyStringSchema,
  monthlyRent: moneySchema,
  depositAmount: moneySchema,
  contractCopiesCount: z.number().int().min(1).optional(),
  holdoverPenaltyMultiple: z.number().finite().positive().optional(),
  paymentDueDay: z.number().int().min(1).max(31).optional(),
  usePurpose: LeaseUsePurposeSchema.optional(),
  includedItems: z.array(nonEmptyStringSchema).optional(),
  specialTerms: z.string().trim().optional(),
  transcriptAttachmentNote: z.string().trim().optional(),
  buildingNumber: nonEmptyStringSchema.optional(),
  landNumber: nonEmptyStringSchema.optional(),
  buildingAreaPing: z.number().finite().positive().optional(),
  landAreaPing: z.number().finite().positive().optional(),
  buildingOwnershipSummary: z.string().trim().optional(),
  landOwnershipSummary: z.string().trim().optional(),
  encumbranceSummary: z.string().trim().optional(),
}).superRefine((value, ctx) => {
  const hasAttachedTranscript = value.buildingTranscriptAttached || value.landTranscriptAttached;
  const hasTranscriptAttachment = value.attachments.some(
    (attachment) =>
      attachment.isAttached
      && (attachment.attachmentType === 'building_transcript' || attachment.attachmentType === 'land_transcript'),
  );

  if (!hasAttachedTranscript || !hasTranscriptAttachment) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '租賃契約草稿至少需附上一份建物或土地謄本副本。',
      path: ['attachments'],
    });
  }
});

export const SaleTranscriptSectionsSchema = z.object({
  buildingDescription: TranscriptSummarySectionSchema,
  buildingOwnership: TranscriptSummarySectionSchema,
  landDescription: TranscriptSummarySectionSchema,
  landOwnership: TranscriptSummarySectionSchema,
  encumbrances: TranscriptSummarySectionSchema.optional(),
  restrictions: TranscriptSummarySectionSchema.optional(),
});

export const SalePaymentMilestoneSchema = z.object({
  label: nonEmptyStringSchema,
  amount: moneySchema,
  // Allow empty string — user may not have set dates yet while drafting
  dueDate: z.string().trim(),
  note: z.string().trim().optional(),
});

export const SaleContractDraftSchema = ContractBaseSchema.extend({
  contractType: z.literal('sale'),
  sellerName: nonEmptyStringSchema,
  buyerName: nonEmptyStringSchema,
  agentName: nonEmptyStringSchema.optional(),
  brokerName: nonEmptyStringSchema.optional(),
  scrivenerName: nonEmptyStringSchema.optional(),
  buildingNumber: nonEmptyStringSchema.optional(),
  landNumbers: z.array(nonEmptyStringSchema).min(1).optional(),
  parkingInfo: z.string().trim().optional(),
  buildingCurrentUse: z.string().trim().optional(),
  deliveryCondition: z.string().trim().optional(),
  transcriptSections: SaleTranscriptSectionsSchema,
  salePriceTotal: moneySchema,
  landPrice: moneySchema.optional(),
  buildingPrice: moneySchema.optional(),
  parkingLandPrice: moneySchema.optional(),
  parkingBuildingPrice: moneySchema.optional(),
  earnestMoney: moneySchema.optional(),
  downPayment: moneySchema.optional(),
  taxPayment: moneySchema.optional(),
  finalPayment: moneySchema.optional(),
  paymentSchedule: z.array(SalePaymentMilestoneSchema).min(1),
  handoverDate: nonEmptyStringSchema.optional(),
  ownershipTransferDate: nonEmptyStringSchema.optional(),
  taxAllocation: z.string().trim().optional(),
  registrationFeeAllocation: z.string().trim().optional(),
  brokerFeeAllocation: z.string().trim().optional(),
  escrowMethod: z.string().trim().optional(),
  occupiedByOthersCondition: z.string().trim().optional(),
  encroachmentCondition: z.string().trim().optional(),
  leaseBorrowCondition: z.string().trim().optional(),
  copyRetentionHolder: z.string().trim().optional(),
  defaultClauseSummary: z.string().trim().optional(),
  ownershipMismatchFlag: z.boolean().optional(),
  encumbranceExistsFlag: z.boolean().optional(),
  restrictedRegistrationFlag: z.boolean().optional(),
  manualReviewRequired: z.boolean().optional(),
  riskNotes: z.string().trim().optional(),
  transcriptAttachmentNote: z.string().trim().optional(),
}).superRefine((value, ctx) => {
  const hasBuildingTranscript = value.buildingTranscriptAttached
    && value.attachments.some(
      (attachment) => attachment.isAttached && attachment.attachmentType === 'building_transcript',
    );
  const hasLandTranscript = value.landTranscriptAttached
    && value.attachments.some(
      (attachment) => attachment.isAttached && attachment.attachmentType === 'land_transcript',
    );

  if (!hasBuildingTranscript) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '買賣契約草稿需附建物謄本副本。',
      path: ['attachments'],
    });
  }

  if (!hasLandTranscript) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '買賣契約草稿需附土地謄本副本。',
      path: ['attachments'],
    });
  }
});

export const ContractDraftSchema = z.discriminatedUnion('contractType', [
  LeaseContractDraftSchema,
  SaleContractDraftSchema,
]);

export type ContractType = z.infer<typeof ContractTypeSchema>;
export type DraftStatus = z.infer<typeof DraftStatusSchema>;
export type AttachmentType = z.infer<typeof AttachmentTypeSchema>;
export type ContractAttachment = z.infer<typeof ContractAttachmentSchema>;
export type TranscriptSummarySection = z.infer<typeof TranscriptSummarySectionSchema>;
export type ContractBase = z.infer<typeof ContractBaseSchema>;
export type LeaseContractDraft = z.infer<typeof LeaseContractDraftSchema>;
export type SaleTranscriptSections = z.infer<typeof SaleTranscriptSectionsSchema>;
export type SalePaymentMilestone = z.infer<typeof SalePaymentMilestoneSchema>;
export type SaleContractDraft = z.infer<typeof SaleContractDraftSchema>;
export type ContractDraft = z.infer<typeof ContractDraftSchema>;