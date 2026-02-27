#!/usr/bin/env python3
"""
Sync roadmap data from the project progress dashboard into Plane.
Creates: Labels, Modules, Cycles, Issues (Work Items) via REST API.
DB items (Views, Pages, Intake) are handled by the companion SQL script.
"""

import json
import sys
import time
import urllib.request
import urllib.error

PLANE_URL = "http://localhost:8080"
API_TOKEN = "plane_api_7fe6d52f3fc999fa7120c78dd7f814bcb5d2ef4e5ff03239"
WORKSPACE_SLUG = "owner-property-management"
WORKSPACE_ID = "3d89e847-5c46-49c3-ad41-53b9f75a76e8"
PROJECT_ID = "f52a75a6-3bba-4193-9b02-7d5045dc93b9"
USER_ID = "fa5eeb07-8237-4362-b34d-8291781fdee5"

STATES = {
    "backlog":     "fb988e1f-44a2-426e-bd42-fbbc66749562",
    "todo":        "14abace9-6cfa-4001-9031-e270c1c25b06",
    "in_progress": "a4993c10-3e55-4112-a275-552b54e5a46e",
    "done":        "cf74ed40-a2f3-4fa1-9914-de4014181d7e",
}

CATEGORY_LABELS = {
    "超級管理員 (Super Admin)":           "#EF4444",
    "買家 (Buyer)":                       "#3B82F6",
    "公司頁面 (Company Pages)":           "#8B5CF6",
    "第三方加值服務 (Third Party)":         "#F59E0B",
    "房東 (Landlord)":                    "#10B981",
    "租客 (Tenant)":                      "#06B6D4",
    "合約與法務 (Contracts & Legal)":      "#EC4899",
    "通用/系統 (General/System)":          "#6366F1",
    "金流支付 (Payments)":                "#F97316",
    "測試與品質保證 (Testing & QA)":       "#14B8A6",
    "專案管理與工具 (Project Management)": "#64748B",
}

PHASE_MODULES = [
    {"name": "Phase 1 — Development (開發階段)", "description": "功能開發、UI 實作、API 建置", "status": "started"},
    {"name": "Phase 2 — Testing (測試階段)", "description": "單元測試、整合測試、E2E 測試、品質驗證", "status": "planned"},
    {"name": "Phase 3 — Deployment (部署階段)", "description": "環境部署、CI/CD、版本發佈", "status": "planned"},
    {"name": "Phase 4 — Operations (運維階段)", "description": "監控、維運、效能調校、事故回應", "status": "planned"},
]

CYCLES = [
    {"name": "Sprint 1 — MVP Core (核心功能)", "description": "使用者認證、房東儀表板、物件管理基礎功能", "start_date": "2026-01-15", "end_date": "2026-03-15"},
    {"name": "Sprint 2 — Tenant & Buyer (租客與買家)", "description": "租客/買家儀表板、溝通中心、繳費記錄", "start_date": "2026-03-16", "end_date": "2026-05-15"},
    {"name": "Sprint 3 — Finance & Contracts (金融與合約)", "description": "金流支付整合、合約管理、報稅功能", "start_date": "2026-05-16", "end_date": "2026-07-15"},
    {"name": "Sprint 4 — AI & Advanced (AI 與進階)", "description": "AI 語音助理、部落格 AI 寫手、照片增生", "start_date": "2026-07-16", "end_date": "2026-09-15"},
    {"name": "Sprint 5 — Polish & Launch (優化與上線)", "description": "第三方整合、效能監控、安全審計、正式上線", "start_date": "2026-09-16", "end_date": "2026-11-15"},
]

FEATURES = [
    {"name": "超級管理員-儀表板", "pct": 95, "cat": "超級管理員 (Super Admin)", "pts": 8, "phase": "development", "desc": "登入後首頁需顯示系統關鍵指標(KPI)，包含總用戶數、總物件數、成交金額。需提供圖表視覺化呈現最近30天的平台流量趨勢。"},
    {"name": "超級管理員-網站行為監控與紀錄功能", "pct": 0, "cat": "超級管理員 (Super Admin)", "pts": 5, "phase": "development"},
    {"name": "超級管理員的RBAC CRUD平台", "pct": 0, "cat": "超級管理員 (Super Admin)", "pts": 8, "phase": "development"},
    {"name": "超級管理員-雲端空間管理平台", "pct": 0, "cat": "超級管理員 (Super Admin)", "pts": 5, "phase": "development"},
    {"name": "超級管理員針對各種Roles的Access Matrix管理平台", "pct": 60, "cat": "超級管理員 (Super Admin)", "pts": 8, "phase": "development"},
    {"name": "超級管理員-資料庫Supabase管理功能", "pct": 0, "cat": "超級管理員 (Super Admin)", "pts": 5, "phase": "development"},
    {"name": "超級管理員-資料庫Elastic Search管理功能", "pct": 0, "cat": "超級管理員 (Super Admin)", "pts": 5, "phase": "development"},
    {"name": "超級管理員AI LLM API效能監控－AI語音回應可靠度監控功能", "pct": 0, "cat": "超級管理員 (Super Admin)", "pts": 8, "phase": "development"},
    {"name": "超級管理員-網路安全－隱私審計管理功能", "pct": 0, "cat": "超級管理員 (Super Admin)", "pts": 5, "phase": "development"},
    {"name": "超級管理員-網站效能監控功能", "pct": 0, "cat": "超級管理員 (Super Admin)", "pts": 5, "phase": "development"},
    {"name": "超級管理員-AI 服務設定（API 金鑰與模型費用）", "pct": 85, "cat": "超級管理員 (Super Admin)", "pts": 5, "phase": "development", "desc": "API 金鑰管理：從 .env 導入、單筆/全部刪除、金鑰驗證。儲存設定按鈕。"},

    {"name": "買家(已簽約)-儀表板", "pct": 50, "cat": "買家 (Buyer)", "pts": 5, "phase": "development"},
    {"name": "買家的溝通中心", "pct": 0, "cat": "買家 (Buyer)", "pts": 3, "phase": "development"},
    {"name": "買家的繳費記錄", "pct": 0, "cat": "買家 (Buyer)", "pts": 3, "phase": "development"},

    {"name": "公司首頁", "pct": 80, "cat": "公司頁面 (Company Pages)", "pts": 5, "phase": "development"},
    {"name": "公司產品費用說明頁", "pct": 0, "cat": "公司頁面 (Company Pages)", "pts": 2, "phase": "development"},
    {"name": "公司產品Q&A+Need Help頁", "pct": 0, "cat": "公司頁面 (Company Pages)", "pts": 2, "phase": "development"},
    {"name": "公司產品教學", "pct": 0, "cat": "公司頁面 (Company Pages)", "pts": 3, "phase": "development"},
    {"name": "聯絡我們>發送訊息功能", "pct": 100, "cat": "公司頁面 (Company Pages)", "pts": 3, "phase": "development"},

    {"name": "第三方加值服務－智能門鎖", "pct": 0, "cat": "第三方加值服務 (Third Party)", "pts": 5, "phase": "development"},
    {"name": "第三方加值服務－保險方案", "pct": 0, "cat": "第三方加值服務 (Third Party)", "pts": 5, "phase": "development"},
    {"name": "第三方加值服務－攝影機監控", "pct": 0, "cat": "第三方加值服務 (Third Party)", "pts": 5, "phase": "development"},
    {"name": "第三方加值服務－租金保障", "pct": 0, "cat": "第三方加值服務 (Third Party)", "pts": 5, "phase": "development"},

    {"name": "房東-儀表板", "pct": 90, "cat": "房東 (Landlord)", "pts": 8, "phase": "development"},
    {"name": "房東的Access Matrix管理平台", "pct": 60, "cat": "房東 (Landlord)", "pts": 8, "phase": "development"},
    {"name": "房東新增物件方式1－手動輸入", "pct": 85, "cat": "房東 (Landlord)", "pts": 5, "phase": "development"},
    {"name": "房東新增物件方式2－自動填入 (VLM/OCR)", "pct": 95, "cat": "房東 (Landlord)", "pts": 8, "phase": "development"},
    {"name": "房東的預約看房管理功能", "pct": 0, "cat": "房東 (Landlord)", "pts": 3, "phase": "development"},
    {"name": "房東的客戶－Details模式", "pct": 0, "cat": "房東 (Landlord)", "pts": 2, "phase": "development"},
    {"name": "房東的客戶－Grid模式", "pct": 0, "cat": "房東 (Landlord)", "pts": 2, "phase": "development"},
    {"name": "房東的客戶－List模式", "pct": 0, "cat": "房東 (Landlord)", "pts": 2, "phase": "development"},
    {"name": "房東的客戶－新增客戶", "pct": 0, "cat": "房東 (Landlord)", "pts": 3, "phase": "development"},
    {"name": "房東的客戶－成交客戶", "pct": 0, "cat": "房東 (Landlord)", "pts": 3, "phase": "development"},
    {"name": "房東－邀請第三人成為user的功能", "pct": 0, "cat": "房東 (Landlord)", "pts": 3, "phase": "development"},
    {"name": "房東的部落格創建功能", "pct": 0, "cat": "房東 (Landlord)", "pts": 5, "phase": "development"},
    {"name": "房東給租客的Q&A", "pct": 0, "cat": "房東 (Landlord)", "pts": 2, "phase": "development"},
    {"name": "房東給買家的Q&A", "pct": 0, "cat": "房東 (Landlord)", "pts": 2, "phase": "development"},
    {"name": "一鍵生成物件銷售部落格", "pct": 0, "cat": "房東 (Landlord)", "pts": 5, "phase": "development"},
    {"name": "房東的部落格 AI 寫手", "pct": 0, "cat": "房東 (Landlord)", "pts": 5, "phase": "development"},
    {"name": "房東的部落格 AI 講房", "pct": 0, "cat": "房東 (Landlord)", "pts": 5, "phase": "development"},
    {"name": "房東自定義銷售物件的Q&A功能", "pct": 0, "cat": "房東 (Landlord)", "pts": 3, "phase": "development"},
    {"name": "房東自定義出租物件的Q&A功能", "pct": 0, "cat": "房東 (Landlord)", "pts": 3, "phase": "development"},
    {"name": "AI TTS語音助理+物件專屬轉接號碼", "pct": 0, "cat": "房東 (Landlord)", "pts": 8, "phase": "development"},
    {"name": "房東的仲介－Details模式", "pct": 0, "cat": "房東 (Landlord)", "pts": 2, "phase": "development"},
    {"name": "房東的仲介－Grid模式", "pct": 0, "cat": "房東 (Landlord)", "pts": 2, "phase": "development"},
    {"name": "房東的仲介－List模式", "pct": 0, "cat": "房東 (Landlord)", "pts": 2, "phase": "development"},
    {"name": "房東的仲介－新增仲介", "pct": 0, "cat": "房東 (Landlord)", "pts": 3, "phase": "development"},
    {"name": "房東財務－銀行帳戶管理", "pct": 0, "cat": "房東 (Landlord)", "pts": 3, "phase": "development"},
    {"name": "房東財務－收支明細儀表板", "pct": 0, "cat": "房東 (Landlord)", "pts": 5, "phase": "development"},
    {"name": "房東財務－租金收支管理", "pct": 0, "cat": "房東 (Landlord)", "pts": 5, "phase": "development"},
    {"name": "房東財務－ATO租賃報稅表生成功能", "pct": 0, "cat": "房東 (Landlord)", "pts": 5, "phase": "development"},
    {"name": "房東財務－台灣租賃報稅表生成功能", "pct": 0, "cat": "房東 (Landlord)", "pts": 5, "phase": "development"},
    {"name": "房東的溝通頁面", "pct": 0, "cat": "房東 (Landlord)", "pts": 3, "phase": "development"},
    {"name": "房東的物件展示功能－Details模式", "pct": 0, "cat": "房東 (Landlord)", "pts": 2, "phase": "development"},
    {"name": "房東的物件展示功能－Grid模式", "pct": 0, "cat": "房東 (Landlord)", "pts": 2, "phase": "development"},
    {"name": "房東的物件－照片增生功能 (AI)", "pct": 0, "cat": "房東 (Landlord)", "pts": 8, "phase": "development"},
    {"name": "房東的物件展示功能－List模式", "pct": 0, "cat": "房東 (Landlord)", "pts": 2, "phase": "development"},
    {"name": "房東的維修派工管理", "pct": 0, "cat": "房東 (Landlord)", "pts": 5, "phase": "development"},
    {"name": "房東的行銷部落格網站行為監控", "pct": 0, "cat": "房東 (Landlord)", "pts": 5, "phase": "development"},
    {"name": "房東的email inbox信箱", "pct": 0, "cat": "房東 (Landlord)", "pts": 5, "phase": "development"},
    {"name": "房東的客戶-租客篩選功能", "pct": 0, "cat": "房東 (Landlord)", "pts": 5, "phase": "development"},
    {"name": "房東的會計人員查帳審計功能", "pct": 0, "cat": "房東 (Landlord)", "pts": 5, "phase": "development"},

    {"name": "租客(已簽約)-儀表板", "pct": 90, "cat": "租客 (Tenant)", "pts": 5, "phase": "development"},
    {"name": "租客(潛在)-儀表板", "pct": 90, "cat": "租客 (Tenant)", "pts": 5, "phase": "development"},
    {"name": "租客的維修申請", "pct": 0, "cat": "租客 (Tenant)", "pts": 3, "phase": "development"},
    {"name": "租客的溝通中心", "pct": 0, "cat": "租客 (Tenant)", "pts": 3, "phase": "development"},
    {"name": "租客的繳費記錄", "pct": 0, "cat": "租客 (Tenant)", "pts": 3, "phase": "development"},

    {"name": "買賣合約附加條款功能", "pct": 0, "cat": "合約與法務 (Contracts & Legal)", "pts": 3, "phase": "development"},
    {"name": "租賃合約附加條款功能", "pct": 0, "cat": "合約與法務 (Contracts & Legal)", "pts": 3, "phase": "development"},
    {"name": "一鍵生成買賣制式合約", "pct": 0, "cat": "合約與法務 (Contracts & Legal)", "pts": 5, "phase": "development"},
    {"name": "一鍵生成租賃制式合約", "pct": 0, "cat": "合約與法務 (Contracts & Legal)", "pts": 5, "phase": "development"},
    {"name": "電子簽約功能", "pct": 0, "cat": "合約與法務 (Contracts & Legal)", "pts": 8, "phase": "development"},

    {"name": "一鍵切換UI風格：暗/亮模式", "pct": 0, "cat": "通用/系統 (General/System)", "pts": 2, "phase": "development"},
    {"name": "RWD網頁響應式設計", "pct": 80, "cat": "通用/系統 (General/System)", "pts": 5, "phase": "development"},
    {"name": "使用者身份驗證系統", "pct": 90, "cat": "通用/系統 (General/System)", "pts": 8, "phase": "development"},
    {"name": "註冊的使用者都有自己的行事曆管理頁面", "pct": 0, "cat": "通用/系統 (General/System)", "pts": 3, "phase": "development"},
    {"name": "使用者登入頁面", "pct": 100, "cat": "通用/系統 (General/System)", "pts": 3, "phase": "development"},
    {"name": "使用者登入頁面-記住我功能", "pct": 100, "cat": "通用/系統 (General/System)", "pts": 2, "phase": "development"},
    {"name": "使用者密碼重設頁面", "pct": 95, "cat": "通用/系統 (General/System)", "pts": 3, "phase": "development"},
    {"name": "使用者的溝通頁面", "pct": 0, "cat": "通用/系統 (General/System)", "pts": 3, "phase": "development"},
    {"name": "受邀使用者登入介面", "pct": 0, "cat": "通用/系統 (General/System)", "pts": 3, "phase": "development"},
    {"name": "謄本權狀掃描功能", "pct": 95, "cat": "通用/系統 (General/System)", "pts": 5, "phase": "development"},
    {"name": "上傳物件照片功能", "pct": 95, "cat": "通用/系統 (General/System)", "pts": 3, "phase": "development"},
    {"name": "登入／Portal／IAM 角色流程與 Superadmin 全角色選單", "pct": 100, "cat": "通用/系統 (General/System)", "pts": 5, "phase": "development", "desc": "登入後一律進 Portal；多角色與 middleware 同步；Portal 顯示使用者 IAM 角色卡。"},
    {"name": "OAuth 用戶新增角色功能修復", "pct": 100, "cat": "通用/系統 (General/System)", "pts": 5, "phase": "development", "desc": "修復 OAuth 登入用戶在 Portal 新增角色時的失敗問題。"},

    {"name": "可用的付款方式之一: ID pay", "pct": 0, "cat": "金流支付 (Payments)", "pts": 5, "phase": "development"},
    {"name": "可用的付款方式之一: Apple Pay", "pct": 0, "cat": "金流支付 (Payments)", "pts": 5, "phase": "development"},
    {"name": "可用的付款方式之一: PayPal", "pct": 0, "cat": "金流支付 (Payments)", "pts": 5, "phase": "development"},
    {"name": "可用的付款方式之一: Credit card", "pct": 0, "cat": "金流支付 (Payments)", "pts": 5, "phase": "development"},
    {"name": "線上支付功能", "pct": 0, "cat": "金流支付 (Payments)", "pts": 5, "phase": "development"},

    {"name": "登入頁面>「記住我」功能 TDD 開發進度檢測報告", "pct": 100, "cat": "測試與品質保證 (Testing & QA)", "pts": 5, "phase": "testing"},

    {"name": "專案開發進度儀表板重構 (Project Dashboard Overhaul)", "pct": 100, "cat": "專案管理與工具 (Project Management)", "pts": 3, "phase": "development"},
    {"name": "OCR 服務 lint 與型別檢查修正", "pct": 100, "cat": "專案管理與工具 (Project Management)", "pts": 3, "phase": "development", "desc": "修復 OCR 服務 ruff 規範問題並完成 ruff 驗證。"},
    {"name": "刪除錯誤的 vercel.json 配置文件", "pct": 100, "cat": "專案管理與工具 (Project Management)", "pts": 2, "phase": "development", "desc": "移除破壞 Next.js App Router 的 SPA 重寫規則配置。"},
    {"name": "Winston 日誌系統重構為 Supabase 資料庫日誌", "pct": 100, "cat": "專案管理與工具 (Project Management)", "pts": 5, "phase": "development", "desc": "將 Winston 日誌改造為 Supabase 資料庫日誌。"},
    {"name": "雲端部署平台選擇說明書", "pct": 100, "cat": "專案管理與工具 (Project Management)", "pts": 3, "phase": "development", "desc": "撰寫雲端部署平台選擇指南，涵蓋 7 個平台對比。"},
    {"name": "Project Progress Dashboard — 四階段 Tab 重構", "pct": 100, "cat": "專案管理與工具 (Project Management)", "pts": 5, "phase": "development", "desc": "將 1,478 行單一頁面拆分為四階段 Tab 架構。"},
]


def api_call(method, path, data=None):
    url = f"{PLANE_URL}/api/v1/workspaces/{WORKSPACE_SLUG}/projects/{PROJECT_ID}{path}"
    headers = {"X-API-Key": API_TOKEN, "Content-Type": "application/json"}
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status == 204:
                return None
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode() if e.fp else ""
        print(f"  ERROR {e.code}: {err_body[:200]}", file=sys.stderr)
        return None


def pct_to_state(pct):
    if pct == 0:
        return STATES["backlog"]
    if pct == 100:
        return STATES["done"]
    return STATES["in_progress"]


def pts_to_priority(pts):
    if pts >= 8:
        return "high"
    if pts >= 5:
        return "medium"
    return "low"


def main():
    print("=" * 56)
    print("  Roadmap -> Plane Sync")
    print("  Project: Owner-Pro (OWNERPRO)")
    print("=" * 56)

    # Step 1: Labels
    print("\n--- Step 1: Creating Labels ---")
    label_map = {}
    for cat, color in CATEGORY_LABELS.items():
        resp = api_call("POST", "/labels/", {"name": cat, "color": color})
        if resp and "id" in resp:
            label_map[cat] = resp["id"]
            print(f"  + Label: {cat}")
        else:
            print(f"  ! Failed: {cat}")

    # Step 2: Modules
    print("\n--- Step 2: Creating Modules (4 Phases) ---")
    module_ids = []
    for m in PHASE_MODULES:
        resp = api_call("POST", "/modules/", m)
        if resp and "id" in resp:
            module_ids.append(resp["id"])
            print(f"  + Module: {m['name']}")
        else:
            module_ids.append("")
            print(f"  ! Failed: {m['name']}")

    # Step 3: Cycles
    print("\n--- Step 3: Creating Cycles ---")
    cycle_ids = []
    for c in CYCLES:
        resp = api_call("POST", "/cycles/", c)
        if resp and "id" in resp:
            cycle_ids.append(resp["id"])
            print(f"  + Cycle: {c['name']}")
        else:
            cycle_ids.append("")
            print(f"  ! Failed: {c['name']}")

    # Step 4: Issues
    print("\n--- Step 4: Creating Work Items ---")
    created_issues = []
    for f in FEATURES:
        desc_text = f.get("desc", f["name"])
        pct_label = f"Progress: {f['pct']}%"
        full_html = f"<p>{desc_text}</p><p><strong>{pct_label}</strong></p>"

        label_ids = []
        if f["cat"] in label_map:
            label_ids.append(label_map[f["cat"]])

        payload = {
            "name": f["name"],
            "description_html": full_html,
            "state": pct_to_state(f["pct"]),
            "priority": pts_to_priority(f["pts"]),
            "labels": label_ids,
        }

        resp = api_call("POST", "/issues/", payload)
        if resp and "id" in resp:
            created_issues.append({
                "id": resp["id"],
                "phase": f["phase"],
                "cat": f["cat"],
                "pct": f["pct"],
                "name": f["name"],
            })
            icon = "v" if f["pct"] == 100 else "~" if f["pct"] > 0 else " "
            print(f"  [{icon}] {f['pct']:3d}% | {f['name'][:55]}")
        else:
            print(f"  [!] FAIL | {f['name'][:55]}")
        time.sleep(0.03)

    # Output data for SQL script
    output = {
        "label_map": label_map,
        "module_ids": module_ids,
        "cycle_ids": cycle_ids,
        "issues": created_issues,
    }
    with open("/tmp/plane-sync-output.json", "w") as fp:
        json.dump(output, fp, indent=2, ensure_ascii=False)

    done = sum(1 for i in created_issues if i["pct"] == 100)
    ip = sum(1 for i in created_issues if 0 < i["pct"] < 100)
    bl = sum(1 for i in created_issues if i["pct"] == 0)

    print("\n" + "=" * 56)
    print(f"  SYNC COMPLETE (API portion)")
    print(f"  Labels:   {len(label_map)}")
    print(f"  Modules:  {sum(1 for m in module_ids if m)}")
    print(f"  Cycles:   {sum(1 for c in cycle_ids if c)}")
    print(f"  Issues:   {len(created_issues)} (Done:{done} InProgress:{ip} Backlog:{bl})")
    print(f"  Output:   /tmp/plane-sync-output.json")
    print("=" * 56)
    print(f"\n  Next: Run the SQL script to create module links, views, pages, intake")
    print(f"  URL: http://localhost:8080/{WORKSPACE_SLUG}/projects/{PROJECT_ID}/issues/")


if __name__ == "__main__":
    main()
