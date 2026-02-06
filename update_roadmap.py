import json
import re
from datetime import datetime, timedelta

# Read the file
with open('project-process/project-progress-dashboard/roadmap.js', 'r') as f:
    content = f.read()

# Extract the JSON part
json_str = re.search(r'window\.ROADMAP_DATA = ({.*});', content, re.DOTALL).group(1)
# Fix loose JSON for python (keys without quotes)
# This is tricky because it's JS object literal, not strict JSON.
# Instead of full parsing, let's use regex to find feature blocks and inject dates.

lines = content.split('\n')
new_lines = []
current_category = ""
cat_start_dates = {
    "通用/系統 (General/System)": datetime(2026, 2, 1),
    "超級管理員 (Super Admin)": datetime(2026, 2, 10),
    "房東 (Landlord)": datetime(2026, 2, 20),
    "租客 (Tenant)": datetime(2026, 3, 1),
    "買家 (Buyer)": datetime(2026, 3, 10),
    "合約與法務 (Contracts & Legal)": datetime(2026, 3, 15),
    "金流支付 (Payments)": datetime(2026, 4, 1),
    "公司頁面 (Company Pages)": datetime(2026, 2, 5),
    "第三方加值服務 (Third Party)": datetime(2026, 4, 15),
    "測試與品質保證 (Testing & QA)": datetime(2026, 2, 15)
}

current_dates = cat_start_dates.copy()

for line in lines:
    # Detect category change
    if 'category:' in line:
        match = re.search(r'category:\s*"([^"]+)"', line)
        if match:
            current_category = match.group(1)
    
    # Inject dates if it's a feature object start (simplified check)
    if 'points:' in line and 'startDate' not in line:
        # Calculate date
        start_date = current_dates.get(current_category, datetime(2026, 5, 1))
        # Get points
        points_match = re.search(r'points:\s*(\d+)', line)
        points = int(points_match.group(1)) if points_match else 1
        duration = max(1, points // 2) # 1 point = 0.5 days roughly? Let's say 1 point = 1 day for visibility
        duration = points 
        
        end_date = start_date + timedelta(days=duration)
        
        # Update current date for this category (sequential)
        current_dates[current_category] = end_date + timedelta(days=1) # 1 day gap
        
        s_str = start_date.strftime('%Y-%m-%d')
        e_str = end_date.strftime('%Y-%m-%d')
        
        # Insert fields
        line = line.replace('points:', f'startDate: "{s_str}", endDate: "{e_str}", owner: "Dev Team", points:')

    new_lines.append(line)

with open('project-process/project-progress-dashboard/roadmap.js', 'w') as f:
    f.write('\n'.join(new_lines))
