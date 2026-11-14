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

echo ">> [2/5] Xóa bản build cũ và đóng gói lại Web Dashboard..."
rm -rf frontend/web-dashboard/dist
cd frontend/web-dashboard && npx vite build && cd ../..

echo ">> File bundle mới vừa tạo:"
ls -lh frontend/web-dashboard/dist/assets/index-*.js

echo ">> [3/5] Áp dụng cấu hình Nginx Reverse Proxy (Chống cache index.html)..."
sudo cp nginx.ec2.conf /etc/nginx/sites-available/sfwms.conf
sudo ln -sf /etc/nginx/sites-available/sfwms.conf /etc/nginx/sites-enabled/sfwms.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ">> [4/5] Khởi động lại các tiến trình PM2..."
pm2 reload ecosystem.config.js 2>/dev/null || pm2 restart ecosystem.config.js

echo ""
echo ">> =================================================================="
echo ">> CẬP NHẬT HOÀN TẤT THÀNH CÔNG!"
echo ">> Web Dashboard: http://smartwarehouse-kltn.duckdns.org"
echo ">> =================================================================="
pm2 status
