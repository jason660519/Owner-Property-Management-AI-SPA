// filepath: apps/mobile/src/hooks/useAuth.ts
/**
 * @file useAuth.ts
 * @description Authentication hook for Expo app
 * @created 2026-02-01
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-02-01
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.0
 */

import { useState, useEffect } from 'react';
import { supabase, signIn, signOut, exchangeTransferToken } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
    error: string | null;
}

export function useAuth() {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        session: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        // Check for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setAuthState({
                user: session?.user ?? null,
                session,
                loading: false,
                error: null,
            });
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setAuthState({
                user: session?.user ?? null,
                session,
                loading: false,
                error: null,
            });
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSignIn = async (email: string, password: string) => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        const result = await signIn(email, password);

        if (!result.success) {
            setAuthState(prev => ({ ...prev, loading: false, error: result.error || 'Login failed' }));
            return result;
        }

        return result;
    };

    const handleSignOut = async () => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        const result = await signOut();

        if (!result.success) {
            setAuthState(prev => ({ ...prev, loading: false, error: result.error || 'Logout failed' }));
        }

        return result;
    };

    const handleExchangeToken = async (token: string) => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        const result = await exchangeTransferToken(token);

        if (!result.success) {
            setAuthState(prev => ({ ...prev, loading: false, error: result.error || 'Token exchange failed' }));
            return result;
        }

        return result;
    };

    return {
        ...authState,
        signIn: handleSignIn,
        signOut: handleSignOut,
        exchangeToken: handleExchangeToken,
    };
}
