import subprocess
import time
import sys
import json

CONTAINER_NAME = "sql_server_restore"
BACKUP_FILE_LOCAL = "/Users/jason66/Owner Real Estate Agent SaaS/resources/data/20140307郭老師特力屋資料備份/house063_backup_2012_11_01_003215_3150000.bak"
BACKUP_FILE_CONTAINER = "/var/opt/mssql/data/house063.bak"
SA_PASSWORD = "StrongPass123!"

def run_cmd(cmd, shell=False):
    print(f"Running: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    res = subprocess.run(cmd, shell=shell, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"Error: {res.stderr}")
    return res.stdout, res.returncode

def wait_for_sql():
    print("Waiting for SQL Server to be ready...")
    for i in range(30):
        # check if we can log in
        cmd = [
            "docker", "exec", CONTAINER_NAME, 
            "/opt/mssql-tools18/bin/sqlcmd", 
            "-S", "localhost", "-U", "SA", "-P", SA_PASSWORD, 
            "-C",
            "-Q", "SELECT @@VERSION"
        ]
        out, code = run_cmd(cmd)
        if code == 0:
            print("SQL Server is ready.")
            return True
        time.sleep(2)
    return False

def copy_backup():
    print("Copying backup file to container...")
    # Create directory if strictly needed? /var/opt/mssql/backup/ usually exists or we can just drop in root?
    # Let's drop in /var/opt/mssql/data/ or /tmp to be safe from permission issues?
    # Standard backup dir is /var/opt/mssql/backup
    cmd = ["docker", "cp", BACKUP_FILE_LOCAL, f"{CONTAINER_NAME}:{BACKUP_FILE_CONTAINER}"]
    out, code = run_cmd(cmd)
    return code == 0

def restore_database():
    # 1. Get File List
    sql_filelist = f"RESTORE FILELISTONLY FROM DISK = '{BACKUP_FILE_CONTAINER}'"
    cmd = [
        "docker", "exec", CONTAINER_NAME,
        "/opt/mssql-tools18/bin/sqlcmd", 
        "-S", "localhost", "-U", "SA", "-P", SA_PASSWORD,
        "-C",
        "-Q", sql_filelist
    ]
    out, code = run_cmd(cmd)
    if code != 0:
        print("Failed to read file list.")
        return
        
    print("File List Output:")
    print(out)
    
    # Parse logical names (this is fragile in text, but let's try standard names first or regex)
    # Typically: LogicalName is column 1
    # We will assume "house063_Data" and "house063_Log" based on previous strings extraction which showed these names.
    # See extracted_content.txt: "house063_Data", "house063_Log"
    
    # Construct Restore
    # We must move files to valid container paths.
    
    db_name = "house063"
    move_data = f"MOVE 'house063_Data' TO '/var/opt/mssql/data/{db_name}.mdf'"
    move_log = f"MOVE 'house063_Log' TO '/var/opt/mssql/data/{db_name}_log.ldf'"
    
    # If the logical names are different, this will fail. We'll see the output of step 1.
    # But let's look at the extracted text again.
    # "house063_Data" and "house063_Log" were explicitly visible.
    
    restore_sql = f"RESTORE DATABASE [{db_name}] FROM DISK = '{BACKUP_FILE_CONTAINER}' WITH {move_data}, {move_log}, RECOVERY, REPLACE"
    
    print("Restoring database...")
    cmd_restore = [
        "docker", "exec", CONTAINER_NAME,
        "/opt/mssql-tools18/bin/sqlcmd",
        "-S", "localhost", "-U", "SA", "-P", SA_PASSWORD,
        "-C",
        "-Q", restore_sql
    ]
    out, code = run_cmd(cmd_restore)
    if code == 0:
        print("Restore successful!")
    else:
        print("Restore failed.")
        print(out)

if __name__ == "__main__":
    if wait_for_sql():
        if copy_backup():
            restore_database()
