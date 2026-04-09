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
import { exchangeTransferToken } from '@/lib/auth/transfer-token';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as unknown;
        const token = isRecord(body) && typeof body.token === 'string' ? body.token : null;

        if (!token) {
            return NextResponse.json(
                { error: 'Token is required' },
                { status: 400 }
            );
        }

        // Exchange the transfer token for a full session
        const session = await exchangeTransferToken(token);

        return NextResponse.json({ session }, { status: 200 });
    } catch (error: unknown) {
        console.error('Token exchange error:', error);
        const msg = error instanceof Error ? error.message : String(error);

        return NextResponse.json(
            { error: msg || 'Failed to exchange token' },
            { status: 401 }
        );
    }
}
