import subprocess
CONTAINER_NAME = "sql_server_restore"
SA_PASSWORD = "StrongPass123!"

def run_cmd(query, db="master"):
    cmd = [
        "docker", "exec", CONTAINER_NAME,
        "/opt/mssql-tools18/bin/sqlcmd",
        "-S", "localhost", "-U", "SA", "-P", SA_PASSWORD,
        "-C", "-d", db,
        "-Q", query
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors='replace')
    print(f"--- Query: {query} (DB: {db}) ---")
    print("STDOUT:", res.stdout)
    print("STDERR:", res.stderr)

if __name__ == "__main__":
    run_cmd("SELECT name, state_desc FROM sys.databases")
    run_cmd("SELECT name FROM sys.tables", db="house063")
    run_cmd("SELECT count(*) FROM sys.tables", db="house063")
