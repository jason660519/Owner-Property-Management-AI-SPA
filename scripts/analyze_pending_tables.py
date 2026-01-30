#!/usr/bin/env python3
"""
分析待完成的表格，按优先级排序
"""
import json

with open('excel_tables_analysis.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 已完成的表格
completed_tables = {
    'roles', 'permissions', 'role_permissions',
    'platform_settings', 'llm_configs', 'seo_configs', 'notification_templates',
    'currencies', 'exchange_rates', 'i18n_glossary', 'regions_settings',
    'whitelist_blacklist', 'rate_limit_configs',
    'audit_logs', 'api_call_logs', 'error_logs', 'system_maintenance_logs',
    'backup_restore_logs', 'cloud_resources_monitoring', 'ai_performance_metrics', 'web_analytics',
    'users_track_history', 'tax_rates', 'webhook_configs', 'elasticsearch_indices',
    'perf_metrics', 'recommendation_logs', 'unit_conversion_logs', 'version_history',
    'user_sessions', 'messages', 'email_threads', 'notification_queue',
    'notification_preferences', 'document_uploads', 'upload_progress',
    'media_processing_queue', 'theme_settings', 'social_auth_connections',
    'calendar_events', 'todo_tasks', 'draft_autosave', 'user_activity_logs',
    'user_feedback',
    'virtual_phone_numbers', 'call_logs', 'ai_conversations', 'contracted_tenants',
    'leads_tenants', 'contracted_buyers', 'leads_buyers', 'tenant_inquiries',
    'buyer_inquiries', 'viewing_appointments_tenant', 'viewing_appointments_buyer',
    'lease_agreements', 'sales_agreements', 'deposit_receipts', 'earnest_money_receipts',
    'digital_signatures', 'service_providers', 'maintenance_vendors', 'maintenance_quotes',
    'escrow_legal_services', 'insurance_plans', 'interior_designers', 'user_favorites',
    'property_comparisons', 'user_reviews', 'vlm_parsing_logs',
    'users_profile', 'agents', 'agent_authorizations',
    'properties_for_rent', 'properties_for_sale',
    'property_amenities', 'property_photos', 'property_videos',
    'contracts', 'contract_addendums', 'payments',
    'maintenance_records', 'tenant_applications', 'tenant_screening',
    'property_documents', 'landlord_documents', 'tenant_documents',
    'notifications', 'ai_chat_sessions', 'ai_chat_messages',
    'activity_logs', 'system_settings', 'email_templates'
}

all_tables = data['super_admin_tables'] + data['landlord_tables'] + data['tenant_tables'] + data['other_tables']

# 找出待完成的表格
pending_tables = []

for table in all_tables:
    table_en = table.get('name_en', '').lower().replace(' ', '_')
    table_id = table.get('id_field', '').replace('_id', '').lower()
    
    is_completed = False
    for completed in completed_tables:
        if completed in table_en or completed in table_id:
            is_completed = True
            break
    
    if not is_completed:
        pending_tables.append(table)

# 按优先级和分类整理
print("=" * 80)
print(f"待完成表格分析 - 共 {len(pending_tables)} 個")
print("=" * 80)

# 按优先级分组
priority_groups = {'A': [], 'B': [], 'C': [], 'D': [], 'E': []}
for table in pending_tables:
    priority = table.get('priority', 'E')
    if priority in priority_groups:
        priority_groups[priority].append(table)
    else:
        priority_groups['E'].append(table)

# 按分类分组
category_groups = {}
for table in pending_tables:
    category = table.get('category', 'Other')
    if category not in category_groups:
        category_groups[category] = []
    category_groups[category].append(table)

print("\n📊 按優先級分組：")
for priority in ['A', 'B', 'C', 'D', 'E']:
    if priority_groups[priority]:
        print(f"\n優先級 {priority} ({len(priority_groups[priority])} 個):")
        for t in priority_groups[priority]:
            print(f"  - {t['name_cn']} ({t.get('name_en', 'N/A')})")
            print(f"    分類: {t.get('category', 'N/A')}")

print("\n" + "=" * 80)
print("📊 按分類分組：")
print("=" * 80)
for category, tables in sorted(category_groups.items()):
    print(f"\n【{category}】({len(tables)} 個):")
    for t in tables:
        print(f"  [{t['priority']}] {t['name_cn']} ({t.get('name_en', 'N/A')})")

# 评估建议
print("\n" + "=" * 80)
print("💡 完成建議")
print("=" * 80)

landlord_pending = [t for t in pending_tables if 'Landlord' in str(t.get('category', ''))]
photos_pending = [t for t in pending_tables if 'photos' in str(t.get('category', '')).lower()]
records_pending = [t for t in pending_tables if 'records' in str(t.get('category', '')).lower()]
customer_pending = [t for t in pending_tables if 'customer' in str(t.get('category', '')).lower()]

print(f"\n1️⃣ Landlord 相關: {len(landlord_pending)} 個")
print(f"2️⃣ 照片存儲路徑: {len(photos_pending)} 個")
print(f"3️⃣ 謄本記錄: {len(records_pending)} 個")
print(f"4️⃣ Customer 功能: {len(customer_pending)} 個")
print(f"5️⃣ 其他: {len(pending_tables) - len(landlord_pending) - len(photos_pending) - len(records_pending) - len(customer_pending)} 個")

print("\n" + "=" * 80)
print("🎯 下一步建議")
print("=" * 80)

print("""
選項 1: 【立即執行 Migration】(推薦)
  ✅ 已完成 68 個核心表格 (57.6%)
  ✅ 涵蓋了主要業務功能
  ✅ 建議先執行現有 migration，讓系統運行起來
  
  執行命令：
  supabase db reset

選項 2: 【繼續完成高優先級表格】
  待完成的優先級 A 表格最重要
  建議優先完成：
  - Landlord 核心功能表
  - Customer 交易相關表
  - 照片存儲可以後續優化
  
選項 3: 【測試現有功能】
  先測試已完成的表格是否正常運作
  發現問題再補充缺失的表格
  避免過度設計

選項 4: 【分階段開發】
  Phase 1: 執行現有 migration (當前)
  Phase 2: 開發基礎功能並測試
  Phase 3: 根據實際需求補充剩餘表格
  Phase 4: 優化和擴展

我的建議：選項 1 + 選項 4
先執行現有的 migration，讓 Dashboard 能夠運行。
剩餘的 50 個表格可以在實際開發過程中，根據需求逐步補充。
""")

print("\n待完成表格保存至: pending_tables_analysis.txt")

# 保存待完成表格列表
with open('pending_tables_analysis.txt', 'w', encoding='utf-8') as f:
    f.write("待完成表格清單\n")
    f.write("=" * 80 + "\n\n")
    f.write(f"總數: {len(pending_tables)} 個\n\n")
    
    for priority in ['A', 'B', 'C', 'D', 'E']:
        if priority_groups[priority]:
            f.write(f"\n優先級 {priority} ({len(priority_groups[priority])} 個)\n")
            f.write("-" * 80 + "\n")
            for t in priority_groups[priority]:
                f.write(f"[{t['priority']}] {t['name_cn']}\n")
                f.write(f"    EN: {t.get('name_en', 'N/A')}\n")
                f.write(f"    ID: {t.get('id_field', 'N/A')}\n")
                f.write(f"    分類: {t.get('category', 'N/A')}\n\n")
