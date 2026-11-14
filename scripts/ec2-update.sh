#!/usr/bin/env bash
# ==============================================================================
# Script Cập Nhật Code Nhanh Trên AWS EC2
# Sử dụng mỗi khi bạn push code mới lên Git
# ==============================================================================

set -e

echo ">> [1/4] Kéo code mới nhất từ Git..."
git pull origin main

echo ">> [2/4] Biên dịch lại Web Dashboard..."
cd frontend/web-dashboard && npx vite build && cd ../..

echo ">> [3/4] Cập nhật cấu hình Nginx Reverse Proxy..."
sudo cp nginx.ec2.conf /etc/nginx/sites-available/sfwms.conf
sudo ln -sf /etc/nginx/sites-available/sfwms.conf /etc/nginx/sites-enabled/sfwms.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ">> [4/4] Khởi động lại các tiến trình PM2..."
pm2 reload ecosystem.config.js 2>/dev/null || pm2 restart ecosystem.config.js

echo ""
echo ">> =================================================================="
echo ">> CẬP NHẬT HOÀN TẤT THÀNH CÔNG!"
echo ">> Web Dashboard: http://smartwarehouse-kltn.duckdns.org"
echo ">> =================================================================="
pm2 status
