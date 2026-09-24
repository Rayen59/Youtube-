export interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  previewGifUrl?: string;
  channelTitle: string;
  channelAvatar: string;
  channelId: string;
  subscribers: string;
  verified: boolean;
  views: number;
  uploadDate: string;
  duration: number; // in seconds
  durationFormatted: string;
  category: string;
  tags: string[];
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  resolution: '4K' | '1080p' | '720p';
}

export interface CommentReply {
  id: string;
  commentId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: string;
  likes: number;
  userLiked?: boolean;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: string;
  likes: number;
  userLiked?: boolean;
  replies?: CommentReply[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  avatar: string;
  role: 'user' | 'admin';
  createdAt: string;
  channelName?: string;
  subscribersCount?: number;
}

export interface UserActivity {
  id: string;
  action: 'watch' | 'like' | 'dislike' | 'comment' | 'search' | 'favorite' | 'download';
  videoId?: string;
  videoTitle?: string;
  category?: string;
  searchQuery?: string;
  watchTimeSeconds?: number;
  timestamp: string;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  autoplay: boolean;
  preferredQuality: string;
  playbackSpeed: number;
  volume: number;
  categoryAffinity: Record<string, number>; // e.g. { 'Tech & IA': 12, 'Gaming': -2 }
  dislikedTags: string[];
  lastActive: string;
}

export interface UserFavorites {
  likedVideoIds: string[];
  dislikedVideoIds: string[];
  savedVideoIds: string[]; // Watch later
  downloadedVideos: {
    videoId: string;
    downloadedAt: string;
    fileSizeMb: number;
    title: string;
  }[];
  customPlaylists: {
    id: string;
    title: string;
    videoIds: string[];
    createdAt: string;
  }[];
}

export interface UserProfileNamespace {
  profile: User;
  activities: UserActivity[];
  preferences: UserPreferences;
  favorites: UserFavorites;
}

export interface RecommendationScore {
  video: Video;
  score: number;
  matchReasons: string[];
}
