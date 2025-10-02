/**
 * Version Checker Utility
 * 
 * Monitors for new app versions and automatically reloads when a new version is deployed.
 * This prevents users from running stale cached versions of the app.
 * 
 * Usage:
 * ```typescript
 * import { VersionChecker } from './utils/versionChecker';
 * 
 * // In your root component
 * useEffect(() => {
 *   const checker = new VersionChecker();
 *   checker.startMonitoring();
 *   return () => checker.stopMonitoring();
 * }, []);
 * ```
 */

interface VersionInfo {
  version: string;
  buildDate: string;
  timestamp: number;
  environment: string;
  gitCommit?: string;
  gitBranch?: string;
  deploymentUrl?: string;
}

export class VersionChecker {
  private currentVersion: string;
  private checkInterval: number;
  private intervalId: NodeJS.Timeout | null = null;
  private isChecking: boolean = false;

  constructor(checkInterval: number = 5 * 60 * 1000) { // Default: 5 minutes
    // Get the version that was compiled into the app
    this.currentVersion = this.getBuildVersion();
    this.checkInterval = checkInterval;
    
    console.log(`[VersionChecker] Initialized with version: ${this.currentVersion}`);
  }

  /**
   * Get the build version that was compiled into the app
   */
  private getBuildVersion(): string {
    return (process.env.BUILD_VERSION || 
            (typeof window !== 'undefined' && (window as any).__BUILD_VERSION__) || 
            'unknown');
  }

  /**
   * Start monitoring for version changes
   */
  public startMonitoring(): void {
    console.log('[VersionChecker] Starting version monitoring...');
    
    // Check immediately on start
    this.checkForUpdates();
    
    // Set up periodic checks
    this.intervalId = setInterval(() => {
      this.checkForUpdates();
    }, this.checkInterval);
  }

  /**
   * Stop monitoring for version changes
   */
  public stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[VersionChecker] Stopped version monitoring');
    }
  }

  /**
   * Check if a new version is available
   */
  public async checkForUpdates(): Promise<void> {
    // Prevent concurrent checks
    if (this.isChecking) {
      return;
    }

    this.isChecking = true;

    try {
      const response = await fetch('/api/version', {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        console.warn('[VersionChecker] Failed to fetch version info:', response.status);
        return;
      }

      const versionInfo: VersionInfo = await response.json();
      
      console.log('[VersionChecker] Version check:', {
        current: this.currentVersion,
        latest: versionInfo.version,
        needsUpdate: versionInfo.version !== this.currentVersion
      });

      // Check if version has changed
      if (versionInfo.version !== this.currentVersion && 
          versionInfo.version !== 'unknown' && 
          this.currentVersion !== 'unknown') {
        
        console.log('[VersionChecker] New version detected! Reloading app...');
        this.handleVersionUpdate(versionInfo);
      }
    } catch (error) {
      console.error('[VersionChecker] Error checking for updates:', error);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Handle version update by clearing caches and reloading
   */
  private async handleVersionUpdate(versionInfo: VersionInfo): Promise<void> {
    try {
      // Show user notification (optional - customize as needed)
      this.notifyUser(versionInfo);

      // Clear all browser caches
      await this.clearAllCaches();

      // Small delay to allow notification to be visible
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Force hard reload
      window.location.reload();
    } catch (error) {
      console.error('[VersionChecker] Error during update:', error);
      // Force reload anyway
      window.location.reload();
    }
  }

  /**
   * Clear all browser caches
   */
  private async clearAllCaches(): Promise<void> {
    console.log('[VersionChecker] Clearing all caches...');

    // Clear Cache API
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log(`[VersionChecker] Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
      } catch (error) {
        console.error('[VersionChecker] Error clearing Cache API:', error);
      }
    }

    // Unregister service workers
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => {
            console.log('[VersionChecker] Unregistering service worker');
            return registration.unregister();
          })
        );
      } catch (error) {
        console.error('[VersionChecker] Error unregistering service workers:', error);
      }
    }

    // Clear localStorage items related to app state (optional)
    // Be careful not to clear user data or authentication tokens
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('app_cache_') || key.startsWith('version_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('[VersionChecker] Error clearing localStorage:', error);
    }
  }

  /**
   * Notify user about the update
   */
  private notifyUser(versionInfo: VersionInfo): void {
    console.log('[VersionChecker] Notifying user about update');
    
    // You can customize this notification based on your UI framework
    // For now, we'll use a simple alert (consider using a toast/snackbar instead)
    
    // Option 1: Simple console message (silent update)
    console.log(`Updating to version ${versionInfo.version}...`);
    
    // Option 2: Alert (uncomment if you want user notification)
    // alert(`A new version is available. The app will reload automatically.`);
    
    // Option 3: Custom toast notification (implement based on your UI library)
    // showToast('New version available! Reloading...', 'info');
  }

  /**
   * Manual version check (can be triggered by user action)
   */
  public async forceUpdate(): Promise<void> {
    console.log('[VersionChecker] Force update triggered');
    await this.clearAllCaches();
    window.location.reload();
  }
}

/**
 * React Hook for version checking
 */
export function useVersionChecker(checkInterval?: number) {
  if (typeof window === 'undefined') {
    return; // Skip on server-side
  }

  const checker = new VersionChecker(checkInterval);
  
  // Start monitoring when hook is used
  checker.startMonitoring();

  // Cleanup on unmount
  return () => {
    checker.stopMonitoring();
  };
}
