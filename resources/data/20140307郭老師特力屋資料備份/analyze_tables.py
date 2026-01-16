import re
from collections import Counter

def find_potential_tables(file_path):
    # Regex to find Default Constraints: DF__TableName__Column...
    # SQL Server default naming: DF__TableName__Colum__HexId
    # Sometimes just DF_TableName_Column
    
    # We will look for DF__, PK__, FK__, CK__ followed by alphanumeric strings
    
    # Pattern explanation:
    # DF__ or PK__ or FK__ or CK__
    # Group 1: The Table Name (greedy match until next double underscore or end)
    # But usually it is __TableName__ColumnName
    
    # Let's try grabbing the token after the prefix.
    # Often: DF__<Table>__<Col>__<Hex>
    
    regex = r'(?:DF|PK|FK|CK|IX)__([a-zA-Z0-9_]+)__'
    
    # Also look for explicit object names like "hbsys_para" seen in grep
    # Maybe matches strictly?
    
    potential_tables = Counter()
    
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        
        # Method 1: Constraint names
        matches = re.findall(regex, content)
        for m in matches:
            # Filter out likely garbage
            if len(m) > 2: 
                potential_tables[m] += 1
                
        # Method 2: Look for strings that look like "dbo.Table" if any (we tried scanning but maybe case insensitive?)
        # skipped for now as grep failed
        
    return potential_tables

if __name__ == "__main__":
    file_path = "/Users/jason66/Owner Real Estate Agent SaaS/resources/data/20140307郭老師特力屋資料備份/extracted_content.txt"
    tables = find_potential_tables(file_path)
    
    print(f"Found {len(tables)} potential tables.")
    print("Top detected tables (by constraint references):")
    for tbl, count in tables.most_common(50):
        print(f"{tbl}: {count} references")
