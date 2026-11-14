const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const gradlewCmd = isWindows ? 'gradlew.bat' : './gradlew';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

const run = (cmd, args, cwd) => {
  let executable = cmd;
  if (cmd.includes('gradlew')) {
    executable = isWindows ? '.\\gradlew.bat' : './gradlew';
  }
  console.log(`\n>> [EXEC] ${executable} ${args.join(' ')}`);
  console.log(`   in ${cwd}`);
  const result = spawnSync(executable, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    console.error(`\n[ERROR] Command failed with exit code ${result.status}: ${executable} ${args.join(' ')}`);
    process.exit(result.status || 1);
  }
};

const copyFileSafe = (src, dest) => {
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(src, dest);
};

// 1. Setup Icons
console.log('==============================================================================');
console.log('[1/3] ĐỒNG BỘ ICON C.T MART VÀO CẢ 2 ỨNG DỤNG...');
console.log('==============================================================================');
require('./setup-app-icons');

const buildApksDir = path.join(rootDir, 'build-apks');
if (!fs.existsSync(buildApksDir)) {
  fs.mkdirSync(buildApksDir, { recursive: true });
}

// 2. Build Staff App
console.log('\n==============================================================================');
console.log('[2/3] BUILD APK: C.T MART STAFF (Capacitor + Android)...');
console.log('==============================================================================');
const staffDir = path.join(rootDir, 'frontend', 'staff-app');
const staffAndroidDir = path.join(staffDir, 'android');

run(npmCmd, ['run', 'build'], staffDir);
run(npxCmd, ['cap', 'sync', 'android'], staffDir);
run(gradlewCmd, ['assembleDebug'], staffAndroidDir);

const staffApkSrc = path.join(staffAndroidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const staffApkDest = path.join(buildApksDir, 'CT-Mart-Staff.apk');

if (fs.existsSync(staffApkSrc)) {
  copyFileSafe(staffApkSrc, staffApkDest);
  const sizeMb = (fs.statSync(staffApkDest).size / (1024 * 1024)).toFixed(2);
  console.log(`\n✓ Đã tạo thành công: ${staffApkDest} (${sizeMb} MB)`);
} else {
  console.error(`\n[ERROR] Không tìm thấy file APK tại: ${staffApkSrc}`);
  process.exit(1);
}

// 3. Build Driver App
console.log('\n==============================================================================');
console.log('[3/3] BUILD APK: C.T MART DRIVER (React Native Expo + Android)...');
console.log('==============================================================================');
const driverDir = path.join(rootDir, 'frontend', 'driver-app');
const driverAndroidDir = path.join(driverDir, 'android');

run(gradlewCmd, ['assembleDebug'], driverAndroidDir);

const driverApkSrc = path.join(driverAndroidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const driverApkDest = path.join(buildApksDir, 'CT-Mart-Driver.apk');

if (fs.existsSync(driverApkSrc)) {
  copyFileSafe(driverApkSrc, driverApkDest);
  const sizeMb = (fs.statSync(driverApkDest).size / (1024 * 1024)).toFixed(2);
  console.log(`\n✓ Đã tạo thành công: ${driverApkDest} (${sizeMb} MB)`);
} else {
  console.error(`\n[ERROR] Không tìm thấy file APK tại: ${driverApkSrc}`);
  process.exit(1);
}

console.log('\n==============================================================================');
console.log('BUILD HOÀN TẤT THÀNH CÔNG!');
console.log(`1. C.T Mart Staff:  ${staffApkDest}`);
console.log(`2. C.T Mart Driver: ${driverApkDest}`);
console.log('==============================================================================\n');

// 4. Install onto connected Android device
console.log('==============================================================================');
console.log('[4/4] TỰ ĐỘNG CÀI ĐẶT 2 APP VÀO ĐIỆN THOẠI QUA ADB...');
console.log('==============================================================================');
try {
  const adbCheck = spawnSync('adb', ['devices'], { shell: true, encoding: 'utf-8' });
  const hasDevice = adbCheck.stdout && adbCheck.stdout.split('\n').some(line => line.includes('\tdevice'));
  if (hasDevice) {
    console.log('>> Phát hiện thiết bị Android kết nối. Bắt đầu cài đặt...');
    console.log('>> Đang cài C.T Mart Staff...');
    run('adb', ['install', '-r', staffApkDest], rootDir);
    console.log('>> Đang cài C.T Mart Driver...');
    run('adb', ['install', '-r', driverApkDest], rootDir);
    console.log('\n✓ ĐÃ CÀI ĐẶT THÀNH CÔNG 2 APP VÀO ĐIỆN THOẠI!');
  } else {
    console.log('>> Không phát hiện thiết bị qua ADB. File APK đã sẵn sàng trong thư mục build-apks/');
  }
} catch (e) {
  console.warn('ADB install error:', e);
}

