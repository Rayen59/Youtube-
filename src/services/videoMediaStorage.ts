/**
 * IndexedDB storage for offline & persistent user gallery video uploads.
 * This ensures videos uploaded from device gallery survive page refreshes,
 * browser restarts, and work with high performance.
 */

const DB_NAME = 'mk_video_storage_db';
const DB_VERSION = 1;
const STORE_NAME = 'uploaded_videos';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveVideoBlobToDB = async (id: string, file: Blob, mimeType?: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id,
        blob: file,
        mimeType: mimeType || file.type || 'video/mp4',
        updatedAt: Date.now(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not store video in IndexedDB:', err);
  }
};

export const getVideoBlobFromDB = async (id: string): Promise<Blob | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob as Blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
};

export const deleteVideoBlobFromDB = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not delete video from IndexedDB:', err);
  }
};

/**
 * Automatically captures a 16:9 thumbnail and extracts metadata
 * (duration, resolution) from a video file selected from the user's gallery.
 */
export const extractVideoMetadataAndThumbnail = (
  file: File
): Promise<{
  thumbnailUrl: string;
  duration: number;
  durationFormatted: string;
  resolution: '4K' | '1080p' | '720p';
}> => {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    let hasResolved = false;

    const cleanupAndResolve = (result: {
      thumbnailUrl: string;
      duration: number;
      durationFormatted: string;
      resolution: '4K' | '1080p' | '720p';
    }) => {
      if (hasResolved) return;
      hasResolved = true;
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
      resolve(result);
    };

    // Safety timeout in case video metadata fails to load
    const timeout = setTimeout(() => {
      cleanupAndResolve({
        thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1280&q=80',
        duration: 120,
        durationFormatted: '02:00',
        resolution: '1080p',
      });
    }, 6000);

    video.onloadedmetadata = () => {
      const rawSecs = Math.max(1, Math.round(video.duration || 60));
      const mins = Math.floor(rawSecs / 60);
      const secs = rawSecs % 60;
      const formatted = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;

      let res: '4K' | '1080p' | '720p' = '1080p';
      if (video.videoWidth >= 3840 || video.videoHeight >= 2160) {
        res = '4K';
      } else if (video.videoWidth >= 1920 || video.videoHeight >= 1080) {
        res = '1080p';
      } else {
        res = '720p';
      }

      // Seek to second 1 or half duration for thumbnail capture
      const targetSeek = Math.min(1.5, Math.max(0.1, video.duration / 3));
      video.currentTime = targetSeek;

      video.onseeked = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(video.videoWidth || 1280, 1280);
          canvas.height = Math.min(video.videoHeight || 720, 720);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbData = canvas.toDataURL('image/jpeg', 0.85);
            cleanupAndResolve({
              thumbnailUrl: thumbData,
              duration: rawSecs,
              durationFormatted: formatted,
              resolution: res,
            });
            return;
          }
        } catch {
          // Fallback if canvas capture fails
        }
        cleanupAndResolve({
          thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1280&q=80',
          duration: rawSecs,
          durationFormatted: formatted,
          resolution: res,
        });
      };
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanupAndResolve({
        thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1280&q=80',
        duration: 120,
        durationFormatted: '02:00',
        resolution: '1080p',
      });
    };
  });
};
