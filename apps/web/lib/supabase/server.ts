import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server Client - 用於 Server Components, Server Actions, Route Handlers
export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // setAll 在 Server Component 中被調用時會失敗（只讀）
                        // 這在 middleware 會刷新用戶 session 時是可以忽略的
                    }
                },
            },
        }
    );
}
