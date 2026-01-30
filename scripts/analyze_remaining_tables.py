#!/usr/bin/env python3
import json

with open('excel_tables_analysis.json', 'r') as f:
    data = json.load(f)

# AI Voice related
ai_voice_tables = [t for t in data['other_tables'] if 'AI Voice' in str(t.get('category', ''))]
print(f'=== AI Voice Tables ({len(ai_voice_tables)}个) ===\n')
for t in ai_voice_tables:
    print(f'[{t["priority"]}] {t["name_cn"]} ({t["name_en"]})')
    print(f'    ID: {t["id_field"]}')
    
# Documents/Photos related
doc_tables = [t for t in data['other_tables'] if 
              'photos' in str(t.get('category', '')).lower() or 
              'Documents' in str(t.get('category', ''))]
print(f'\n=== Documents/Photos Tables ({len(doc_tables)}个) ===\n')
for t in doc_tables:
    print(f'[{t["priority"]}] {t["name_cn"]} ({t["name_en"]})')
    print(f'    Category: {t["category"]}')

# Property records related
property_records = [t for t in data['other_tables'] if 
                    'property_records' in str(t.get('category', '')).lower()]
print(f'\n=== Property Records Tables ({len(property_records)}个) ===\n')
for t in property_records:
    print(f'[{t["priority"]}] {t["name_cn"]} ({t["name_en"]})')

# Other special categories
special_cats = set()
for t in data['other_tables']:
    cat = t.get('category', '')
    if cat and cat not in ['所有人都有', 'AI Voice']:
        if not any(x in cat for x in ['photos', 'property_records', 'Documents']):
            special_cats.add(cat)

print(f'\n=== 其他特殊分类 ===')
for cat in sorted(special_cats):
    tables = [t for t in data['other_tables'] if t.get('category') == cat]
    print(f'\n{cat} ({len(tables)}个):')
    for t in tables:
        print(f'  [{t["priority"]}] {t["name_cn"]} ({t["name_en"]})')
