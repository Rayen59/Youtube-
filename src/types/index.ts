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
  fallbackUrls?: string[];
  isFromGallery?: boolean;
  fileSizeMb?: number;
  creatorId?: string;
  trimStart?: number;
  trimEnd?: number;
  videoFilter?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  defaultPlaybackSpeed?: number;
  defaultMuted?: boolean;
  ultraHqEnhanced?: boolean;
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

export interface UserGeoTelemetry {
  country: string;
  countryCode: string;
  flag: string;
  city: string;
  timezone: string;
  language: string;
  deviceType: 'Mobile' | 'Desktop' | 'Tablette';
  os: string;
  browser: string;
  ipMasked: string;
  screenResolution: string;
  sessionsCount: number;
  bandwidthMb: number;
  hourlyUsage: number[]; // 24 slots (0h to 23h)
  trustScore: number; // 0 to 100
  isSuspended?: boolean;
  suspensionReason?: string;
}

export interface AIModerationIncident {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  country?: string;
  source: 'video_upload' | 'comment' | 'reply' | 'search' | 'voice_search';
  contentSnippet: string;
  violationCategory: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  reason: string;
  flaggedTerms: string[];
  timestamp: string;
  autoBlocked: boolean;
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
  country?: string;
  countryCode?: string;
  flag?: string;
  city?: string;
  timezone?: string;
  deviceType?: 'Mobile' | 'Desktop' | 'Tablette';
  os?: string;
  browser?: string;
  ipMasked?: string;
  isSuspended?: boolean;
}

export interface UserActivity {
  id: string;
  action:
    | 'watch'
    | 'like'
    | 'dislike'
    | 'comment'
    | 'search'
    | 'voice_search'
    | 'favorite'
    | 'download'
    | 'upload'
    | 'ai_blocked';
  videoId?: string;
  videoTitle?: string;
  category?: string;
  searchQuery?: string;
  watchTimeSeconds?: number;
  blockedReason?: string;
  hour?: number;
  country?: string;
  timestamp: string;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  autoplay: boolean;
  preferredQuality: string;
  playbackSpeed: number;
  volume: number;
  categoryAffinity: Record<string, number>;
  dislikedTags: string[];
  lastActive: string;
}

export interface UserFavorites {
  likedVideoIds: string[];
  dislikedVideoIds: string[];
  savedVideoIds: string[];
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
  telemetry?: UserGeoTelemetry;
}

export interface RecommendationScore {
  video: Video;
  score: number;
  matchReasons: string[];
}
