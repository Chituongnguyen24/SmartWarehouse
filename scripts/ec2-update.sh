#!/usr/bin/env bash
# ==============================================================================
# Script Cập Nhật Code Nhanh Trên AWS EC2
# ==============================================================================

set -e

echo ">> [1/5] Đồng bộ code mới nhất từ GitHub..."
git fetch origin main
git reset --hard origin/main

echo ">> Cấp quyền thực thi cho scripts..."
chmod +x scripts/*.sh 2>/dev/null || true

echo ">> Commit mới nhất trên EC2:"
git log -1 --oneline

echo ">> [2/5] Dọn dẹp tiến trình cũ và build Web Dashboard..."
rm -rf frontend/web-dashboard/dist
cd frontend/web-dashboard && npx vite build && cd ../..

echo ">> [3/5] Đóng gói Customer Web (Next.js SSR)..."
cd frontend/customer-web && npm run build && cd ../..

echo ">> [4/5] Áp dụng cấu hình Nginx Reverse Proxy..."
sudo cp nginx.ec2.conf /etc/nginx/sites-available/sfwms.conf
sudo ln -sf /etc/nginx/sites-available/sfwms.conf /etc/nginx/sites-enabled/sfwms.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ">> [5/5] Khởi động lại các tiến trình PM2..."
# Đảm bảo giải phóng port 3000 và xóa trạng thái errored cũ của PM2 nếu có
sudo fuser -k 3000/tcp 2>/dev/null || true
pm2 delete sfwms-customer-web 2>/dev/null || true
pm2 startOrReload ecosystem.config.js --update-env || pm2 restart ecosystem.config.js --update-env
pm2 save

echo ""
echo ">> =================================================================="
echo ">> CẬP NHẬT HOÀN TẤT THÀNH CÔNG!"
echo ">> Web Dashboard (Quản trị): http://smartwarehouse-kltn.duckdns.org"
echo ">> Customer Web (Khách hàng): http://smartwarehouse-kltn.duckdns.org/store/"
echo ">> =================================================================="
pm2 status
