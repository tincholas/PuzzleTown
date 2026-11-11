import { registerSW } from 'virtual:pwa-register';

export type CheckUpdateStatus =
  | 'idle'
  | 'checking'
  | 'update-found'
  | 'up-to-date'
  | 'offline'
  | 'error';

export interface CheckUpdateResult {
  status: CheckUpdateStatus;
  message: string;
}

type PwaListener = (hasUpdate: boolean) => void;

class PwaManager {
  private hasUpdate = false;
  private isChecking = false;
  private registration: ServiceWorkerRegistration | null = null;
  private updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
  private listeners = new Set<PwaListener>();
  private initialized = false;

  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      this.updateSWFn = registerSW({
        immediate: true,
        onNeedRefresh: () => {
          this.hasUpdate = true;
          this.notifyListeners();
        },
        onOfflineReady: () => {
          // App precached and ready for offline play
        },
        onRegistered: (registration) => {
          if (!registration) return;
          this.registration = registration;
          this.setupAutoUpdateChecks(registration);
        },
        onRegisterError: (err) => {
          console.warn('[PWA] Service worker registration failed:', err);
        }
      });
    } catch (err) {
      console.warn('[PWA] registerSW error:', err);
    }
  }

  private setupAutoUpdateChecks(registration: ServiceWorkerRegistration): void {
    // 1. Initial proactive check 3 seconds after boot
    setTimeout(() => {
      if (navigator.onLine) {
        registration.update().catch(() => {});
      }
    }, 3000);

    // 2. Proactive check when returning to app (visibility change)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        registration.update().catch(() => {});
      }
    });

    // 3. Proactive check on window focus
    window.addEventListener('focus', () => {
      if (navigator.onLine) {
        registration.update().catch(() => {});
      }
    });

    // 4. Proactive check when coming back online
    window.addEventListener('online', () => {
      registration.update().catch(() => {});
    });

    // 5. Periodic check every 15 minutes while app remains open
    setInterval(() => {
      if (navigator.onLine) {
        registration.update().catch(() => {});
      }
    }, 15 * 60 * 1000);
  }

  public getHasUpdate(): boolean {
    return this.hasUpdate;
  }

  public subscribe(listener: PwaListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.hasUpdate);
      } catch (err) {
        console.error('[PWA] listener error:', err);
      }
    }
  }

  public async applyUpdate(): Promise<void> {
    if (this.updateSWFn) {
      await this.updateSWFn(true);
    } else {
      window.location.reload();
    }
  }

  public async checkForUpdate(): Promise<CheckUpdateResult> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return {
        status: 'error',
        message: 'Service workers are not supported on this browser.'
      };
    }

    if (!navigator.onLine) {
      return {
        status: 'offline',
        message: 'You are currently offline. Check your connection.'
      };
    }

    if (!this.registration) {
      return {
        status: 'up-to-date',
        message: 'PuzzleTown is running the latest version.'
      };
    }

    this.isChecking = true;

    try {
      await this.registration.update();

      // Give worker a brief moment to transition to waiting/installing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (this.hasUpdate || this.registration.waiting) {
        this.hasUpdate = true;
        this.notifyListeners();
        this.isChecking = false;
        return {
          status: 'update-found',
          message: 'New update downloaded! Reload to apply.'
        };
      }

      this.isChecking = false;
      return {
        status: 'up-to-date',
        message: 'PuzzleTown is up to date!'
      };
    } catch (err) {
      this.isChecking = false;
      return {
        status: 'error',
        message: 'Failed to check for updates. Try again later.'
      };
    }
  }
}

export const pwaManager = new PwaManager();
