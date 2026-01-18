#!/bin/bash
docker rm -f sql_server_restore || true
docker run -e 'ACCEPT_EULA=Y' -e 'MSSQL_SA_PASSWORD=StrongPass123!' -p 1433:1433 --name sql_server_restore -d mcr.microsoft.com/mssql/server:2022-latest
