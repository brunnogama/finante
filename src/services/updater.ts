import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateProgress {
  status: 'checking' | 'available' | 'up-to-date' | 'downloading' | 'installing' | 'relaunching' | 'error';
  percentage?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  error?: string;
  updateInfo?: {
    version: string;
    notes?: string;
    date?: string;
  };
}

export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
};

export async function checkAppUpdate(): Promise<Update | null> {
  try {
    const update = await check();
    return update;
  } catch (err: any) {
    console.warn('[Updater] check() error:', err?.message || err);
    return null;
  }
}

export async function downloadAndApplyUpdate(
  update: Update,
  onProgress?: (progress: { percentage: number; downloadedBytes: number; totalBytes: number }) => void
): Promise<void> {
  let downloadedBytes = 0;
  let totalBytes = 0;

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        totalBytes = event.data.contentLength || 0;
        downloadedBytes = 0;
        if (onProgress) {
          onProgress({ percentage: 0, downloadedBytes: 0, totalBytes });
        }
        break;
      case 'Progress':
        downloadedBytes += event.data.chunkLength;
        const percentage = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
        if (onProgress) {
          onProgress({ percentage, downloadedBytes, totalBytes });
        }
        break;
      case 'Finished':
        if (onProgress) {
          onProgress({ percentage: 100, downloadedBytes: totalBytes, totalBytes });
        }
        break;
    }
  });

  // Relaunch the application after installation
  await relaunch();
}
