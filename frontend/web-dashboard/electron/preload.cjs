const { contextBridge } = require('electron');

// Phơi bày cờ môi trường Desktop an toàn vào window (không cấp quyền hệ thống nguy hiểm)
contextBridge.exposeInMainWorld('isElectron', true);
contextBridge.exposeInMainWorld('electronEnv', {
  platform: process.platform,
  version: '1.0.0',
  defaultServerUrl: 'http://smartwarehouse-kltn.duckdns.org',
});
