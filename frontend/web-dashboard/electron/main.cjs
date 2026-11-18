const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let staticServer = null;

// Bảng tra MIME types chuẩn xác cho ứng dụng web tĩnh
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

/**
 * Khởi động một máy chủ nội bộ siêu nhẹ (Embedded Loopback Server)
 * - Lắng nghe duy nhất trên 127.0.0.1 với cổng động do HĐH cấp.
 * - Hỗ trợ Single Page Application (SPA Fallback): Mọi route của BrowserRouter
 *   nếu không phải là file tĩnh đều tự động trả về index.html.
 * - Giữ nguyên 100% đường dẫn tuyệt đối /assets/ mà không cần đổi base Vite thành ./.
 */
function startLoopbackServer(distPath) {
  return new Promise((resolve, reject) => {
    staticServer = http.createServer((req, res) => {
      try {
        const cleanUrl = req.url.split('?')[0];
        let decodedPath = decodeURI(cleanUrl);
        let targetFile = path.join(distPath, decodedPath === '/' ? 'index.html' : decodedPath);

        // Kiểm tra xem file có thực sự tồn tại trong thư mục dist không
        let fileExists = fs.existsSync(targetFile) && fs.statSync(targetFile).isFile();

        // SPA Fallback: Nếu không tìm thấy file tĩnh, trả về index.html để React Router xử lý
        if (!fileExists) {
          targetFile = path.join(distPath, 'index.html');
        }

        const ext = path.extname(targetFile).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(targetFile, (err, data) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Lỗi nạp tài nguyên giao diện.');
            return;
          }
          res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(data);
        });
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Lỗi máy chủ cục bộ.');
      }
    });

    staticServer.listen(0, '127.0.0.1', () => {
      const port = staticServer.address().port;
      console.log(`[SmartWarehouse Desktop] Embedded server listening on http://127.0.0.1:${port}`);
      resolve(`http://127.0.0.1:${port}`);
    });

    staticServer.on('error', (err) => {
      reject(err);
    });
  });
}

async function createMainWindow() {
  const iconPath = path.join(__dirname, '../public/favicon.ico');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'SmartWarehouse - Hệ Thống Điều Hành & Quản Trị Kho Thông Minh',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    show: false, // Ẩn cửa sổ ban đầu để tránh chớp trắng khi tải
  });

  // Gắn nhận diện Desktop vào User-Agent
  const currentUa = session.defaultSession.getUserAgent();
  session.defaultSession.setUserAgent(`${currentUa} SmartWarehouseDesktop/1.0.0`);

  // Xóa thanh menu chuẩn của Electron để giao diện chuyên nghiệp như phần mềm Enterprise
  mainWindow.setMenuBarVisibility(false);

  // Hiển thị mượt mà khi giao diện đã sẵn sàng
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const isDev = process.env.ELECTRON_DEV === 'true' && !app.isPackaged;

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    console.log(`[SmartWarehouse Desktop] Loading Vite dev server: ${devUrl}`);
    await mainWindow.loadURL(devUrl);
  } else {
    const distPath = path.join(__dirname, '../dist');
    const localUrl = await startLoopbackServer(distPath);
    console.log(`[SmartWarehouse Desktop] Loading production app: ${localUrl}`);
    await mainWindow.loadURL(localUrl);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Khởi tạo ứng dụng
app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (staticServer) {
    staticServer.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
