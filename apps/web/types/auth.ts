// filepath: apps/web/types/auth.ts
/**
 * @file auth.ts
 * @description 認證系統專用 TypeScript 型別定義
 * @created 2026-01-31
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-01-31
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.0
 */

import type { Database } from './database';

export type UserRole = Database['public']['Tables']['users_profile']['Row']['role'];

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  role: 'landlord' | 'tenant' | 'agent';
  phone?: string;
}

export interface SignInData {
  email: string;
  password: string;
}
