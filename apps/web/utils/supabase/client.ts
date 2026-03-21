import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const useSessionStorage = process.env.NEXT_PUBLIC_MULTI_ACCOUNT_MODE === 'true'

    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions: {
                name: 'sb-localhost-auth-token',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
            },
            ...(useSessionStorage
                ? {
                    auth: {
                        storage:
                            typeof window !== 'undefined'
                                ? window.sessionStorage
                                : undefined,
                        persistSession: true,
                    },
                }
                : {}),
        }
    )
}
