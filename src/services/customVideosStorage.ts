import { Video } from '../types';
import { getVideoBlobFromDB, deleteVideoBlobFromDB } from './videoMediaStorage';

const CUSTOM_VIDEOS_STORAGE_KEY = 'mk_custom_user_created_videos_v2';
// In-memory cache of object URLs created for indexedDB blobs to avoid memory leaks
const activeBlobUrls: Map<string, string> = new Map();

export const getCustomVideos = (): Video[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_VIDEOS_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Video[];
    // Reattach any active object URLs for gallery videos
    return list.map((video) => {
      if (video.isFromGallery && activeBlobUrls.has(video.id)) {
        return {
          ...video,
          videoUrl: activeBlobUrls.get(video.id) || video.videoUrl,
        };
      }
      return video;
    });
  } catch {
    return [];
  }
};

/**
 * Hydrates gallery videos from IndexedDB by generating valid Object URLs.
 * Should be called on app mount.
 */
export const hydrateGalleryVideos = async (): Promise<Video[]> => {
  const videos = getCustomVideos();
  const updatedVideos: Video[] = [];

  for (const v of videos) {
    if (v.isFromGallery) {
      try {
        const blob = await getVideoBlobFromDB(v.id);
        if (blob) {
          const newUrl = URL.createObjectURL(blob);
          activeBlobUrls.set(v.id, newUrl);
          updatedVideos.push({
            ...v,
            videoUrl: newUrl,
          });
          continue;
        }
      } catch (err) {
        console.warn(`Could not restore gallery video blob for ${v.id}:`, err);
      }
    }
    updatedVideos.push(v);
  }

  return updatedVideos;
};

export const saveCustomVideo = (video: Video): void => {
  try {
    if (video.isFromGallery && video.videoUrl.startsWith('blob:')) {
      activeBlobUrls.set(video.id, video.videoUrl);
    }
    const current = getCustomVideos();
    const updated = [video, ...current.filter((v) => v.id !== video.id)];
    localStorage.setItem(CUSTOM_VIDEOS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save custom video:', err);
  }
};

export const deleteCustomVideo = async (videoId: string): Promise<void> => {
  try {
    const current = getCustomVideos();
    const updated = current.filter((v) => v.id !== videoId);
    localStorage.setItem(CUSTOM_VIDEOS_STORAGE_KEY, JSON.stringify(updated));

    if (activeBlobUrls.has(videoId)) {
      const url = activeBlobUrls.get(videoId);
      if (url) URL.revokeObjectURL(url);
      activeBlobUrls.delete(videoId);
    }

    await deleteVideoBlobFromDB(videoId);
  } catch (err) {
    console.error('Failed to delete custom video:', err);
  }
};
