#!/usr/bin/env bash
# Script xuất toàn bộ CSDL local thành full_backup.sql
echo ">> Đang xuất toàn bộ cơ sở dữ liệu từ container sfwms-postgres..."
docker exec -i sfwms-postgres pg_dumpall -c -U postgres > full_backup.sql
echo ">> Xuất thành công vào file full_backup.sql!"

