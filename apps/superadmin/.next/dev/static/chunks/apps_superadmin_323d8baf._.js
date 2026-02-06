(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/superadmin/components/ui/Button.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Button",
    ()=>Button
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
'use client';
;
;
function Button(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(13);
    if ($[0] !== "cfdeab16d1cf2a5a9be8e54235e7bb11d2491711aa014f53a24aafda5703f7d4") {
        for(let $i = 0; $i < 13; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "cfdeab16d1cf2a5a9be8e54235e7bb11d2491711aa014f53a24aafda5703f7d4";
    }
    let children;
    let props;
    let t1;
    let t2;
    let t3;
    if ($[1] !== t0) {
        ({ variant: t1, size: t2, children, className: t3, ...props } = t0);
        $[1] = t0;
        $[2] = children;
        $[3] = props;
        $[4] = t1;
        $[5] = t2;
        $[6] = t3;
    } else {
        children = $[2];
        props = $[3];
        t1 = $[4];
        t2 = $[5];
        t3 = $[6];
    }
    const variant = t1 === undefined ? "primary" : t1;
    const size = t2 === undefined ? "md" : t2;
    const className = t3 === undefined ? "" : t3;
    let t4;
    if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
        t4 = {
            primary: "bg-[#7C3AED] text-white hover:bg-[#6D28D9]",
            outline: "border border-[#333333] text-white hover:border-[#7C3AED] hover:bg-[#7C3AED]/10",
            ghost: "text-white hover:bg-[#2A2A2A]"
        };
        $[7] = t4;
    } else {
        t4 = $[7];
    }
    const variants = t4;
    let t5;
    if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
        t5 = {
            sm: "px-4 py-2 text-sm",
            md: "px-6 py-3 text-base",
            lg: "px-8 py-4 text-lg"
        };
        $[8] = t5;
    } else {
        t5 = $[8];
    }
    const sizes = t5;
    const t6 = `${"inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50"} ${variants[variant]} ${sizes[size]} ${className}`;
    let t7;
    if ($[9] !== children || $[10] !== props || $[11] !== t6) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            className: t6,
            ...props,
            children: children
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/ui/Button.tsx",
            lineNumber: 74,
            columnNumber: 10
        }, this);
        $[9] = children;
        $[10] = props;
        $[11] = t6;
        $[12] = t7;
    } else {
        t7 = $[12];
    }
    return t7;
}
_c = Button;
var _c;
__turbopack_context__.k.register(_c, "Button");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/superadmin/components/ui/Card.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Card",
    ()=>Card,
    "CardContent",
    ()=>CardContent,
    "CardHeader",
    ()=>CardHeader,
    "CardTitle",
    ()=>CardTitle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
'use client';
;
;
function Card(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(5);
    if ($[0] !== "9c499645118380ec470c5522064d98b81773d9aa5c5038c494e1ec885a335ab3") {
        for(let $i = 0; $i < 5; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "9c499645118380ec470c5522064d98b81773d9aa5c5038c494e1ec885a335ab3";
    }
    const { children, className: t1, padding: t2 } = t0;
    const className = t1 === undefined ? "" : t1;
    const padding = t2 === undefined ? "md" : t2;
    let t3;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t3 = {
            none: "",
            sm: "p-4",
            md: "p-6",
            lg: "p-8"
        };
        $[1] = t3;
    } else {
        t3 = $[1];
    }
    const paddingClass = t3[padding];
    const t4 = `bg-[#2A2A2A] border border-[#333333] rounded-xl ${paddingClass} ${className}`;
    let t5;
    if ($[2] !== children || $[3] !== t4) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: t4,
            children: children
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/ui/Card.tsx",
            lineNumber: 36,
            columnNumber: 10
        }, this);
        $[2] = children;
        $[3] = t4;
        $[4] = t5;
    } else {
        t5 = $[4];
    }
    return t5;
}
_c = Card;
function CardHeader(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(4);
    if ($[0] !== "9c499645118380ec470c5522064d98b81773d9aa5c5038c494e1ec885a335ab3") {
        for(let $i = 0; $i < 4; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "9c499645118380ec470c5522064d98b81773d9aa5c5038c494e1ec885a335ab3";
    }
    const { children, className: t1 } = t0;
    const className = t1 === undefined ? "" : t1;
    const t2 = `mb-4 ${className}`;
    let t3;
    if ($[1] !== children || $[2] !== t2) {
        t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: t2,
            children: children
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/ui/Card.tsx",
            lineNumber: 61,
            columnNumber: 10
        }, this);
        $[1] = children;
        $[2] = t2;
        $[3] = t3;
    } else {
        t3 = $[3];
    }
    return t3;
}
_c1 = CardHeader;
function CardTitle(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(4);
    if ($[0] !== "9c499645118380ec470c5522064d98b81773d9aa5c5038c494e1ec885a335ab3") {
        for(let $i = 0; $i < 4; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "9c499645118380ec470c5522064d98b81773d9aa5c5038c494e1ec885a335ab3";
    }
    const { children, className: t1 } = t0;
    const className = t1 === undefined ? "" : t1;
    const t2 = `text-lg font-semibold text-white ${className}`;
    let t3;
    if ($[1] !== children || $[2] !== t2) {
        t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
            className: t2,
            children: children
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/ui/Card.tsx",
            lineNumber: 86,
            columnNumber: 10
        }, this);
        $[1] = children;
        $[2] = t2;
        $[3] = t3;
    } else {
        t3 = $[3];
    }
    return t3;
}
_c2 = CardTitle;
function CardContent(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(4);
    if ($[0] !== "9c499645118380ec470c5522064d98b81773d9aa5c5038c494e1ec885a335ab3") {
        for(let $i = 0; $i < 4; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "9c499645118380ec470c5522064d98b81773d9aa5c5038c494e1ec885a335ab3";
    }
    const { children, className: t1 } = t0;
    const className = t1 === undefined ? "" : t1;
    let t2;
    if ($[1] !== children || $[2] !== className) {
        t2 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: className,
            children: children
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/ui/Card.tsx",
            lineNumber: 110,
            columnNumber: 10
        }, this);
        $[1] = children;
        $[2] = className;
        $[3] = t2;
    } else {
        t2 = $[3];
    }
    return t2;
}
_c3 = CardContent;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "Card");
__turbopack_context__.k.register(_c1, "CardHeader");
__turbopack_context__.k.register(_c2, "CardTitle");
__turbopack_context__.k.register(_c3, "CardContent");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DashboardLayout",
    ()=>DashboardLayout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-right.js [app-client] (ecmascript) <export default as ChevronRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/external-link.js [app-client] (ecmascript) <export default as ExternalLink>");
'use client';
;
;
;
;
;
const MAIN_SITE_URL = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_MAIN_SITE_URL || 'http://localhost:3000';
function DashboardLayout(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(29);
    if ($[0] !== "01ea6f52932d4a3a194b64cfe91e96661059cca71a9d1255260e527a8ac1077f") {
        for(let $i = 0; $i < 29; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "01ea6f52932d4a3a194b64cfe91e96661059cca71a9d1255260e527a8ac1077f";
    }
    const { pageTitle, breadcrumbs, greeting, children, headerActions, className: t1 } = t0;
    const className = t1 === undefined ? "" : t1;
    const t2 = `min-h-screen bg-[#1A1A1A] ${className}`;
    let t3;
    if ($[1] !== breadcrumbs) {
        let t4;
        if ($[3] !== breadcrumbs.length) {
            t4 = ({
                "DashboardLayout[breadcrumbs.map()]": (crumb, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Fragment, {
                        children: [
                            crumb.href ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: crumb.href,
                                className: "text-[#999999] hover:text-white transition-colors",
                                children: crumb.label
                            }, void 0, false, {
                                fileName: "[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx",
                                lineNumber: 31,
                                columnNumber: 107
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-white font-medium",
                                children: crumb.label
                            }, void 0, false, {
                                fileName: "[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx",
                                lineNumber: 31,
                                columnNumber: 216
                            }, this),
                            index < breadcrumbs.length - 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                                className: "w-4 h-4 text-[#666666]"
                            }, void 0, false, {
                                fileName: "[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx",
                                lineNumber: 31,
                                columnNumber: 313
                            }, this)
                        ]
                    }, index, true, {
                        fileName: "[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx",
                        lineNumber: 31,
                        columnNumber: 65
                    }, this)
            })["DashboardLayout[breadcrumbs.map()]"];
            $[3] = breadcrumbs.length;
            $[4] = t4;
        } else {
            t4 = $[4];
        }
        t3 = breadcrumbs.map(t4);
        $[1] = breadcrumbs;
        $[2] = t3;
    } else {
        t3 = $[2];
    }
    let t4;
    if ($[5] !== t3) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
            className: "flex items-center gap-2 text-sm mb-4",
            children: t3
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx",
            lineNumber: 46,
            columnNumber: 10
        }, this);
        $[5] = t3;
        $[6] = t4;
    } else {
        t4 = $[6];
    }
    let t5;
    if ($[7] !== pageTitle) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
            className: "text-2xl font-bold text-white mb-1",
            children: pageTitle
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx",
            lineNumber: 54,
            columnNumber: 10
        }, this);
        $[7] = pageTitle;
        $[8] = t5;
    } else {
        t5 = $[8];
    }
    let t6;
    if ($[9] !== greeting) {
        t6 = greeting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-sm text-[#999999]",
            children: greeting
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx",
            lineNumber: 62,
            columnNumber: 22
        }, this);
        $[9] = greeting;
        $[10] = t6;
    } else {
        t6 = $[10];
    }
    let t7;
    if ($[11] !== t5 || $[12] !== t6) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t5,
                t6
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx",
            lineNumber: 70,
            columnNumber: 10
        }, this);
        $[11] = t5;
        $[12] = t6;
        $[13] = t7;
    } else {
        t7 = $[13];
    }
    let t8;
    if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
        t8 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
            href: MAIN_SITE_URL,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "inline-flex items-center gap-2 px-4 py-2 text-sm text-[#999999] hover:text-white border border-[#333333] rounded-lg hover:border-[#7C3AED] transition-colors",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__["ExternalLink"], {
                    className: "w-4 h-4"
                }, void 0, false, {
                    fileName: "[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx",
                    lineNumber: 79,
                    columnNumber: 245
                }, this),
                "前往主站 (房東/租客/買家)"
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx",
            lineNumber: 79,
            columnNumber: 10
        }, this);
        $[14] = t8;
    } else {
        t8 = $[14];
    }
    let t9;
    if ($[15] !== headerActions) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center gap-4",
            children: [
                headerActions,
                t8
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx",
            lineNumber: 86,
            columnNumber: 10
        }, this);
        $[15] = headerActions;
        $[16] = t9;
    } else {
        t9 = $[16];
    }
    let t10;
    if ($[17] !== t7 || $[18] !== t9) {
        t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-between",
            children: [
                t7,
                t9
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx",
            lineNumber: 94,
            columnNumber: 11
        }, this);
        $[17] = t7;
        $[18] = t9;
        $[19] = t10;
    } else {
        t10 = $[19];
    }
    let t11;
    if ($[20] !== t10 || $[21] !== t4) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-[#1F1F1F] border-b border-[#333333] px-6 py-4",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-7xl mx-auto",
                children: [
                    t4,
                    t10
                ]
            }, void 0, true, {
                fileName: "[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx",
                lineNumber: 103,
                columnNumber: 77
            }, this)
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx",
            lineNumber: 103,
            columnNumber: 11
        }, this);
        $[20] = t10;
        $[21] = t4;
        $[22] = t11;
    } else {
        t11 = $[22];
    }
    let t12;
    if ($[23] !== children) {
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-7xl mx-auto px-6 py-8",
            children: children
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx",
            lineNumber: 112,
            columnNumber: 11
        }, this);
        $[23] = children;
        $[24] = t12;
    } else {
        t12 = $[24];
    }
    let t13;
    if ($[25] !== t11 || $[26] !== t12 || $[27] !== t2) {
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: t2,
            children: [
                t11,
                t12
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx",
            lineNumber: 120,
            columnNumber: 11
        }, this);
        $[25] = t11;
        $[26] = t12;
        $[27] = t2;
        $[28] = t13;
    } else {
        t13 = $[28];
    }
    return t13;
}
_c = DashboardLayout;
var _c;
__turbopack_context__.k.register(_c, "DashboardLayout");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/superadmin/components/ui/Badge.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Badge",
    ()=>Badge
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
;
;
function Badge(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(13);
    if ($[0] !== "8162859b3fca0746d5d61e30bfec98ef597817e62b922311a05a0c08c193ecee") {
        for(let $i = 0; $i < 13; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "8162859b3fca0746d5d61e30bfec98ef597817e62b922311a05a0c08c193ecee";
    }
    let children;
    let props;
    let t1;
    let t2;
    let t3;
    if ($[1] !== t0) {
        ({ className: t1, variant: t2, size: t3, children, ...props } = t0);
        $[1] = t0;
        $[2] = children;
        $[3] = props;
        $[4] = t1;
        $[5] = t2;
        $[6] = t3;
    } else {
        children = $[2];
        props = $[3];
        t1 = $[4];
        t2 = $[5];
        t3 = $[6];
    }
    const className = t1 === undefined ? "" : t1;
    const variant = t2 === undefined ? "default" : t2;
    const size = t3 === undefined ? "default" : t3;
    let t4;
    if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
        t4 = {
            default: "bg-[#333333] text-white",
            success: "bg-green-500/20 text-green-500",
            warning: "bg-yellow-500/20 text-yellow-500",
            error: "bg-red-500/20 text-red-500",
            info: "bg-blue-500/20 text-blue-500"
        };
        $[7] = t4;
    } else {
        t4 = $[7];
    }
    const variantClasses = t4;
    let t5;
    if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
        t5 = {
            default: "px-2 py-1 text-xs",
            sm: "px-1.5 py-0.5 text-[10px]"
        };
        $[8] = t5;
    } else {
        t5 = $[8];
    }
    const sizeClasses = t5;
    const t6 = `inline-flex items-center font-medium rounded ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
    let t7;
    if ($[9] !== children || $[10] !== props || $[11] !== t6) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: t6,
            ...props,
            children: children
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/ui/Badge.tsx",
            lineNumber: 68,
            columnNumber: 10
        }, this);
        $[9] = children;
        $[10] = props;
        $[11] = t6;
        $[12] = t7;
    } else {
        t7 = $[12];
    }
    return t7;
}
_c = Badge;
var _c;
__turbopack_context__.k.register(_c, "Badge");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/superadmin/components/dashboard/ProgressLink.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProgressLink",
    ()=>ProgressLink
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-right.js [app-client] (ecmascript) <export default as ArrowRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/superadmin/components/ui/Badge.tsx [app-client] (ecmascript)");
'use client';
;
;
;
;
;
function ProgressLink(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(14);
    if ($[0] !== "fd8fa2b6b9d64245511bb6ece233abc1b382201b8db833c216005bc436a24369") {
        for(let $i = 0; $i < 14; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "fd8fa2b6b9d64245511bb6ece233abc1b382201b8db833c216005bc436a24369";
    }
    const { link, className: t1 } = t0;
    const className = t1 === undefined ? "" : t1;
    let t2;
    if ($[1] !== link.href || $[2] !== link.query) {
        t2 = link.query ? `${link.href}?${new URLSearchParams(link.query).toString()}` : link.href;
        $[1] = link.href;
        $[2] = link.query;
        $[3] = t2;
    } else {
        t2 = $[3];
    }
    const href = t2;
    const t3 = `group flex items-center justify-between px-3 py-2 rounded-md text-sm text-[#999999] hover:bg-[#2A2A2A] hover:text-white transition-all ${className}`;
    let t4;
    if ($[4] !== link.badge) {
        t4 = link.badge && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
            variant: link.badge.variant,
            size: "sm",
            children: link.badge.count
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/dashboard/ProgressLink.tsx",
            lineNumber: 35,
            columnNumber: 24
        }, this);
        $[4] = link.badge;
        $[5] = t4;
    } else {
        t4 = $[5];
    }
    let t5;
    if ($[6] !== link.label || $[7] !== t4) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "flex items-center gap-2",
            children: [
                link.label,
                t4
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/components/dashboard/ProgressLink.tsx",
            lineNumber: 43,
            columnNumber: 10
        }, this);
        $[6] = link.label;
        $[7] = t4;
        $[8] = t5;
    } else {
        t5 = $[8];
    }
    let t6;
    if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
        t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
            className: "w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/dashboard/ProgressLink.tsx",
            lineNumber: 52,
            columnNumber: 10
        }, this);
        $[9] = t6;
    } else {
        t6 = $[9];
    }
    let t7;
    if ($[10] !== href || $[11] !== t3 || $[12] !== t5) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            href: href,
            className: t3,
            children: [
                t5,
                t6
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/components/dashboard/ProgressLink.tsx",
            lineNumber: 59,
            columnNumber: 10
        }, this);
        $[10] = href;
        $[11] = t3;
        $[12] = t5;
        $[13] = t7;
    } else {
        t7 = $[13];
    }
    return t7;
}
_c = ProgressLink;
var _c;
__turbopack_context__.k.register(_c, "ProgressLink");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/superadmin/components/dashboard/KPICard.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "KPICard",
    ()=>KPICard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-client] (ecmascript) <export default as TrendingUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trending-down.js [app-client] (ecmascript) <export default as TrendingDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/superadmin/components/ui/Card.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$dashboard$2f$ProgressLink$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/superadmin/components/dashboard/ProgressLink.tsx [app-client] (ecmascript)");
'use client';
;
;
;
;
;
function KPICard(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(43);
    if ($[0] !== "db2ad4a85735dd880637c9df708c2bef42e6c2960df67241bb1dcf9454efd4ac") {
        for(let $i = 0; $i < 43; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "db2ad4a85735dd880637c9df708c2bef42e6c2960df67241bb1dcf9454efd4ac";
    }
    const { config, loading, className: t1 } = t0;
    const className = t1 === undefined ? "" : t1;
    const { title, value, icon: Icon, color, trend, progressLinks } = config;
    if (loading?.isLoading) {
        const t2 = `p-6 ${className}`;
        let t3;
        if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
            t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-center h-32",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                    className: "w-6 h-6 animate-spin text-[#7C3AED]"
                }, void 0, false, {
                    fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                    lineNumber: 35,
                    columnNumber: 67
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                lineNumber: 35,
                columnNumber: 12
            }, this);
            $[1] = t3;
        } else {
            t3 = $[1];
        }
        let t4;
        if ($[2] !== t2) {
            t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                className: t2,
                children: t3
            }, void 0, false, {
                fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                lineNumber: 42,
                columnNumber: 12
            }, this);
            $[2] = t2;
            $[3] = t4;
        } else {
            t4 = $[3];
        }
        return t4;
    }
    if (loading?.error) {
        const t2 = `p-6 border-red-500 ${className}`;
        let t3;
        if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
            t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm text-red-500 mb-2",
                children: "載入失敗"
            }, void 0, false, {
                fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                lineNumber: 54,
                columnNumber: 12
            }, this);
            $[4] = t3;
        } else {
            t3 = $[4];
        }
        let t4;
        if ($[5] !== loading.error) {
            t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col items-center justify-center h-32 text-center",
                children: [
                    t3,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-[#666666]",
                        children: loading.error
                    }, void 0, false, {
                        fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                        lineNumber: 61,
                        columnNumber: 92
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                lineNumber: 61,
                columnNumber: 12
            }, this);
            $[5] = loading.error;
            $[6] = t4;
        } else {
            t4 = $[6];
        }
        let t5;
        if ($[7] !== t2 || $[8] !== t4) {
            t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                className: t2,
                children: t4
            }, void 0, false, {
                fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                lineNumber: 69,
                columnNumber: 12
            }, this);
            $[7] = t2;
            $[8] = t4;
            $[9] = t5;
        } else {
            t5 = $[9];
        }
        return t5;
    }
    if (loading?.isEmpty) {
        const t2 = `p-6 ${className}`;
        const t3 = `w-5 h-5 ${color}`;
        let t4;
        if ($[10] !== Icon || $[11] !== t3) {
            t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-2 rounded-lg bg-[#2A2A2A]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                    className: t3
                }, void 0, false, {
                    fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                    lineNumber: 83,
                    columnNumber: 57
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                lineNumber: 83,
                columnNumber: 12
            }, this);
            $[10] = Icon;
            $[11] = t3;
            $[12] = t4;
        } else {
            t4 = $[12];
        }
        let t5;
        if ($[13] !== title) {
            t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                className: "text-sm font-medium text-[#999999]",
                children: title
            }, void 0, false, {
                fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                lineNumber: 92,
                columnNumber: 12
            }, this);
            $[13] = title;
            $[14] = t5;
        } else {
            t5 = $[14];
        }
        let t6;
        if ($[15] !== t4 || $[16] !== t5) {
            t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-4 flex items-start justify-between",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-3",
                    children: [
                        t4,
                        t5
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                    lineNumber: 100,
                    columnNumber: 67
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                lineNumber: 100,
                columnNumber: 12
            }, this);
            $[15] = t4;
            $[16] = t5;
            $[17] = t6;
        } else {
            t6 = $[17];
        }
        let t7;
        let t8;
        if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
            t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-2xl font-bold text-white mb-4",
                children: "-"
            }, void 0, false, {
                fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                lineNumber: 110,
                columnNumber: 12
            }, this);
            t8 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm text-[#666666]",
                children: "暫無資料"
            }, void 0, false, {
                fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                lineNumber: 111,
                columnNumber: 12
            }, this);
            $[18] = t7;
            $[19] = t8;
        } else {
            t7 = $[18];
            t8 = $[19];
        }
        let t9;
        if ($[20] !== t2 || $[21] !== t6) {
            t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                className: t2,
                children: [
                    t6,
                    t7,
                    t8
                ]
            }, void 0, true, {
                fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                lineNumber: 120,
                columnNumber: 12
            }, this);
            $[20] = t2;
            $[21] = t6;
            $[22] = t9;
        } else {
            t9 = $[22];
        }
        return t9;
    }
    const t2 = `p-6 hover:border-[#7C3AED]/50 transition-all ${className}`;
    const t3 = `w-5 h-5 ${color}`;
    let t4;
    if ($[23] !== Icon || $[24] !== t3) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "p-2 rounded-lg bg-[#2A2A2A]",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                className: t3
            }, void 0, false, {
                fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                lineNumber: 133,
                columnNumber: 55
            }, this)
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
            lineNumber: 133,
            columnNumber: 10
        }, this);
        $[23] = Icon;
        $[24] = t3;
        $[25] = t4;
    } else {
        t4 = $[25];
    }
    let t5;
    if ($[26] !== title) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
            className: "text-sm font-medium text-[#999999]",
            children: title
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
            lineNumber: 142,
            columnNumber: 10
        }, this);
        $[26] = title;
        $[27] = t5;
    } else {
        t5 = $[27];
    }
    let t6;
    if ($[28] !== t4 || $[29] !== t5) {
        t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mb-4 flex items-start justify-between",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-3",
                children: [
                    t4,
                    t5
                ]
            }, void 0, true, {
                fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                lineNumber: 150,
                columnNumber: 65
            }, this)
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
            lineNumber: 150,
            columnNumber: 10
        }, this);
        $[28] = t4;
        $[29] = t5;
        $[30] = t6;
    } else {
        t6 = $[30];
    }
    let t7;
    if ($[31] !== value) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mb-4",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-3xl font-bold text-white",
                children: value
            }, void 0, false, {
                fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                lineNumber: 159,
                columnNumber: 32
            }, this)
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
            lineNumber: 159,
            columnNumber: 10
        }, this);
        $[31] = value;
        $[32] = t7;
    } else {
        t7 = $[32];
    }
    let t8;
    if ($[33] !== trend) {
        t8 = trend && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mb-4 flex items-center gap-2",
            children: [
                trend.direction === "up" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__["TrendingUp"], {
                    className: "w-4 h-4 text-green-500"
                }, void 0, false, {
                    fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                    lineNumber: 167,
                    columnNumber: 93
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingDown$3e$__["TrendingDown"], {
                    className: "w-4 h-4 text-red-500"
                }, void 0, false, {
                    fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                    lineNumber: 167,
                    columnNumber: 145
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: `text-sm font-medium ${trend.direction === "up" ? "text-green-500" : "text-red-500"}`,
                    children: [
                        trend.direction === "up" ? "+" : "-",
                        Math.abs(trend.value),
                        "%"
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                    lineNumber: 167,
                    columnNumber: 195
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-sm text-[#666666]",
                    children: trend.label
                }, void 0, false, {
                    fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
                    lineNumber: 167,
                    columnNumber: 368
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
            lineNumber: 167,
            columnNumber: 19
        }, this);
        $[33] = trend;
        $[34] = t8;
    } else {
        t8 = $[34];
    }
    let t9;
    if ($[35] !== progressLinks) {
        t9 = progressLinks.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mt-4 pt-4 border-t border-[#333333] space-y-1",
            children: progressLinks.map(_KPICardProgressLinksMap)
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
            lineNumber: 175,
            columnNumber: 38
        }, this);
        $[35] = progressLinks;
        $[36] = t9;
    } else {
        t9 = $[36];
    }
    let t10;
    if ($[37] !== t2 || $[38] !== t6 || $[39] !== t7 || $[40] !== t8 || $[41] !== t9) {
        t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
            className: t2,
            children: [
                t6,
                t7,
                t8,
                t9
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
            lineNumber: 183,
            columnNumber: 11
        }, this);
        $[37] = t2;
        $[38] = t6;
        $[39] = t7;
        $[40] = t8;
        $[41] = t9;
        $[42] = t10;
    } else {
        t10 = $[42];
    }
    return t10;
}
_c = KPICard;
function _KPICardProgressLinksMap(link, index) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$dashboard$2f$ProgressLink$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ProgressLink"], {
        link: link
    }, index, false, {
        fileName: "[project]/apps/superadmin/components/dashboard/KPICard.tsx",
        lineNumber: 196,
        columnNumber: 10
    }, this);
}
var _c;
__turbopack_context__.k.register(_c, "KPICard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/superadmin/components/dashboard/StatsGrid.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "StatsGrid",
    ()=>StatsGrid
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$dashboard$2f$KPICard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/superadmin/components/dashboard/KPICard.tsx [app-client] (ecmascript)");
'use client';
;
;
;
function StatsGrid(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(10);
    if ($[0] !== "883efbc0ed2c1b330fc85b7768a0bda7fd835c83c5b8df55d46b3489d65dd554") {
        for(let $i = 0; $i < 10; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "883efbc0ed2c1b330fc85b7768a0bda7fd835c83c5b8df55d46b3489d65dd554";
    }
    const { kpis, loading, columns: t1, className: t2 } = t0;
    const columns = t1 === undefined ? 4 : t1;
    const className = t2 === undefined ? "" : t2;
    let t3;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t3 = {
            2: "lg:grid-cols-2",
            3: "lg:grid-cols-3",
            4: "lg:grid-cols-4"
        };
        $[1] = t3;
    } else {
        t3 = $[1];
    }
    const gridColsClass = t3[columns];
    const t4 = `grid grid-cols-1 md:grid-cols-2 ${gridColsClass} gap-6 ${className}`;
    let t5;
    if ($[2] !== kpis || $[3] !== loading) {
        let t6;
        if ($[5] !== loading) {
            t6 = ({
                "StatsGrid[kpis.map()]": (kpi, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$dashboard$2f$KPICard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["KPICard"], {
                        config: kpi,
                        loading: loading?.[index]
                    }, index, false, {
                        fileName: "[project]/apps/superadmin/components/dashboard/StatsGrid.tsx",
                        lineNumber: 41,
                        columnNumber: 50
                    }, this)
            })["StatsGrid[kpis.map()]"];
            $[5] = loading;
            $[6] = t6;
        } else {
            t6 = $[6];
        }
        t5 = kpis.map(t6);
        $[2] = kpis;
        $[3] = loading;
        $[4] = t5;
    } else {
        t5 = $[4];
    }
    let t6;
    if ($[7] !== t4 || $[8] !== t5) {
        t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: t4,
            children: t5
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/components/dashboard/StatsGrid.tsx",
            lineNumber: 57,
            columnNumber: 10
        }, this);
        $[7] = t4;
        $[8] = t5;
        $[9] = t6;
    } else {
        t6 = $[9];
    }
    return t6;
}
_c = StatsGrid;
var _c;
__turbopack_context__.k.register(_c, "StatsGrid");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/superadmin/components/dashboard/index.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$dashboard$2f$DashboardLayout$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$dashboard$2f$KPICard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/superadmin/components/dashboard/KPICard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$dashboard$2f$ProgressLink$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/superadmin/components/dashboard/ProgressLink.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$dashboard$2f$StatsGrid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/superadmin/components/dashboard/StatsGrid.tsx [app-client] (ecmascript)");
;
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SuperadminDashboardClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/users.js [app-client] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/house.js [app-client] (ecmascript) <export default as Home>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Key$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/key.js [app-client] (ecmascript) <export default as Key>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield.js [app-client] (ecmascript) <export default as Shield>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-text.js [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/settings.js [app-client] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/superadmin/components/ui/Button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/superadmin/components/ui/Card.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$dashboard$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/superadmin/components/dashboard/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$dashboard$2f$DashboardLayout$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/superadmin/components/dashboard/DashboardLayout.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$dashboard$2f$StatsGrid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/superadmin/components/dashboard/StatsGrid.tsx [app-client] (ecmascript)");
'use client';
;
;
;
;
;
;
;
const BASE = '/superadmin';
function SuperadminDashboardClient(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(42);
    if ($[0] !== "5633f371d699fd6b5b9f027f86be1cfa7451300e336ce9f558146a068f1ae3fe") {
        for(let $i = 0; $i < 42; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "5633f371d699fd6b5b9f027f86be1cfa7451300e336ce9f558146a068f1ae3fe";
    }
    const { stats } = t0;
    let t1;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = [
            {
                label: "\u7BA1\u7406\u7528\u6236",
                href: `${BASE}/users`
            },
            {
                label: "\u7FA4\u7D44\u7BA1\u7406",
                href: `${BASE}/groups`
            }
        ];
        $[1] = t1;
    } else {
        t1 = $[1];
    }
    let t2;
    if ($[2] !== stats.totalUsers) {
        t2 = {
            title: "\u7E3D\u7528\u6236\u6578",
            value: stats.totalUsers,
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"],
            color: "text-blue-500",
            progressLinks: t1
        };
        $[2] = stats.totalUsers;
        $[3] = t2;
    } else {
        t2 = $[3];
    }
    let t3;
    if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
        t3 = [
            {
                label: "\u67E5\u770B\u6240\u6709\u7269\u4EF6",
                href: `${BASE}/properties`
            }
        ];
        $[4] = t3;
    } else {
        t3 = $[4];
    }
    let t4;
    if ($[5] !== stats.totalProperties) {
        t4 = {
            title: "\u7E3D\u7269\u4EF6\u6578",
            value: stats.totalProperties,
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__["Home"],
            color: "text-green-500",
            progressLinks: t3
        };
        $[5] = stats.totalProperties;
        $[6] = t4;
    } else {
        t4 = $[6];
    }
    let t5;
    if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
        t5 = [
            {
                label: "\u67E5\u770B\u79DF\u7D04",
                href: `${BASE}/leases`
            }
        ];
        $[7] = t5;
    } else {
        t5 = $[7];
    }
    let t6;
    if ($[8] !== stats.activeRentals) {
        t6 = {
            title: "\u6D3B\u8E8D\u79DF\u8CC3",
            value: stats.activeRentals,
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Key$3e$__["Key"],
            color: "text-purple-500",
            progressLinks: t5
        };
        $[8] = stats.activeRentals;
        $[9] = t6;
    } else {
        t6 = $[9];
    }
    let t7;
    if ($[10] !== stats.pendingVerifications) {
        t7 = stats.pendingVerifications > 0 ? {
            count: stats.pendingVerifications,
            variant: "warning"
        } : undefined;
        $[10] = stats.pendingVerifications;
        $[11] = t7;
    } else {
        t7 = $[11];
    }
    let t8;
    if ($[12] !== t7) {
        t8 = [
            {
                label: "\u5BE9\u6838\u7533\u8ACB",
                href: `${BASE}/verifications`,
                badge: t7
            }
        ];
        $[12] = t7;
        $[13] = t8;
    } else {
        t8 = $[13];
    }
    let t9;
    if ($[14] !== stats.pendingVerifications || $[15] !== t8) {
        t9 = {
            title: "\u7CFB\u7D71\u5F85\u8FA6",
            value: stats.pendingVerifications,
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"],
            color: "text-orange-500",
            progressLinks: t8
        };
        $[14] = stats.pendingVerifications;
        $[15] = t8;
        $[16] = t9;
    } else {
        t9 = $[16];
    }
    let t10;
    if ($[17] !== t2 || $[18] !== t4 || $[19] !== t6 || $[20] !== t9) {
        t10 = [
            t2,
            t4,
            t6,
            t9
        ];
        $[17] = t2;
        $[18] = t4;
        $[19] = t6;
        $[20] = t9;
        $[21] = t10;
    } else {
        t10 = $[21];
    }
    const kpis = t10;
    let t11;
    if ($[22] !== kpis) {
        t11 = kpis.map(_SuperadminDashboardClientKpisMap);
        $[22] = kpis;
        $[23] = t11;
    } else {
        t11 = $[23];
    }
    const kpiLoadingStates = t11;
    let t12;
    if ($[24] === Symbol.for("react.memo_cache_sentinel")) {
        t12 = [
            {
                label: "\u9996\u9801",
                href: "/"
            },
            {
                label: "\u8D85\u7D1A\u7BA1\u7406\u54E1\u5C08\u5340",
                href: `${BASE}`
            },
            {
                label: "\u5100\u8868\u677F"
            }
        ];
        $[24] = t12;
    } else {
        t12 = $[24];
    }
    let t13;
    if ($[25] === Symbol.for("react.memo_cache_sentinel")) {
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            href: `${BASE}/settings`,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"], {
                        className: "w-5 h-5 mr-2"
                    }, void 0, false, {
                        fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                        lineNumber: 173,
                        columnNumber: 51
                    }, this),
                    "系統設定"
                ]
            }, void 0, true, {
                fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                lineNumber: 173,
                columnNumber: 43
            }, this)
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
            lineNumber: 173,
            columnNumber: 11
        }, this);
        $[25] = t13;
    } else {
        t13 = $[25];
    }
    let t14;
    if ($[26] !== kpiLoadingStates || $[27] !== kpis) {
        t14 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$dashboard$2f$StatsGrid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatsGrid"], {
            kpis: kpis,
            loading: kpiLoadingStates,
            columns: 4,
            className: "mb-8"
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
            lineNumber: 180,
            columnNumber: 11
        }, this);
        $[26] = kpiLoadingStates;
        $[27] = kpis;
        $[28] = t14;
    } else {
        t14 = $[28];
    }
    let t15;
    if ($[29] === Symbol.for("react.memo_cache_sentinel")) {
        t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                children: "快速操作"
            }, void 0, false, {
                fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                lineNumber: 189,
                columnNumber: 23
            }, this)
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
            lineNumber: 189,
            columnNumber: 11
        }, this);
        $[29] = t15;
    } else {
        t15 = $[29];
    }
    let t16;
    if ($[30] === Symbol.for("react.memo_cache_sentinel")) {
        t16 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            href: `${BASE}/users`,
            className: "flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"], {
                        className: "w-5 h-5 text-blue-500"
                    }, void 0, false, {
                        fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                        lineNumber: 196,
                        columnNumber: 296
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                    lineNumber: 196,
                    columnNumber: 183
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                            className: "text-white font-medium",
                            children: "用戶管理"
                        }, void 0, false, {
                            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                            lineNumber: 196,
                            columnNumber: 350
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm text-[#999999]",
                            children: "管理系統用戶與權限"
                        }, void 0, false, {
                            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                            lineNumber: 196,
                            columnNumber: 398
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                    lineNumber: 196,
                    columnNumber: 345
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
            lineNumber: 196,
            columnNumber: 11
        }, this);
        $[30] = t16;
    } else {
        t16 = $[30];
    }
    let t17;
    if ($[31] === Symbol.for("react.memo_cache_sentinel")) {
        t17 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            href: `${BASE}/groups`,
            className: "flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                        className: "w-5 h-5 text-purple-500"
                    }, void 0, false, {
                        fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                        lineNumber: 203,
                        columnNumber: 301
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                    lineNumber: 203,
                    columnNumber: 184
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                            className: "text-white font-medium",
                            children: "權限群組"
                        }, void 0, false, {
                            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                            lineNumber: 203,
                            columnNumber: 358
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm text-[#999999]",
                            children: "設定角色與存取控制"
                        }, void 0, false, {
                            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                            lineNumber: 203,
                            columnNumber: 406
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                    lineNumber: 203,
                    columnNumber: 353
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
            lineNumber: 203,
            columnNumber: 11
        }, this);
        $[31] = t17;
    } else {
        t17 = $[31];
    }
    let t18;
    if ($[32] === Symbol.for("react.memo_cache_sentinel")) {
        t18 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            href: `${BASE}/dashboard/role_access_matrix`,
            className: "flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center group-hover:bg-indigo-500/20",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                        className: "w-5 h-5 text-indigo-500"
                    }, void 0, false, {
                        fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                        lineNumber: 210,
                        columnNumber: 323
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                    lineNumber: 210,
                    columnNumber: 206
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                            className: "text-white font-medium",
                            children: "權限矩陣 (Access Matrix)"
                        }, void 0, false, {
                            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                            lineNumber: 210,
                            columnNumber: 380
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm text-[#999999]",
                            children: "管理角色與資源權限"
                        }, void 0, false, {
                            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                            lineNumber: 210,
                            columnNumber: 444
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                    lineNumber: 210,
                    columnNumber: 375
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
            lineNumber: 210,
            columnNumber: 11
        }, this);
        $[32] = t18;
    } else {
        t18 = $[32];
    }
    let t19;
    if ($[33] === Symbol.for("react.memo_cache_sentinel")) {
        t19 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            href: `${BASE}/dashboard/supabase`,
            className: "flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                        className: "w-5 h-5 text-green-500"
                    }, void 0, false, {
                        fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                        lineNumber: 217,
                        columnNumber: 311
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                    lineNumber: 217,
                    columnNumber: 196
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                            className: "text-white font-medium",
                            children: "Supabase 管理"
                        }, void 0, false, {
                            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                            lineNumber: 217,
                            columnNumber: 367
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm text-[#999999]",
                            children: "資料庫監控與 RLS 管理"
                        }, void 0, false, {
                            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                            lineNumber: 217,
                            columnNumber: 422
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                    lineNumber: 217,
                    columnNumber: 362
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
            lineNumber: 217,
            columnNumber: 11
        }, this);
        $[33] = t19;
    } else {
        t19 = $[33];
    }
    let t20;
    if ($[34] === Symbol.for("react.memo_cache_sentinel")) {
        t20 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
            children: [
                t15,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                    className: "space-y-3",
                    children: [
                        t16,
                        t17,
                        t18,
                        t19,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: `${BASE}/logs`,
                            className: "flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center group-hover:bg-yellow-500/20",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                        className: "w-5 h-5 text-yellow-500"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                                        lineNumber: 224,
                                        columnNumber: 365
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                                    lineNumber: 224,
                                    columnNumber: 248
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                            className: "text-white font-medium",
                                            children: "系統日誌"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                                            lineNumber: 224,
                                            columnNumber: 424
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm text-[#999999]",
                                            children: "查看操作記錄與錯誤"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                                            lineNumber: 224,
                                            columnNumber: 472
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                                    lineNumber: 224,
                                    columnNumber: 419
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                            lineNumber: 224,
                            columnNumber: 77
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                    lineNumber: 224,
                    columnNumber: 22
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
            lineNumber: 224,
            columnNumber: 11
        }, this);
        $[34] = t20;
    } else {
        t20 = $[34];
    }
    let t21;
    if ($[35] === Symbol.for("react.memo_cache_sentinel")) {
        t21 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                children: "系統狀態"
            }, void 0, false, {
                fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                lineNumber: 231,
                columnNumber: 23
            }, this)
        }, void 0, false, {
            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
            lineNumber: 231,
            columnNumber: 11
        }, this);
        $[35] = t21;
    } else {
        t21 = $[35];
    }
    let t22;
    if ($[36] === Symbol.for("react.memo_cache_sentinel")) {
        t22 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-sm text-[#999999]",
                    children: "API 狀態"
                }, void 0, false, {
                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                    lineNumber: 238,
                    columnNumber: 90
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-sm font-medium text-green-500",
                    children: "正常運作"
                }, void 0, false, {
                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                    lineNumber: 238,
                    columnNumber: 144
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
            lineNumber: 238,
            columnNumber: 11
        }, this);
        $[36] = t22;
    } else {
        t22 = $[36];
    }
    let t23;
    if ($[37] === Symbol.for("react.memo_cache_sentinel")) {
        t23 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-sm text-[#999999]",
                    children: "資料庫連線"
                }, void 0, false, {
                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                    lineNumber: 245,
                    columnNumber: 90
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-sm font-medium text-green-500",
                    children: "已連線"
                }, void 0, false, {
                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                    lineNumber: 245,
                    columnNumber: 143
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
            lineNumber: 245,
            columnNumber: 11
        }, this);
        $[37] = t23;
    } else {
        t23 = $[37];
    }
    let t24;
    if ($[38] === Symbol.for("react.memo_cache_sentinel")) {
        t24 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-sm text-[#999999]",
                    children: "儲存空間使用量"
                }, void 0, false, {
                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                    lineNumber: 252,
                    columnNumber: 90
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-sm font-medium text-white",
                    children: "45.2 GB / 1 TB"
                }, void 0, false, {
                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                    lineNumber: 252,
                    columnNumber: 145
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
            lineNumber: 252,
            columnNumber: 11
        }, this);
        $[38] = t24;
    } else {
        t24 = $[38];
    }
    let t25;
    if ($[39] === Symbol.for("react.memo_cache_sentinel")) {
        t25 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
            children: [
                t20,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                    children: [
                        t21,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$ui$2f$Card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-4",
                                children: [
                                    t22,
                                    t23,
                                    t24,
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-sm text-[#999999]",
                                                children: "系統版本"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                                                lineNumber: 259,
                                                columnNumber: 216
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-sm font-medium text-white",
                                                children: "v1.0.0-beta"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                                                lineNumber: 259,
                                                columnNumber: 268
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                                        lineNumber: 259,
                                        columnNumber: 137
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                                lineNumber: 259,
                                columnNumber: 95
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                            lineNumber: 259,
                            columnNumber: 82
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
                    lineNumber: 259,
                    columnNumber: 71
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
            lineNumber: 259,
            columnNumber: 11
        }, this);
        $[39] = t25;
    } else {
        t25 = $[39];
    }
    let t26;
    if ($[40] !== t14) {
        t26 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$superadmin$2f$components$2f$dashboard$2f$DashboardLayout$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DashboardLayout"], {
            currentRole: "superadmin",
            pageTitle: "\u7CFB\u7D71\u7BA1\u7406\u5100\u8868\u677F",
            breadcrumbs: t12,
            greeting: "\u6B61\u8FCE\u56DE\u4F86\uFF0C\u7CFB\u7D71\u7BA1\u7406\u54E1",
            headerActions: t13,
            children: [
                t14,
                t25
            ]
        }, void 0, true, {
            fileName: "[project]/apps/superadmin/app/superadmin/dashboard/SuperadminDashboardClient.tsx",
            lineNumber: 266,
            columnNumber: 11
        }, this);
        $[40] = t14;
        $[41] = t26;
    } else {
        t26 = $[41];
    }
    return t26;
}
_c = SuperadminDashboardClient;
function _SuperadminDashboardClientKpisMap() {
    return {
        isLoading: false,
        isEmpty: false
    };
}
var _c;
__turbopack_context__.k.register(_c, "SuperadminDashboardClient");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=apps_superadmin_323d8baf._.js.map