import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export const storageHelper = {
  async saveItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      const fs = FileSystem as any;
      if (Platform.OS !== 'web' && fs && fs.documentDirectory) {
        const fileUri = `${fs.documentDirectory}${key}.json`;
        await fs.writeAsStringAsync(fileUri, value);
      }
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      const fs = FileSystem as any;
      if (Platform.OS !== 'web' && fs && fs.documentDirectory) {
        const fileUri = `${fs.documentDirectory}${key}.json`;
        const info = await fs.getInfoAsync(fileUri);
        if (info.exists) {
          return await fs.readAsStringAsync(fileUri);
        }
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('Storage read error:', e);
    }
    return null;
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      const fs = FileSystem as any;
      if (Platform.OS !== 'web' && fs && fs.documentDirectory) {
        const fileUri = `${fs.documentDirectory}${key}.json`;
        const info = await fs.getInfoAsync(fileUri);
        if (info.exists) {
          await fs.deleteAsync(fileUri, { idempotent: true });
        }
      }
    } catch (e) {
      console.warn('Storage remove error:', e);
    }
  }
};

