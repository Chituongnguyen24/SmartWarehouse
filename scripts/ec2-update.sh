#!/usr/bin/env bash
# ==============================================================================
# Script Cập Nhật Code Nhanh Trên AWS EC2
# Sử dụng mỗi khi bạn push code mới lên Git
# ==============================================================================

set -e

echo ">> [1/4] Kéo code mới nhất từ Git..."
git pull

echo ">> [2/4] Kiểm tra cài đặt package (nếu có bổ sung)..."
npm install --legacy-peer-deps

echo ">> [3/4] Biên dịch lại 9 Microservices..."
npm run backend:build

echo ">> [4/4] Khởi động lại 9 Microservices trên PM2 (Zero Downtime)..."
pm2 reload ecosystem.config.js

echo ">> Hoàn tất cập nhật! Trạng thái hiện tại:"
pm2 status

