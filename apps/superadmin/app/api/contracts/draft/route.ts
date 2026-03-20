import { z } from 'zod';
import { getPropertyById, getPropertyDocuments } from '@/lib/actions/properties';
import {
  buildLeaseContractDraftFromProperty,
  buildSaleContractDraftFromProperty,
  type TranscriptAttachmentInput,
} from '@/lib/utils/contract-draft-builders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Coerces empty/whitespace strings from the form to undefined so that
// optional fields with min(1) constraints are not falsely rejected.
const optionalStr = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().min(1).optional(),
);

const LeaseDraftRequestSchema = z.object({
  contractType: z.literal('lease'),
  propertyId: z.string().trim().min(1),
  // Allow empty strings for draft generation — builder fills in placeholders
  tenantName: z.string().trim(),
  leaseStartDate: z.string().trim(),
  leaseEndDate: z.string().trim(),
  depositAmount: z.number().finite().nonnegative(),
  contractCopiesCount: z.number().int().min(1).optional(),
  holdoverPenaltyMultiple: z.number().finite().positive().optional(),
  monthlyRent: z.number().finite().nonnegative().optional(),
  paymentDueDay: z.number().int().min(1).max(31).optional(),
  usePurpose: z.enum(['residential', 'office', 'commercial', 'other']).optional(),
  includedItems: z.array(z.string().trim().min(1)).optional(),
  specialTerms: optionalStr,
  contractNumber: optionalStr,
  contractDate: optionalStr,
});

const SalePaymentMilestoneSchema = z.object({
  label: z.string().trim().min(1),
  amount: z.number().finite().nonnegative(),
  // dueDate may be empty while the user is drafting — allow blank
  dueDate: z.string().trim(),
  note: optionalStr,
});

const SaleDraftRequestSchema = z.object({
  contractType: z.literal('sale'),
  propertyId: z.string().trim().min(1),
  // Allow empty string for draft generation — builder fills in placeholder
  buyerName: z.string().trim(),
  sellerName: optionalStr,
  agentName: optionalStr,
  brokerName: optionalStr,
  scrivenerName: optionalStr,
  deliveryCondition: optionalStr,
  taxAllocation: optionalStr,
  registrationFeeAllocation: optionalStr,
  brokerFeeAllocation: optionalStr,
  escrowMethod: optionalStr,
  occupiedByOthersCondition: optionalStr,
  encroachmentCondition: optionalStr,
  leaseBorrowCondition: optionalStr,
  copyRetentionHolder: optionalStr,
  defaultClauseSummary: optionalStr,
  salePriceTotal: z.number().finite().nonnegative(),
  landPrice: z.number().finite().nonnegative().optional(),
  buildingPrice: z.number().finite().nonnegative().optional(),
  parkingLandPrice: z.number().finite().nonnegative().optional(),
  parkingBuildingPrice: z.number().finite().nonnegative().optional(),
  paymentSchedule: z.array(SalePaymentMilestoneSchema).min(1),
  handoverDate: optionalStr,
  ownershipTransferDate: optionalStr,
  contractNumber: optionalStr,
  contractDate: optionalStr,
});

const DraftRequestSchema = z.discriminatedUnion('contractType', [
  LeaseDraftRequestSchema,
  SaleDraftRequestSchema,
]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function toAttachmentInput(
  attachmentId: string,
  fileName: string,
  storagePath: string,
): TranscriptAttachmentInput {
  return { attachmentId, fileName, storagePath };
}

function findTranscriptAttachment(
  propertyId: string,
  docs: Awaited<ReturnType<typeof getPropertyDocuments>>,
  kind: 'building' | 'land',
): TranscriptAttachmentInput {
  const docType = kind === 'building' ? 'building_registry_transcript' : 'land_registry_transcript';
  const fallbackFileName = kind === 'building' ? 'building-transcript.pdf' : 'land-transcript.pdf';
  const doc = docs.find((item) => item.documentType === docType);

  if (doc) {
    return toAttachmentInput(doc.id, doc.documentName || fallbackFileName, doc.filePath);
  }

  return toAttachmentInput(
    `${propertyId}-${kind}-transcript`,
    fallbackFileName,
    `${propertyId}/${fallbackFileName}`,
  );
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = DraftRequestSchema.parse(json);
    const property = await getPropertyById(input.propertyId);

    if (!property) {
      return jsonResponse({ success: false, error: 'Property not found.' }, 404);
    }

    const documents = await getPropertyDocuments(property.id);

    if (input.contractType === 'lease') {
      const draft = buildLeaseContractDraftFromProperty({
        property,
        tenantName: input.tenantName,
        leaseStartDate: input.leaseStartDate,
        leaseEndDate: input.leaseEndDate,
        depositAmount: input.depositAmount,
        contractCopiesCount: input.contractCopiesCount,
        holdoverPenaltyMultiple: input.holdoverPenaltyMultiple,
        monthlyRent: input.monthlyRent,
        paymentDueDay: input.paymentDueDay,
        usePurpose: input.usePurpose,
        includedItems: input.includedItems,
        specialTerms: input.specialTerms,
        contractNumber: input.contractNumber,
        contractDate: input.contractDate,
        buildingTranscriptAttachment: property.buildingTranscript
          ? findTranscriptAttachment(property.id, documents, 'building')
          : undefined,
        landTranscriptAttachment: property.landTranscript
          ? findTranscriptAttachment(property.id, documents, 'land')
          : undefined,
      });

      return jsonResponse({ success: true, draft });
    }

    const draft = buildSaleContractDraftFromProperty({
      property,
      buyerName: input.buyerName,
      sellerName: input.sellerName,
      agentName: input.agentName,
      brokerName: input.brokerName,
      scrivenerName: input.scrivenerName,
      deliveryCondition: input.deliveryCondition,
      taxAllocation: input.taxAllocation,
      registrationFeeAllocation: input.registrationFeeAllocation,
      brokerFeeAllocation: input.brokerFeeAllocation,
      escrowMethod: input.escrowMethod,
      occupiedByOthersCondition: input.occupiedByOthersCondition,
      encroachmentCondition: input.encroachmentCondition,
      leaseBorrowCondition: input.leaseBorrowCondition,
      copyRetentionHolder: input.copyRetentionHolder,
      defaultClauseSummary: input.defaultClauseSummary,
      salePriceTotal: input.salePriceTotal,
      landPrice: input.landPrice,
      buildingPrice: input.buildingPrice,
      parkingLandPrice: input.parkingLandPrice,
      parkingBuildingPrice: input.parkingBuildingPrice,
      paymentSchedule: input.paymentSchedule,
      handoverDate: input.handoverDate,
      ownershipTransferDate: input.ownershipTransferDate,
      contractNumber: input.contractNumber,
      contractDate: input.contractDate,
      buildingTranscriptAttachment: findTranscriptAttachment(property.id, documents, 'building'),
      landTranscriptAttachment: findTranscriptAttachment(property.id, documents, 'land'),
    });

    return jsonResponse({ success: true, draft });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse(
        { success: false, error: 'Invalid request payload.', details: error.flatten() },
        400,
      );
    }

    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return jsonResponse({ success: false, error: message }, 400);
  }
}