import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const memoryFallback: Record<string, string> = {};

export class StorageService {
  public static async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch {
        memoryFallback[key] = value;
      }
      return;
    }

    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      memoryFallback[key] = value;
    }
  }

  public static async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch {
        return memoryFallback[key] || null;
      }
    }

    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return memoryFallback[key] || null;
    }
  }

  public static async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch {
        delete memoryFallback[key];
      }
      return;
    }

    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      delete memoryFallback[key];
    }
  }
}
