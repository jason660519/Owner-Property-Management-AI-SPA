'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { randomInt } from 'crypto';

import nodemailer from 'nodemailer';

const BASE = '/superadmin/users';

/**
 * Generate an 8-digit numeric invite code (10000000–99999999)
 */
function generateInviteCode(): string {
  return String(randomInt(10000000, 100000000));
}

export async function inviteUser(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: profile } = await supabase
    .from('users_profile')
    .select('role')
    .eq('id', user.id)
    .single();

  // Allow if role is super_admin OR if the profile doesn't exist but user has app_metadata.roles including super_admin
  const hasSuperAdminRole = profile?.role === 'super_admin' || 
    (user.app_metadata?.roles?.includes('super_admin')) ||
    (user.user_metadata?.roles?.includes('super_admin'));

  if (!hasSuperAdminRole) {
    console.error('Unauthorized invite attempt:', { 
      userId: user.id, 
      profileRole: profile?.role,
      appRoles: user.app_metadata?.roles,
      userRoles: user.user_metadata?.roles 
    });
    return { error: 'Unauthorized: Admin access required' };
  }

  const supabaseAdmin = createAdminClient();
  const email = formData.get('email') as string;
  const groupId = formData.get('groupId') as string;
  const role = (formData.get('role') as string) || 'landlord';
  if (!email) return { error: 'Email is required' };

  // Generate invite link via Supabase Admin API (creates the user in auth.users if new)
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite',
    email: email,
    options: {
      redirectTo: 'http://localhost:3000/auth/callback',
    }
  });

  if (linkError) {
    console.error('Error generating invite link:', linkError);
    return { error: linkError.message };
  }

  const hashedToken = linkData.properties.hashed_token;
  const supabaseToken = linkData.properties.email_otp || hashedToken || 'unknown-token';
  const invitedUserId = linkData.user.id;

  // Generate our 8-digit invite code
  const inviteCode = generateInviteCode();

  // Build the accept link that goes to the login page in invite mode
  // User will enter their email + 8-digit invite code on the login page
  const siteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'http://localhost:3000';
  const acceptLink = `${siteUrl}/login?mode=invite&email=${encodeURIComponent(email)}`;

  // Track the invitation in our custom table
  const { error: dbError } = await supabaseAdmin
    .from('user_invitations')
    .insert({
      email: email,
      token: supabaseToken,
      invite_code: inviteCode,
      role: role,
      group_id: groupId || null,
      status: 'pending',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      metadata: {
        accept_link: acceptLink,
        invited_by: user.id,
        invited_user_id: invitedUserId,
      }
    });

  if (dbError) {
    console.error('Error storing invitation:', dbError);
    return { error: 'Failed to store invitation record' };
  }

  // Send Email using Nodemailer (to Inbucket in dev)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '54325'),
    secure: false,
    auth: undefined, // No auth for Inbucket
  });

  try {
    await transporter.sendMail({
      from: '"物業管理系統" <noreply@property-mgmt.com>',
      to: email,
      subject: 'You have been invited',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #1a1a1a;">
          <div style="background-color: #2a2a2a; border-radius: 12px; padding: 40px; border: 1px solid #333;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="background-color: #7C3AED; width: 64px; height: 64px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 28px;">🏠</span>
              </div>
            </div>
            <h2 style="color: #ffffff; font-size: 22px; margin: 0 0 16px; text-align: center;">You have been invited</h2>
            <p style="color: #999; font-size: 15px; line-height: 1.6; text-align: center; margin: 0 0 12px;">
              系統管理員已邀請您以 <strong style="color: #ccc;">${role}</strong> 身分加入物業管理平台。
            </p>
            <p style="color: #999; font-size: 15px; line-height: 1.6; text-align: center; margin: 0 0 8px;">
              Follow this link to accept the invite:
            </p>
            <p style="color: #999; font-size: 14px; line-height: 1.6; text-align: center; margin: 0 0 28px;">
              點擊下方按鈕後，請在登入頁面輸入您的 Email 及下方的 8 位數邀請碼完成註冊。
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${acceptLink}"
                 style="display: inline-block; padding: 14px 32px; background-color: #7C3AED; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                Accept the invite
              </a>
            </div>
            <div style="background-color: #1a1a1a; border: 1px solid #444; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
              <p style="color: #888; font-size: 12px; margin: 0 0 6px;">您的 8 位數邀請碼 (Your Invite Code)：</p>
              <p style="color: #7C3AED; font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 0;">${inviteCode}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">
            <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
              如果您不認識寄件者，請忽略此郵件。<br>
              此邀請連結將在 24 小時後過期。
            </p>
          </div>
        </div>
      `,
    });
  } catch (emailError: unknown) {
    const msg = emailError instanceof Error ? emailError.message : String(emailError);
    console.error('Error sending email:', emailError);
    return { error: 'Failed to send email: ' + msg };
  }

  // Handle Group Assignment (Optional)
  if (groupId && invitedUserId) {
    const { data: existingMembership } = await supabaseAdmin
      .from('iam_group_members')
      .select('id')
      .eq('user_id', invitedUserId)
      .eq('group_id', groupId)
      .single();

    if (!existingMembership) {
        const { error: groupError } = await supabaseAdmin.from('iam_group_members').insert({
          user_id: invitedUserId,
          group_id: groupId,
        });
        if (groupError) {
          console.error('Error adding user to group:', groupError);
          // Don't fail the whole request, just warn
        }
    }
  }

  revalidatePath(BASE);
  return { success: true };
}

export type IAMUser = {
  id: string;
  email: string;
  groups: string[];
  roles: string[];
};

export async function getUsers(): Promise<IAMUser[]> {
  const supabase = await createClient();
  const { data: users, error: userError } = await supabase
    .from('iam_users_view')
    .select('id, email')
    .order('created_at', { ascending: false });
  if (userError) throw new Error(`Failed to fetch users: ${userError.message}`);

  const { data: memberships, error: memberError } = await supabase
    .from('iam_group_members')
    .select('user_id, group:iam_groups(name)');
  if (memberError) throw new Error(`Failed to fetch memberships: ${memberError.message}`);

  const { data: profiles } = await supabase
    .from('users_profile')
    .select('id, roles');

  const profileRolesMap = new Map<string, string[]>();
  (profiles || []).forEach((p: { id: string; roles: string[] | null }) => {
    profileRolesMap.set(p.id, p.roles || []);
  });

  const userMap = new Map<string, IAMUser>();
  users.forEach((u) => {
    userMap.set(u.id, {
      id: u.id,
      email: u.email || 'No Email',
      groups: [],
      roles: profileRolesMap.get(u.id) || [],
    });
  });
  memberships.forEach((m: { user_id: string; group?: { name: string } | { name: string }[] }) => {
    const user = userMap.get(m.user_id);
    const groupName = Array.isArray(m.group) ? m.group[0]?.name : m.group?.name;
    if (user && groupName) user.groups.push(groupName);
  });
  return Array.from(userMap.values());
}

export async function getAllGroups() {
  const supabase = await createClient();
  const { data } = await supabase.from('iam_groups').select('id, name').order('name');
  return data || [];
}

export async function addUserToGroup(userId: string, groupId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('iam_group_members').insert({ user_id: userId, group_id: groupId });
  if (error) {
    if (error.code === '23505') return { success: false, message: 'User is already in this group' };
    return { success: false, message: error.message };
  }
  revalidatePath(BASE);
  return { success: true };
}

export async function getInvites(email: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('users_profile')
    .select('role')
    .eq('id', user.id)
    .single();

  const hasSuperAdminRole = profile?.role === 'super_admin' || 
    (user.app_metadata?.roles?.includes('super_admin')) ||
    (user.user_metadata?.roles?.includes('super_admin'));

  if (!hasSuperAdminRole) throw new Error('Unauthorized: Admin access required');

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from('user_invitations')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Failed to fetch invites: ' + error.message);
  return data;
}

export async function removeUserFromGroup(userId: string, groupName: string) {
  const supabase = await createClient();
  const { data: group } = await supabase.from('iam_groups').select('id').eq('name', groupName).single();
  if (!group) return { success: false, message: 'Group not found' };
  const { error } = await supabase
    .from('iam_group_members')
    .delete()
    .match({ user_id: userId, group_id: group.id });
  if (error) return { success: false, message: error.message };
  revalidatePath(BASE);
  return { success: true };
}
