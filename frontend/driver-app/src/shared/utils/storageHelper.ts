import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as FileSystemModern from 'expo-file-system';
import { Platform } from 'react-native';

const memoryCache = new Map<string, string>();

export const storageHelper = {
  async saveItem(key: string, value: string): Promise<void> {
    try {
      memoryCache.set(key, value);

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }

      if (Platform.OS !== 'web') {
        // 1. Ưu tiên module legacy chính thức của Expo SDK 54+ (có documentDirectory và writeAsStringAsync)
        const fsLegacy = FileSystemLegacy as any;
        if (fsLegacy && fsLegacy.documentDirectory && fsLegacy.writeAsStringAsync) {
          const fileUri = `${fsLegacy.documentDirectory}${key}.json`;
          await fsLegacy.writeAsStringAsync(fileUri, value);
          return;
        }

        // 2. Dự phòng qua class API hiện đại File / Paths của Expo SDK 54+
        const fsModern = FileSystemModern as any;
        if (fsModern?.Paths?.document && fsModern?.File) {
          const file = new fsModern.File(fsModern.Paths.document, `${key}.json`);
          file.write(value);
          return;
        }
      }
    } catch (e) {
      console.warn(`[storageHelper] Lỗi khi lưu key "${key}":`, e);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS !== 'web') {
        // 1. Kiểm tra module legacy
        const fsLegacy = FileSystemLegacy as any;
        if (fsLegacy && fsLegacy.documentDirectory && fsLegacy.readAsStringAsync && fsLegacy.getInfoAsync) {
          const fileUri = `${fsLegacy.documentDirectory}${key}.json`;
          const info = await fsLegacy.getInfoAsync(fileUri);
          if (info && info.exists) {
            const data = await fsLegacy.readAsStringAsync(fileUri);
            if (data !== undefined && data !== null) {
              memoryCache.set(key, data);
              return data;
            }
          }
        }

        // 2. Dự phòng qua class File / Paths
        const fsModern = FileSystemModern as any;
        if (fsModern?.Paths?.document && fsModern?.File) {
          const file = new fsModern.File(fsModern.Paths.document, `${key}.json`);
          const info = file.info();
          if (info && info.exists) {
            const data = await file.text();
            if (data !== undefined && data !== null) {
              memoryCache.set(key, data);
              return data;
            }
          }
        }
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch (e) {
      console.warn(`[storageHelper] Lỗi khi đọc key "${key}":`, e);
    }

    return memoryCache.get(key) || null;
  },

  async removeItem(key: string): Promise<void> {
    try {
      memoryCache.delete(key);

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }

      if (Platform.OS !== 'web') {
        const fsLegacy = FileSystemLegacy as any;
        if (fsLegacy && fsLegacy.documentDirectory && fsLegacy.deleteAsync && fsLegacy.getInfoAsync) {
          const fileUri = `${fsLegacy.documentDirectory}${key}.json`;
          const info = await fsLegacy.getInfoAsync(fileUri);
          if (info && info.exists) {
            await fsLegacy.deleteAsync(fileUri, { idempotent: true });
          }
        }

        const fsModern = FileSystemModern as any;
        if (fsModern?.Paths?.document && fsModern?.File) {
          const file = new fsModern.File(fsModern.Paths.document, `${key}.json`);
          const info = file.info();
          if (info && info.exists) {
            file.delete();
          }
        }
      }
    } catch (e) {
      console.warn(`[storageHelper] Lỗi khi xóa key "${key}":`, e);
    }
  }
};
