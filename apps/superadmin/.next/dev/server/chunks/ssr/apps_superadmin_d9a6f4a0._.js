module.exports = [
"[project]/apps/superadmin/utils/supabase/server.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-rsc] (ecmascript)");
;
;
async function createClient() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "http://127.0.0.1:54321"), ("TURBOPACK compile-time value", "your-anon-key-here"), {
        cookies: {
            getAll () {
                return cookieStore.getAll();
            },
            setAll (cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options })=>cookieStore.set(name, value, options));
                } catch  {
                // ignore in Server Component
                }
            }
        }
    });
}
}),
"[project]/apps/superadmin/lib/actions/dashboard.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"00c71a8f61293f5d08e42ada3b4469fca562a87a2f":"getAdminDashboardStats"},"",""] */ __turbopack_context__.s([
    "getAdminDashboardStats",
    ()=>getAdminDashboardStats
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$utils$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/superadmin/utils/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
async function getAdminDashboardStats() {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unstable_noStore"])();
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$utils$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    try {
        const { count: totalUsers } = await supabase.from('users_profile').select('*', {
            count: 'exact',
            head: true
        });
        const { count: salesCount } = await supabase.from('property_sales').select('*', {
            count: 'exact',
            head: true
        });
        const { count: rentalsCount } = await supabase.from('property_rentals').select('*', {
            count: 'exact',
            head: true
        });
        const { count: activeRentals } = await supabase.from('property_rentals').select('*', {
            count: 'exact',
            head: true
        }).eq('status', 'rented');
        const { count: activeListings } = await supabase.from('property_sales').select('*', {
            count: 'exact',
            head: true
        }).eq('status', 'available');
        return {
            totalUsers: totalUsers || 0,
            totalProperties: (salesCount || 0) + (rentalsCount || 0),
            activeRentals: activeRentals || 0,
            activeListings: activeListings || 0,
            totalRevenue: 0,
            pendingVerifications: 0
        };
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return {
            totalUsers: 0,
            totalProperties: 0,
            activeRentals: 0,
            activeListings: 0,
            totalRevenue: 0,
            pendingVerifications: 0
        };
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    getAdminDashboardStats
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getAdminDashboardStats, "00c71a8f61293f5d08e42ada3b4469fca562a87a2f", null);
}),
"[project]/apps/superadmin/.next-internal/server/app/superadmin/dashboard/page/actions.js { ACTIONS_MODULE0 => \"[project]/apps/superadmin/lib/actions/dashboard.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$lib$2f$actions$2f$dashboard$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/superadmin/lib/actions/dashboard.ts [app-rsc] (ecmascript)");
;
}),
"[project]/apps/superadmin/.next-internal/server/app/superadmin/dashboard/page/actions.js { ACTIONS_MODULE0 => \"[project]/apps/superadmin/lib/actions/dashboard.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "00c71a8f61293f5d08e42ada3b4469fca562a87a2f",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$lib$2f$actions$2f$dashboard$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getAdminDashboardStats"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f2e$next$2d$internal$2f$server$2f$app$2f$superadmin$2f$dashboard$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$apps$2f$superadmin$2f$lib$2f$actions$2f$dashboard$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/apps/superadmin/.next-internal/server/app/superadmin/dashboard/page/actions.js { ACTIONS_MODULE0 => "[project]/apps/superadmin/lib/actions/dashboard.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$lib$2f$actions$2f$dashboard$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/superadmin/lib/actions/dashboard.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=apps_superadmin_d9a6f4a0._.js.map