// filepath: apps/web/app/actions/onboarding.ts
/**
 * @file onboarding.ts
 * @description Server actions for user onboarding flow
 * @created 2026-02-16
 * @creator Claude Sonnet 4.5
 * @version 1.0
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { addUserToIamGroupByRole } from '@/lib/iam';

type UserRole = 'landlord' | 'potential_tenant' | 'potential_buyer' | 'contracted_tenant' | 'contracted_buyer';

interface CreateProfileResult {
  success: boolean;
  error?: string;
  dashboardPath?: string;
}

/**
 * Create user profile for new OAuth users after role selection
 */
export async function createUserProfile(role: UserRole): Promise<CreateProfileResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '未登入，請重新登入' };
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('users_profile')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      return { success: false, error: '帳號已建立，請直接登入' };
    }

    // Extract display name from user metadata
    const metadata = user.user_metadata || {};
    const displayName =
      metadata.full_name || metadata.name || user.email?.split('@')[0] || 'New User';

    // Create profile
    const { error: insertError } = await supabase.from('users_profile').insert({
      id: user.id,
      display_name: displayName,
      role: role,
      roles: [role],
      primary_role: role,
    });

    if (insertError) {
      console.error('Failed to create user profile:', insertError);
      return {
        success: false,
        error: `建立帳號失敗：${insertError.message}`,
      };
    }

    // Add user to IAM group
    try {
      const admin = createAdminClient();
      await addUserToIamGroupByRole(admin, user.id, role);
    } catch (e) {
      console.error('Failed to add user to IAM group:', e);
      // Non-critical error, continue
    }

    // Determine dashboard path
    const dashboardPaths: Record<UserRole, string> = {
      landlord: '/landlord/dashboard',
      potential_tenant: '/tenant/potential/dashboard',
      potential_buyer: '/buyer/potential/dashboard',
      contracted_tenant: '/tenant/contracted/dashboard',
      contracted_buyer: '/buyer/contracted/dashboard',
    };

    const dashboardPath = dashboardPaths[role] || '/';

    return {
      success: true,
      dashboardPath,
    };
  } catch (error: unknown) {
    console.error('Error in createUserProfile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '系統錯誤，請稍後再試',
    };
  }
}

/**
 * Add additional role to existing user
 */
export async function addUserRole(newRole: UserRole): Promise<CreateProfileResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '未登入，請重新登入' };
    }

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('users_profile')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: '找不到使用者資料' };
    }

    const currentRoles = profile.roles || [];

    // Check if role already exists
    if (currentRoles.includes(newRole)) {
      return { success: false, error: '您已經有這個角色了' };
    }

    // Add new role
    const updatedRoles = [...currentRoles, newRole];

    const { error: updateError } = await supabase
      .from('users_profile')
      .update({
        roles: updatedRoles,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to add role:', updateError);
      return { success: false, error: '新增角色失敗' };
    }

    // Add to IAM group
    try {
      const admin = createAdminClient();
      await addUserToIamGroupByRole(admin, user.id, newRole);
    } catch (e) {
      console.error('Failed to add user to IAM group:', e);
      // Non-critical error, continue
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error in addUserRole:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '系統錯誤，請稍後再試',
    };
  }
}
