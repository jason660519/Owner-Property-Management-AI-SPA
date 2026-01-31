// filepath: apps/web/app/api/auth/generate-transfer-token/route.ts
/**
 * @file route.ts
 * @description API route to generate Transfer Token for authenticated users
 * @created 2026-02-01
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-02-01
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateTransferToken } from '@/lib/auth/transfer-token';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Get the current session
        const supabase = await createClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Verify the user ID matches the session
        if (session.user.id !== userId) {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }

        // Generate transfer token
        const transferToken = await generateTransferToken(session);

        // Return redirect URL
        const redirectUrl = `exp://localhost:8081?token=${transferToken}`;

        return NextResponse.json({ redirectUrl, token: transferToken }, { status: 200 });
    } catch (error: any) {
        console.error('Transfer token generation error:', error);

        return NextResponse.json(
            { error: error.message || 'Failed to generate transfer token' },
            { status: 500 }
        );
    }
}
