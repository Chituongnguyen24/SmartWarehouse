#!/usr/bin/env bash
# ==============================================================================
# Script Khôi Phục Toàn Bộ Database từ full_backup.sql vào PostgreSQL trên EC2
# ==============================================================================

set -e

BACKUP_FILE="${1:-full_backup.sql}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "[!] Lỗi: Không tìm thấy tệp $BACKUP_FILE trong thư mục hiện tại!"
    exit 1
fi

echo "===================================================================="
echo ">> [1/3] ĐANG NẠP TOÀN BỘ CSDL TỪ $BACKUP_FILE VÀO DOCKER POSTGRES..."
echo "===================================================================="
sudo docker exec -i sfwms-postgres-ec2 psql -U postgres < "$BACKUP_FILE"

echo "===================================================================="
echo ">> [2/3] SAO CHÉP ĐỒNG BỘ VÀO scripts/init-db.sql ĐỂ LƯU VĨNH VIỄN..."
echo "===================================================================="
cp "$BACKUP_FILE" scripts/init-db.sql

echo "===================================================================="
echo ">> [3/3] KHỞI ĐỘNG LẠI 9 MICROSERVICES ĐỂ NHẬN DỮ LIỆU MỚI..."
echo "===================================================================="
pm2 restart all

echo ""
echo ">> ĐỒNG BỘ HOÀN TẤT 100%! Toàn bộ dữ liệu từ máy local đã có trên EC2!"
pm2 status

