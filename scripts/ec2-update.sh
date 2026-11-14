#!/usr/bin/env bash
# ==============================================================================
# Script Cập Nhật Code Nhanh Trên AWS EC2
# ==============================================================================

set -e

echo ">> [1/5] Đồng bộ code mới nhất từ GitHub..."
git fetch origin main
git reset --hard origin/main

echo ">> Commit mới nhất trên EC2:"
git log -1 --oneline

echo ">> [2/5] Đóng gói lại Web Dashboard & Customer Web..."
rm -rf frontend/web-dashboard/dist
cd frontend/web-dashboard && npx vite build && cd ../..

echo ">> Đóng gói Customer Web (Next.js SSR)..."
cd frontend/customer-web && npx next build --webpack && cd ../..

echo ">> [3/5] Áp dụng cấu hình Nginx Reverse Proxy..."
sudo cp nginx.ec2.conf /etc/nginx/sites-available/sfwms.conf
sudo ln -sf /etc/nginx/sites-available/sfwms.conf /etc/nginx/sites-enabled/sfwms.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ">> [4/5] Khởi động lại các tiến trình PM2 (bao gồm cả sfwms-customer-web)..."
pm2 startOrReload ecosystem.config.js || pm2 restart ecosystem.config.js
pm2 save

echo ""
echo ">> =================================================================="
echo ">> CẬP NHẬT HOÀN TẤT THÀNH CÔNG!"
echo ">> Web Dashboard (Quản trị): http://smartwarehouse-kltn.duckdns.org"
echo ">> Customer Web (Khách hàng): http://smartwarehouse-kltn.duckdns.org/store/"
echo ">> =================================================================="
pm2 status
