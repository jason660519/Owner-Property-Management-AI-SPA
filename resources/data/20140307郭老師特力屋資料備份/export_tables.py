import subprocess
import os

CONTAINER_NAME = "sql_server_restore"
SA_PASSWORD = "StrongPass123!"
EXPORT_DIR = "/Users/jason66/Owner Real Estate Agent SaaS/resources/data/exported_tables"

def run_sql(query, database="master", separator=None):
    cmd = [
        "docker", "exec", CONTAINER_NAME,
        "/opt/mssql-tools18/bin/sqlcmd",
        "-S", "localhost", "-U", "SA", "-P", SA_PASSWORD,
        "-C", "-d", database,
        "-y", "0", # No truncation
        # "-W",      # Remove trailing whitespace - incompatible with -y
        "-Q", query
    ]
    if separator:
        cmd.extend(["-s", separator])
        
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors='replace')
    if res.returncode != 0:
        print(f"SQL Error: {res.stderr}")
    return res.stdout, res.returncode

def get_tables():
    print("Fetching table list...")
    query = "SET NOCOUNT ON; SELECT name FROM sys.tables WHERE type='U' ORDER BY name;"
    out, code = run_sql(query, database="house063")
    
    lines = out.strip().split('\n')
    tables = []
    for line in lines:
        line = line.strip()
        if not line: continue
        if line.startswith('-'): continue
        if line == 'name': continue
        tables.append(line)
    return tables

def export_table(table_name):
    # Use pipe separator
    sep = "|"
    csv_path = os.path.join(EXPORT_DIR, f"{table_name}.csv")
    
    # Check row count first
    count_q = f"SET NOCOUNT ON; SELECT count(*) FROM [{table_name}]"
    out, c = run_sql(count_q, database="house063")
    try:
        # Parse count from output which usually looks like:
        # amount
        # ------
        # 123
        lines = [l.strip() for l in out.split('\n') if l.strip()]
        # find the number. It's usually the last line that is a number.
        row_count = 0
        for l in reversed(lines):
            if l.isdigit():
                row_count = int(l)
                break
    except:
        row_count = 0
        
    if row_count == 0:
        # print(f"Skipping empty table {table_name}")
        return

    print(f"Exporting {table_name} ({row_count} rows)...")

    # Export data
    query = f"SET NOCOUNT ON; SELECT * FROM [{table_name}]"
    out, code = run_sql(query, database="house063", separator=sep)
    
    # Clean up output:
    # 1. Split lines
    # 2. Find header separator (---)
    # 3. Header is before, Data is after
    
    lines = [l.strip() for l in out.split('\n') if l.strip()]
    sep_idx = -1
    for i, l in enumerate(lines):
        if l.startswith('---'):
            sep_idx = i
            break
            
    if sep_idx > 0:
        header_row = lines[sep_idx-1]
        data_rows = lines[sep_idx+1:]
        
        # Filter data rows that are just "(X rows affected)"
        data_rows = [r for r in data_rows if not r.startswith('(') and not r.endswith('rows affected)')]
        
        with open(csv_path, 'w', encoding='utf-8') as f:
            f.write(header_row + "\n")
            for row in data_rows:
                f.write(row + "\n")
    else:
        pass

if __name__ == "__main__":
    if not os.path.exists(EXPORT_DIR):
        os.makedirs(EXPORT_DIR)
        
    tables = get_tables()
    print(f"Found {len(tables)} tables.")
    
    for tbl in tables:
        export_table(tbl)
