import { confirmPickingApi, adjustStockAuditApi, updateOutboundStatus } from './api';

export interface SyncTask {
  id: string;
  type: 'CONFIRM_PICK' | 'ADJUST_AUDIT' | 'UPDATE_ORDER_STATUS' | 'REPORT_INCIDENT';
  payload: any;
  createdAt: number;
  retries: number;
}

const STORAGE_KEY = 'citymart_offline_sync_queue';

class OfflineSyncService {
  private queue: SyncTask[] = [];
  private isSyncing: boolean = false;
  private listeners: ((tasks: SyncTask[], isOnline: boolean) => void)[] = [];
  private isOnlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    this.loadQueue();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnlineChange(true));
      window.addEventListener('offline', () => this.handleOnlineChange(false));
    }
  }

  private handleOnlineChange(online: boolean) {
    this.isOnlineStatus = online;
    this.notifyListeners();
    if (online) {
      this.flushQueue();
    }
  }

  private loadQueue() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      this.queue = data ? JSON.parse(data) : [];
    } catch (e) {
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (e) {}
    this.notifyListeners();
  }

  public isOnline(): boolean {
    return this.isOnlineStatus;
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public getQueue(): SyncTask[] {
    return [...this.queue];
  }

  public subscribe(listener: (tasks: SyncTask[], isOnline: boolean) => void) {
    this.listeners.push(listener);
    listener(this.queue, this.isOnlineStatus);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.queue, this.isOnlineStatus));
  }

  /**
   * Enqueue an action when offline or when network fails
   */
  public enqueue(type: SyncTask['type'], payload: any): SyncTask {
    const task: SyncTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      createdAt: Date.now(),
      retries: 0,
    };

    this.queue.push(task);
    this.saveQueue();

    if (this.isOnlineStatus) {
      this.flushQueue();
    }

    return task;
  }

  /**
   * Process all queued tasks sequentially
   */
  public async flushQueue() {
    if (this.isSyncing || this.queue.length === 0 || !this.isOnlineStatus) return;
    this.isSyncing = true;

    try {
      const remaining: SyncTask[] = [];

      for (const task of this.queue) {
        try {
          if (task.type === 'CONFIRM_PICK') {
            await confirmPickingApi(task.payload.orderId, task.payload.pickedItems);
          } else if (task.type === 'ADJUST_AUDIT') {
            await adjustStockAuditApi(
              task.payload.lotId,
              task.payload.qty,
              task.payload.reason,
              task.payload.performedBy,
              task.payload.token
            );
          } else if (task.type === 'UPDATE_ORDER_STATUS') {
            await updateOutboundStatus(task.payload.orderId, task.payload.status);
          }
        } catch (err) {
          task.retries += 1;
          if (task.retries < 5) {
            remaining.push(task);
          }
        }
      }

      this.queue = remaining;
      this.saveQueue();
    } finally {
      this.isSyncing = false;
    }
  }
}

export const offlineSync = new OfflineSyncService();
