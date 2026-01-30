// filepath: apps/web/types/database.ts
/**
 * @file database.ts
 * @description Supabase Database TypeScript 型別定義
 * @created 2026-01-31
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-01-31
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.0
 * @note 此檔案應由 Supabase CLI 自動生成
 * @note 執行指令: npx supabase gen types typescript --local > apps/web/types/database.ts
 * @note 以下為臨時型別定義，實際使用時請執行上述指令生成完整型別
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users_profile: {
        Row: {
          id: string;
          user_id: string;
          role: 'super_admin' | 'landlord' | 'tenant' | 'agent' | 'service_provider';
          email: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users_profile']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users_profile']['Insert']>;
      };
      property_rentals: {
        Row: {
          id: string;
          landlord_id: string;
          title: string;
          description: string | null;
          property_type: string;
          address: string;
          city: string;
          bedrooms: number;
          bathrooms: number;
          monthly_rent: number;
          status: 'available' | 'rented' | 'maintenance';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['property_rentals']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['property_rentals']['Insert']>;
      };
      // 其他表格型別...
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
