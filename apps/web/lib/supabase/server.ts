import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server Client - 用於 Server Components, Server Actions, Route Handlers
export async function createClient() {
    // #region agent log
    const { appendFile } = await import('fs/promises');
    const { join } = await import('path');
    const logPath = join(process.cwd(), '.cursor', 'debug.log');
    const logEntry = JSON.stringify({location:'lib/supabase/server.ts:5',message:'createClient entry',data:{hasEnvUrl:!!process.env.NEXT_PUBLIC_SUPABASE_URL,hasEnvKey:!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}) + '\n';
    appendFile(logPath, logEntry).catch(()=>{});
    // #endregion
    const cookieStore = await cookies();
    // #region agent log
    const { appendFile: appendFile2 } = await import('fs/promises');
    const { join: join2 } = await import('path');
    const logPath2 = join2(process.cwd(), '.cursor', 'debug.log');
    const logEntry2 = JSON.stringify({location:'lib/supabase/server.ts:9',message:'Before createServerClient',data:{envUrl:process.env.NEXT_PUBLIC_SUPABASE_URL||'MISSING',envKeyPrefix:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0,20)||'MISSING'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}) + '\n';
    appendFile2(logPath2, logEntry2).catch(()=>{});
    // #endregion

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
