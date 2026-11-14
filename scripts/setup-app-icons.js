const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const sourceLogo = path.join(rootDir, 'frontend', 'customer-web', 'public', 'logos', 'logo_icon.png');

if (!fs.existsSync(sourceLogo)) {
  console.error('[ERROR] Cannot find source logo at:', sourceLogo);
  process.exit(1);
}

const copyTo = (targetPath) => {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.copyFileSync(sourceLogo, targetPath);
  console.log('✓ Copied icon to:', path.relative(rootDir, targetPath));
};

console.log('>> [1/2] Updating C.T Mart Staff app icons...');
const staffMipmaps = ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];
staffMipmaps.forEach((folder) => {
  const base = path.join(rootDir, 'frontend', 'staff-app', 'android', 'app', 'src', 'main', 'res', folder);
  copyTo(path.join(base, 'ic_launcher.png'));
  copyTo(path.join(base, 'ic_launcher_round.png'));
  copyTo(path.join(base, 'ic_launcher_foreground.png'));
});
copyTo(path.join(rootDir, 'frontend', 'staff-app', 'public', 'logos', 'logo_icon.png'));

console.log('>> [2/2] Updating C.T Mart Driver app icons...');
const driverAssets = path.join(rootDir, 'frontend', 'driver-app', 'assets');
copyTo(path.join(driverAssets, 'icon.png'));
copyTo(path.join(driverAssets, 'adaptive-icon.png'));

const driverMipmaps = ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];
driverMipmaps.forEach((folder) => {
  const base = path.join(rootDir, 'frontend', 'driver-app', 'android', 'app', 'src', 'main', 'res', folder);
  // Remove old .webp icons to prevent "Duplicate resources" error
  ['ic_launcher.webp', 'ic_launcher_round.webp'].forEach(webpFile => {
    const webpPath = path.join(base, webpFile);
    if (fs.existsSync(webpPath)) {
      fs.unlinkSync(webpPath);
      console.log('  - Removed duplicate:', path.relative(rootDir, webpPath));
    }
  });
  copyTo(path.join(base, 'ic_launcher.png'));
  copyTo(path.join(base, 'ic_launcher_round.png'));
  copyTo(path.join(base, 'ic_launcher_foreground.png'));
});

console.log('\n>> TẤT CẢ ICON ĐÃ ĐƯỢC CẬP NHẬT THÀNH CÔNG CHO CẢ 2 APP!');

