#!/usr/bin/env bash
# ==============================================================================
# Script Tự Động Thiết Lập Backend & Database SmartWarehouse Trên AWS EC2 (Ubuntu)
# Áp dụng cho: Ubuntu 22.04 LTS / 24.04 LTS trên AWS EC2 (t3.small / t3.medium)
# ==============================================================================

set -e

echo "===================================================================="
echo ">> [1/7] CẬP NHẬT HỆ THỐNG VÀ THIẾT LẬP SWAPFILE 4GB (TRÁNH TRÀN RAM) <<"
echo "===================================================================="
sudo apt-get update -y
sudo apt-get install -y curl wget git build-essential ufw

# Kiểm tra nếu chưa có swapfile thì tạo 4GB swap
if ! swapon --show | grep -q '/swapfile'; then
    echo ">> Đang tạo 4GB Swapfile để biên dịch an toàn trên EC2 t3.small..."
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo ">> Tạo Swapfile thành công!"
else
    echo ">> Swapfile đã tồn tại, bỏ qua bước tạo swap."
fi

echo "===================================================================="
echo ">> [2/7] CÀI ĐẶT DOCKER & DOCKER COMPOSE PLUGIN                     <<"
echo "===================================================================="
if ! command -v docker &> /dev/null; then
    echo ">> Đang cài đặt Docker và Docker Compose..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm -f get-docker.sh
    sudo usermod -aG docker "$USER" || true
    sudo systemctl enable docker
    sudo systemctl start docker
    echo ">> Cài đặt Docker thành công!"
else
    echo ">> Docker đã được cài đặt."
fi

echo "===================================================================="
echo ">> [3/7] CÀI ĐẶT NODE.JS 20 LTS & PM2                               <<"
echo "===================================================================="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo ">> Cài đặt Node.js $(node -v) và npm $(npm -v) thành công!"
else
    echo ">> Node.js phiên bản $(node -v) đã sẵn sàng."
fi

if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    echo ">> Cài đặt PM2 Process Manager thành công!"
fi

echo "===================================================================="
echo ">> [4/7] KHỞI ĐỘNG HẠ TẦNG CƠ SỞ DỮ LIỆU DOCKER (POSTGRES & REDIS)   <<"
echo "===================================================================="
# Tạo file .env nếu chưa có
if [ ! -f .env ]; then
    cp .env.ec2.example .env
fi

# Chạy Docker Compose tinh gọn trên EC2
docker compose -f docker-compose.ec2.yml up -d

echo ">> Đang đợi PostgreSQL khởi tạo và nạp dữ liệu từ init-db.sql (15 giây)..."
sleep 15

echo "===================================================================="
echo ">> [5/7] CÀI ĐẶT THƯ VIỆN NPM VÀ BIÊN DỊCH 9 MICROSERVICES          <<"
echo "===================================================================="
# Cài đặt thư viện toàn monorepo
npm install --legacy-peer-deps

# Biên dịch cả 9 microservices
npm run backend:build

echo "===================================================================="
echo ">> [6/7] KHỞI CHẠY 9 SERVICES BẰNG PM2                              <<"
echo "===================================================================="
pm2 start ecosystem.config.js
pm2 save

echo "===================================================================="
echo ">> [7/7] CÀI ĐẶT VÀ CẤU HÌNH NGINX REVERSE PROXY                    <<"
echo "===================================================================="
if ! command -v nginx &> /dev/null; then
    sudo apt-get install -y nginx
fi

sudo cp nginx.ec2.conf /etc/nginx/sites-available/sfwms.conf
sudo ln -sf /etc/nginx/sites-available/sfwms.conf /etc/nginx/sites-enabled/sfwms.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "===================================================================="
echo ">> CHÚC MỪNG! HỆ THỐNG SMARTWAREHOUSE ĐÃ TRIỂN KHAI THÀNH CÔNG TRÊN EC2!"
echo "===================================================================="
echo ">> Trạng thái PM2:"
pm2 status
echo ""
echo ">> Bạn có thể kiểm tra sức khỏe hệ thống qua Nginx:"
echo "   curl http://localhost/health"
echo "===================================================================="

