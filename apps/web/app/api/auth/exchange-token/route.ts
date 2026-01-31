// filepath: apps/web/app/api/auth/exchange-token/route.ts
/**
 * @file route.ts
 * @description API route to exchange Transfer Token for Session
 * @created 2026-02-01
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-02-01
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyTransferToken, exchangeTransferToken } from '@/lib/auth/transfer-token';

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { error: 'Token is required' },
                { status: 400 }
            );
        }

        // Exchange the transfer token for a full session
        const session = await exchangeTransferToken(token);

        return NextResponse.json({ session }, { status: 200 });
    } catch (error: any) {
        console.error('Token exchange error:', error);

        return NextResponse.json(
            { error: error.message || 'Failed to exchange token' },
            { status: 401 }
        );
    }
}
