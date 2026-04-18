'use server';

import { createClient } from '@supabase/supabase-js';
import { addUserToIamGroupByRole } from '@/lib/iam';
import { createClient as createServerClient } from '@/lib/supabase/server';

// 初始化 Admin Client (需要 Service Role Key)
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const adminSupabase = () => getAdminSupabase();

/** Serializable return type for Server Actions (no Session/User objects) */
type SignInResult =
  | { success: true; userId: string }
  | { success: false; error: string };

/**
 * Server-side sign in with password. Sets auth cookies on the response so the client is logged in.
 * Returns only plain serializable data to avoid Next.js "unexpected response" (non-serializable return).
 */
function normalizeSignInEmail(raw: string): string {
  return raw.replace(/\u00a0/g, ' ').trim().toLowerCase();
}

export async function signInWithPasswordAction(email: string, password: string): Promise<SignInResult> {
  try {
    const supabase = await createServerClient();
    const normalizedEmail = normalizeSignInEmail(email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      const isDev = process.env.NODE_ENV === 'development';
      let msg = '登入失敗，請確認帳號與密碼是否正確。';

      if (isDev) {
        msg = error.message?.includes('unexpected response') || error.message?.includes('Unexpected response')
          ? '登入被拒絕。請確認密碼是否正確；本機請確認 Supabase 已啟動且 Auth 已啟用 Email 登入（config.toml 中 auth.email.enable_signup = true），執行 supabase stop && supabase start 後再試。'
          : String(error.message ?? '登入失敗');
      }

      const out: SignInResult = { success: false, error: msg };
      return out;
    }
    if (!data?.session || !data?.user?.id) {
      return { success: false, error: '登入失敗，未取得 session。' };
    }
    return { success: true, userId: String(data.user.id) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '登入失敗，請稍後再試。';
    console.error('signInWithPasswordAction error:', e);
    return { success: false, error: String(msg) };
  }
}

export interface SignUpCredentials {
  email: string;
  password: string;
  display_name?: string;
  role?: 'landlord' | 'tenant' | 'buyer' | 'agent' | 'service_provider';
}

export async function signUpWithRole(credentials: SignUpCredentials) {
  const { email, password, display_name, role = 'landlord' } = credentials;

  try {
    // 1. 檢查用戶是否已存在
    const supabase = adminSupabase();
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('List users error:', listError);
      throw new Error('系統錯誤，請稍後再試');
    }

    const existingUser = listData.users.find((u) => u.email === email);

    if (existingUser) {
      // 2. 用戶已存在，添加角色
      const currentRoles = existingUser.user_metadata?.roles || [];

      // 如果角色已存在，直接返回成功
      if (currentRoles.includes(role)) {
        return { success: true, message: '帳號已存在，請直接登入' };
      }

      const updatedRoles = [...new Set([...currentRoles, role])];

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          user_metadata: {
            ...existingUser.user_metadata,
            roles: updatedRoles,
          },
        }
      );

      if (updateError) {
        console.error('Update user error:', updateError);
        throw new Error('更新使用者失敗');
      }

      // Option A: 寫入 IAM，由 trigger 同步 profile.role
      await addUserToIamGroupByRole(supabase, existingUser.id, role);

      return { success: true, message: '角色已新增，請登入' };
    }

    // 3. 新用戶註冊
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 自動確認 email
      user_metadata: {
        display_name,
        role: role,
      },
    });

    if (createError) {
      console.error('Create user error:', createError);
      throw new Error(createError.message || '註冊失敗');
    }

    // 創建 users_profile 記錄，並加入對應 IAM 群組（Option A：trigger 會同步 role）
    if (newUser.user) {
      const { error: profileError } = await supabase.from('users_profile').insert({
        id: newUser.user.id,
        display_name,
        role: role,
      });

      if (profileError) {
        console.error('Failed to create user profile:', profileError);
      } else {
        await addUserToIamGroupByRole(supabase, newUser.user.id, role);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return { success: true, message: '註冊成功，請登入' };
  } catch (error: unknown) {
    console.error('SignUp error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

/**
 * Get user roles from IAM (single source of truth).
 * Uses get_user_roles RPC; fallback to users_profile.roles cache if RPC fails.
 */
export async function getUserRoles(userId: string) {
  try {
    const supabase = adminSupabase();

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_roles', {
      lookup_user_id: userId,
    });

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      const roles = rpcData.map((r: { role_name?: string }) => String(r?.role_name ?? r));
      return { success: true, roles };
    }

    // Fallback: read from users_profile.roles (IAM-synced cache)
    const { data: profile, error: profileError } = await supabase
      .from('users_profile')
      .select('roles')
      .eq('id', userId)
      .single();

    if (!profileError && profile?.roles?.length) {
      const roles = profile.roles.map((r: unknown) => String(r));
      return { success: true, roles };
    }

    // Last resort: Auth metadata (legacy)
    const { data: userData, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (!authError && userData?.user) {
      const raw =
        userData.user.app_metadata?.roles ||
        userData.user.user_metadata?.roles ||
        [];
      const roles = Array.isArray(raw) ? raw.map((r: unknown) => String(r)) : [];
      return { success: true, roles };
    }

    return { success: true, roles: [] };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Get user roles error:', error);
    return { success: false, error: msg };
  }
}

/**
 * Sync IAM roles to Supabase Auth user_metadata so middleware sees the same roles
 * (e.g. multi-role → redirect to /portal). Call after login when we have fresh roles.
 */
export async function syncUserRolesToAuthMetadata(userId: string, roles: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = adminSupabase();
    const { data: userData, error: fetchError } = await supabase.auth.admin.getUserById(userId);
    if (fetchError || !userData?.user) {
      return { success: false, error: fetchError?.message ?? 'User not found' };
    }
    const existing = userData.user.user_metadata || {};
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { ...existing, roles, role: roles[0] ?? existing.role },
    });
    if (updateError) {
      console.error('syncUserRolesToAuthMetadata error:', updateError);
      return { success: false, error: updateError.message };
    }
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('syncUserRolesToAuthMetadata error:', e);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Accept Invite Code — validates 8-digit code and creates a session
// ---------------------------------------------------------------------------

/** Role → dashboard path mapping (mirrors apps/web/config/roles.ts) */
const ROLE_DASHBOARD_MAP: Record<string, string> = {
  landlord: '/landlord/dashboard',
  contracted_tenant: '/tenant/contracted/dashboard',
  potential_tenant: '/tenant/potential/dashboard',
  contracted_buyer: '/buyer/contracted/dashboard',
  potential_buyer: '/buyer/potential/dashboard',
  agent: '/agent/dashboard',
  service_provider: '/service-provider/dashboard',
  super_admin: '/portal',
};

export async function acceptInviteCode(email: string, inviteCode: string) {
  try {
    if (!email || !inviteCode || inviteCode.length !== 8) {
      return { success: false, error: '請輸入有效的 Email 和 8 位數邀請碼' };
    }

    const admin = adminSupabase();

    // 1. Validate the invite code against user_invitations
    const { data: invitation, error: invErr } = await admin
      .from('user_invitations')
      .select('*')
      .eq('email', email)
      .eq('invite_code', inviteCode)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (invErr || !invitation) {
      console.error('Invite code lookup failed:', invErr);
      return { success: false, error: '邀請碼無效或已被使用' };
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      return { success: false, error: '邀請碼已過期，請聯繫管理員重新發送' };
    }

    // 2. Generate a magic link to create a session for this user
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (linkErr || !linkData) {
      console.error('Magic link generation failed:', linkErr);
      return { success: false, error: '無法建立登入連結，請稍後再試' };
    }

    const hashedToken = linkData.properties.hashed_token;

    // 3. Verify the OTP server-side to create a session (sets auth cookies)
    const { createClient: createServerClient } = await import('@/lib/supabase/server');
    const supabase = await createServerClient();

    const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash: hashedToken,
      type: 'email',
    });

    if (verifyErr || !verifyData.session) {
      console.error('OTP verification failed:', verifyErr);
      return { success: false, error: '驗證失敗，請稍後再試' };
    }

    const userId = verifyData.user?.id;
    const role = invitation.role || 'landlord';

    // 4. Add user to IAM (Option A: trigger syncs profile.role); upsert profile if new
    if (userId) {
      const { data: existingProfile } = await admin
        .from('users_profile')
        .select('id, roles')
        .eq('id', userId)
        .single();

      if (!existingProfile) {
        await admin.from('users_profile').insert({
          id: userId,
          display_name: email.split('@')[0],
          role: role,
          roles: [role],
          primary_role: role,
        }).throwOnError();
      }

      if (invitation.group_id) {
        const { data: existingMembership } = await admin
          .from('iam_group_members')
          .select('id')
          .eq('user_id', userId)
          .eq('group_id', invitation.group_id)
          .single();
        if (!existingMembership) {
          await admin.from('iam_group_members').insert({
            user_id: userId,
            group_id: invitation.group_id,
          });
        }
      } else {
        await addUserToIamGroupByRole(admin, userId, role);
      }

      await admin.auth.admin.updateUserById(userId, {
        user_metadata: {
          role: role,
          roles: existingProfile
            ? [...new Set([...(existingProfile.roles || []), role])]
            : [role],
        },
      });
    }

    // 5. Mark invitation as accepted
    await admin
      .from('user_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    // 6. Return success with redirect info
    const dashboardPath = ROLE_DASHBOARD_MAP[role] || '/landlord/dashboard';

    return {
      success: true,
      shouldSetPassword: true,
      role,
      redirectUrl: dashboardPath,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('acceptInviteCode error:', msg);
    return { success: false, error: '系統錯誤，請稍後再試' };
  }
}

// ---------------------------------------------------------------------------
// Reset Password — uses admin generateLink + Nodemailer to bypass PKCE/template issues
// ---------------------------------------------------------------------------

export async function resetPasswordForUser(email: string) {
  try {
    if (!email) {
      return { success: false, error: '請輸入有效的電子郵件地址' };
    }

    const admin = adminSupabase();

    // Verify the user exists before generating a recovery link
    const { data: listData } = await admin.auth.admin.listUsers();
    const userExists = listData?.users?.some((u) => u.email === email);
    if (!userExists) {
      // Don't reveal whether the email exists (security best practice)
      // Return success anyway so attackers can't enumerate emails
      return { success: true };
    }

    // Generate a recovery link via Admin API (no PKCE, produces a valid token_hash)
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (linkError || !linkData) {
      console.error('Generate recovery link error:', linkError);
      return { success: false, error: '無法產生重設連結，請稍後再試' };
    }

    const hashedToken = linkData.properties.hashed_token;
    const siteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'http://localhost:3000';
    const resetLink = `${siteUrl}/auth/confirm?token_hash=${hashedToken}&type=recovery`;

    // Send email via Nodemailer (Inbucket in local dev)
    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '54325'),
      secure: false,
      auth: undefined,
    });

    await transporter.sendMail({
      from: '"物業管理系統" <noreply@property-mgmt.com>',
      to: email,
      subject: '重設您的密碼 - 物業管理系統',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #1a1a1a;">
          <div style="background-color: #2a2a2a; border-radius: 12px; padding: 40px; border: 1px solid #333;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="background-color: #7C3AED; width: 64px; height: 64px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 28px;">🏠</span>
              </div>
            </div>
            <h2 style="color: #ffffff; font-size: 22px; margin: 0 0 16px; text-align: center;">重設您的密碼</h2>
            <p style="color: #999; font-size: 15px; line-height: 1.6; text-align: center; margin: 0 0 12px;">
              我們收到了重設您帳戶密碼的請求。
            </p>
            <p style="color: #999; font-size: 15px; line-height: 1.6; text-align: center; margin: 0 0 28px;">
              請點擊下方按鈕設定新密碼。
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${resetLink}"
                 style="display: inline-block; padding: 14px 32px; background-color: #7C3AED; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                重設密碼
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">
            <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
              如果您沒有要求重設密碼，請忽略此郵件。<br>
              此連結將在 1 小時後過期。
            </p>
          </div>
          <div style="text-align: center; padding-top: 24px;">
            <p style="color: #555; font-size: 12px; margin: 0;">
              &copy; 2026 物業管理系統 &mdash; Owner Property Management
            </p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('resetPasswordForUser error:', msg);
    return { success: false, error: '發送重設密碼郵件失敗，請稍後再試' };
  }
}
