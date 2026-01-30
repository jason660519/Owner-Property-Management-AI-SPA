#!/usr/bin/env python3
"""
生成所有已完成表格的清單
"""
import json

# 讀取分析結果
with open('excel_tables_analysis.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 已完成的表格（從 migration 文件中提取）
completed_tables = {
    # Super Admin - 原始 migration
    'roles', 'permissions', 'role_permissions',
    'platform_settings', 'llm_configs', 'seo_configs', 'notification_templates',
    'currencies', 'exchange_rates', 'i18n_glossary', 'regions_settings',
    'whitelist_blacklist', 'rate_limit_configs',
    'audit_logs', 'api_call_logs', 'error_logs', 'system_maintenance_logs',
    'backup_restore_logs', 'cloud_resources_monitoring', 'ai_performance_metrics', 'web_analytics',
    
    # Super Admin - 補充 migration
    'users_track_history', 'tax_rates', 'webhook_configs', 'elasticsearch_indices',
    'perf_metrics', 'recommendation_logs', 'unit_conversion_logs', 'version_history',
    
    # Landlord migration
    'buildings_communities', 'building_title_records', 'bank_accounts', 'rental_ledger',
    'sales_ledger', 'rent_receipts', 'tax_reports', 'property_inventory',
    'property_status_history', 'property_type_change_logs', 'maintenance_requests',
    'media_gallery', 'panorama_images', 'ocr_parsing_logs', 'blog_posts',
    'blog_analytics', 'property_faqs', 'comfyui_styles', 'landlord_call_preferences',
    'agent_directory', 'nearby_facilities',
    
    # Common User migration
    'user_sessions', 'messages', 'email_threads', 'notification_queue',
    'notification_preferences', 'document_uploads', 'upload_progress',
    'media_processing_queue', 'theme_settings', 'social_auth_connections',
    'calendar_events', 'todo_tasks', 'draft_autosave', 'user_activity_logs',
    'user_feedback',
    
    # Special Features migration
    'virtual_phone_numbers', 'call_logs', 'ai_conversations', 'contracted_tenants',
    'leads_tenants', 'contracted_buyers', 'leads_buyers', 'tenant_inquiries',
    'buyer_inquiries', 'viewing_appointments_tenant', 'viewing_appointments_buyer',
    'lease_agreements', 'sales_agreements', 'deposit_receipts', 'earnest_money_receipts',
    'digital_signatures', 'service_providers', 'maintenance_vendors', 'maintenance_quotes',
    'escrow_legal_services', 'insurance_plans', 'interior_designers', 'user_favorites',
    'property_comparisons', 'user_reviews', 'vlm_parsing_logs'
}

print("=" * 80)
print("資料表完成狀態檢查")
print("=" * 80)

# 統計
total_excel = data['total_tables']
total_completed = len(completed_tables)

print(f"\nExcel 中定義的表格總數: {total_excel}")
print(f"已完成的表格數: {total_completed}")
print(f"完成率: {(total_completed/total_excel*100):.1f}%")

# 按分類檢查
all_tables = data['super_admin_tables'] + data['landlord_tables'] + data['tenant_tables'] + data['other_tables']

# 找出缺失的表格
missing_tables = []
completed_list = []

for table in all_tables:
    table_en = table.get('name_en', '').lower().replace(' ', '_')
    table_id = table.get('id_field', '').replace('_id', '')
    
    # 檢查是否已完成
    is_completed = False
    for completed in completed_tables:
        if completed in table_en or completed in table_id:
            is_completed = True
            break
    
    if is_completed:
        completed_list.append(table)
    else:
        missing_tables.append(table)

print(f"\n已確認完成: {len(completed_list)} 個")
print(f"可能缺失: {len(missing_tables)} 個")

if missing_tables:
    print("\n" + "=" * 80)
    print("可能缺失的表格清單")
    print("=" * 80)
    
    for t in missing_tables:
        print(f"\n[{t['priority']}] {t['name_cn']}")
        print(f"    EN: {t['name_en']}")
        print(f"    ID: {t['id_field']}")
        print(f"    Category: {t.get('category', 'N/A')}")

# 輸出完成清單到文件
with open('completed_tables_checklist.txt', 'w', encoding='utf-8') as f:
    f.write("已完成表格清單\n")
    f.write("=" * 80 + "\n\n")
    
    for table_name in sorted(completed_tables):
        f.write(f"✓ {table_name}\n")
    
    f.write(f"\n總計: {len(completed_tables)} 個表格\n")

print(f"\n✓ 完成清單已保存至 completed_tables_checklist.txt")
