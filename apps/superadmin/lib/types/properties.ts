// filepath: apps/superadmin/lib/types/properties.ts
// created: 2026-02-14 | creator: Claude Opus 4.6
// Shared types and constants for properties (extracted from server actions to
// comply with Next.js "use server" export restrictions).

export interface PropertyItem {
  id: string;
  type: 'sale' | 'rental';
  title: string;
  address: string;
  status: string;
  price: number | null;
  monthlyRent: number | null;
  ownerName: string | null;
  ownerId: string;
  area: number | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  createdAt: string;
}

export interface PropertiesResult {
  properties: PropertyItem[];
  totalSales: number;
  totalRentals: number;
}

export interface UpdatePropertyInput {
  address?: string;
  status?: string;
  price?: number;
  monthlyRent?: number;
  leaseTerm?: number;
  // details JSONB fields
  title?: string;
  propertyType?: string;
  area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  description?: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

// ── Valid statuses per type (matching DB CHECK constraints) ──────────────
export const SALE_STATUSES = ['available', 'pending', 'sold', 'archived'] as const;
export const RENTAL_STATUSES = ['vacant', 'occupied', 'maintenance', 'archived'] as const;

export type SaleStatus = (typeof SALE_STATUSES)[number];
export type RentalStatus = (typeof RENTAL_STATUSES)[number];
