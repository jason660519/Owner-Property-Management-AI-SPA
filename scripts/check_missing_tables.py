#!/usr/bin/env python3
import json

with open('excel_tables_analysis.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

super_admin = data['super_admin_tables']
print("=== Super Admin 表格清单 (27个) ===\n")

# 检查哪些已完成，哪些未完成
completed_tables = {
    'roles', 'permissions', 'role_permissions',
    'platform_settings', 'llm_configs', 'seo_configs', 'notification_templates',
    'currencies', 'exchange_rates', 'i18n_glossary', 'regions_settings',
    'whitelist_blacklist', 'rate_limit_configs',
    'audit_logs', 'api_call_logs', 'error_logs', 'system_maintenance_logs',
    'backup_restore_logs', 'cloud_resources_monitoring', 'ai_performance_metrics', 'web_analytics'
}

missing = []
for table in super_admin:
    table_name = table['name_en'].lower() if table['name_en'] else table['id_field'].replace('_id', '')
    is_completed = any(comp in table_name for comp in completed_tables)
    
    status = "✅ 已完成" if is_completed else "❌ 未完成"
    print(f"{status}: [{table['priority']}] {table['name_cn']} ({table['name_en']}) - {table['id_field']}")
    
    if not is_completed:
        missing.append(table)

print(f"\n=== 缺失的 Super Admin 表格: {len(missing)} ===")
for t in missing:
    print(f"  - {t['name_en'] or t['id_field']}: {t['name_cn']}")
