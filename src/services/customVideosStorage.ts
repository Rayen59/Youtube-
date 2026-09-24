import { Video } from '../types';

const CUSTOM_VIDEOS_STORAGE_KEY = 'mk_custom_user_created_videos_v1';

export const getCustomVideos = (): Video[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_VIDEOS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Video[];
  } catch {
    return [];
  }
};

export const saveCustomVideo = (video: Video): void => {
  try {
    const current = getCustomVideos();
    const updated = [video, ...current.filter((v) => v.id !== video.id)];
    localStorage.setItem(CUSTOM_VIDEOS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save custom video:', err);
  }
};

export const deleteCustomVideo = (videoId: string): void => {
  try {
    const current = getCustomVideos();
    const updated = current.filter((v) => v.id !== videoId);
    localStorage.setItem(CUSTOM_VIDEOS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete custom video:', err);
  }
};
