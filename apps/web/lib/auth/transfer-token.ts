// filepath: apps/web/lib/auth/transfer-token.ts
/**
 * @file transfer-token.ts
 * @description Transfer Token utility for secure session transfer between Next.js and Expo
 * @created 2026-02-01
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-02-01
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.0
 */

import { createClient } from '@/lib/supabase/server';
import type { Session } from '@supabase/supabase-js';

/**
 * Transfer Token payload structure
 */
interface TransferTokenPayload {
    userId: string;
    email: string;
    role: string;
    sessionId: string;
    exp: number; // Expiration timestamp
    iat: number; // Issued at timestamp
}

/**
 * Generate a Transfer Token for secure session transfer
 * Token is valid for 5 minutes and can only be used once
 * 
 * @param session - Current user session
 * @returns Transfer token string
 */
export async function generateTransferToken(session: Session): Promise<string> {
    const supabase = await createClient();

    // Get user profile to include role
    const { data: profile, error } = await supabase
        .from('users_profile')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

    if (error || !profile) {
        throw new Error('Failed to fetch user profile');
    }

    // Create payload
    const payload: TransferTokenPayload = {
        userId: session.user.id,
        email: session.user.email!,
        role: profile.role,
        sessionId: session.access_token.substring(0, 16), // Use part of access token as session ID
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    };

    // Encode payload as base64 (in production, use proper JWT signing)
    const token = Buffer.from(JSON.stringify(payload)).toString('base64url');

    // Store token in database for one-time use validation
    await supabase
        .from('transfer_tokens')
        .insert({
            token,
            user_id: session.user.id,
            expires_at: new Date(payload.exp * 1000).toISOString(),
            used: false,
        });

    return token;
}

/**
 * Verify a Transfer Token
 * Checks expiration and one-time use
 * 
 * @param token - Transfer token to verify
 * @returns Token payload if valid
 * @throws Error if token is invalid, expired, or already used
 */
export async function verifyTransferToken(token: string): Promise<TransferTokenPayload> {
    const supabase = await createClient();

    // Decode token
    let payload: TransferTokenPayload;
    try {
        const decoded = Buffer.from(token, 'base64url').toString('utf-8');
        payload = JSON.parse(decoded);
    } catch (error) {
        throw new Error('Invalid token format');
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
        throw new Error('Token expired');
    }

    // Check if token exists and hasn't been used
    const { data: tokenRecord, error } = await supabase
        .from('transfer_tokens')
        .select('*')
        .eq('token', token)
        .eq('user_id', payload.userId)
        .single();

    if (error || !tokenRecord) {
        throw new Error('Token not found');
    }

    if (tokenRecord.used) {
        throw new Error('Token already used');
    }

    return payload;
}

/**
 * Exchange a Transfer Token for a full session
 * Marks the token as used and returns the session
 * 
 * @param token - Transfer token
 * @returns Session object
 * @throws Error if token is invalid or exchange fails
 */
export async function exchangeTransferToken(token: string): Promise<Session> {
    const supabase = await createClient();

    // Verify token first
    const payload = await verifyTransferToken(token);

    // Mark token as used
    const { error: updateError } = await supabase
        .from('transfer_tokens')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('token', token);

    if (updateError) {
        throw new Error('Failed to mark token as used');
    }

    // Get the user's current session
    // In a real implementation, you would create a new session here
    // For now, we'll return the session info needed for the client
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
        throw new Error('Failed to get session');
    }

    return session;
}

/**
 * Clean up expired transfer tokens
 * Should be run periodically (e.g., via cron job)
 */
export async function cleanupExpiredTokens(): Promise<void> {
    const supabase = await createClient();

    await supabase
        .from('transfer_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString());
}
